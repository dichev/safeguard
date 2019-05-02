'use strict'


const Trigger = require('../../guards/triggers/types/Trigger')
const Config = require('../../config/Config')


class Metrics {
    
    constructor(operator) {
        this.operator = operator
        this.metrics = {}
        this.metrics[`safeguard_tracking{operator="${this.operator}"}`] = { value: 0, time: Date.now() }
    }
    
    
    /**
     * @param {Trigger} trigger
     * @param {boolean} blocked
     */
    collectTrigger(trigger, blocked){
        let name = ''
        if(trigger.type === Trigger.types.USER){
            name = `safeguard_${trigger.name}{operator="${this.operator}",user="${trigger.userId}"}`
        }
        else if(trigger.type === Trigger.types.GAME){
            name = `safeguard_${trigger.name}{operator="${this.operator}",game="${trigger.gameName}"}`
        }
        else if(trigger.type === Trigger.types.JACKPOT){
            name = `safeguard_${trigger.name}{operator="${this.operator}",jackpot="${trigger.jackpotGroup}_${trigger.jackpotPot}"}`
        }
        else {
            name = `safeguard_${trigger.name}{operator="${this.operator}"}`
        }
        this.metrics[name] = { value: trigger.value, time: Date.now() }
    
        if(trigger.action === Trigger.actions.BLOCK) {
            this.metrics[`safeguard_blocked{operator="${this.operator}",type="${trigger.type.toLowerCase()}",trigger="${trigger.uid}",blocked="${blocked}"}`] = { value: 1, time: Date.now() }
        }
        if(trigger.value / trigger.threshold >= Config.killSwitch.dangerRatio){
            this.metrics[`safeguard_danger{operator="${this.operator}",type="${trigger.type.toLowerCase()}",trigger="${trigger.uid}"}`] = { value: trigger.value / trigger.threshold, time: Date.now() }
        }
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