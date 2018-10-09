'use strict'

const Database = require('../lib/Database')

class Alarm {
    
    constructor() {
        
    }
    
    
    async notify(value, threshold, details) {
        let perc = Math.round(100 * value / threshold)
        let msg = details.msg || 'above warning limit'
        
        // console.log('[ALARM]', msg, details)
        console.log(`[ALARM ${perc}%]`, msg)
        
        let db = await Database.getLocalInstance()
        let SQL = `INSERT INTO found (type, percent, value, threshold, message, details) VALUES (?, ?, ?, ?, ?, ?)`
        await db.query(SQL, ['ALERT', perc/100, value, threshold, msg, JSON.stringify(details)])
    }
}

module.exports = Alarm