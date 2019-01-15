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
const Trigger = require('./triggers/events/Trigger')
const Log = require('./Log')
const prefix = require('./lib/Utils').prefix
const sleep = require('./lib/Utils').sleep

class SafeGuard {
    
    // used during dev
    static async cleanDatabase(){
        let db = await Database.getLocalInstance()
        await db.query('TRUNCATE alerts; TRUNCATE blocked; TRUNCATE log;')
    }
    
    constructor(operator) {
        if(!Config.credentials.databases.operators[operator]) throw Error('There is no such operator: ' + operator)
        
        this.operator = operator
        
        this.tests = [
            new DailyJackpots(),
            new UserLoss(),
            new GameLoss(),
            new OperatorLoss(),
        ]
        
        this.alerts = new Alert(operator)
        this.killSwitch = new KillSwitch(operator)
        this.log = new Log(operator)
        
        this._metrics = new Metrics(operator)
    }
    
    /**
     * @return {string}
     */
    metrics() {
        return this._metrics.export()
    }
    
    
    async activate(){
        for (let test of this.tests) {
            test.on('ALERT', async (details) => this._handleAlert(details, test))
        }

        // noinspection InfiniteLoopJS
        while (true) {
            await this.check()
            console.log(prefix(this.operator) + `Next iteration will be after ${Config.schedule.intervalBetweenIterations} sec`)
            await sleep(Config.schedule.intervalBetweenIterations)
        }
    }
    
    async check(){
        for (let test of this.tests) {
            let logId = await this.log.start(test.constructor.name)
            try {
                let result = await test.exec(this.operator)
                await this.log.end(logId)
            } catch (err) {
                await this.log.error(logId, err)
                throw err
            }
        }

        await Database.killConnectionsByNamePrefix(this.operator)
    }
    
    
    /**
     * @param {Trigger} trigger
     * @param test
     * @return {Promise<void>}
     * @private
     */
    async _handleAlert(trigger, test){
        try {
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
        
        } catch (err) { // these errors are in asynchronous event loop, so they can't be catch by the main loop
            return this.errorHandler(err)
        }
    }
    
    
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
    
    
    
    /**
     * @param {Error} error
     */
    errorHandler(error){
        console.error(prefix(this.operator) + error.toString())
        if(error.stack && (process.argv.findIndex(arg => arg === '-v' || arg === '--verbose') !== -1)) {
            console.error(error.stack)
        }
        process.exit(1)
    }
    
    
}

module.exports = SafeGuard