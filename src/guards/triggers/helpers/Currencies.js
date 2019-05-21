'use strict'

const Database = require('../../../lib/Database')
const prefix = require('../../../lib/Utils').prefix
const CACHE_DURATION_SEC = require('../../../config/Config').schedule.currencyRatioInvalidateCache

class Currencies {
    
    constructor(operator) {
        this.operator = operator
        this._baseCurrency = null
        this._cache = {}
    }
    
    /**
     * @param {string} from
     * @param {string} to
     * @return {Promise<number>}
     */
    async getRatio(from, to){
        if(from === to) return 1.00
        
        let key = `${from}_${to}`
        
        if(!this.hasValidCache(key)) {
            let db = await Database.getPlatformInstance(this.operator)
            
            let baseCurrency = await this.getBaseCurrency()
            
            let rate
            if(baseCurrency === from) {
                let [row] = await db.query(`
                    SELECT rate FROM currencies_exchange_rates WHERE fromCurrency = ? AND toCurrency = ? ORDER BY id DESC LIMIT 1
                `, [baseCurrency, to])
                if(!row || !row.rate) throw Error(`Missing currency ratio from ${from} to ${to}`)
                rate = parseFloat(row.rate)
            }
            else if(baseCurrency === to) {
                let [row] = await db.query(`
                    SELECT rate FROM currencies_exchange_rates WHERE fromCurrency = ? AND toCurrency = ? ORDER BY id DESC LIMIT 1
                `, [baseCurrency, from])
                if(!row || !row.rate) throw Error(`Missing currency ratio from ${baseCurrency} to ${from}`)
                rate = 1 / parseFloat(row.rate)
            }
            else {
                rate = await this.getRatio(baseCurrency, to) / await this.getRatio(baseCurrency, from)
            }
        
            this._cache[key] = { rate, time: Date.now() }
            console.log(prefix(this.operator) + `currency ratio: ${from} to ${to} = ${rate}`)
        }
        
        return this._cache[key].rate
    }
    
    /**
     * @return {Promise<string>}
     */
    async getBaseCurrency(){
        if(!this._baseCurrency) {
            let db = await Database.getPlatformInstance(this.operator)
            let [row] = await db.query(`SELECT value FROM settings WHERE type = 'base.currency'`)
            if (!row.value) throw Error('Missing operator base currency')
            this._baseCurrency = row.value
    
        }
        return  this._baseCurrency
    }
    
    hasValidCache(key){
        if(!this._cache[key] || !this._cache[key].rate) {
            return false
        }
        if(this._cache[key].time < Date.now() - 1000 * CACHE_DURATION_SEC) {
            return false
        }
        return true
        
    }
}

module.exports = Currencies