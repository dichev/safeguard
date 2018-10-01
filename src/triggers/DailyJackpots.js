'use strict'

const Database = require('../lib/Database')

class DailyJackpots {
    
    constructor() {
        
        this.interval = 10 //sec
        
    }
    
    
    
    async exec(operator, date = null){
        
        let db = await Database.getJackpotInstance(operator)
        
        // Daily jackpot won two times in same day
        
        let SQL = `SELECT DATE(timeWon), potId, COUNT(*), SUM(pot)
                   FROM _jackpot_history h
                   WHERE DATE(timeWon) = :date
                   GROUP BY potId, DATE(timeWon)`
        
        let [found] = await db.query(SQL, [date || 'CURDATE()'])
        
        if(!found) return false
        
        
        await this.action()
        
        return {
            message: "Daily jackpot won two times in same day!!!",
            details: {
                potId: 2001,
                wins: [
                    { timeWon: '2018-09-28 21:10:10', amount: '100050.40' },
                    { timeWon: '2018-09-28 22:10:10', amount: '100050.40' },
                ]
            }
        }
        
        
    }
    
    async collect(){}
    
    
    async action(data){
    
        
        let SQL = `UPDATE settings SET value = 'false' WHERE type = 'module.jackpot.enabled'`
        
        
    
    }
    
}

module.exports = DailyJackpots