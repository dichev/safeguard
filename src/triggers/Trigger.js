'use strict'

class Trigger {
    
    constructor({action, userId, gameId, value, threshold, msg, period, name}) {
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