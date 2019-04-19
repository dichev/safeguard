'use strict'

class Trigger {
    
    /**
     * @param {Trigger.actions} action
     * @param {Trigger.types} type
     * @param {number|null} userId
     * @param {string|null} gameName
     * @param {string|null} jackpotGroup
     * @param {string|null} jackpotPot
     * @param {number} value
     * @param {number} threshold
     * @param {string} msg
     * @param {string} period
     * @param {string} name
     */
    constructor({action, type, userId = null, gameName = null, jackpotGroup = null, jackpotPot = null, value, threshold, msg, period, name}) {
        if (!Trigger.actions[action]) throw Error('Invalid trigger action: ' + action)
        if (!Trigger.types[type]) throw Error('Invalid trigger type: ' + type)
        if ((jackpotGroup && !jackpotPot) || (jackpotPot && !jackpotGroup)) throw Error(`Invalid jackpots: jackpotGroup(${jackpotGroup}) jackpotPot(${jackpotPot})`)
        
        this.userId = userId || null
        this.gameName = gameName || null
        this.jackpotGroup = jackpotGroup || null
        this.jackpotPot = jackpotPot || null
        
        this.type = type
        this.action = action
        this.value = value
        this.threshold = threshold
        this.msg = msg
        this.period = period
        this.name = name
    }
    
}

Trigger.types = {
    USER: 'USER',
    GAME: 'GAME',
    JACKPOT: 'JACKPOT',
    OPERATOR: 'OPERATOR',
}

Trigger.actions = {
    ALERT: 'ALERT',
    BLOCK_USER: 'BLOCK_USER',
    BLOCK_GAME: 'BLOCK_GAME',
    BLOCK_JACKPOT: 'BLOCK_JACKPOT',
    BLOCK_OPERATOR: 'BLOCK_OPERATOR',
}

module.exports = Trigger