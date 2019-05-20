'use strict'

const Trigger = require('./types/Trigger')
const Currencies = require('./helpers/Currencies')
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
        this.currencies = new Currencies(operator)
        this.jackpotGroups = []
    }
    
    /**
     * Checks in last 24 hours
     * @return {Promise<Array<Trigger>>}
     */
    async exec(){
        this.jackpotGroups = await this.getJackpotGroups()
        if(!this.jackpotGroups.length) return  []
        
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
    
    
    async getJackpotGroups() {
        let db = await Database.getPlatformInstance(this.operator)
        let rows = await db.query(`SELECT groupName FROM jackpot_groups WHERE playMode IS NULL OR playMode = 'real'`) // TODO: need enabled flag also
        await Database.killConnection(db)
        return rows.map(r => r.groupName)
    }
    
    async testTimedJackpotWonTwoTimeSameDay(){
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
            FROM _jackpot_group_pots g
            JOIN _jackpot_config c ON(c.id = g.potId and c.type = 'time')
            JOIN _jackpot_pots p ON (p.potId = g.potId and p.state != 'disabled')
            WHERE g.groupId IN (?)
            HAVING timedJackpotWonCount >= ${thresholds.timedJackpotWonCount.block}
        `
    
        let found = await db.query(SQL, [this.jackpotGroups])
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
        let db = await Database.getJackpotInstance(this.operator)
        
        let SQL = `
            SELECT
                NOW() as period,
                p.potId,
                g.groupId,
                g.name,
                gg.currency,
                p.pot
            FROM _jackpot_group_pots g
            JOIN _jackpot_groups gg ON (gg.id = g.groupId AND gg.id IN (?))
            JOIN _jackpot_pots p ON (p.potId = g.potId AND p.state = 'active')
        `
        let rows = await db.query(SQL, [this.jackpotGroups])
        if(!rows.length) return []
        
        let found = []
        for(let row of rows) {
            row.pot = parseFloat(row.pot)
            if(!row.currency) throw Error(`Found jackpot without currency: ` + JSON.stringify(row))
            if(row.currency === 'DEC') continue // exclude pokerstars custom currency: DEC
            let currencyRatio = await this.currencies.getRatio(row.currency, Config.defaultCurrency)
            row.pot *= currencyRatio
            
            if(row.pot >= thresholds.warn) {
                found.push(row)
            }
        }
        if (!found.length) return []
    
        let triggers = []
        for (let row of found) {
            let value = parseFloat(row.pot)
    
            if (value >= thresholds.warn) {
                triggers.push(new Trigger({
                    action: Trigger.actions.ALERT, // NEVER block here
                    type: Trigger.types.JACKPOT,
                    value: value,
                    threshold: thresholds.block,
                    operator: this.operator,
                    jackpotGroup: row.groupId,
                    jackpotPot: row.potId,
                    msg: thresholds.msg.replace('{{VALUE}}', row.pot).replace('{{OPERATOR}}', this.operator).replace('{{JACKPOT}}', `[${row.groupId}_${row.potId}] "${row.name}"`),
                    period: {from: row.period, to: row.period},
                    name: `jackpots_tooHighJackpotSize_gbp`,
                }))
            }
        }
    
        return triggers
    }
}

module.exports = Jackpots