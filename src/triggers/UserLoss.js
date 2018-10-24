'use strict'

const Trigger = require('../triggers/Trigger')
const Database = require('../lib/Database')
const EventEmitter = require('events').EventEmitter
const Config = require('../config/Config')
const moment = require('moment')

const WARNING_LIMIT = 0.60 // from the threshold

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
        
        //
        console.log('Executing testCappedTotalLossFromGames..')
        await this.testCappedTotalLossFromGames(operator, from, to)
        //
        // console.log('Executing testTotalMplrLoss..')
        // await this.testTotalMplrLoss(operator, from, to)
    
    }

    async testLimits(operator, from, to){
        const limits = Config.limits.users
        
        let db = await Database.getSegmentsInstance(operator)
        let SQL = `SELECT
                        userId,
                        SUM(payout)-SUM(bets) AS profit,
                        SUM(payout-jackpotPayout)-SUM(bets-jackpotBets) AS profitGames,
                        SUM(jackpotPayout - jackpotBets) AS profitJackpots,
                        SUM(bonusPayout-bonusBets) AS profitBonuses
                   FROM user_summary_hourly
                   WHERE (period BETWEEN ? AND ?)
                   GROUP BY userId
                   HAVING profitGames >= ${limits.lossFromGames * WARNING_LIMIT}
                       OR profitJackpots >= ${limits.lossFromJackpots * WARNING_LIMIT}
                       OR profitBonuses >= ${limits.lossFromBonuses * WARNING_LIMIT}
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
            
        }
        
        
        /*
        // from platform
        let db = await Database.getPlatformInstance(operator)
        let SQL = `SELECT
                        userId,
                        SUM(payout)-SUM(stake) AS profit,
                        SUM(payout-jackpot)-SUM(stake) AS profitGames,
                        SUM(jackpot) AS profitJackpots,
                        SUM(bonusPayout-bonusStake) AS profitBonuses
                   FROM transactions_real
                   WHERE (startTime BETWEEN ? AND ?) AND statusCode IN (100, 101, 102, 200)
                   GROUP BY userId
                   HAVING profitGames > ${limits.lossFromGames * WARNING_LIMIT}
                       OR profitJackpots > ${limits.lossFromJackpots * WARNING_LIMIT}
                       OR profitBonuses > ${limits.lossFromBonuses * WARNING_LIMIT}
                   `
    
        
        // from aggregations
        let db = await Database.getAggregationsInstance(operator)
        let SQL = `
                SELECT
                    period,
                    s.operator,
                    s.userId,
                    ROUND(-SUM(s.hold), 2) AS profit
                FROM summary_gbp s
                WHERE s.operator = ? AND period BETWEEN DATE(?) AND DATE(?)
                GROUP BY s.period, s.operator, s.userId
                HAVING profit > ${threshold * WARNING_LIMIT}`
        
        // from segments
        let db = await Database.getSegmentsInstance(operator)
        let SQL = `
                SELECT
                     timeLastGameSession as period,
                     userId,
                     (totalWin - turnover - jackpotsWinnings) AS profit,
                     hold
                FROM users
                WHERE timeLastGameSession >= CURDATE() - INTERVAL 1 DAY
                  AND (totalWin - turnover - jackpotsWinnings) > ${threshold * WARNING_LIMIT}`
        */
    
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
    
    async testTotalMplrLoss(operator, from, to){
        const {threshold, info} = Config.triggers.limits.userMplr
    
        // from platform
        let db = await Database.getPlatformInstance(operator)
        let SQL = `SELECT
                        userId,
                        SUM(mplr) as mplr
                   FROM (
                       SELECT
                            userId,
                            ROUND(SUM(payout-jackpot-stake)/SUM(stake), 2) AS mplr
                       FROM transactions_real
                       WHERE (startTime BETWEEN ? AND ?) AND statusCode IN (100, 101, 102, 200)
                       GROUP BY roundInstanceId, userId
                   ) tmp
                   GROUP BY userId
                   HAVING mplr > ${threshold * WARNING_LIMIT}`
    
        let found = await db.query(SQL, [from, to])
        if (!found.length) return
    
        console.log(`-> Found ${found.length} users`)
        for (let user of found) {
            this.emit('ALERT', new Trigger({
                action: user.mplr < threshold ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                userId: user.userId,
                value: user.mplr,
                threshold: threshold,
                msg: `Detected user #${user.userId} with mplr of x${user.mplr} for last 24 hours`,
                period: {from, to},
                name: 'testTotalLossFromGames',
            }))
        }
    }
    
    
    
    async saveTransactions(operator, roundIds){
        console.log('Saving rounds:', roundIds.length)
        let db = await Database.getPlatformInstance(operator)
        let rows = await db.query(`SELECT * from transactions_real WHERE roundInstanceId IN (?)`, [roundIds])
        let values = rows.map(row => Object.keys(row).map(key => row[key]))
    
        let local = await Database.getLocalInstance()
        await local.query(`
            REPLACE INTO users_huge_wins VALUES ?
        `, [values])
    }
    
    
}

module.exports = UserLoss