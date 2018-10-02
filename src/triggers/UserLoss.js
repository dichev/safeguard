'use strict'

const Database = require('../lib/Database')
const EventEmitter = require('events').EventEmitter

// £500,000 total loss from user for last 24 hours
const THRESHOLD_USER_TOTAL_LOSS = 1000;

// £10,000 total loss from user for last 24 hours
const THRESHOLD_USER_TOTAL_LOSS_NORMALIZED = 2000;

// x100,000 total mplr loss from user for last 24 hours
const THRESHOLD_USER_TOTAL_MPLR_LOSS = 1000;

const WARNING_LIMIT = 0.60 // from the threshold

class UserLoss extends EventEmitter {
    
    constructor() {
        super()
        this.interval = 60 //sec
        this.description = 'Detect users with abnormal amount of profit in last 24 hours'
    }
    
    
    
    async exec(operator, from, to){
        console.log('---------------------------------------------------------------------------')
        console.log(this.description)
        console.log({operator, from, to})
        
        console.log('Executing testTotalLoss..')
        await this.testTotalLoss(operator, from, to)
    
        console.log('Executing testTotalLossNormalized..')
        await this.testTotalLossNormalized(operator, from, to)
    
        console.log('Executing testTotalMplrLoss..')
        await this.testTotalMplrLoss(operator, from, to)
    
    }

    async testTotalLoss(operator, from, to){
        let db = await Database.getPlatformInstance(operator)
    
        let SQL = `SELECT
                        userId,
                        SUM(payout-jackpot)-SUM(stake) AS profit
                   FROM transactions_real
                   WHERE (startTime BETWEEN ? AND ?) AND statusCode IN (100, 101, 102, 200)
                   GROUP BY userId
                   HAVING profit > ${THRESHOLD_USER_TOTAL_LOSS * WARNING_LIMIT}`
    
        let found = await db.query(SQL, [from, to])
        if (!found) return
        for (let user of found) {
            // console.warn(`[ALERT]`, user)
            this.emit('ALERT', {
                action: user.profit < THRESHOLD_USER_TOTAL_LOSS ? 'ALARM' : 'BLOCK_USER',
                userId: user.userId,
                value: user.profit,
                threshold: THRESHOLD_USER_TOTAL_LOSS,
                period: {from, to}
            })
        }
    }
    
    
    async testTotalLossNormalized(operator, from, to){
        let db = await Database.getPlatformInstance(operator)
    
        let SQL = `SELECT
                        userId,
                        SUM(IF(payout-jackpot<1000, payout-jackpot, 0))-SUM(stake) AS profitNormalized
                        #, SUM(IF(payout-jackpot<1000, 0, payout-jackpot)) AS profitExcluded
                   FROM transactions_real
                   WHERE (startTime BETWEEN ? AND ?) AND statusCode IN (100, 101, 102, 200)
                   GROUP BY userId
                   HAVING profitNormalized > ${THRESHOLD_USER_TOTAL_LOSS_NORMALIZED * WARNING_LIMIT}`
    
        
        let found = await db.query(SQL, [from, to])
        if (!found) return
        for (let user of found) {
            // console.warn(`[ALERT]`, user)
            this.emit('ALERT', {
                action: user.profitNormalized < THRESHOLD_USER_TOTAL_LOSS_NORMALIZED ? 'ALARM' : 'BLOCK_USER',
                userId: user.userId,
                value: user.profitNormalized,
                threshold: THRESHOLD_USER_TOTAL_LOSS_NORMALIZED,
                period: {from, to}
            })
        }
    }
    
    async testTotalMplrLoss(operator, from, to){
    
    }
    
    
}

module.exports = UserLoss