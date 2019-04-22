'use strict'

const Database = require('../../lib/Database')
const Config = require('../../config/Config')
const prefix = require('../../lib/Utils').prefix

class KillSwitch {
    
    constructor(operator) {
        this.operator = operator
        this._blocked = []
    }
    
    /**
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async block(trigger) {
        if(Config.killSwitch.enabled) return false
        
        if (this._blocked.includes(trigger.uid)) return true // TODO: this should be combined with mysql checks
        
        console.log(prefix(this.operator) + `[BLOCK] Disable #${trigger.uid}`)
        await this.log(trigger)
    
        this._blocked.push(trigger.uid)
        
        
        // TODO: try catch + permissions checks
        // TODO: temporary using local instance during testing
        
        let db;
        if(Config.killSwitch.debug.storeBlockedInSafeguardDatabase) {
            db = await Database.getLocalInstance()
        } else {
            db = await Database.getPlatformInstance()
        }
        
        
        await db.query(`
            INSERT INTO _platform_blocked (message, blocked, type, userId, gameName, jackpotGroup)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [trigger.msg, 'YES', trigger.type, trigger.userId, trigger.gameName, trigger.jackpotGroup])
        
        
        return true
    }
    
    /**
     * @param {Trigger} trigger
     * @return {Promise}
     */
    async log(trigger) {
        let perc = Math.round(100 * trigger.value / trigger.threshold)
        
        let row = {
            name: trigger.name,
            blocked: 'YES',
            type: trigger.type,
            percent: perc / 100,
            value: trigger.value,
            threshold: trigger.threshold,
            operator: this.operator,
            userId: trigger.userId,
            gameName: trigger.gameName,
            jackpotGroup: trigger.jackpotGroup,
            message: trigger.msg,
            periodFrom: trigger.period.from,
            periodTo: trigger.period.to,
        }
        
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO blocked (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
    
    
}

module.exports = KillSwitch