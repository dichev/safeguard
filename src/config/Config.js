'use strict'

const Config = {
    
    schedule: {
        intervalBetweenIterations: 60, // sec
        initialThrottleBetweenOperators: 0.5, // sec
    },
    
    
    indicators: {
        warningsRatio: 0.60, // from the threshold
        hugeWinIsAbove: 1000 // GBP
    },
    
    
    limits: {
        
        jackpots: {
            // timed jackpot won 2 times in N minutes
            timedJackpotWonCount: 2
        },
        
        
        users: {
            //'£500,000 from games for last 24 hours'
            lossFromGames: 100000, // GBP
            
            // £10,000 from games for last 24 hours excluding wins above £10,000',
            cappedLossFromGames: 20000, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots: 100000, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses: 10000, // GBP
            
            pureLossFromGames: 10000 // as multiplier
        },
        
        
        
        games: {
            //'£500,000 from the game for last 24 hours'
            lossFromGames: 100000, // GBP
            
            // £10,000 from the game for last 24 hours excluding wins above £10,000',
            cappedLossFromGames: 10000, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots: 100000, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses: 10000, // GBP
    
            pureLossFromGames: 10000 // as multiplier
        },
        
        operators: {
            //'£500,000 from the game for last 24 hours'
            lossFromGames: 100000, // GBP
            
            // £10,000 from the game for last 24 hours excluding wins above £10,000',
            cappedLossFromGames: 10000, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots: 100000, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses: 10000, // GBP
    
            pureLossFromGames: 10000 // as multiplier
        },
        
        
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
        port: 4000
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

