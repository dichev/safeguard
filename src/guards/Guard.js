'use strict'


const moment = require('moment')
const Config = require('../config/Config')
const Database = require('../lib/Database')
const Jackpots = require('./triggers/Jackpots')
const UserLoss = require('./triggers/UserLoss')
const GameLoss = require('./triggers/GameLoss')
const OperatorLoss = require('./triggers/OperatorLoss')
const Alert = require('./actions/Alert')
const KillSwitch = require('./actions/KillSwitch')
const Metrics = require('./actions/Metrics')
const Trigger = require('./triggers/types/Trigger')
const prefix = require('../lib/Utils').prefix

class Guard {
    
    
    constructor(operator) {
        if(!Config.credentials.databases.operators[operator]) throw Error('There is no such operator: ' + operator)
        
        this.operator = operator
        
        this.tests = [
            new Jackpots(this.operator),
            new UserLoss(this.operator),
            new GameLoss(this.operator),
            new OperatorLoss(this.operator),
        ]
        this.alerts = new Alert(operator)
        this.killSwitch = new KillSwitch(operator)
        
        this.metrics = new Metrics(operator)
        
        this._startDate = null
    }

    
    async history(date) {
        date = moment.utc(date, 'YYYY-MM-DD', true)
        
        if(!this._startDate) {
            let db = await Database.getSegmentsInstance(this.operator)
            let row = await db.query(`SELECT MIN(period) as startDate FROM user_games_summary_daily`)
            this._startDate = row[0] && row[0].startDate ? moment.utc(row[0].startDate) : moment.utc()
            if (date.isBefore(this._startDate)) {
                console.warn(prefix(this.operator) + `First transactions are recorded at ${this._startDate.format('YYYY-MM-DD')}, so skipping the periods until then..`)
            }
        }
        
        if(date.isSameOrAfter(this._startDate)) {
            await this.check(date.format('YYYY-MM-DD'))
        }
        
    }
    
    async check(date = false){
        console.log(prefix(this.operator) + (date ? `[${date}] ` : '') + `Checking for anomalies..`)
        let startAt = Date.now()
        
        for (let test of this.tests) {
            let triggers = date ? await test.execHistoric(date) : await test.exec()
            for(let trigger of triggers) {
                await this._handleTrigger(trigger)
            }
        }
        this.metrics.cleanup(startAt)
        this.alerts.cleanup(startAt)
}
    
    
    /**
     * @param {Trigger} trigger
     * @return {Promise<void>}
     * @private
     */
    async _handleTrigger(trigger){
        let isBlocked = false
    
        switch (trigger.action) {
        
            case Trigger.actions.ALERT:
                //
                break;
        
            case Trigger.actions.BLOCK_USER:
                isBlocked = await this.killSwitch.blockUser(trigger)
                break;
        
            case Trigger.actions.BLOCK_GAME:
                isBlocked = await this.killSwitch.blockGame(trigger)
                break;
        
            case Trigger.actions.BLOCK_JACKPOT:
                isBlocked = await this.killSwitch.blockJackpots(trigger)
                break;
        
            case Trigger.actions.BLOCK_OPERATOR:
                isBlocked = await this.killSwitch.blockOperator(trigger)
                break;
        
            default:
                throw Error('Unexpected action: ' + trigger.value)
        
        }
    
        await this.alerts.notify(trigger, isBlocked)
        this.metrics.collectTrigger(trigger)
    }
    
    
}

module.exports = Guard