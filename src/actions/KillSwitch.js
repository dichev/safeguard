'use strict'

const Database = require('../lib/Database')

class KillSwitch {
    
    constructor() {
        this._blocked = {
            users: [],
            games: [],
            jackpots: [],
            operators: [],
        }
    }
    
    
    async blockUser(operator, userId, details) {
        if(this._blocked.users.includes(userId)) return true // TODO: this should be combined with mysql checks
        
        console.log(`[BLOCK] Disable user #${userId}`)
        let SQL = `UPDATE users SET blocked = 1 WHERE id = :id`
        this._blocked.users.push(userId)
    
        // console.log('   '+SQL.replace(':id', userId))
        
        await this.log(operator, details)
        return true
    }
    
    async blockGame(operator, gameId) {
        console.log(`[BLOCK] Disable game #${gameId}`)
        let SQL = `UPDATE games SET status = 0 WHERE id = :id`
        // console.log('   '+SQL.replace(':id', gameId))
        return true
    }
    
    async blockJackpots(operator, potId) {
        console.log(`[BLOCK] Disable jackpots`)
        let SQL = `UPDATE settings SET value = 'false' WHERE type = 'modules.jackpots'`
        // console.log('   '+SQL.replace(':id', user.userId))
        return true
    }
    
    async blockOperator(operator) {
        console.log(`[BLOCK] Disable opertaor #${operator}`)
        let SQL = `UPDATE settings SET value = 'true' WHERE type = 'maintenance'`
        // console.log('   '+SQL.replace(':id', user.userId))
        return true
    }
    
    
    async log(operator, {value, threshold, trigger, msg, userId = null, gameId = null}) {
        let perc = Math.round(100 * value / threshold)
        
        let row = {
            type: 'BLOCK',
            blocked: 'YES',
            percent: perc / 100,
            value: value,
            threshold: threshold,
            operator: operator,
            userId: userId,
            gameId: gameId,
            message: `Blocked user #${userId}`,
            details: null,
        }
        
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO found (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
    
    
}

module.exports = KillSwitch