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
           date = date.format('YYYY-MM-DD')
    
            console.log(prefix(this.operator) +`[${date}] Checking for anomalies..`)
            let startAt = Date.now()
    
            for (let test of this.tests) {
                let triggers = await test.execHistoric(date)
                for (let trigger of triggers) {
                    await this.alerts.notify(trigger)
                }
            }
            this.alerts.cleanup(startAt)
        }
        
    }
    
    async check(){
        console.log(prefix(this.operator) + `Checking for anomalies..`)
        let startAt = Date.now()
        
        for (let test of this.tests) {
            let triggers = await test.exec()
            for(let trigger of triggers) {
                let isBlocked = false
                if(trigger.action === Trigger.actions.BLOCK) {
                    isBlocked = await this.killSwitch.block(trigger)
                }
                await this.alerts.notify(trigger, isBlocked)
                this.metrics.collectTrigger(trigger)
            }
        }
        this.metrics.cleanup(startAt)
        this.alerts.cleanup(startAt)
    }
    
    async validateDatabasePermissions(){
        let operator = this.operator
        
        let db = await Database.getKillSwitchInstance(operator)
        let grants = await db.query('SHOW GRANTS FOR CURRENT_USER()');
        let expected = "GRANT SELECT, INSERT ON `" + db.dbname + "`.`_blocked` TO 'safeguard'@'%'"
        let found = grants.map(row => Object.values(row)[0]).find(rule => rule === expected)
        if (!found) {
            console.verbose(grants.map(row => Object.values(row)[0]))
            throw Error(`Can't find expected database permissions for ${db.dbname}._blocked table:\n ${expected}\nTry running with disabled kill switch (Config.killSwitch.enabled = false) or fix the db permissions`)
        }
    }
    
}

module.exports = Guard