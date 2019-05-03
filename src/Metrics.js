'use strict'

const Config = require('./config/Config')

class Metrics {
    
    constructor() {
        this.metrics = {}
    }
    
    /**
     * @param {array} logs
     * @return Array
     */
    collectLogs(logs) {
        let now = Date.now()
        for(let {operator, count, status, msg = ''} of logs) {
             msg = msg.replace(/["\n]/g, '').substr(0, 100)
             this.metrics[`safeguard_logs_${status.toLowerCase()}{operator="${operator}",msg="${msg}"}`] = { value: count, time: now }
        }
        this._cleanup(now)
    }
    
    
    /**
     * Clean up metrics which didn't triggered
     * @param {Number} timestamp - all metrics before this timestamp will be cleaned
     */
    _cleanup(timestamp){
        for(let metric in this.metrics) if(this.metrics.hasOwnProperty(metric)){
            if(this.metrics[metric].time < timestamp){
                // console.warn(`clean metric ${metric}`, this.metrics[metric])
                delete this.metrics[metric]
            }
        }
    }
    
    export(){
        let output = ''
    
        // export thresholds
        for (let type in Config.thresholds) {
            for (let name in Config.thresholds[type]) {
                let {warn, block} = Config.thresholds[type][name]
                output += `safeguard_${type}_${name}_threshold_warn ${warn}\n`
                output += `safeguard_${type}_${name}_threshold_block ${block}\n`
            }
        }
        output += `safeguard_danger_threshold_warn ${Config.killSwitch.dangerRatio}\n`

        // export logs
        for(let [metric, {value, time}] of Object.entries(this.metrics)){
            output += `${metric} ${value}\n`
        }
        // console.log(output)
        return output
    }
    
}

module.exports = Metrics