'use strict'

const Trigger = require('./types/Trigger')
const Database = require('../lib/Database')
const Config = require('../config/Config')
const moment = require('moment')
const prefix = require('../lib/Utils').prefix

class DailyJackpots {
    
    /**
     * @param {string} operator
     */
    constructor(operator) {
        this.operator = operator
        this.description = 'Detect abnormal daily jackpot wins'
    }
    
    
    /**
     * @param {string} now
     * @return {Promise<Array<Trigger>>}
     */
    async exec(now = null){
        now = now || moment().utc().format('YYYY-MM-DD HH:mm:ss')
        console.verbose(prefix(this.operator) + this.description)
    
        return await this.testDailyJackpotWonTwoTimeSameDay(now)
    }
    
    async testDailyJackpotWonTwoTimeSameDay(now){
        const limits = Config.limits.jackpots
    
        let db = await Database.getJackpotInstance(this.operator)
    
        let SQL = `SELECT
                      DATE(timeWon),
                      potId, COUNT(*) as cnt, 
                      SUM(pot)
                   FROM _jackpot_history h
                   JOIN _jackpot_config c ON(c.id = h.potId and c.type = 'time')
                   WHERE DATE(timeWon) = DATE(?)
                   GROUP BY potId, DATE(timeWon)
                   HAVING cnt >= ${limits.timedJackpotWonCount}`
        
    
        let found = await db.query(SQL, [now])
        if (!found) return []
    
        let triggers = []
        for (let pot of found) {
            triggers.push(new Trigger({
                action: Trigger.actions.BLOCK_JACKPOT,
                value: pot.cnt,
                threshold: limits.timedJackpotWonCount,
                potId: pot.potId,
                msg: `Daily jackpot won ${pot.cnt} times same day`,
                period: now,
                name: 'jackpots_daily_won_same_day',
            }))
        }
    
        return triggers
    }
}

module.exports = DailyJackpots