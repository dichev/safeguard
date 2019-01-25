'use strict'

class Utils {
    
    static now() {
        return new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
    
    /**
     * @param {string} [group]
     * @return {string}
     */
    static prefix(group) {
        if(group) {
            return `${Utils.now()} | ${group.padEnd(15)} | `
        } else {
            return `${Utils.now()} | `
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