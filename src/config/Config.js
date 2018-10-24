'use strict'

const Config = {
    
    
    indicators: {
        hugeWinIsAbove: 1000 // GBP
    },
    
    
    limits: {
        
        users: {
            //'£500,000 from games for last 24 hours'
            lossFromGames: 2000, // GBP
            
            // £10,000 from games for last 24 hours excluding wins above £10,000',
            cappedLossFromGames: 1000, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots: 1000, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses: 1000, // GBP
        },
        
        
        
        games: {
            //'£500,000 from the game for last 24 hours'
            lossFromGames: 1000, // GBP
            
            // £10,000 from the game for last 24 hours excluding wins above £10,000',
            cappedLossFromGames: 1000, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots: 1000, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses: 1000, // GBP
        },
        
        operators: {
            //'£500,000 from the game for last 24 hours'
            lossFromGames: -10000, // GBP
            
            // £10,000 from the game for last 24 hours excluding wins above £10,000',
            cappedLossFromGames: 1000, // GBP
            
            // £2,000,000 from jackpots for last 24 hours
            lossFromJackpots: 1000, // GBP
            
            // £100,000 from bonuses for last 24 hours
            lossFromBonuses: 1000, // GBP
        },
        
        
        
        
    },
    
    
    triggers: { // to be removed
        
        jackpots: {
            dailyJackpots: {
                info: 'jackpot won 2 times in N minutes (exclude small jackpots)',
                threshold: 2
            }
        },

        limits: {
            userMplr: {
                info: 'mplr from single user for last 24 hours',
                threshold: 2000 // x
            },
        }
        
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
                    archive:     { database: '', host: '', user: '', password: '', ssh: {}  },
                }
            },
            
            
            aggregations: {
                database: 'aggregator',
                host: '127.0.0.1',
                user: 'ronly',
                password: ''
            }
        }
    },
    
    monitoring: {
        enabled: false,
        graphite: {
            host: null,
            port: null,
        }
    }
    
}

module.exports = Config

// Override the Config when custom configuration is available
// TODO: better user ENV VARIABLES
try {
    require('./custom.config.js')
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') return false;
    throw err
}


