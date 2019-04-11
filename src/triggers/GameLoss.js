'use strict'

const Trigger = require('./types/Trigger')
const Database = require('../lib/Database')
const Config = require('../config/Config')
const moment = require('moment')
const prefix = require('../lib/Utils').prefix

const WARNING_LIMIT = Config.indicators.warningsRatio

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
                   HAVING lossFromGames_gbp       >= ${limits.lossFromGames_gbp * WARNING_LIMIT}
                       OR cappedLossFromGames_gbp >= ${limits.cappedLossFromGames_gbp * WARNING_LIMIT}
                       OR lossFromJackpots_gbp    >= ${limits.lossFromJackpots_gbp * WARNING_LIMIT}
                       OR lossFromBonuses_gbp     >= ${limits.lossFromBonuses_gbp * WARNING_LIMIT}
                       OR pureLossFromGames_x     >= ${limits.pureLossFromGames_x * WARNING_LIMIT}
                   `

        let found = await db.query(SQL, [from, to, from, to])
        if (!found.length) return []
        // console.log(`-> Found ${found.length} games`)
    
        let triggers = []
        for (let game of found) {
            if(game.lossFromGames_gbp >= limits.lossFromGames_gbp * WARNING_LIMIT){
                let action = game.lossFromGames_gbp >= limits.lossFromGames_gbp ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.lossFromGames_gbp,
                    threshold: limits.lossFromGames_gbp,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with net profit of ${game.lossFromGames_gbp} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'games_lossFromGames_gbp',
                }))
            }
            if(game.cappedLossFromGames_gbp >= limits.cappedLossFromGames_gbp * WARNING_LIMIT){
                let action = game.cappedLossFromGames_gbp >= limits.cappedLossFromGames_gbp ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.cappedLossFromGames_gbp,
                    threshold: limits.cappedLossFromGames_gbp,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with capped profit of ${game.cappedLossFromGames_gbp} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'games_cappedLossFromGames_gbp',
                }))
            }
            if(game.lossFromJackpots_gbp >= limits.lossFromJackpots_gbp * WARNING_LIMIT){
                let action = game.lossFromJackpots_gbp >= limits.lossFromJackpots_gbp ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.lossFromJackpots_gbp,
                    threshold: limits.lossFromJackpots_gbp,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with net profit of ${game.lossFromJackpots_gbp} GBP from jackpots in last 24 hours`,
                    period: {from, to},
                    name: 'games_lossFromJackpots_gbp',
                }))
            }
            if(game.lossFromBonuses_gbp >= limits.lossFromBonuses_gbp * WARNING_LIMIT){
                let action = game.lossFromBonuses_gbp >= limits.lossFromBonuses_gbp ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.lossFromBonuses_gbp,
                    threshold: limits.lossFromBonuses_gbp,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with net profit of ${game.lossFromBonuses_gbp} GBP from bonuses in last 24 hours`,
                    period: {from, to},
                    name: 'games_lossFromBonuses_gbp',
                }))
            }
            if(game.pureLossFromGames_x    >= limits.pureLossFromGames_x * WARNING_LIMIT) {
                let action = game.pureLossFromGames_x    >= limits.pureLossFromGames_x ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.pureLossFromGames_x   ,
                    threshold: limits.pureLossFromGames_x,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with pure mplr win of x${game.pureLossFromGames_x   } in last 24 hours`,
                    period: {from, to},
                    name: 'games_pureLossFromGames_x',
                }))
            }
        }
        
        return triggers
    }
    
    
}

module.exports = GameLoss