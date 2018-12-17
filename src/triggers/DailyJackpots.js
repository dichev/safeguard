'use strict'

const Trigger = require('./events/Trigger')
const Database = require('../lib/Database')
const Config = require('../config/Config')
const EventEmitter = require('events').EventEmitter
const moment = require('moment')

class DailyJackpots extends EventEmitter {
    
    constructor() {
        super()
        this.description = 'Detect abnormal daily jackpot wins'
    }
    
    
    
    async exec(operator, now = null){
        now = now || moment().utc().format('YYYY-MM-DD HH:mm:ss')
        console.log('---------------------------------------------------------------------------')
        console.log(this.description)
        // console.log({operator, now})
    
        console.log(' - Executing testDailyJackpotWonTwoTimeSameDay..')
        await this.testDailyJackpotWonTwoTimeSameDay(operator, now)
    
    }
    
    async testDailyJackpotWonTwoTimeSameDay(operator, now){
        const limits = Config.limits.jackpots
        
        let db = await Database.getJackpotInstance(operator)
    
        let SQL = `SELECT DATE(timeWon), potId, COUNT(*) as cnt, SUM(pot)
                   FROM _jackpot_history h
                   JOIN _jackpot_config c ON(c.id = h.potId and c.type = 'time')
                   WHERE DATE(timeWon) = DATE(?)
                   GROUP BY potId, DATE(timeWon)
                   HAVING cnt >= ${limits.timedJackpotWonCount}`
        
    
        let found = await db.query(SQL, [now])
        if (!found) return false
    
        for (let pot of found) {
            this.emit('ALERT', new Trigger({
                action: Trigger.actions.BLOCK_JACKPOT,
                potId: pot.potId,
                value: pot.cnt,
                threshold: 1,
                msg: `Daily jackpot won ${pot.cnt} times same day`,
                period: now,
                name: 'testDailyJackpotWonTwoTimeSameDay',
            }))
        }
      
    }
}

module.exports = DailyJackpots