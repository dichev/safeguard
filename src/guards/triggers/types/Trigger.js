'use strict'

class Trigger {
    
    /**
     * @param {Trigger.actions} action
     * @param {Trigger.types} type
     * @param {number|null} userId
     * @param {string|null} gameName
     * @param {string|null} jackpotGroup
     * @param {string|null} jackpotPot
     * @param {string} operator
     * @param {number} value
     * @param {number} threshold
     * @param {string} msg
     * @param {string} period
     * @param {string} name //TODO: rename to metric
     */
    constructor({action, type, userId = null, gameName = null, jackpotGroup = null, jackpotPot = null, operator, value, threshold, msg, period, name}) {
        if (!Trigger.actions[action]) throw Error('Invalid trigger action: ' + action)
        if (!Trigger.types[type]) throw Error('Invalid trigger type: ' + type)
        if ((jackpotGroup && !jackpotPot) || (jackpotPot && !jackpotGroup)) throw Error(`Invalid jackpots: jackpotGroup(${jackpotGroup}) jackpotPot(${jackpotPot})`)
        
        this.userId = userId || null
        this.gameName = gameName || null
        this.jackpotGroup = jackpotGroup || null
        this.jackpotPot = jackpotPot || null
        this.operator = operator
        
        this.type = type
        this.action = action
        this.value = value
        this.threshold = threshold
        this.msg = msg
        this.period = period
        this.name = name
        
        this.uid = null
        if     (this.type === Trigger.types.USER && this.userId)          this.uid = this.name + '_' + this.userId
        else if(this.type === Trigger.types.GAME && this.gameName)        this.uid = this.name + '_' + this.gameName
        else if(this.type === Trigger.types.JACKPOT && this.jackpotGroup) this.uid = this.name + '_' + this.jackpotGroup + '_' + this.jackpotPot
        else if(this.type === Trigger.types.OPERATOR && this.operator)    this.uid = this.name + '_' + this.operator
        
        if(!this.uid) throw Error('Invalid trigger data for defining of uid:' + JSON.stringify(this))
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
    BLOCK: 'BLOCK',
}

module.exports = Trigger