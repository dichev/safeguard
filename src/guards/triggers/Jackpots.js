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
        let triggers = [].concat(
            await this.testTimedJackpotWonTwoTimeSameDay(),
            await this.testJackpotSize(),
        )
        await Database.killConnection(await Database.getJackpotInstance(this.operator)) // optimization - only this trigger uses that connection so it's safe to be killed early
        return triggers
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
                g.groupId,
                g.name,
                timePeriods - interval c.repeatOffsetSeconds SECOND AS periodFrom,
                p.timePeriods AS periodEnd,
                (SELECT COUNT(*) FROM _jackpot_history h WHERE h.potId = p.potId AND h.timeWon > periodFrom) AS timedJackpotWonCount
            FROM _jackpot_pots p
            JOIN _jackpot_config c ON(c.id = p.potId and c.type = 'time' AND state != 'disabled')
            LEFT JOIN _jackpot_group_pots g ON(g.potId = p.potId)
            HAVING timedJackpotWonCount >= ${thresholds.timedJackpotWonCount.block}
        `
    
        let found = await db.query(SQL)
        if (!found) return []
    
        let triggers = []
        for (let pot of found) {
            triggers.push(new Trigger({
                action: Trigger.actions.BLOCK,
                type: Trigger.types.JACKPOT,
                value: pot.timedJackpotWonCount,
                threshold: thresholds.timedJackpotWonCount.block,
                operator: this.operator,
                jackpotGroup: pot.groupId,
                jackpotPot: pot.potId,
                msg: thresholds.timedJackpotWonCount.msg.replace('{{JACKPOT}}', `[${pot.groupId}_${pot.potId}] "${pot.name}"`).replace('{{VALUE}}', pot.timedJackpotWonCount) + ` ${pot.periodFrom}..${pot.periodEnd}`,
                period: {from: pot.periodFrom, to: pot.periodEnd},
                name: 'jackpots_timedJackpotWonCount',
            }))
        }
    
        return triggers
    }
    
    
    async testJackpotSize() {
        const thresholds = Config.thresholds.jackpots.tooHighJackpotSize_gbp
        let db = await Database.getJackpotInstance(this.operator) // TODO: control connections
        
        let SQL = `
            SELECT
                NOW() as period,
                p.potId,
                g.groupId,
                g.name,
                p.pot
            FROM _jackpot_pots p
            LEFT JOIN _jackpot_group_pots g USING(potId)
            WHERE state = 'active'
              AND pot > 100000
        `
        
        let found = await db.query(SQL, [])
        if (!found.length) return []
    
        let triggers = []
        for (let row of found) {
            let value = parseFloat(row.pot)
    
            if (value >= thresholds.warn) {
                triggers.push(new Trigger({
                    action: Trigger.actions.ALERT, // NEVER block here
                    type: Trigger.types.OPERATOR,
                    value: value,
                    threshold: thresholds.block,
                    operator: this.operator,
                    msg: `Detected operator ${this.operator} with too high jackpot pot size of ${value.toFixed(2)} - when it is won there is a risk the lucky user to be blocked`,
                    period: {from: row.period, to: row.period},
                    name: `jackpots_tooHighJackpotSize_gbp`,
                }))
            }
        }
    
        return triggers
    }
}

module.exports = Jackpots