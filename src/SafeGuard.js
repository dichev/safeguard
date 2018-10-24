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
const Alarm = require('./actions/Alarm')
const KillSwitch = require('./actions/KillSwitch')
const Monitor = require('./actions/Monitor')
const Trigger = require('./triggers/Trigger')
const Log = require('./Log')
const sleep = (sec = 1, msg = '') => {
    if (msg) console.info(msg, `(${sec}sec)`)
    return new Promise((resolve) => setTimeout(resolve, sec * 1000))
}

const INTERVAL = 10 //sec

class SafeGuard {
    
    constructor(operator) {
        if(!Config.credentials.databases.operators[operator]) throw Error('There is no such operator: ' + operator)
        
        this.operator = operator
        
        this.tests = [
            new DailyJackpots(),
            new UserLoss(),
            new GameLoss(),
            new OperatorLoss(),
        ]
        
        this.alarm = new Alarm(operator)
        this.killSwitch = new KillSwitch(operator)
        this.monitor = new Monitor(operator)
        this.log = new Log(operator)
    }
    
    
    async activate(){
        for (let test of this.tests) {
            test.on('ALERT', async (details) => this._handleAlert(details, test))
        }

        // noinspection InfiniteLoopJS
        while (true) { // TODO: decide about the parallel execution
            await this.check()
            await sleep(INTERVAL, '\n\nWaiting between iterations')
        }
    }
    
    async check(){
        for (let test of this.tests) {
            let logId = await this.log.start(test.constructor.name)
            let result = await test.exec(this.operator)
            await this.log.end(logId, test.constructor.name)
        }
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
            
                case Trigger.actions.ALARM:
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
        
            await this.alarm.notify(trigger, isBlocked)
        
        
            if (Config.monitoring.enabled && trigger.userId) {
                this.monitor.trackUser(trigger.userId, trigger.period.from)
            }
        
        } catch (err) { // these errors are in asynchronous event loop, so they can't be catch by the main loop
            return this.errorHandler(err)
        }
    }
    
    
    async history(from, to = null){
        to = to || moment().utc().format('YYYY-MM-DD')
        let interval = moment().recur(from, to).all('YYYY-MM-DD');
        
        for(let date of interval){
            // let [from, to] =  [`${date} 00:00:00`, `${date} 23:59:59`]
            console.log(`Execution for ${date}`)
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
        console.error(error)
        process.exit(1)
    }
    
    
}

module.exports = SafeGuard