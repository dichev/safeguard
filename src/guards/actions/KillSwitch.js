'use strict'

const Database = require('../../lib/Database')
const Config = require('../../config/Config')
const Trigger = require('../../guards/triggers/types/Trigger')
const prefix = require('../../lib/Utils').prefix

class KillSwitch {
    
    constructor(operator) {
        this.operator = operator
    }
    
    /**
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async block(trigger) {
        if(!Config.killSwitch.enabled) return false
        
        
        // first check is there already a blocking records for this trigger
        let db = await Database.getKillSwitchInstance(this.operator)
        let found = await db.query(`
            SELECT id, blocked, triggerKey, time
            FROM _blocked WHERE time > ? AND triggerKey = ?
        `, [trigger.period.from, trigger.uid])
        
        if(found.length) { // could be more than 1 record
            let isBlocked = !!found.find(row => row.blocked === 'YES') // when the admin set blocked = "NO", then we respect that and do not add new blocking rule even if the threshold is still firing
            console.log(prefix(this.operator) + `[${isBlocked?'BLOCKED':'UNBLOCKED'}] There are already ${found.length} blocking rules for #${trigger.uid}`)
            return isBlocked
        }
    
        
        // do the actual blocking by adding record in platform database:
        console.log(prefix(this.operator) + `[BLOCK] Disable #${trigger.uid}`)
        let row = {
            triggerKey: trigger.uid,
            blocked: 'YES',
            type: trigger.type,
            userId: trigger.userId || null,
            gameName: trigger.gameName || null,
            jackpotGroup: trigger.jackpotGroup || null,
            message: trigger.msg,
        }
        
        await db.query(`INSERT INTO _blocked (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
        
        return true
    }
    
}

module.exports = KillSwitch