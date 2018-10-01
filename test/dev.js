'use strict'

const SafeGuard = require('../src/SafeGuard')

let safeGuard = new SafeGuard()

;(async function () {

    try {
    
	    await safeGuard.activate()
	    // await safeGuard.history('2018-09-27')
    
    } catch (e){
        console.error(e.toString())
        console.error(e)
        process.exit(1)
    }
    
})();
// 16:12:29