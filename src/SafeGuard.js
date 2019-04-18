'use strict'

require('dopamine-toolbox').lib.console.upgrade()

const moment = require('moment')
const Config = require('./config/Config')
const Database = require('./lib/Database')
const Jackpots = require('./triggers/Jackpots')
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
    
    static async closeDatabaseConnections(){
        Database.killAllConnections()
    }
    
    constructor(operator) {
        if(!Config.credentials.databases.operators[operator]) throw Error('There is no such operator: ' + operator)
        
        this.operator = operator
        
        this.tests = [
            new Jackpots(this.operator),
            new UserLoss(this.operator),
            new GameLoss(this.operator),
            new OperatorLoss(this.operator),
        ]
        this.alerts = new Alert(operator)
        this.killSwitch = new KillSwitch(operator)
        this.log = new Log(operator)
        
        this._metrics = new Metrics(operator)
        
        this._startDate = null
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
            // noinspection InfiniteLoopJS
            while (true) {
                let logs = await this.log.history()
                if (logs.length) logs.map(log => this._metrics.collectLogs(log))
                
                await this.check()
    
                await Database.killConnectionsByNamePrefix(this.operator)
                
                console.verbose(prefix(this.operator) + `Next iteration will be after ${Config.schedule.intervalBetweenIterations} sec`)
                await sleep(Config.schedule.intervalBetweenIterations)
            }
        } catch (err) {
            return this.errorHandler(err)
        }
    }
    
    async history(date) {
        date = moment.utc(date, 'YYYY-MM-DD', true)
        
        if(!this._startDate) {
            let db = await Database.getSegmentsInstance(this.operator)
            let row = await db.query(`SELECT MIN(period) as startDate FROM user_games_summary_daily`)
            this._startDate = row[0] && row[0].startDate ? moment.utc(row[0].startDate) : moment.utc()
            if (date.isBefore(this._startDate)) {
                console.warn(prefix(this.operator) + `First transactions are recorded at ${this._startDate.format('YYYY-MM-DD')}, so skipping the periods until then..`)
            }
        }
        
        if(date.isSameOrAfter(this._startDate)) {
            await this.check(date.format('YYYY-MM-DD'))
        }
        
    }
    
    async check(date = false){
        console.log(prefix(this.operator) + (date ? `[${date}] ` : '') + `Checking for anomalies..`)
        let startAt = Date.now()
        try {
            for (let test of this.tests) {
                let triggers = date ? await test.execHistoric(date) : await test.exec()
                for(let trigger of triggers) {
                    await this._handleTrigger(trigger)
                }
            }
            this._metrics.cleanup(startAt)
            this.alerts.cleanup(startAt)
            
            let duration = Date.now() - startAt
            if(duration > Config.logs.warnIfDurationAbove) {
                await this.log.warn({msg: `Too long execution time (above ${Config.logs.warnIfDurationAbove}ms)`, duration: `${duration}ms`}, startAt)
            }
        } catch (err) {
            await this.log.error({ msg: err.toString() }, startAt)
            throw err
        }
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
        this._metrics.collectTrigger(trigger)
    }
    
    
    //TODO: checkRecordsExists()
  
    
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