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
    
        //
        console.log('Executing testTotalLoss..')
        await this.testTotalLoss(operator, from, to)
        
        // console.log('Executing testHugeWins..')
        // await this.testHugeWins(operator, from, to)
    
        // console.log('Executing testTotalLossNormalized..')
        // await this.testTotalLossNormalized(operator, from, to)
        //
        // console.log('Executing testTotalMplrLoss..')
        // await this.testTotalMplrLoss(operator, from, to)
    
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
    
        let found = await db.query(SQL, [operator, from, to])
        if (!found) return
        
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
    
    
    async testTotalLossNormalized(operator, from, to){
        const {threshold, info} = Config.triggers.limits.userLossNormalized
        
        let db = await Database.getPlatformInstance(operator)
    
        let SQL = `SELECT
                        userId,
                        SUM(IF(payout-jackpot<1000, payout-jackpot, 0))-SUM(stake) AS profitNormalized
                        #, SUM(IF(payout-jackpot<1000, 0, payout-jackpot)) AS profitExcluded
                   FROM transactions_real
                   WHERE (startTime BETWEEN ? AND ?) AND statusCode IN (100, 101, 102, 200)
                   GROUP BY userId
                   HAVING profitNormalized > ${threshold * WARNING_LIMIT}`
    
        
        let found = await db.query(SQL, [from, to])
        if (!found) return
        for (let user of found) {
            // console.warn(`[ALERT]`, user)
            this.emit('ALERT', new Trigger({
                action: user.profitNormalized < threshold ? Trigger.actions.ALARM : Trigger.actions.BLOCK_USER,
                userId: user.userId,
                value: user.profitNormalized,
                threshold: threshold,
                period: {from, to}
            }))
        }
    }
    
    async testTotalMplrLoss(operator, from, to){
        console.warn('not implemented')
    }
    
    
    async testHugeWins(operator, from, to){
        const {threshold, info} = Config.triggers.users.hugeWins
        
        let db = await Database.getPlatformInstance(operator)
    
        let SQL = `SELECT
                        id,
                        roundInstanceId,
                        userId,
                        payout-jackpot as value
                   FROM transactions_real
                   WHERE (startTime BETWEEN ? AND ?) # AND statusCode IN (100, 101, 102, 200)
                   AND payout-jackpot > ${threshold * WARNING_LIMIT}`
    
    
        let found = await db.query(SQL, [from, to])
        if (!found) return
        
        
        console.log(`-> Found ${found.length} users`)
        for (let user of found) {
            this.emit('ALERT', new Trigger({
                action: Trigger.actions.ALARM,
                userId: user.userId,
                value: user.value,
                threshold: threshold,
                msg: `Detected user #${user.userId} with single win of ${user.value} GBP for last 2 days`,
                period: {from, to},
                trigger: 'testHugeWins',
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
            REPLACE INTO transactions_real VALUES ?
        `, [values])
    }
    
    
}

module.exports = UserLoss