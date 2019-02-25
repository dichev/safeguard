'use strict'

require('dopamine-toolbox').lib.console.upgrade()

const moment = require('moment')
require('moment-recur')
const Config = require('./config/Config')
const Database = require('./lib/Database')
const DailyJackpots = require('./triggers/DailyJackpots')
const UserLoss = require('./triggers/UserLoss')
const GameLoss = require('./triggers/GameLoss')
const OperatorLoss = require('./triggers/OperatorLoss')
const Alert = require('./actions/Alert')
const KillSwitch = require('./actions/KillSwitch')
const Metrics = require('./actions/Metrics')
const Trigger = require('./triggers/types/Trigger')
const Log = require('./Log')
const prefix = require('./lib/Utils').prefix
const sleep = require('./lib/Utils').sleep

class SafeGuard {
    
    static async cleanDatabaseLogs(){
        let db = await Database.getLocalInstance()
        await db.query('TRUNCATE alerts; TRUNCATE blocked; TRUNCATE log;')
    }
    
    constructor(operator) {
        if(!Config.credentials.databases.operators[operator]) throw Error('There is no such operator: ' + operator)
        
        this.operator = operator
        
        this.tests = []
        this.alerts = new Alert(operator)
        this.killSwitch = new KillSwitch(operator)
        this.log = new Log(operator)
        
        this._metrics = new Metrics(operator)
    }
    
    /**
     * @return {string}
     */
    metrics() {
        try {
            return this._metrics.export()
        } catch (err) {
            this.errorHandler(err)
        }
    }
    
    
    async activate(){
        try {
            this.tests = [
                new DailyJackpots(this.operator),
                new UserLoss(this.operator),
                new GameLoss(this.operator),
                new OperatorLoss(this.operator),
            ]

            // noinspection InfiniteLoopJS
            while (true) {
                await this.check()
                console.verbose(prefix(this.operator) + `Next iteration will be after ${Config.schedule.intervalBetweenIterations} sec`)
                await sleep(Config.schedule.intervalBetweenIterations)
            }
        } catch (err) {
            return this.errorHandler(err)
        }
    }
    
    async check(){
        console.log(prefix(this.operator) + `Checking for anomalies..`)
        let result = { alerts: 0, blocked: 0 }
        let startAt = Date.now()
        try {
            for (let test of this.tests) {
                let triggers = await test.exec()
                for(let trigger of triggers) {
                    trigger.action === Trigger.actions.ALERT ? result.alerts++ : result.blocked++
                    await this._handleTrigger(trigger)
                }
            }
            this._metrics.cleanup(startAt)
            this.alerts.cleanup(startAt)
            
            let duration = Date.now() - startAt
            if(duration > Config.logs.warnIfDurationAbove) {
                await this.log.warn({msg: `Too long execution time: ${duration}ms`, result}, startAt)
            }
        } catch (err) {
            await this.log.error(err, startAt)
            throw err
        }

        await Database.killConnectionsByNamePrefix(this.operator)
    }
    
        
    /**
     * @param {Trigger} trigger
     * @return {Promise<void>}
     * @private
     */
    async _handleTrigger(trigger){
        let isBlocked = false
    
        switch (trigger.action) {
        
            case Trigger.actions.ALERT:
                //
                break;
        
            case Trigger.actions.BLOCK_USER:
                isBlocked = await this.killSwitch.blockUser(trigger)
                break;
        
            case Trigger.actions.BLOCK_GAME:
                isBlocked = await this.killSwitch.blockGame(trigger)
                break;
        
            case Trigger.actions.BLOCK_JACKPOT:
                isBlocked = await this.killSwitch.blockJackpots(trigger)
                break;
        
            case Trigger.actions.BLOCK_OPERATOR:
                isBlocked = await this.killSwitch.blockOperator(trigger)
                break;
        
            default:
                throw Error('Unexpected action: ' + trigger.value)
        
        }
    
        await this.alerts.notify(trigger, isBlocked)
        this._metrics.collect(trigger)
    }
    
    /*
    // TODO: will be supported later
    async history(from, to = null){
        to = to || moment().utc().format('YYYY-MM-DD')
        let interval = moment().recur(from, to).all('YYYY-MM-DD');
        
        for(let date of interval){
            // let [from, to] =  [`${date} 00:00:00`, `${date} 23:59:59`]
            console.log(prefix(this.operator) + `Execution for ${date}`)
            for (let test of this.tests) {
                let logId = await this.log.start(test.constructor.name)
                let result = await test.exec(`${date} 23:59:59`)
                await this.log.end(logId, test.constructor.name, {period: date})
            }
        }
        
        await Database.killAllConnections()
    }
    */
    
    
    /**
     * @param {Error} error
     */
    errorHandler(error){
        console.error(prefix(this.operator) + '[ERROR] ' + error.toString())
        console.verbose(error.stack)
        process.exit(1)
    }
    
    
}

module.exports = SafeGuard