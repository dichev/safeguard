'use strict'

class Trigger {
    
    /**
     * @param {Trigger.actions} action
     * @param {number|null} userId
     * @param {number|null} gameId
     * @param {number} value
     * @param {number} threshold
     * @param {string} msg
     * @param {string} period
     * @param {string} name
     */
    constructor({action, userId = null, gameId = null, value, threshold, msg, period, name}) {
        this.action = action
        this.userId = userId
        this.gameId = gameId
        this.value = value
        this.threshold = threshold
        this.msg = msg
        this.period = period
        this.name = name
    }
    
}


Trigger.actions = {
    ALARM: 'ALARM',
    BLOCK_USER: 'BLOCK_USER',
    BLOCK_GAME: 'BLOCK_GAME',
    BLOCK_JACKPOT: 'BLOCK_JACKPOT',
    BLOCK_OPERATOR: 'BLOCK_OPERATOR',
}

module.exports = Trigger