'use strict'

const Database = require('../../lib/Database')
const Trigger = require('../triggers/types/Trigger')
const prefix = require('../../lib/Utils').prefix

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
        
        let before = this.alerts[trigger.uid]
        
        if(before){
            let diff = Math.abs(perc - before.perc)
            if(diff < ALERT_GAP) {
                before.time = Date.now()
                console.log(prefix(this.operator) + `[ALERT ${perc}%]`, trigger.msg, `(diff ${diff})`)
                return
            }
        }
    
        this.alerts[trigger.uid] = {perc: perc, time: trigger.period.to}
        
        console.log(prefix(this.operator) + `[ALERT ${perc}%]`, trigger.msg)
    
        let row = {
            name: trigger.name,
            blocked: blocked ? 'YES' : 'NO',
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
        await db.query(`INSERT INTO alerts (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
    
    /**
     * Clean up metrics which didn't triggered
     * @param {Number} timestamp - all metrics before this timestamp will be cleaned
     */
    cleanup(timestamp) {
        for (let alert in this.alerts) if (this.alerts.hasOwnProperty(alert)) {
            if (this.alerts[alert].time < timestamp) {
                // console.warn(`clean alert ${alert}`, this.alerts[alert])
                delete this.alerts[alert]
            }
        }
    }
}

module.exports = Alert