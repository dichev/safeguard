'use strict'

const Config = {
    
    schedule: {
        intervalBetweenIterations: 60, // sec
        initialThrottleBetweenOperators: 0.5, // sec
    },
    
    
    indicators: {
        hugeWinIsAbove: 1000 //TODO: remove it
    },
    
    thresholds: {
        
        jackpots: {
            timedJackpotWonCount:     { block: 2, warn: 2 }
        },
        
        users: {
            lossFromGames_gbp:        { block:  500000, warn:  50000 },
            cappedLossFromGames_gbp:  { block:  100000, warn:  20000, capWinsAbove: 1000 },
            lossFromJackpots_gbp:     { block: 2000000, warn: 100000 },
            lossFromBonuses_bets_gbp: { block:   10000, warn:   1000 },
            lossFromBonuses_pays_gbp: { block:   10000, warn:   1000 },
            pureLossFromGames_x:      { block:   30000, warn:   8000 },
        },
        
        games: {
            lossFromGames_gbp:        { block:  500000, warn:  50000 },
            cappedLossFromGames_gbp:  { block:  100000, warn:  20000, capWinsAbove: 1000 },
            lossFromJackpots_gbp:     { block: 2000000, warn: 100000 },
            lossFromBonuses_bets_gbp: { block:  100000, warn:  20000 },
            lossFromBonuses_pays_gbp: { block:  100000, warn:  20000 },
            pureLossFromGames_x:      { block:   50000, warn:   8000 },
        },
        
        operators: {
            lossFromGames_gbp:        { block:  500000, warn:  50000 },
            cappedLossFromGames_gbp:  { block:  100000, warn:  20000, capWinsAbove: 1000 },
            lossFromJackpots_gbp:     { block: 2000000, warn: 100000 },
            lossFromBonuses_bets_gbp: { block:  150000, warn:  30000 },
            lossFromBonuses_pays_gbp: { block:  150000, warn:  30000 },
            pureLossFromGames_x:      { block:   30000, warn:   5000 },
        },
    
    
        //TODO: alert when jackpot seed is above 900k
        //TODO: limit bonus pays in platform?
        //TODO: there are 2 cayetano games with maxMplr = 50000
        //TODO: rename pureLoss to mplr
        //TODO: cappedPureLossFromGames
        //TODO: grrr bonus collect is tracked as payout
    },
    
    
    credentials: {
        databases: {
            safeguard: {
                database: 'safeguard',
                host: '127.0.0.1',
                user: 'root',
                password: ''
            },
            
            operators: { // dynamically configured
                OPERATOR: {
                    platform:    { database: '', host: '', user: '', password: '', ssh: {}  },
                    demo:        { database: '', host: '', user: '', password: '', ssh: {}  },
                    panel:       { database: '', host: '', user: '', password: '', ssh: {}  },
                    jackpot:     { database: '', host: '', user: '', password: '', ssh: {}  },
                    stats:       { database: '', host: '', user: '', password: '', ssh: {}  },
                    segments:    { database: '', host: '', user: '', password: '', ssh: {}  },
                    tournaments: { database: '', host: '', user: '', password: '', ssh: {}  },
                    rewards:     { database: '', host: '', user: '', password: '', ssh: {}  },
                    bonus:       { database: '', host: '', user: '', password: '', ssh: {}  },
                    // archive:     { database: '', host: '', user: '', password: '', ssh: {}  },
                }
            },
        }
    },

    server: { // used to expose prometheus metrics
        port: 4444
    },
    
    logs: {
        prefixTimestamp: true,
        warnIfDurationAbove: 1200 // ms
    }
}

module.exports = Config

// Override the Config when custom configuration is available
try {
    require('./custom.config.js')
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') return false;
    throw err
}

