'use strict'

const Config = {
    
    schedule: {
        intervalBetweenIterations: 60, // sec
        initialThrottleBetweenOperators: 0.5, // sec
    },
    
    
    indicators: {
        hugeWinIsAbove: 1000 // GBP //TODO: remove it
    },
    
    
    limits: {
        
        jackpots: {
            // timed jackpot won 2 times in N minutes
            timedJackpotWonCount: { block: 2, warn: 2 }
        },
        
        
        users: {
            //'£500,000 from games for last 24 hours'
            lossFromGames_gbp: { block: 500000, warn: 50000 }, // GBP
            
            // £10,000 from games for last 24 hours excluding wins above £10,000',
            cappedLossFromGames_gbp: { block: 100000, warn: 20000, capWinsAbove: 1000 }, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots_gbp: { block: 2000000, warn: 100000 }, // GBP //TODO: alert when jackpot seed is above 900k
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses_gbp: { block: 50000, warn: 500 }, // GBP //TODO: better check the total sum(bonusPayout) exceed 500k
            lossFromBonuses_bets_gbp: { block: 1000, warn: 100 }, // GBP
            lossFromBonuses_pays_gbp: { block: 10000, warn: 1000 }, // GBP
            
            // TODO: there are 2 cayetano games with maxMplr = 50000
            pureLossFromGames_x: { block: 30000, warn: 8000} // as multiplier //TODO: rename to mplr
            
            //TODO: cappedPureLossFromGames
        },
        
        
        
        games: {
            //'£500,000 from the game for last 24 hours'
            lossFromGames_gbp: { block: 500000, warn: 50000 }, // GBP
            
            // £10,000 from the game for last 24 hours excluding wins above £10,000',
            cappedLossFromGames_gbp: { block: 100000, warn: 20000, capWinsAbove: 1000 }, // GBP //TODO: grrr bonus collect is tracked as payout
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots_gbp: { block: 2000000, warn: 100000 }, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses_gbp: { block: 50000, warn: 500 }, // GBP
            lossFromBonuses_bets_gbp: { block: 100000, warn: 10000 }, // GBP
            lossFromBonuses_pays_gbp: { block: 100000, warn: 10000 }, // GBP
    
            pureLossFromGames_x: { block: 50000, warn: 8000}  // as multiplier
        },
        
        operators: {
            //'£500,000 from the game for last 24 hours'
            lossFromGames_gbp: { block: 500000, warn: 50000 }, // GBP
            
            // £10,000 from the game for last 24 hours excluding wins above £10,000',
            cappedLossFromGames_gbp: { block: 100000, warn: 20000, capWinsAbove: 1000 }, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots_gbp: { block: 2000000, warn: 100000 }, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses_gbp: { block: 50000, warn: 500 }, // GBP
            lossFromBonuses_bets_gbp: { block: 150000, warn: 20000 }, // GBP
            lossFromBonuses_pays_gbp: { block: 150000, warn: 20000 }, // GBP
    
            pureLossFromGames_x: { block: 30000, warn: 5000} // as multiplier
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

