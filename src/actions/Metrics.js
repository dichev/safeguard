'use strict'

const Config = require('../config/Config')

const pool = []

class Metrics {
    
    constructor(operator) {
        this.operator = operator
        this.metrics = {}
        this.metrics[`safeguard_tracking{operator="${this.operator}"}`] = { value: 1, time: Date.now() }
        pool.push(this)
    }
    
    
    /**
     * @param {Trigger} trigger
     */
    collect(trigger){
        let name = ''
        if(trigger.userId){
            name = `safeguard_${trigger.name}{operator="${this.operator}",user="${trigger.userId}"}`
        }
        else if(trigger.gameName){
            name = `safeguard_${trigger.name}{operator="${this.operator}",game="${trigger.gameName}"}`
        }
        else if(trigger.potId){
            name = `safeguard_${trigger.name}{operator="${this.operator}",jackpot="${trigger.potId}"}`
        }
        else {
            name = `safeguard_${trigger.name}{operator="${this.operator}"}`
        }
        this.metrics[name] = { value: trigger.value, time: Date.now() }
    }
    
    /**
     * Clean up metrics which didn't triggered
     * @param {Number} timestamp - all metrics before this timestamp will be cleaned
     */
    cleanup(timestamp){
        this.metrics[`safeguard_tracking{operator="${this.operator}"}`].time = Date.now()
        
        for(let metric in this.metrics) if(this.metrics.hasOwnProperty(metric)){
            if(this.metrics[metric].time < timestamp){
                // console.warn(`clean metric ${metric}`, this.metrics[metric])
                delete this.metrics[metric]
            }
        }
    }
    
    export(){
        let output = ''
        for(let [metric, {value, time}] of Object.entries(this.metrics)){
            // output += `# HELP ${metric} infoo`
            // output += `# TYPE ${metric} gauge`
            output += `${metric} ${value}\n`
        }
        // console.log(output)
        return output
    }
    
    static exportAll() {
        let output = ''
        
        // export thresholds
        for (let type in Config.limits) {
            for (let name in Config.limits[type]) {
                let {warn, block} = Config.limits[type][name]
                output += `safeguard_${type}_${name}_threshold_warn ${warn}\n`
                output += `safeguard_${type}_${name}_threshold_block ${block}\n`
            }
        }
    
        // export metrics by operator
        for (let metrics of pool) {
            output += metrics.export()
        }
        
        return output
    }
    
}

module.exports = Metrics