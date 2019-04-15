'use strict'

const Trigger = require('./types/Trigger')
const Database = require('../lib/Database')
const Config = require('../config/Config')
const moment = require('moment')
const prefix = require('../lib/Utils').prefix

class GameLoss {
    
    /**
     * @param {string} operator
     */
    constructor(operator) {
        this.operator = operator
        this.description = 'Detect games with abnormal amount of profit in last 24 hours'
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
        const limits = Config.limits.games
        const indicators = Config.indicators
        
        // from platform
        let db = await Database.getSegmentsInstance(this.operator)
        let SQL = `SELECT
                       gameId,
                       SUM(payout)-SUM(bets) AS profit,
                       SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS lossFromGames_gbp,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) - IFNULL(h.hugeWins, 0) AS cappedLossFromGames_gbp,
                       SUM(jackpotPayout - jackpotBets) AS lossFromJackpots_gbp,
                       SUM(bonusPayout-bonusBets) AS lossFromBonuses_gbp,
                       SUM(bonusBets) AS lossFromBonuses_bets_gbp,
                       SUM(bonusPayout) AS lossFromBonuses_pays_gbp,
                       SUM(mplr) AS pureLossFromGames_x
                   FROM user_games_summary_hourly_live
                   LEFT JOIN (
                       SELECT
                         gameId,
                         SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS hugeWins
                       FROM user_huge_wins
                       WHERE (period BETWEEN ? and ?) AND payout-jackpotPayout >= ${indicators.hugeWinIsAbove}
                       GROUP BY gameId
                   ) h USING (gameId)
                   WHERE (period BETWEEN ? AND ?)
                   GROUP BY gameId
                   HAVING lossFromGames_gbp        >= ${limits.lossFromGames_gbp.warn}
                       OR cappedLossFromGames_gbp  >= ${limits.cappedLossFromGames_gbp.warn}
                       OR lossFromJackpots_gbp     >= ${limits.lossFromJackpots_gbp.warn}
                       OR lossFromBonuses_gbp      >= ${limits.lossFromBonuses_gbp.warn}
                       OR lossFromBonuses_bets_gbp >= ${limits.lossFromBonuses_bets_gbp.warn}
                       OR lossFromBonuses_pays_gbp >= ${limits.lossFromBonuses_pays_gbp.warn}
                       OR pureLossFromGames_x      >= ${limits.pureLossFromGames_x.warn}
                   `

        let found = await db.query(SQL, [from, to, from, to])
        if (!found.length) return []
        // console.log(`-> Found ${found.length} games`)
    
        let triggers = []
        for (let game of found) {
            for (let metric of Object.keys(limits)) {
                let value = game[metric]
                let threshold = limits[metric]
        
                if (value >= threshold.warn) {
                    triggers.push(new Trigger({
                        action: value < threshold.block ? Trigger.actions.ALERT : Trigger.actions.BLOCK_GAME,
                        value: value,
                        threshold: threshold.block,
                        gameName: game.gameId,
                        msg: `Detected game #${game.gameId} with ${metric} of ${value} in last 24 hours`,
                        period: {from, to},
                        name: `games_${metric}`
                    }))
                }
            }
        }
        
        return triggers
    }
    
    
}

module.exports = GameLoss