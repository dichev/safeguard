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
const Log = require('./Log')
const sleep = (sec = 1, msg = '') => {
    if (msg) console.info(msg, `(${sec}sec)`)
    return new Promise((resolve) => setTimeout(resolve, sec * 1000))
}

const INTERVAL = 10 //sec

class SafeGuard {
    
    constructor() {
        
        this.tests = [
            // new DailyJackpots(),
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
        let from = moment().utc().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss')
        let to = moment().utc().format('YYYY-MM-DD HH:mm:ss')
        
        for (let test of this.tests) {
            let logId = await this.log.start(operator, test.constructor.name)
            let result = await test.exec(operator, from, to)
            await this.log.end(logId, test.constructor.name)
        }
    }
    
    async _handleAlert(operator, details, test){
    
        let isBlocked = false
        
        switch (details.action) {
        
            case 'ALARM':
                //
                break;
        
            case 'BLOCK_USER':
                isBlocked = await this.killSwitch.blockUser(operator, details.userId, details)
                break;
        
            case 'BLOCK_GAME':
                isBlocked = await this.killSwitch.blockGame(operator, details.gameId, details)
                break;
        
            case 'BLOCK_JACKPOTS':
                isBlocked = await this.killSwitch.blockJackpots(operator, details, details)
                break;
        
            case 'BLOCK_OPERATOR':
                isBlocked = await this.killSwitch.blockOperator(operator)
                break;
        
            default:
                throw Error('Unexpected action: ' + details.action)

        }
    
        await this.alarm.notify(operator, details, isBlocked)
    
        
        
        if (Config.monitoring.enabled && details.userId) {
            this.monitor.trackUser(operator, details.userId, details.period.from)
        }
    }
    
    
    async history(operator, from, to = null){
        to = to || moment().utc().format('YYYY-MM-DD')
        let interval = moment().recur(from, to).all('YYYY-MM-DD');
        
        for(let date of interval){
            let [from, to] =  [`${date} 00:00:00`, `${date} 23:59:59`]
            console.log(`Execution for ${from} - ${to}`)
            for (let test of this.tests) {
                let logId = await this.log.start(operator, test.constructor.name)
                let result = await test.exec(operator, `${date} 00:00:00`, `${date} 23:59:59`)
                await this.log.end(logId, test.constructor.name, {period: date})
            }
        }
        
        await Database.killAllConnections()
        
    
    }
    
    
}

module.exports = SafeGuard