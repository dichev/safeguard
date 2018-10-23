'use strict'

const Trigger = require('../triggers/Trigger')
const Database = require('../lib/Database')
const EventEmitter = require('events').EventEmitter
const Config = require('../config/Config')
const moment = require('moment')

const WARNING_LIMIT = 0.60 // from the threshold

class GameLoss extends EventEmitter {
    
    constructor() {
        super()
        this.description = 'Detect games with abnormal amount of profit in last 24 hours'
    }
    
    
    
    async exec(operator, now = null){
        let to = now || moment().utc().format('YYYY-MM-DD HH:mm:ss')
        let from = moment(to).subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss')
        
        console.log('---------------------------------------------------------------------------')
        console.log(this.description)
        // console.log({operator, from, to})
    
        console.log('Executing game testLimits..')
        await this.testLimits(operator, from, to)
    
    }

    async testLimits(operator, from, to){
        const limits = Config.limits.games
        
        // from platform
        let db = await Database.getSegmentsInstance(operator)
        let SQL = `SELECT
                        gameId as gameName,
                        SUM(payout)-SUM(bets) AS profit,
                        SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS profitGames,
                        SUM(jackpotPayout - jackpotBets) AS profitJackpots,
                        SUM(bonusPayout-bonusBets) AS profitBonuses
                   FROM user_summary_hourly
                   WHERE (period BETWEEN ? AND ?)
                   GROUP BY gameId
                   HAVING profitGames > ${limits.lossFromGames * WARNING_LIMIT}
                       OR profitJackpots > ${limits.lossFromJackpots * WARNING_LIMIT}
                       OR profitBonuses > ${limits.lossFromBonuses * WARNING_LIMIT}
                   `
    
    
        let found = await db.query(SQL, [from, to])
        if (!found.length) return
        console.log(`-> Found ${found.length} games`)
    
        for (let game of found) {
            if(game.profitGames > limits.lossFromGames * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: game.profitGames < limits.lossFromGames ? Trigger.actions.ALARM : Trigger.actions.BLOCK_GAME,
                    value: game.profitGames,
                    threshold: limits.lossFromGames,
                    gameName: game.gameName,
                    msg: `Detected game #${game.gameName} with net profit of ${game.profitGames} GBP from games in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            if(game.profitJackpots > limits.lossFromJackpots * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: game.profitJackpots < limits.lossFromJackpots ? Trigger.actions.ALARM : Trigger.actions.BLOCK_GAME,
                    value: game.profitJackpots,
                    threshold: limits.lossFromJackpots,
                    gameName: game.gameName,
                    msg: `Detected game #${game.gameName} with net profit of ${game.profitJackpots} GBP from jackpots in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            if(game.profitBonuses > limits.lossFromBonuses * WARNING_LIMIT){
                this.emit('ALERT', new Trigger({
                    action: game.profitBonuses < limits.lossFromBonuses ? Trigger.actions.ALARM : Trigger.actions.BLOCK_GAME,
                    value: game.profitBonuses,
                    threshold: limits.lossFromBonuses,
                    gameName: game.gameName,
                    msg: `Detected game #${game.gameName} with net profit of ${game.profitBonuses} GBP from bonuses in last 24 hours`,
                    period: {from, to},
                    name: 'testLimits',
                }))
            }
            
        }
    
    }
    
}

module.exports = GameLoss