'use strict'

const Database = require('./lib/Database')
const prefix = require('./lib/Utils').prefix

class Log {
    
    constructor(operator) {
        this.operator = operator
    }
    
    async error(error, startedAt = null){
        try {
            let json = JSON.stringify({error: error.toString()})
            let db = await Database.getLocalInstance()
            await db.query(`INSERT INTO log (operator, status, result, timeStarted, timeEnded) VALUES (?, ?, ?, FROM_UNIXTIME(? / 1000), NOW(3))`, [this.operator, 'ERROR', json, startedAt || Date.now()])
        } catch (e) {
            console.error(e)
            // we shouldn't mask the original error by throwing new error here
        }
    }
    
    async warn(data, startedAt = null){
        let json = JSON.stringify(data)
        console.warn(prefix('log') + json)
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO log (operator, status, result, timeStarted, timeEnded) VALUES (?, ?, ?, FROM_UNIXTIME(? / 1000), NOW(3))`, [this.operator, 'WARN', json, startedAt || Date.now()])
    }

}

module.exports = Log