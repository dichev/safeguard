'use strict'

const Config = {
    
    triggers: {
        
        jackpots: {
        
        },
        
        users: {
            hugeWins: {
                info: 'single huge win from user in last 24 hours',
                threshold: 10000 // GBP
            },
        },
        
        limits: {
            userLoss: {
                info: 'loss from single user for last 24 hours',
                threshold: 2000 // GBP
            },
            userLossNormalized: {
                info: 'normalized loss from single user for last 24 hours',
                threshold: 2000 // GBP
            },
            gameLoss: {
                info: 'loss from single game for last 24 hours',
                threshold: 50000 // GBP
            },
            operatorLoss: {
                info: 'loss from operator for last 24 hours',
                threshold: 50000 // GBP
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


