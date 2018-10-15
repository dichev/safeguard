'use strict'

const Database = require('../lib/Database')

const ALARM_GAP = 1 // percent

class Alarm {
    
    constructor() {
        this.alarms = {}
    }
    

    
    async notify(operator, {value, threshold, trigger, msg, userId = null, gameId = null}, blocked = false){
        let perc = Math.round(100 * value / threshold)
        
        let key = trigger + '_' + userId
        if(!trigger || !key) console.warn('Invalid data:', {trigger, key})
        if(this.alarms[key]){
            let diff = Math.abs(perc - this.alarms[key])
            if(diff < ALARM_GAP) {
                return console.verbose(`skipping alarm for ${key} with diff:`, diff)
            }
        }
        this.alarms[key] = perc
        
        
        console.log(`[ALARM] ${perc}%]`, msg)
    
        let row = {
            type: 'ALERT',
            blocked: blocked ? 'YES' : 'NO',
            percent: perc / 100,
            value: value,
            threshold: threshold,
            operator: operator,
            userId: userId,
            gameId: gameId,
            message: msg || 'above warning limit',
            details: null,
        }
    
    
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO found (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
}

module.exports = Alarm