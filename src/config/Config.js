'use strict'

const Config = {
    
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
            
            }
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


