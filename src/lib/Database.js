'use strict'

const DatabasePool = require('./DatabasePool')
const Config = require('../config/Config')

class Database extends DatabasePool {
    
    /**
     * @return {Promise<MySQL>}
     */
    static async getLocalInstance(){
        return this.getInstance('local', Config.credentials.databases.safeguard)
    }
    
    /**
     * @return {Promise<MySQL>}
     */
    static async getJackpotInstance(operator){
        return this.getInstance(operator, Config.credentials.databases.operators[operator].jackpot)
    }
    
    /**
     * @return {Promise<MySQL>}
     */
    static async getSegmentsInstance(operator){
        return this.getInstance(operator, Config.credentials.databases.operators[operator].segments)
    }
    
    /**
     * @return {Promise<MySQL>}
     */
    static async getKillSwitchInstance(operator){
        return this.getInstance(operator, Config.credentials.databases.operators[operator].killSwitch)
    }
  
    
}


module.exports = Database