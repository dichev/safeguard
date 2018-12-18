'use strict'

const Database = require('./lib/Database')

class Log {
    
    constructor(operator) {
        this.operator = operator
    }
    
    async start(name){
        // console.log('Log started', name)
        let db = await Database.getLocalInstance()
        let res = await db.query(`INSERT INTO log (operator, command, status, timeStarted) VALUES (?, ?, 'PROGRESS', NOW(3))`, [this.operator, name])
        return res.insertId
    }
    
    async end(logId, details = null){
        // console.log('Log end', name, details)
        let json = details ? JSON.stringify(details) : null
        let db = await Database.getLocalInstance()
        await db.query(`UPDATE log SET result = ?, status = 'DONE', timeEnded = NOW(3), duration = TIMEDIFF(timeEnded, timeStarted) WHERE id = ?`, [json, logId])
    }
    
    async error(logId, error){
        try {
            let json = JSON.stringify({error: error.toString()})
            let db = await Database.getLocalInstance()
            await db.query(`UPDATE log SET result = ?, status = 'ERROR', timeEnded = NOW(3), duration = TIMEDIFF(timeEnded, timeStarted) WHERE id = ?`, [json, logId])
        }catch (e) {
            console.error(e)
            // we shouldn't mask the original error by throwing new error here
        }
    }
}

module.exports = Log