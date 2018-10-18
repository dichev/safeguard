'use strict'

require('dopamine-toolbox').lib.console.upgrade()

const moment = require('moment')
require('moment-recur')
const Config = require('./config/Config')
const Database = require('./lib/Database')
const DailyJackpots = require('./triggers/DailyJackpots')
const UserLoss = require('./triggers/UserLoss')
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
    
    constructor() {
        
        this.tests = [
            new DailyJackpots(),
            new UserLoss(),
        ]
        
        this.alarm = new Alarm()
        this.killSwitch = new KillSwitch()
        this.monitor = new Monitor()
        this.log = new Log()
    }
    
    
    async activate(operator){
        for (let test of this.tests) {
            test.on('ALERT', async (details) => this._handleAlert(operator, details, test))
        }

        while (true) { // TODO: decide about the parallel execution
            await this.check(operator)
            await sleep(INTERVAL, 'Waiting between iterations')
        }
    }
    
    async check(operator){
        for (let test of this.tests) {
            let logId = await this.log.start(operator, test.constructor.name)
            let result = await test.exec(operator)
            await this.log.end(logId, test.constructor.name)
        }
    }
    
    /**
     * @param {string} operator
     * @param {Trigger} trigger
     * @param test
     * @return {Promise<void>}
     * @private
     */
    async _handleAlert(operator, trigger, test){
        try {
            let isBlocked = false
        
            switch (trigger.action) {
            
                case Trigger.actions.ALARM:
                    //
                    break;
            
                case Trigger.actions.BLOCK_USER:
                    isBlocked = await this.killSwitch.blockUser(operator, trigger)
                    break;
            
                case Trigger.actions.BLOCK_GAME:
                    isBlocked = await this.killSwitch.blockGame(operator, trigger)
                    break;
            
                case Trigger.actions.BLOCK_JACKPOT:
                    isBlocked = await this.killSwitch.blockJackpots(operator, trigger)
                    break;
            
                case Trigger.actions.BLOCK_OPERATOR:
                    isBlocked = await this.killSwitch.blockOperator(operator)
                    break;
            
                default:
                    throw Error('Unexpected action: ' + trigger.value)
            
            }
        
            await this.alarm.notify(operator, trigger, isBlocked)
        
        
            if (Config.monitoring.enabled && trigger.userId) {
                this.monitor.trackUser(operator, trigger.userId, trigger.period.from)
            }
        
        } catch (err) { // these errors are in asynchronous event loop, so they can't be catch by the main loop
            return this.errorHandler(err)
        }
    }
    
    
    async history(operator, from, to = null){
        to = to || moment().utc().format('YYYY-MM-DD')
        let interval = moment().recur(from, to).all('YYYY-MM-DD');
        
        for(let date of interval){
            // let [from, to] =  [`${date} 00:00:00`, `${date} 23:59:59`]
            console.log(`Execution for ${date}`)
            for (let test of this.tests) {
                let logId = await this.log.start(operator, test.constructor.name)
                let result = await test.exec(operator, `${date} 23:59:59`)
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