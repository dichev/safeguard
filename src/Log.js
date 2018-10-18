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
    
    async end(logId, name, details = null){
        // console.log('Log end', name, details)
        let result = details ? JSON.stringify(details) : null
        let db = await Database.getLocalInstance()
        await db.query(`UPDATE log SET result = ?, status = 'DONE', timeEnded = NOW(3), duration = TIMEDIFF(timeEnded, timeStarted) WHERE id = ?`, [result, logId])
    }
}

module.exports = Log