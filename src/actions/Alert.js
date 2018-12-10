'use strict'

const Database = require('../lib/Database')
const Trigger = require('../triggers/Trigger')

const ALERT_GAP = 1 // percent

class Alert {
    
    constructor(operator) {
        this.operator = operator
        this.alerts = {}
    }
    
    
    /**
     *
     * @param {Trigger} trigger
     * @param {boolean} blocked
     * @return {Promise}
     */
    async notify(trigger, blocked = false){
        let perc = Math.round(100 * trigger.value / trigger.threshold)
        
        let type = trigger.userId || trigger.potId || trigger.gameName || this.operator
        let key = trigger.name + '_' + type
        if(!trigger.name || !type) console.warn('Invalid data:', {trigger})
        if(this.alerts[key]){
            let diff = Math.abs(perc - this.alerts[key])
            if(diff < ALERT_GAP) {
                return console.verbose(`skipping alerts for ${key} with diff:`, diff)
            }
        }
        this.alerts[key] = perc
        
        
        console.log(`[ALERT ${perc}%]`, trigger.msg)
    
        let row = {
            name: trigger.name,
            blocked: blocked ? 'YES' : 'NO',
            percent: perc / 100,
            value: trigger.value,
            threshold: trigger.threshold,
            operator: this.operator,
            userId: trigger.userId,
            gameName: trigger.gameName,
            message: trigger.msg || 'above warning limit',
            details: null,
        }
    
    
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO alerts (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
}

module.exports = Alert