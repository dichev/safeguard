'use strict'

require('dopamine-toolbox').lib.console.upgrade()

const moment = require('moment')
require('moment-recur')
const Config = require('./config/Config')
const Database = require('./lib/Database')
const DailyJackpots = require('./triggers/DailyJackpots')
const UserLoss = require('./triggers/UserLoss')
const GameLoss = require('./triggers/GameLoss')
const OperatorLoss = require('./triggers/OperatorLoss')
const Alert = require('./actions/Alert')
const KillSwitch = require('./actions/KillSwitch')
const Metrics = require('./actions/Metrics')
const Trigger = require('./triggers/types/Trigger')
const Log = require('./Log')
const prefix = require('./lib/Utils').prefix
const sleep = require('./lib/Utils').sleep

class SafeGuard {
    
    static async cleanDatabaseLogs(){
        let db = await Database.getLocalInstance()
        await db.query('TRUNCATE alerts; TRUNCATE blocked; TRUNCATE log;')
    }
    
    constructor(operator) {
        if(!Config.credentials.databases.operators[operator]) throw Error('There is no such operator: ' + operator)
        
        this.operator = operator
        
        this.tests = []
        this.alerts = new Alert(operator)
        this.killSwitch = new KillSwitch(operator)
        this.log = new Log(operator)
        
        this._metrics = new Metrics(operator)
    }
    
    /**
     * @return {string}
     */
    metrics() {
        try {
            return this._metrics.export()
        } catch (err) {
            this.errorHandler(err)
        }
    }
    
    
    async activate(){
        try {
            let rate = await this.getCurrencyRate()
    
            this.tests = [
                new DailyJackpots(this.operator, rate),
                new UserLoss(this.operator, rate),
                new GameLoss(this.operator, rate),
                new OperatorLoss(this.operator, rate),
            ]

            // noinspection InfiniteLoopJS
            while (true) {
                await this.check()
                console.verbose(prefix(this.operator) + `Next iteration will be after ${Config.schedule.intervalBetweenIterations} sec`)
                await sleep(Config.schedule.intervalBetweenIterations)
            }
        } catch (err) {
            return this.errorHandler(err)
        }
    }
    
    async check(){
        console.log(prefix(this.operator) + `Checking for anomalies..`)
        let logId = await this.log.start()
        let result = { alerts: 0, blocked: 0 }
        try {
            for (let test of this.tests) {
                let triggers = await test.exec()
                for(let trigger of triggers) {
                    trigger.action === Trigger.actions.ALERT ? result.alerts++ : result.blocked++
                    await this._handleTrigger(trigger)
                }
            }
        } catch (err) {
            await this.log.error(logId, err)
            throw err
        }
        await this.log.end(logId, result)

        await Database.killConnectionsByNamePrefix(this.operator)
    }
    
    /**
     * TODO: this will be used temporary until all segments switch to GBP aggregations
     *       the biggest issue of dynamic ratios is that it complicate the queries and could lead to errors
     *       because the current implementation is temporary it use FIXED rates (they don't change each day)
     *
     * @return {Promise<number>}
     */
    async getCurrencyRate(){
        let rate = 1
        
        let db = await Database.getPlatformInstance(this.operator)
        let baseCurrency = await db.query(`SELECT value FROM settings WHERE type = 'base.currency'`)
        await Database.killConnection(db)
        baseCurrency = baseCurrency[0].value
        
        if(baseCurrency !== 'GBP') {
    
            const TO_GBP = { // 2018-01-28
                USD: '0.760248',
                EUR: '0.867009',
                GEL: '0.286349',
                CNY: '0.112830',
                RMB: '0.112830',
                HKD: '0.0968926',
            }
    
            // NOTE: So far not all operators contains currency ratio of their base currency to GBP
            // let row = await db.query(`SELECT rate FROM currencies_exchange_rates WHERE fromCurrency = ? AND toCurrency = 'GBP' ORDER BY lastSyncTime DESC LIMIT 1`, [baseCurrency])
            // if (!rate[0] || !row[0].rate) throw Error(`Can't find rate for ${baseCurrency} to GBP`)
            // rate = row[0].rate
    
            rate = TO_GBP[baseCurrency]
            if(!rate) throw Error(`Can't find rate for ${baseCurrency} to GBP`)
            
            console.warn(prefix(this.operator) + `Base currency is ${baseCurrency} (conversion ratio will be ${baseCurrency} to GBP = ${rate})`)
        }
        
        return rate
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
        this._metrics.collect(trigger)
    }
    
    /*
    // TODO: will be supported later
    async history(from, to = null){
        to = to || moment().utc().format('YYYY-MM-DD')
        let interval = moment().recur(from, to).all('YYYY-MM-DD');
        
        for(let date of interval){
            // let [from, to] =  [`${date} 00:00:00`, `${date} 23:59:59`]
            console.log(prefix(this.operator) + `Execution for ${date}`)
            for (let test of this.tests) {
                let logId = await this.log.start(test.constructor.name)
                let result = await test.exec(`${date} 23:59:59`)
                await this.log.end(logId, test.constructor.name, {period: date})
            }
        }
        
        await Database.killAllConnections()
    }
    */
    
    
    /**
     * @param {Error} error
     */
    errorHandler(error){
        console.error(prefix(this.operator) + '[ERROR] ' + error.toString())
        console.verbose(error.stack)
        process.exit(1)
    }
    
    
}

module.exports = SafeGuard