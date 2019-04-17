'use strict'

const Trigger = require('./types/Trigger')
const Database = require('../lib/Database')
const Config = require('../config/Config')
const moment = require('moment')
const prefix = require('../lib/Utils').prefix

class OperatorLoss {
    
    /**
     * @param {string} operator
     */
    constructor(operator) {
        this.operator = operator
        this.description = 'Detect operators with abnormal amount of profit in last 24 hours'
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
        const limits = Config.limits.operators
        const indicators = Config.indicators
        
        // from platform
        let db = await Database.getSegmentsInstance(this.operator)
        
        let sqlHugeWins = `
            SELECT SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS hugeWins
            FROM user_huge_wins
            WHERE (period BETWEEN ? AND ?) AND payout-jackpotPayout >= ${indicators.hugeWinIsAbove}
        `
        let res = await db.query(sqlHugeWins, [from, to])
        let hugeWins = res.length ? res[0].hugeWins : 0
        
        let SQL = `SELECT
                       SUM(payout)-SUM(bets) AS profit,
                       SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS lossFromGames_gbp,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) - ? AS cappedLossFromGames_gbp,
                       SUM(jackpotPayout - jackpotBets) AS lossFromJackpots_gbp,
                       SUM(bonusBets) AS lossFromBonuses_bets_gbp,
                       SUM(bonusPayout) AS lossFromBonuses_pays_gbp,
                       SUM(mplr) AS pureLossFromGames_x
                   FROM user_games_summary_hourly_live
                   WHERE (period BETWEEN ? AND ?)
                   HAVING lossFromGames_gbp        >= ${limits.lossFromGames_gbp.warn}
                       OR cappedLossFromGames_gbp  >= ${limits.cappedLossFromGames_gbp.warn}
                       OR lossFromJackpots_gbp     >= ${limits.lossFromJackpots_gbp.warn}
                       OR lossFromBonuses_bets_gbp >= ${limits.lossFromBonuses_bets_gbp.warn}
                       OR lossFromBonuses_pays_gbp >= ${limits.lossFromBonuses_pays_gbp.warn}
                       OR pureLossFromGames_x      >= ${limits.pureLossFromGames_x.warn}
                   `
        let found = await db.query(SQL, [hugeWins, from, to])
        if (!found.length) return []
        // console.log(`-> Found ${found.length} operator`)
        if(found.length > 1) console.warn('It is not expected to found more than 1 operator here, please investigate', found)
    
        let triggers = []
        for (let row of found) {
            for (let metric of Object.keys(limits)) {
                let value = row[metric]
                let threshold = limits[metric]
        
                if (value >= threshold.warn) {
                    triggers.push(new Trigger({
                        action: value < threshold.block ? Trigger.actions.ALERT : Trigger.actions.BLOCK_OPERATOR,
                        value: value,
                        threshold: threshold.block,
                        msg: `Detected operator #${this.operator} with ${metric} of ${value} in last 24 hours`,
                        period: {from, to},
                        name: `operators_${metric}`
                    }))
                }
            }
        }
    
        return triggers
    }
    
}

module.exports = OperatorLoss