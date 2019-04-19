'use strict'

const Config = require('../../config/Config')


class Metrics {
    
    constructor(operator) {
        this.operator = operator
        this.metrics = {}
        this.metrics[`safeguard_tracking{operator="${this.operator}"}`] = { value: 0, time: Date.now() }
    }
    
    
    /**
     * @param {Trigger} trigger
     */
    collectTrigger(trigger){
        let name = ''
        if(trigger.userId){
            name = `safeguard_${trigger.name}{operator="${this.operator}",user="${trigger.userId}"}`
        }
        else if(trigger.gameName){
            name = `safeguard_${trigger.name}{operator="${this.operator}",game="${trigger.gameName}"}`
        }
        else if(trigger.jackpotGroup){
            name = `safeguard_${trigger.name}{operator="${this.operator}",jackpot="${trigger.jackpotGroup}_${trigger.jackpotPot}"}`
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
        this.metrics[`safeguard_tracking{operator="${this.operator}"}`].value = 1
        
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
            output += `${metric} ${value}\n`
        }
        // console.log(output)
        return output
    }
 
}

module.exports = Metrics