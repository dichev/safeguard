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
    
    /**
     * @param {string} operator
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockUser(operator, trigger) {
        if(this._blocked.users.includes(trigger.userId)) return true // TODO: this should be combined with mysql checks
        
        console.log(`[BLOCK] Disable user #${trigger.userId}`)
        let SQL = `UPDATE users SET blocked = 1 WHERE id = :id`
        this._blocked.users.push(trigger.userId)
    
        // console.log('   '+SQL.replace(':id', userId))
        
        await this.log(operator, trigger)
        return true
    }
    
    /**
     * @param {string} operator
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockGame(operator, trigger) {
        if(this._blocked.users.includes(trigger.gameName)) return true // TODO: this should be combined with mysql checks
    
        console.log(`[BLOCK] Disable game #${trigger.gameName}`)
        let SQL = `UPDATE games SET status = 0 WHERE id = :id`
        this._blocked.users.push(trigger.gameName)
    
        // console.log('   '+SQL.replace(':id', gameName))
        
        await this.log(operator, trigger)
        return true
    }
    
    
    /**
     * @param {string} operator
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockJackpots(operator, trigger) {
        if (this._blocked.jackpots.includes(trigger.potId)) return true
        
        console.log(`[BLOCK] Disable jackpots`)
        let SQL = `UPDATE settings SET value = 'false' WHERE type = 'modules.jackpots'`
        // console.log('   '+SQL.replace(':id', user.userId))
        this._blocked.jackpots.push(trigger.potId)
        return true
    }
    
    /**
     * @param {string} operator
     * @param {Trigger} trigger
     * @return {Promise<boolean>}
     */
    async blockOperator(operator, trigger) {
        console.log(`[BLOCK] Disable opertaor #${operator}`)
        let SQL = `UPDATE settings SET value = 'true' WHERE type = 'maintenance'`
        // console.log('   '+SQL.replace(':id', user.userId))
        return true
    }
    
    /**
     * @param {string} operator
     * @param {Trigger} trigger
     * @return {Promise}
     */
    async log(operator, trigger) {
        let perc = Math.round(100 * trigger.value / trigger.threshold)
        
        let row = {
            type: 'BLOCK',
            blocked: 'YES',
            percent: perc / 100,
            value: trigger.value,
            threshold: trigger.threshold,
            operator: operator,
            userId: trigger.userId,
            gameName: trigger.gameName,
            message: `Blocked user #${trigger.userId}`,
            details: null,
        }
        
        let db = await Database.getLocalInstance()
        await db.query(`INSERT INTO found (${db.toKeys(row)}) VALUES ?`, db.toValues(row))
    }
    
    
}

module.exports = KillSwitch