'use strict'

const Trigger = require('./types/Trigger')
const Database = require('../lib/Database')
const Config = require('../config/Config')
const moment = require('moment')
const prefix = require('../lib/Utils').prefix
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

class UserLoss {
    
    /**
     * @param {string} operator
     */
    constructor(operator) {
        this.operator = operator
    }
    
    /**
     * Checks in last 24 hours
     * @return {Promise<Array<Trigger>>}
     */
    async exec(){
        let to = moment.utc().format(DATETIME_FORMAT)
        let from = moment.utc(to).subtract({hours: 23, minutes: 59, seconds: 59}).format(DATETIME_FORMAT)
        return await this.testLimits(from, to, false)
    }
    
    /**
     * Check by day
     * @param {string} date
     * @return {Promise<Array<Trigger>>}
     */
    async execHistoric(date) {
        let from = moment.utc(date, 'YYYY-MM-DD', true).format(DATETIME_FORMAT)
        let to = moment.utc(from).add({ hours: 23, minutes: 59, seconds: 59}).format(DATETIME_FORMAT)
        return await this.testLimits(from, to, true)
    }

    async testLimits(from, to, historic = false){
        if (!historic && moment.duration(moment.utc().diff(moment.utc(from))).asHours() > 24) throw Error(`There is no available hourly data for this period: ${from}..${to}`)
        console.verbose(prefix(this.operator), {historic, from, to})
        
        const table = historic ? `user_games_summary_daily` : `user_games_summary_hourly_live`
        const thresholds = Config.thresholds.users
        
        let db = await Database.getSegmentsInstance(this.operator)
        let SQL = `SELECT
                       userId,
                       SUM(payout)-SUM(bets) AS profit,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) AS lossFromGames_gbp,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) - IFNULL(h.hugeWins, 0) AS cappedLossFromGames_gbp,
                       SUM(jackpotPayout - jackpotBets) AS lossFromJackpots_gbp,
                       SUM(bonusBets) AS lossFromBonuses_bets_gbp,
                       SUM(bonusPayout) AS lossFromBonuses_pays_gbp,
                       SUM(mplr) AS pureLossFromGames_x
                   FROM ${table}
                   LEFT JOIN (
                       SELECT
                         userId,
                         SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS hugeWins
                       FROM user_huge_wins
                       WHERE (period BETWEEN ? and ?) AND payout-jackpotPayout >= ${thresholds.cappedLossFromGames_gbp.capWinsAbove}
                       GROUP BY userId
                   ) h USING (userId)
                   WHERE (period BETWEEN ? AND ?)
                   GROUP BY userId
                   HAVING lossFromGames_gbp        >= ${thresholds.lossFromGames_gbp.warn}
                       OR cappedLossFromGames_gbp  >= ${thresholds.cappedLossFromGames_gbp.warn}
                       OR lossFromJackpots_gbp     >= ${thresholds.lossFromJackpots_gbp.warn}
                       OR lossFromBonuses_bets_gbp >= ${thresholds.lossFromBonuses_bets_gbp.warn}
                       OR lossFromBonuses_pays_gbp >= ${thresholds.lossFromBonuses_pays_gbp.warn}
                       OR pureLossFromGames_x      >= ${thresholds.pureLossFromGames_x.warn}
                   `
        
    
        let found = await db.query(SQL, [from, to, from, to])
        if (!found.length) return []
        // console.log(`-> Found ${found.length} users`)
    
        let triggers = []
        for (let user of found) {
            for (let metric of Object.keys(thresholds)) {
                let value = user[metric]
                let threshold = thresholds[metric]
                
                if (value >= threshold.warn) {
                    triggers.push(new Trigger({
                        action: value < threshold.block ? Trigger.actions.ALERT : Trigger.actions.BLOCK_USER,
                        value: value,
                        threshold: threshold.block,
                        userId: user.userId,
                        msg: `Detected user #${user.userId} with ${metric} of ${value} in last 24 hours`,
                        period: {from, to},
                        name: `users_${metric}`
                    }))
                }
            }
        }
    
        return triggers
    }
    
    
}

module.exports = UserLoss