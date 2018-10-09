'use strict'

const Database = require('../lib/Database')
const EventEmitter = require('events').EventEmitter

class DailyJackpots extends EventEmitter {
    
    constructor() {
        super()
        this.interval = 10 //sec
        this.description = 'Detect abnormal daily jackpot wins'
    }
    
    
    
    async exec(operator, from, to){
        console.log('---------------------------------------------------------------------------')
        console.log(this.description)
        console.log({operator, from, to})
    
        console.log('Executing testDailyJackpotWonTwoTimeSameDay..')
        await this.testDailyJackpotWonTwoTimeSameDay(operator, from, to)
    
    
    }
    
    async testDailyJackpotWonTwoTimeSameDay(operator, from, to){
        let db = await Database.getJackpotInstance(operator)
    
        let SQL = `SELECT DATE(timeWon), potId, COUNT(*) as cnt, SUM(pot)
                   FROM _jackpot_history h
                   LEFT JOIN _jackpot_config c ON(c.id = h.potId)
                   WHERE (timeWon BETWEEN ? AND ?) and type = 'time'
                   GROUP BY potId, DATE(timeWon)
                   HAVING cnt > 0`
    
        let found = await db.query(SQL, [from, to])
        if (!found) return false
    
        for (let pot of found) {
            this.emit('ALERT', { action: 'BLOCK_JACKPOTS',  potId: pot.potId,  value: pot.cnt,  threshold: 1 })
        }
      
    }
}

module.exports = DailyJackpots