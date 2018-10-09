'use strict'

class KillSwitch {
    
    constructor() {
        
    }
    
    
    async blockUser(operator, userId) {
        console.log(`[BLOCK] Disable user #${userId}`)
        let SQL = `UPDATE users SET blocked = 1 WHERE id = :id`
        // console.log('   '+SQL.replace(':id', userId))
    }
    
    async blockGame(operator, gameId) {
        console.log(`[BLOCK] Disable game #${gameId}`)
        let SQL = `UPDATE games SET status = 0 WHERE id = :id`
        // console.log('   '+SQL.replace(':id', gameId))
    }
    
    async blockJackpots(operator, potId) {
        console.log(`[BLOCK] Disable jackpots`)
        let SQL = `UPDATE settings SET value = 'false' WHERE type = 'modules.jackpots'`
        // console.log('   '+SQL.replace(':id', user.userId))
    }
    
    async blockOperator(operator) {
        console.log(`[BLOCK] Disable opertaor #${operator}`)
        let SQL = `UPDATE settings SET value = 'true' WHERE type = 'maintenance'`
        // console.log('   '+SQL.replace(':id', user.userId))
    }
    
}

module.exports = KillSwitch