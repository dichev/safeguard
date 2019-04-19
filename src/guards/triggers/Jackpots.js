'use strict'

const Trigger = require('./types/Trigger')
const Database = require('../../lib/Database')
const Config = require('../../config/Config')
const prefix = require('../../lib/Utils').prefix

let historicWarnShown = false

class Jackpots {
    
    /**
     * @param {string} operator
     */
    constructor(operator) {
        this.operator = operator
    }
    
    /**
     * Checks in last 24 hours
     * @return {Promise<Array<Trigger>>}
     */
    async exec(){
        return await this.testTimedJackpotWonTwoTimeSameDay()
    }
    
    /**
     * Check by day
     * @param {string} date
     * @return {Promise<Array<Trigger>>}
     */
    async execHistoric(date) {
        if(!historicWarnShown) {
            historicWarnShown = true
            console.warn('WARNING! Jackpots anomaly tests are not supported historic mode and will be skipped..')
        }
        return []
    }

    
    async testTimedJackpotWonTwoTimeSameDay(){
        console.verbose(prefix(this.operator))
        
        const thresholds = Config.thresholds.jackpots
    
        let db = await Database.getJackpotInstance(this.operator)
    
        let SQL = `
            SELECT
                p.potId,
                c.name,
                timePeriods - interval c.repeatOffsetSeconds SECOND AS periodFrom,
                p.timePeriods AS periodEnd,
                (SELECT COUNT(*) FROM _jackpot_history h WHERE h.potId = p.potId AND h.timeWon > periodFrom) AS timedJackpotWonCount
            FROM _jackpot_pots p
            JOIN _jackpot_config c ON(c.id = p.potId and c.type = 'time' AND state != 'disabled')
            HAVING timedJackpotWonCount >= ${thresholds.timedJackpotWonCount.block}
        `
    
        let found = await db.query(SQL)
        if (!found) return []
    
        let triggers = []
        for (let pot of found) {
            triggers.push(new Trigger({
                action: Trigger.actions.BLOCK_JACKPOT,
                type: Trigger.types.JACKPOT,
                value: pot.timedJackpotWonCount,
                threshold: thresholds.timedJackpotWonCount.block,
                potId: pot.potId,
                msg: thresholds.timedJackpotWonCount.msg.replace('{{JACKPOT}}', pot.name).replace('{{VALUE}}', pot.timedJackpotWonCount) + ` ${pot.periodFrom}..${pot.periodEnd}`,
                period: now,
                name: 'jackpots_timedJackpotWonCount',
            }))
        }
    
        return triggers
    }
}

module.exports = Jackpots