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
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) AS lossFromGames_gbp,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) - IFNULL(h.hugeWins, 0) AS cappedLossFromGames_gbp,
                       SUM(jackpotPayout - jackpotBets) AS lossFromJackpots_gbp,
                       SUM(bonusPayout-bonusBets) AS lossFromBonuses_gbp,
                       SUM(mplr) AS pureLossFromGames_x
                   FROM user_games_summary_hourly_live
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
                   HAVING lossFromGames_gbp       >= ${limits.lossFromGames_gbp * WARNING_LIMIT}
                       OR cappedLossFromGames_gbp >= ${limits.cappedLossFromGames_gbp * WARNING_LIMIT}
                       OR lossFromJackpots_gbp    >= ${limits.lossFromJackpots_gbp * WARNING_LIMIT}
                       OR lossFromBonuses_gbp     >= ${limits.lossFromBonuses_gbp * WARNING_LIMIT}
                       OR pureLossFromGames_x     >= ${limits.pureLossFromGames_x * WARNING_LIMIT}
                   `
        
    
        let found = await db.query(SQL, [from, to, from, to])
        if (!found.length) return []
        // console.log(`-> Found ${found.length} users`)
    
        let triggers = []
        for (let user of found) {
            if(user.lossFromGames_gbp >= limits.lossFromGames_gbp * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.lossFromGames_gbp < limits.lossFromGames_gbp ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.lossFromGames_gbp,
                    threshold: limits.lossFromGames_gbp,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.lossFromGames_gbp} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'users_lossFromGames_gbp',
                }))
            }
            
            if(user.cappedLossFromGames_gbp >= limits.cappedLossFromGames_gbp * WARNING_LIMIT) {
                triggers.push(new Trigger({
                    action: user.cappedLossFromGames_gbp < limits.cappedLossFromGames_gbp ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    userId: user.userId,
                    value: user.cappedLossFromGames_gbp,
                    threshold: limits.cappedLossFromGames_gbp,
                    msg: `Detected user #${user.userId} with capped profit of ${user.cappedLossFromGames_gbp} GBP for last 24 hours`,
                    period: {from, to},
                    name: 'users_cappedLossFromGames_gbp',
                }))
            }
            
            if(user.lossFromJackpots_gbp >= limits.lossFromJackpots_gbp * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.lossFromJackpots_gbp < limits.lossFromJackpots_gbp ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.lossFromJackpots_gbp,
                    threshold: limits.lossFromJackpots_gbp,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.lossFromJackpots_gbp} GBP from jackpots in last 24 hours`,
                    period: {from, to},
                    name: 'users_lossFromJackpots_gbp',
                }))
            }
            if(user.lossFromBonuses_gbp >= limits.lossFromBonuses_gbp * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.lossFromBonuses_gbp < limits.lossFromBonuses_gbp ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.lossFromBonuses_gbp,
                    threshold: limits.lossFromBonuses_gbp,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with net profit of ${user.lossFromBonuses_gbp} GBP from bonuses in last 24 hours`,
                    period: {from, to},
                    name: 'users_lossFromBonuses_gbp',
                }))
            }
            
            if(user.pureLossFromGames_x >= limits.pureLossFromGames_x * WARNING_LIMIT){
                triggers.push(new Trigger({
                    action: user.pureLossFromGames_x < limits.pureLossFromGames_x ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                    value: user.pureLossFromGames_x,
                    threshold: limits.pureLossFromGames_x,
                    userId: user.userId,
                    msg: `Detected user #${user.userId} with pure mplr win of x${user.pureLossFromGames_x} in last 24 hours`,
                    period: {from, to},
                    name: 'users_pureLossFromGames_x',
                }))
            }
    
        }
    
        return triggers
    }
    
    
}

module.exports = UserLoss