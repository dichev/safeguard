'use strict'

class Metrics {
    
    constructor(operator) {
        this.operator = operator
        this.metrics = {}
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
        else {
            name = `safeguard_${trigger.name}{operator="${this.operator}"}`
        }
        this.metrics[name] = trigger.value
    }
    
    export(){
        let output = ''
        for(let [metric, value] of Object.entries(this.metrics)){
            // output += `# HELP ${metric} infoo`
            // output += `# TYPE ${metric} gauge`
            output += `${metric} ${value}\n`
        }
        // console.log(output)
        return output
    }
    
}

module.exports = Metrics