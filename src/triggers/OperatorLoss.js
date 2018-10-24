'use strict'

const Trigger = require('../triggers/Trigger')
const Database = require('../lib/Database')
const EventEmitter = require('events').EventEmitter
const Config = require('../config/Config')
const moment = require('moment')

const WARNING_LIMIT = 0.60 // from the threshold

class OperatorLoss extends EventEmitter {
    
    constructor() {
        super()
        this.description = 'Detect operators with abnormal amount of profit in last 24 hours'
    }
    
    
    
    async exec(operator, now = null){
        let to = now || moment().utc().format('YYYY-MM-DD HH:mm:ss')
        let from = moment(to).subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss')
        
        console.log('---------------------------------------------------------------------------')
        console.log(this.description)
        // console.log({operator, from, to})
    
        console.log('Executing operator testLimits..')
        await this.testLimits(operator, from, to)
    
    }

    async testLimits(operator, from, to){
        const limits = Config.limits.operators
        
        // from platform
        let db = await Database.getSegmentsInstance(operator)
        let SQL = `SELECT
                        SUM(payout)-SUM(bets) AS profit,
                        SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS profitGames,
                        SUM(jackpotPayout - jackpotBets) AS profitJackpots,
                        SUM(bonusPayout-bonusBets) AS profitBonuses
                   FROM user_summary_hourly
                   WHERE (period BETWEEN ? AND ?)
                   HAVING profitGames >= ${limits.lossFromGames * WARNING_LIMIT}
                       OR profitJackpots >= ${limits.lossFromJackpots * WARNING_LIMIT}
                       OR profitBonuses >= ${limits.lossFromBonuses * WARNING_LIMIT}
                   `
    
    
        let found = await db.query(SQL, [from, to])
        if (!found.length) return
        console.log(`-> Found ${found.length} operator`)
        if(found.length > 1) console.warn('It is not expected to found more than 1 operator here, please investigate', found)
    
        for (let row of found) {
            if(row.profitGames > limits.lossFromGames * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: row.profitGames < limits.lossFromGames ? Trigger.actions.ALARM : Trigger.actions.BLOCK_OPERATOR,
                    value: row.profitGames,
                    threshold: limits.lossFromGames,
                    msg: `Detected operator #${operator} with net profit of ${row.profitGames} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            if(row.profitJackpots > limits.lossFromJackpots * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: row.profitJackpots < limits.lossFromJackpots ? Trigger.actions.ALARM : Trigger.actions.BLOCK_OPERATOR,
                    value: row.profitJackpots,
                    threshold: limits.lossFromJackpots,
                    msg: `Detected operator #${operator} with net profit of ${row.profitJackpots} GBP from jackpots in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            if(row.profitBonuses > limits.lossFromBonuses * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: row.profitBonuses < limits.lossFromBonuses ? Trigger.actions.ALARM : Trigger.actions.BLOCK_OPERATOR,
                    value: row.profitBonuses,
                    threshold: limits.lossFromBonuses,
                    msg: `Detected operator #${operator} with net profit of ${row.profitBonuses} GBP from bonuses in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            
        }
    
    }
    
}

module.exports = OperatorLoss