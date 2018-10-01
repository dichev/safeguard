'use strict'

const moment = require('moment')
require('moment-recur')
const Database = require('./lib/Database')
const DailyJackpots = require('./triggers/DailyJackpots')
const UserLoss = require('./triggers/UserLoss')
const Alarm = require('./actions/Alarm')
const KillSwitch = require('./actions/KillSwitch')

const operator = 'bede'

class SafeGuard {
    
    constructor() {
        
        this.operators = ['bede', 'rank']
        this.tests = [
            // new DailyJackpots(),
            new UserLoss(),
        ]
        
        this.alarm = new Alarm()
        this.killSwitch = new KillSwitch()
    }
    
    
    async activate(){
        
       
        for(let test of this.tests){
            test.on('ALERT', async (details) => this._handleAlert(details, test))
            
            let task = async () => {
                let from = moment().utc().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss')
                let to = moment().utc().format('YYYY-MM-DD HH:mm:ss')
                await test.exec(operator, from, to)
                console.log(`waiting ${test.interval}s`)
                
                setTimeout(task, test.interval * 1000) // minus elapsed time
            }
            // setInterval(task, test.interval * 1000)
            await task()
        }
        
    }
    
    async _handleAlert(details, test){
        
        await this.alarm.notify(details.value, details.threshold, details, test)
        
        switch (details.action) {
        
            case 'ALARM':
                // just alarming above
                break;
        
            case 'BLOCK_USER':
                await this.killSwitch.blockUser(operator, details.userId)
                break;
        
            case 'BLOCK_GAME':
                await this.killSwitch.blockGame(operator, details.gameId)
                break;
        
            case 'BLOCK_JACKPOTS':
                await this.killSwitch.blockJackpots(operator, details)
                break;
        
            case 'BLOCK_OPERATOR':
                await this.killSwitch.blockOperator(operator)
                break;
        
            default:
                throw Error('Unexpected action: ' + details.action)
        
        }
    }
    
    
    async history(from, to = null){
        to = to || moment().utc().format('YYYY-MM-DD')
        let interval = moment().recur(from, to).all('YYYY-MM-DD');
        
        for(let date of interval){
            let [from, to] =  [`${date} 00:00:00`, `${date} 23:59:59`]
            console.log(`Execution for ${from} - ${to}`)
            for (let test of this.tests) {
                await test.exec(operator, `${date} 00:00:00`, `${date} 23:59:59`)
            }
        }
        
        await Database.killAllConnections()
        
    
    }
    
    
}

module.exports = SafeGuard