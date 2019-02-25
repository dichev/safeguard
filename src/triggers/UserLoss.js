'use strict'

const Trigger = require('./types/Trigger')
const Database = require('../lib/Database')
const Config = require('../config/Config')
const moment = require('moment')
const prefix = require('../lib/Utils').prefix

const WARNING_LIMIT = Config.indicators.warningsRatio

class UserLoss {
    
    /**
     * @param {string} operator
     */
    constructor(operator) {
        this.operator = operator
        this.description = 'Detect users with abnormal amount of profit in last 24 hours'
    }
    
    /**
     * @param {string} now
     * @return {Promise<Array<Trigger>>}
     */
    async exec(now = null){
        let to = now || moment().utc().format('YYYY-MM-DD HH:mm:ss')
        let from = moment(to).subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss')
        
        console.verbose(prefix(this.operator) + this.description)
    
        return await this.testLimits(from, to)
    }

    async testLimits(from, to){
        const limits = Config.limits.users
        const indicators = Config.indicators
        
        let db = await Database.getSegmentsInstance(this.operator)
        let SQL = `SELECT
                       userId,
                       SUM(payout)-SUM(bets) AS profit,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) AS profitGames,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) - IFNULL(h.hugeWins, 0) AS profitCapGames,
                       SUM(jackpotPayout - jackpotBets) AS profitJackpots,
                       SUM(bonusPayout-bonusBets) AS profitBonuses,
                       SUM(mplr) AS pureProfit
                   FROM user_summary_hourly_live
                   LEFT JOIN (
                       SELECT
                         userId,
                         SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS hugeWins
                       FROM user_huge_wins
                       WHERE (period BETWEEN ? and ?) AND payout-jackpotPayout >= ${indicators.hugeWinIsAbove}
                       GROUP BY userId
                   ) h USING (userId)
                   WHERE (period BETWEEN ? AND ?)
                   GROUP BY userId
                   HAVING profitGames >= ${limits.lossFromGames * WARNING_LIMIT}
                       OR profitCapGames >= ${limits.cappedLossFromGames * WARNING_LIMIT}
                       OR profitJackpots >= ${limits.lossFromJackpots * WARNING_LIMIT}
                       OR profitBonuses >= ${limits.lossFromBonuses * WARNING_LIMIT}
                       OR pureProfit >= ${limits.pureLossFromGames * WARNING_LIMIT}
                   `
        
    
        let found = await db.query(SQL, [from, to, from, to])
        if (!found.length) return []
        // console.log(`-> Found ${found.length} users`)
    
        let triggers = []
        for (let user of found) {
            if(user.profitGames >= limits.lossFromGames * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.profitGames < limits.lossFromGames ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.profitGames,
                    threshold: limits.lossFromGames,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.profitGames} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'users_lossFromGames_gbp',
                }))
            }
            
            if(user.profitCapGames >= limits.cappedLossFromGames * WARNING_LIMIT) {
                triggers.push(new Trigger({
                    action: user.profitCapGames < limits.cappedLossFromGames ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    userId: user.userId,
                    value: user.profitCapGames,
                    threshold: limits.cappedLossFromGames,
                    msg: `Detected user #${user.userId} with capped profit of ${user.profitCapGames} GBP for last 24 hours`,
                    period: {from, to},
                    name: 'users_cappedLossFromGames_gbp',
                }))
            }
            
            if(user.profitJackpots >= limits.lossFromJackpots * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.profitJackpots < limits.lossFromJackpots ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.profitJackpots,
                    threshold: limits.lossFromJackpots,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.profitJackpots} GBP from jackpots in last 24 hours`,
                    period: {from, to},
                    name: 'users_lossFromJackpots_gbp',
                }))
            }
            if(user.profitBonuses >= limits.lossFromBonuses * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.profitBonuses < limits.lossFromBonuses ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.profitBonuses,
                    threshold: limits.lossFromBonuses,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.profitBonuses} GBP from bonuses in last 24 hours`,
                    period: {from, to},
                    name: 'users_lossFromBonuses_gbp',
                }))
            }
            
            if(user.pureProfit >= limits.pureLossFromGames * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.pureProfit < limits.pureLossFromGames ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.pureProfit,
                    threshold: limits.pureLossFromGames,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with pure mplr win of x${user.pureProfit} in last 24 hours`,
                    period: {from, to},
                    name: 'users_pureLossFromGames_x',
                }))
            }
    
        }
    
        return triggers
    }
    
    
}

module.exports = UserLoss