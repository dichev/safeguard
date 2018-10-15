'use strict'

// TODO: temporary gathering data from transactions tables (slow) until the segments aggregations are ready (fast)

const Trigger = require('../triggers/Trigger')
const Database = require('../lib/Database')
const EventEmitter = require('events').EventEmitter
const Config = require('../config/Config')

const WARNING_LIMIT = 0.60 // from the threshold

class UserLoss extends EventEmitter {
    
    constructor() {
        super()
        this.interval = 10 //sec
        this.description = 'Detect users with abnormal amount of profit in last 24 hours'
    }
    
    
    
    async exec(operator, from, to){
        console.log('---------------------------------------------------------------------------')
        console.log(this.description)
        console.log({operator, from, to})
    
        console.log('Executing testTotalLoss..')
        await this.testTotalLoss(operator, from, to)
        
        console.log('Executing testHugeWins..')
        await this.testHugeWins(operator, from, to)
    
        console.log('Executing testTotalLossCapped..')
        await this.testTotalLossCapped(operator, from, to)
        
        console.log('Executing testTotalMplrLoss..')
        await this.testTotalMplrLoss(operator, from, to)
    
    }

    async testTotalLoss(operator, from, to){
        const {threshold, info} = Config.triggers.limits.userLoss
        
        
        // from platform
        let db = await Database.getPlatformInstance(operator)
        let SQL = `SELECT
                        userId,
                        SUM(payout-jackpot)-SUM(stake) AS profit
                   FROM transactions_real FORCE INDEX (startTime)
                   WHERE (startTime BETWEEN ? AND ?) AND statusCode IN (100, 101, 102, 200)
                   GROUP BY userId
                   HAVING profit > ${threshold * WARNING_LIMIT}`

        
        /*
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
        */
        
        /*
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
    
        let found = await db.query(SQL, [from, to])
        if (!found.length) return
        
        console.log(`-> Found ${found.length} users`)
        for (let user of found) {
            this.emit('ALERT', new Trigger({
                action: user.profit < threshold ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                userId: user.userId,
                value: user.profit,
                threshold: threshold,
                msg: `Detected user #${user.userId} with net profit of ${user.profit} GBP for last 24 hours`,
                period: {from, to},
                name: 'testTotalLoss',
            }))
        }
    }
    
    
    async testTotalLossCapped(operator, from, to){
        const {threshold, info} = Config.triggers.limits.userLossCapped
        
        let db = await Database.getPlatformInstance(operator)
    
        let SQL = `SELECT
                        userId,
                        SUM(payout-jackpot)-SUM(stake) AS profit
                        #, SUM(IF(payout-jackpot<1000, 0, payout-jackpot)) AS profitExcluded
                   FROM transactions_real FORCE INDEX (startTime)
                   WHERE (startTime BETWEEN ? AND ?) AND statusCode IN (100, 101, 102, 200)
                   GROUP BY userId
                   HAVING profit > ${threshold * WARNING_LIMIT}`
    
        let found = await db.query(SQL, [from, to])
        if (!found.length) return
        
        
        // Cap users huge wins
        let ids = found.map(u => u.userId)
        let local = await Database.getLocalInstance()
        let SQL2 = `SELECT userId, SUM(payout-jackpot) as payout FROM users_huge_wins
                    WHERE userId IN (?) AND (startTime BETWEEN ? AND ?)
                    GROUP BY userId`
        let rows = await local.query(SQL2, [ids, from, to])

        for(let row of rows) { // TODO: validations & tests
            found.find(u => u.userId === row.userId).profit -= row.payout
        }
        found = found.filter(u => u.profit > threshold * WARNING_LIMIT)
        
        if(!found.length) return
        
        
        for (let user of found) {
            // console.warn(`[ALERT]`, user)
            this.emit('ALERT', new Trigger({
                action: user.profit < threshold ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                userId: user.userId,
                value: user.profit,
                threshold: threshold,
                msg: `Detected user #${user.userId} with capped profit of ${user.profit} GBP for last 24 hours`,
                period: {from, to},
                name: 'testTotalLossCapped',
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
                       FROM transactions_real FORCE INDEX (startTime)
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
                name: 'testTotalLoss',
            }))
        }
    }
    
    
    async testHugeWins(operator, from, to){
        const {threshold, info} = Config.triggers.users.hugeWins
        
        let db = await Database.getPlatformInstance(operator)
    
        let SQL = `SELECT
                        id,
                        roundInstanceId,
                        userId,
                        payout-jackpot as value
                   FROM transactions_real FORCE INDEX (startTime)
                   WHERE (startTime BETWEEN ? AND ?) # AND statusCode IN (100, 101, 102, 200)
                   AND payout-jackpot > ${threshold * WARNING_LIMIT}`
    
    
        let found = await db.query(SQL, [from, to])
        if (!found.length) return
        
        
        console.log(`-> Found ${found.length} users`)
        for (let user of found) {
            this.emit('ALERT', new Trigger({
                action: Trigger.actions.ALARM,
                userId: user.userId,
                value: user.value,
                threshold: threshold,
                msg: `Detected user #${user.userId} with single win of ${user.value} GBP for last 2 days`,
                period: {from, to},
                name: 'testHugeWins',
            }))
        }
    
        await this.saveTransactions(operator, found.map(t => t.roundInstanceId))
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