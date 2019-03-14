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
                       SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS profitGames,
                       SUM(payout-jackpotPayout) - SUM(bets-jackpotBets) - IFNULL(h.hugeWins, 0) AS profitCapGames,
                       SUM(jackpotPayout - jackpotBets) AS profitJackpots,
                       SUM(bonusPayout-bonusBets) AS profitBonuses,
                       SUM(mplr) AS pureProfit
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
                   HAVING profitGames >= ${limits.lossFromGames * WARNING_LIMIT}
                       OR profitCapGames >= ${limits.cappedLossFromGames * WARNING_LIMIT}
                       OR profitJackpots >= ${limits.lossFromJackpots * WARNING_LIMIT}
                       OR profitBonuses >= ${limits.lossFromBonuses * WARNING_LIMIT}
                       OR pureProfit >= ${limits.pureLossFromGames * WARNING_LIMIT}
                   `

        let found = await db.query(SQL, [from, to, from, to])
        if (!found.length) return []
        // console.log(`-> Found ${found.length} games`)
    
        let triggers = []
        for (let game of found) {
            if(game.profitGames >= limits.lossFromGames * WARNING_LIMIT){
                let action = game.profitGames >= limits.lossFromGames ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.profitGames,
                    threshold: limits.lossFromGames,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with net profit of ${game.profitGames} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'games_lossFromGames_gbp',
                }))
            }
            if(game.profitCapGames >= limits.cappedLossFromGames * WARNING_LIMIT){
                let action = game.profitCapGames >= limits.cappedLossFromGames ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.profitCapGames,
                    threshold: limits.cappedLossFromGames,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with capped profit of ${game.profitCapGames} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'games_cappedLossFromGames_gbp',
                }))
            }
            if(game.profitJackpots >= limits.lossFromJackpots * WARNING_LIMIT){
                let action = game.profitJackpots >= limits.lossFromJackpots ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.profitJackpots,
                    threshold: limits.lossFromJackpots,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with net profit of ${game.profitJackpots} GBP from jackpots in last 24 hours`,
                    period: {from, to},
                    name: 'games_lossFromJackpots_gbp',
                }))
            }
            if(game.profitBonuses >= limits.lossFromBonuses * WARNING_LIMIT){
                let action = game.profitBonuses >= limits.lossFromBonuses ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.profitBonuses,
                    threshold: limits.lossFromBonuses,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with net profit of ${game.profitBonuses} GBP from bonuses in last 24 hours`,
                    period: {from, to},
                    name: 'games_lossFromBonuses_gbp',
                }))
            }
            if(game.pureProfit >= limits.pureLossFromGames * WARNING_LIMIT) {
                let action = game.pureProfit >= limits.pureLossFromGames ? Trigger.actions.BLOCK_GAME : Trigger.actions.ALERT
                triggers.push(new Trigger({
                    action: action,
                    value: game.pureProfit,
                    threshold: limits.pureLossFromGames,
                    gameName: game.gameId,
                    msg: `Detected game #${game.gameId} with pure mplr win of x${game.pureProfit} in last 24 hours`,
                    period: {from, to},
                    name: 'games_pureLossFromGames_x',
                }))
            }
        }
        
        return triggers
    }
    
    
}

module.exports = GameLoss