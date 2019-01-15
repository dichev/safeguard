'use strict'

const Database = require('../lib/Database')
const prefix = require('../lib/Utils').prefix

class KillSwitch {
    
    constructor(operator) {
        this.operator = operator
        this._blocked = {
            users: [],
            games: [],
            jackpots: [],
            operators: [],
        }
    }
    
    /**
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockUser(trigger) {
        if(this._blocked.users.includes(trigger.userId)) return true // TODO: this should be combined with mysql checks
        
        console.log(prefix(this.operator) + `[BLOCK] Disable user #${trigger.userId}`)
        let SQL = `UPDATE users SET blocked = 1 WHERE id = :id`
        this._blocked.users.push(trigger.userId)
    
        // console.log('   '+SQL.replace(':id', userId))
        
        await this.log(trigger)
        return true
    }
    
    /**
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockGame(trigger) {
        if(this._blocked.games.includes(trigger.gameName)) return true // TODO: this should be combined with mysql checks
    
        console.log(prefix(this.operator) + `[BLOCK] Disable game #${trigger.gameName}`)
        let SQL = `UPDATE games SET status = 0 WHERE id = :id`
        this._blocked.games.push(trigger.gameName)
    
        // console.log('   '+SQL.replace(':id', gameName))
        
        await this.log(trigger)
        return true
    }
    
    
    /**
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockJackpots(trigger) {
        if (this._blocked.jackpots.includes(trigger.potId)) return true
        
        console.log(prefix(this.operator) + `[BLOCK] Disable jackpots`)
        let SQL = `UPDATE settings SET value = 'false' WHERE type = 'modules.jackpots'`
        // console.log('   '+SQL.replace(':id', user.userId))
        this._blocked.jackpots.push(trigger.potId)
        return true
    }
    
    /**
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockOperator(trigger) {
        if (this._blocked.operators.includes(this.operator)) return true
        
        console.log(prefix(this.operator) + `[BLOCK] Disable operator #${this.operator}`)
        let SQL = `UPDATE settings SET value = 'true' WHERE type = 'maintenance'`
        // console.log('   '+SQL.replace(':id', user.userId))
        this._blocked.operators.push(this.operator)
        return true
    }
    
    /**
     * @param {Trigger} trigger
     * @return {Promise}
     */
    async log(trigger) {
        let perc = Math.round(100 * trigger.value / trigger.threshold)
        
        let row = {
            name: trigger.name,
            blocked: 'YES',
            percent: perc / 100,
            value: trigger.value,
            threshold: trigger.threshold,
            operator: this.operator,
            userId: trigger.userId,
            gameName: trigger.gameName,
            message: `Blocked #${trigger.userId}`,
            details: null,
        }
        
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO blocked (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
    
    
}

module.exports = KillSwitch