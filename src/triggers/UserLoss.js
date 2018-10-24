'use strict'

const Trigger = require('../triggers/Trigger')
const Database = require('../lib/Database')
const EventEmitter = require('events').EventEmitter
const Config = require('../config/Config')
const moment = require('moment')

const WARNING_LIMIT = Config.indicators.warningsRatio

class UserLoss extends EventEmitter {
    
    constructor() {
        super()
        this.interval = 10 //sec
        this.description = 'Detect users with abnormal amount of profit in last 24 hours'
    }
    
    
    async exec(operator, now = null){
        let to = now || moment().utc().format('YYYY-MM-DD HH:mm:ss')
        let from = moment(to).subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss')
        
        console.log('---------------------------------------------------------------------------')
        console.log(this.description)
        // console.log({operator, from, to})
    
        console.log('Executing user testLimits..')
        await this.testLimits(operator, from, to)
        
        console.log('Executing testCappedTotalLossFromGames..')
        await this.testCappedTotalLossFromGames(operator, from, to)
    }

    async testLimits(operator, from, to){
        const limits = Config.limits.users
        
        let db = await Database.getSegmentsInstance(operator)
        let SQL = `SELECT
                       userId,
                       SUM(payout)-SUM(bets) AS profit,
                       SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS profitGames,
                       SUM(jackpotPayout - jackpotBets) AS profitJackpots,
                       SUM(bonusPayout-bonusBets) AS profitBonuses,
                       SUM(mplr) AS pureProfit
                   FROM user_summary_hourly
                   WHERE (period BETWEEN ? AND ?)
                   GROUP BY userId
                   HAVING profitGames >= ${limits.lossFromGames * WARNING_LIMIT}
                       OR profitJackpots >= ${limits.lossFromJackpots * WARNING_LIMIT}
                       OR profitBonuses >= ${limits.lossFromBonuses * WARNING_LIMIT}
                       OR pureProfit >= ${limits.pureLossFromGames * WARNING_LIMIT}
                   `
    
    
        let found = await db.query(SQL, [from, to])
        if (!found.length) return
        console.log(`-> Found ${found.length} users`)
    
        for (let user of found) {
            if(user.profitGames > limits.lossFromGames * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: user.profitGames < limits.lossFromGames ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                    value: user.profitGames,
                    threshold: limits.lossFromGames,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.profitGames} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            if(user.profitJackpots > limits.lossFromJackpots * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: user.profitJackpots < limits.lossFromJackpots ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                    value: user.profitJackpots,
                    threshold: limits.lossFromJackpots,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.profitJackpots} GBP from jackpots in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            if(user.profitBonuses > limits.lossFromBonuses * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: user.profitBonuses < limits.lossFromBonuses ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                    value: user.profitBonuses,
                    threshold: limits.lossFromBonuses,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.profitBonuses} GBP from bonuses in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            
            if(user.pureProfit > limits.pureLossFromGames * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: user.pureProfit < limits.pureLossFromGames ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                    value: user.pureProfit,
                    threshold: limits.pureLossFromGames,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with pure mplr win of x${user.pureProfit} in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            
        }
    
    }
    
    
    async testCappedTotalLossFromGames(operator, from, to){
        const limits = Config.limits.users
        const indicators = Config.indicators
    
        let db = await Database.getSegmentsInstance(operator)
        let SQL = `SELECT
                       userId,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) - IFNULL(h.hugeWins, 0) AS profitCapGames
                   FROM user_summary_hourly
                   LEFT JOIN (
                       SELECT userId, SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS hugeWins
                       FROM user_huge_wins
                       WHERE period BETWEEN ? and ? AND payout-jackpotPayout >= ${indicators.hugeWinIsAbove}
                       GROUP BY userId
                   ) h USING (userId)
                   WHERE (period BETWEEN ? AND ?)
                   GROUP BY userId
                   HAVING profitCapGames >= ${limits.cappedLossFromGames * WARNING_LIMIT}
                   `
    
        let found = await db.query(SQL, [from, to, from, to])
        if (!found.length) return
        
        for (let user of found) {
            // console.warn(`[ALERT]`, user)
            this.emit('ALERT', new Trigger({
                action: user.profitCapGames < limits.cappedLossFromGames ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                userId: user.userId,
                value: user.profitCapGames,
                threshold: limits.cappedLossFromGames,
                msg: `Detected user #${user.userId} with capped profit of ${user.profitCapGames} GBP for last 24 hours`,
                period: {from, to},
                name: 'testCappedTotalLossFromGames',
            }))
        }
    }
    
    
    
}

module.exports = UserLoss