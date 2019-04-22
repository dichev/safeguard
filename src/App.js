'use strict'

require('dopamine-toolbox').lib.console.upgrade()

require('moment-recur')
const moment = require('moment')
const Config = require('./config/Config')
const Guard = require('./guards/Guard')
const Database = require('./lib/Database')
const Server = require('../src/Server')
const Metrics = require('./Metrics')
const Log = require('./Log')
const prefix = require('./lib/Utils').prefix
const sleep = require('./lib/Utils').sleep

const THROTTLE = require('../src/config/Config').schedule.initialThrottleBetweenOperators

class App {
    
    constructor(operators){
        /**@type Array<Guard> */
        this.guards = []
        for(let operator of operators) {
            this.guards.push(new Guard(operator))
        }
        
        this.log = new Log()
        this.metrics = new Metrics()
    }
    
    async activate(){
        if(Config.production) {
            if(!Config.killSwitch.enabled) await this.log.warn('APP', {msg: `Running in PRODUCTION mode with disabled kill switch`})
            if(Config.killSwitch.enabled && Config.killSwitch.debug.storeBlockedInSafeguardDatabase) {
                await this.log.error('APP', {msg: `Running in PRODUCTION mode with debug.storeBlockedInSafeguardDatabase is not allowed`})
                throw Error('Running in PRODUCTION mode with debug.storeBlockedInSafeguardDatabase is not allowed')
            }
        } else {
            await this.log.warn('APP', {msg: `INFO | Running in non-production mode with ${Config.killSwitch.enabled ? 'enabled' : 'disabled'} kill switch`})
            if (Config.killSwitch.enabled && !Config.killSwitch.debug.storeBlockedInSafeguardDatabase) await this.log.warn('APP', {msg: `When running in non-production mode with kill switch enabled - is recommended to activate debug.storeBlockedInSafeguardDatabase to avoid attempts to insert block records in replications`})
        }
        
        
        // run each operator in parallel
        await Promise.all(this.guards.map(async (guard, i) => {
            await sleep(i * THROTTLE) // throttle db connections
    
            // noinspection InfiniteLoopJS
            while (true) {
                let startAt = Date.now()
                try {
                    await guard.check()
                    await this.checkDuration(guard, startAt)
                } catch (err) {
                    await this.log.error(guard.operator, {msg: err.toString()}, startAt)
                    throw err
                }
                
                // repeat later
                await Database.killConnectionsByNamePrefix(guard.operator)
                console.verbose(prefix(guard.operator) + `Next iteration will be after ${Config.schedule.intervalBetweenIterations} sec`)
                await sleep(Config.schedule.intervalBetweenIterations)
            }
        }))
    }
    
    
    async history(from, to) {
        if(!moment(from, 'YYYY-MM-DD', true).isValid()) throw Error(`Invalid date: ${from}`)
        if(!moment(to,   'YYYY-MM-DD', true).isValid()) throw Error(`Invalid date: ${to}`)
        if(moment.utc(from).isAfter(moment.utc(to)))    throw Error('Invalid dates! The history start period can not be after the end period')
        if(moment.utc(to).isSameOrAfter(moment.utc().startOf('day'))) throw Error('Invalid dates! The history end period must be before today')
    
        let interval = moment().recur(from, to).all('YYYY-MM-DD');
    
        for (let date of interval) {
            for (let guard of this.guards) {
                await guard.history(date)
            }
            // console.log(`-`.repeat(140))
        }
    
        await Database.killAllConnections()
    }
    
    async cleanDatabaseLogs(){
        let db = await Database.getLocalInstance()
        await db.query('TRUNCATE alerts; TRUNCATE blocked; TRUNCATE log;')
    }
    
    async checkDuration(guard, startAt){
        let duration = Date.now() - startAt
        if (duration > Config.logs.warnIfDurationAbove) {
            await this.log.warn(guard.operator, {msg: `Too long execution time (above ${Config.logs.warnIfDurationAbove}ms)`, duration: `${duration}ms`}, startAt)
        }
    }
    
    async serve(){
        let server = new Server()
        server.metricsHandler = async () => this.getMetrics()
        server.listen()
    }
    
    async getMetrics(){
        let output = ''
        try {
            let logs = await this.log.collectLogs()
            logs.map(log => this.metrics.collectLogs(log))
    
            output = this.metrics.export()
            output += this.guards.map(guard => guard.metrics.export()).join('')
        } catch (err) {
            return this.asyncErrorHandler(err)
        }
        
        return output
    }
    
    /**
     * @param {Error} error
     */
    async asyncErrorHandler(error){
        try { // attempt to save the error log
            await this.log.error('APP', {msg: error.toString()})
        } catch (e) {
            console.error(e)
        }
        console.error('[ERROR] ' + error.toString())
        console.verbose(error.stack)
        process.exit(1)
    }
    
}

module.exports = App