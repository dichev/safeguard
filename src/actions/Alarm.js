'use strict'

const Database = require('../lib/Database')
const Trigger = require('../triggers/Trigger')

const ALARM_GAP = 1 // percent

class Alarm {
    
    constructor() {
        this.alarms = {}
    }
    
    
    /**
     *
     * @param {string} operator
     * @param {Trigger} trigger
     * @param {boolean} blocked
     * @return {Promise}
     */
    async notify(operator, trigger, blocked = false){
        let perc = Math.round(100 * trigger.value / trigger.threshold)
        
        let type = trigger.userId || trigger.potId || trigger.gameId
        let key = trigger.name + '_' + type
        if(!trigger.name || !type) console.warn('Invalid data:', {trigger})
        if(this.alarms[key]){
            let diff = Math.abs(perc - this.alarms[key])
            if(diff < ALARM_GAP) {
                return console.verbose(`skipping alarm for ${key} with diff:`, diff)
            }
        }
        this.alarms[key] = perc
        
        
        console.log(`[ALARM] ${perc}%]`, trigger.msg)
    
        let row = {
            type: 'ALERT',
            blocked: blocked ? 'YES' : 'NO',
            percent: perc / 100,
            value: trigger.value,
            threshold: trigger.threshold,
            operator: operator,
            userId: trigger.userId,
            gameId: trigger.gameId,
            message: trigger.msg || 'above warning limit',
            details: null,
        }
    
    
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO found (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
}

module.exports = Alarm