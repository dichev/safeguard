'use strict'

const Database = require('./lib/Database')
const prefix = require('./lib/Utils').prefix

class Log {
    
    constructor() {}
    
    async error(operator, data){
        try {
            let json = JSON.stringify(data)
            console.error(prefix(operator) + json)
            let db = await Database.getLocalInstance()
            await db.query(`INSERT INTO log (operator, status, result) VALUES (?, ?, ?)`, [operator, 'ERROR', json])
        } catch (e) {
            console.error(e)
            // we shouldn't mask the original error by throwing new error here
        }
    }
    
    async warn(operator, data){
        let json = JSON.stringify(data)
        console.warn(prefix(operator) + json)
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO log (operator, status, result) VALUES (?, ?, ?)`, [operator, 'WARN', json])
    }
    
    async collectLogs(){
        let db = await Database.getLocalInstance()
        let rows = await db.query(`
            SELECT COUNT(*) AS count, status, operator, JSON_EXTRACT(result, '$.msg') AS msg FROM log
            WHERE time > NOW() - INTERVAL 5 MINUTE
            GROUP BY STATUS, operator, msg
        `)
    
        return rows || []
    }

}

module.exports = Log