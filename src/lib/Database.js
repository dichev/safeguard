'use strict'

const DatabasePool = require('./DatabasePool')
const Config = require('../config/Config')

class Database extends DatabasePool {
    
    static async getLocalInstance(){
        return this.getInstance('local', Config.credentials.databases.safeguard)
    }
    
    static async getJackpotInstance(operator){
        return this.getInstance(operator, Config.credentials.databases.operators[operator].jackpot)
    }
    
    static async getPlatformInstance(operator){
        return this.getInstance(operator, Config.credentials.databases.operators[operator].platform)
    }
    
    static async getArchiveInstance(operator){
        return this.getInstance(operator, Config.credentials.databases.operators[operator].archive)
    }
    
}


module.exports = Database