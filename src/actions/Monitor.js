'use strict'

const net = require('net')
const Config = require('../config/Config')
const Database = require('../lib/Database')

const UPDATE_INTERVAL = 60 // sec

class Monitor {
    
    constructor(operator) {
        if(!Config.monitoring.enabled) return {}

        this.operator = operator

        this._users = []
        
        this.graphite = net.createConnection(Config.monitoring.graphite, () => {
            console.log('connected to graphite!')
        })
        this.graphite.on('error', (data) => {
            console.error('ERROR', data.toString())
        })
        this.graphite.on('end', () => {
            console.log('disconnected from graphite server')
        })
    }
    
    trackUser(userId, from){
        if (this._users.includes(this.operator + '_' + userId)) return
        this._users.push(this.operator + '_' + userId)
        console.log(`Tracking ${userId} from ${from}`)
        
        const track = async () => {
            let db = await Database.getPlatformInstance(this.operator)
            let SQL = `SELECT
                        UNIX_TIMESTAMP(NOW()) as time,
                        userId,
                        SUM(IF(transactionTypeCode = 10, 1, 0))*2 as spins,
                        SUM(payout-jackpot)-SUM(stake) AS profit,
                        SUM(IF(payout-jackpot<1000, payout-jackpot, 0))-SUM(stake) AS profitNormalized,
                        SUM(IF(payout-jackpot<1000, 0, payout-jackpot)) AS profitExcluded,
                        SUM(jackpot) AS jackpot
                   FROM transactions_real
                   WHERE startTime >= ? AND statusCode IN (100, 101, 102, 200)
                   AND userId = ?`
    
            let rows = await db.query(SQL, [from, userId])
            // console.log('MONITOR:', JSON.stringify(rows))
            await this.toGraphite(`test.${this.operator}.users.${userId}`, rows[0]) // or to database
    
            setTimeout(() => track(), UPDATE_INTERVAL * 1000) // minus elapsed time
        }
        
        track()
        
       
    }
    
    toGraphite(category, metrics){
        
        for(let [key, value] of Object.entries(metrics)){
            if(key === 'userId' || key === 'time') continue
            let formatted = `${category}.${key} ${value} ${metrics.time}`
            console.log(`graphite | ${formatted}`)
            this.graphite.write(formatted + '\r\n')
        }
    
        
    }
    
}

module.exports = Monitor