'use strict'

const Config = require('../config/Config')

class Utils {
    
    static now() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
    
    /**
     * @param {string} [group]
     * @return {string}
     */
    static prefix(group) {
        let timestamp = Config.logs.prefixTimestamp ? `${Utils.now()} | ` : ''
        
        if(group) {
            return timestamp + `${group.padEnd(15)} | `
        } else {
            return timestamp
        }
    }
    
    /**
     * @param {int} [sec]
     * @param {string} msg
     * @return {Promise}
     */
    static sleep (sec = 1, msg = ''){
        if (msg) console.info(msg, `(${sec}sec)`)
        return new Promise((resolve) => setTimeout(resolve, sec * 1000))
    }
    
}

module.exports = Utils