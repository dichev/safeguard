'use strict'

const Config = {
    
    production: false,
    defaultCurrency: 'GBP',
    
    killSwitch: {
        enabled: true,
        dangerRatio: 0.60 // the ratio of value/threshold - above it the threshold will be considered as danger and the monitoring system should alert us to check it
    },
    
    schedule: {
        intervalBetweenIterations: 60, // sec
        initialThrottleBetweenOperators: 0.5, // sec
        currencyRatioInvalidateCache: 60 * 60 // sec
    },
    
    thresholds: {
        
        jackpots: {
            timedJackpotWonCount:     { block:       2, warn:    1.1,                     msg: 'Timed jackpot {{JACKPOT}} was won {{VALUE}} times, but is expected to be won just once during its period' },
            tooHighJackpotSize_gbp:   { block: 2000000, warn: 800000,                     msg: 'Detected operator {{OPERATOR}} with jackpot {{JACKPOT}} with too high pot size of {{VALUE}} - when it is won there is a risk the lucky user to be blocked' },
        },
        
        users: {
            lossFromGames_gbp:        { block:  500000, warn:  50000,                     msg: 'Detected user #{{USER}} with extreme net loss of £{{VALUE}} from games in last 24 hours' },
            cappedLossFromGames_gbp:  { block:  100000, warn:  20000, capWinsAbove: 1000, msg: 'Detected user #{{USER}} with extreme capped net loss of £{{VALUE}} from games in last 24 hours (single wins above £1000 are excluded' },
            lossFromJackpots_gbp:     { block: 2000000, warn: 100000,                     msg: 'Detected user #{{USER}} with extreme net loss of £{{VALUE}} from jackpots in last 24 hours' },
            lossFromBonuses_bets_gbp: { block:   18000, warn:   2000,                     msg: 'Detected user #{{USER}} with extreme gross loss of £{{VALUE}} from bonus pays in last 24 hours' },
            lossFromBonuses_pays_gbp: { block:   18000, warn:   2000,                     msg: 'Detected user #{{USER}} with extreme gross loss of £{{VALUE}} from bonus bets in last 24 hours' },
            pureLossFromGames_x:      { block:   30000, warn:  10000,                     msg: 'Detected user #{{USER}} with extreme pure math loss of x{{VALUE}} in last 24 hours' },
        },
        
        games: {
            lossFromGames_gbp:        { block:  500000, warn:  50000,                     msg: 'Detected game {{GAME}} with extreme net loss of £{{VALUE}} from games in last 24 hours' },
            cappedLossFromGames_gbp:  { block:  100000, warn:  20000, capWinsAbove: 1000, msg: 'Detected game {{GAME}} with extreme capped net loss of £{{VALUE}} from games in last 24 hours (single wins above £1000 are excluded' },
            lossFromJackpots_gbp:     { block: 2000000, warn: 100000,                     msg: 'Detected game {{GAME}} with extreme net loss of £{{VALUE}} from jackpots in last 24 hours' },
            lossFromBonuses_bets_gbp: { block:  120000, warn:  20000,                     msg: 'Detected game {{GAME}} with extreme gross loss of £{{VALUE}} from bonus pays in last 24 hours' },
            lossFromBonuses_pays_gbp: { block:  120000, warn:  20000,                     msg: 'Detected game {{GAME}} with extreme gross loss of £{{VALUE}} from bonus bets in last 24 hours' },
            pureLossFromGames_x:      { block:   60000, warn:  15000,                     msg: 'Detected game {{GAME}} with extreme pure math loss of x{{VALUE}} in last 24 hours' },
        },
        
        operators: {
            lossFromGames_gbp:        { block:  500000, warn:  50000,                     msg: 'Detected operator {{OPERATOR}} with extreme net loss of £{{VALUE}} from games in last 24 hours' },
            cappedLossFromGames_gbp:  { block:  100000, warn:  20000, capWinsAbove: 1000, msg: 'Detected operator {{OPERATOR}} with extreme capped net loss of £{{VALUE}} from games in last 24 hours (single wins above £1000 are excluded' },
            lossFromJackpots_gbp:     { block: 2000000, warn: 100000,                     msg: 'Detected operator {{OPERATOR}} with extreme net loss of £{{VALUE}} from jackpots in last 24 hours' },
            lossFromBonuses_bets_gbp: { block:  200000, warn:  30000,                     msg: 'Detected operator {{OPERATOR}} with extreme gross loss of £{{VALUE}} from bonus pays in last 24 hours' },
            lossFromBonuses_pays_gbp: { block:  200000, warn:  30000,                     msg: 'Detected operator {{OPERATOR}} with extreme gross loss of £{{VALUE}} from bonus bets in last 24 hours' },
            pureLossFromGames_x:      { block:   30000, warn:   5000,                     msg: 'Detected operator {{OPERATOR}} with extreme pure math loss of x{{VALUE}} in last 24 hours' },
        },

    },
    
    
    credentials: {
        databases: {
            safeguard: {
                database: 'safeguard',
                host: '127.0.0.1',
                user: 'safeguard',
                password: ''
            },
            
            operators: { // dynamically configured
                OPERATOR: {
                    killSwitch:  { database: '', host: '', user: '', password: '', ssh: {}  }, // this database must contain table _blocked
                    
                    platform:    { database: '', host: '', user: '', password: '', ssh: {}  },
                    jackpot:     { database: '', host: '', user: '', password: '', ssh: {}  },
                    segments:    { database: '', host: '', user: '', password: '', ssh: {}  },
                    
                    // demo:        { database: '', host: '', user: '', password: '', ssh: {}  },
                    // panel:       { database: '', host: '', user: '', password: '', ssh: {}  },
                    // stats:       { database: '', host: '', user: '', password: '', ssh: {}  },
                    // tournaments: { database: '', host: '', user: '', password: '', ssh: {}  },
                    // rewards:     { database: '', host: '', user: '', password: '', ssh: {}  },
                    // bonus:       { database: '', host: '', user: '', password: '', ssh: {}  },
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
        showInfoMessages: true,
    },
    
}

module.exports = Config

// Override the Config when custom configuration is available
try {
    require('./custom.config.js')
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') return false;
    throw err
}
