'use strict'

const SSHClient = require('dopamine-toolbox').SSHClient
const MySQL = require('dopamine-toolbox').MySQL;
const EventEmitter = require('events').EventEmitter

// TODO: move me to toolbox

let pool = {}

class DatabasePool {
   
    
    /**
     * @param {string} name
     * @param {object} cfg
     * @return {Promise<MySQL>}
     */
    static async getInstance(name, cfg) {
        let key = name + '|' + cfg.database
        
        if (!pool) pool = {}
        if (!pool[key]) {
            pool[key] = {
                state: 'init',
                emitter: new EventEmitter(),
                mysqlClient: null,
                sshClient: null
            }
        }
        
        
        let instance = pool[key]
        
        if (instance.state === 'init') {
            instance.state = 'connecting'
            instance.emitter.emit('CONNECTING')
            let {mysqlClient, sshClient} = await this.getConnection(cfg);
            instance.mysqlClient = mysqlClient
            instance.sshClient = sshClient
            instance.state = 'connected'
            instance.emitter.emit('CONNECTED')
            
        }
        else if(instance.state === 'connecting'){
            await new Promise((resolve, reject) => { // TODO: timeout/error reject
                instance.emitter.once('CONNECTED', () => resolve())
            })
        }
        else if(instance.state === 'connected') {
            // that's fine, just reuse it
        }
        
        return instance.mysqlClient
    }
    
    
    static async getConnection({host, user, password, database, ssh}){
        let sshClient = ssh ? new SSHClient() : null
        let mysqlClient = new MySQL()
    
        let cfg = {
            host: host,
            user: user,
            password: password,
            database: database,
            supportBigNumbers: false,
            bigNumberStrings: false,
            dateStrings: 'date',
            multipleStatements: true
        }
        
        if(ssh) await sshClient.connect(ssh)
        await mysqlClient.connect(cfg, sshClient)
        await mysqlClient.query(`
            SET SESSION max_heap_table_size  = 1024 * 1024 * 128,
                SESSION tmp_table_size       = 1024 * 1024 * 128
        `);
        return {mysqlClient, sshClient }
    }
    
    static killAllConnections(){
        Object.keys(pool).forEach(name => this.killConnectionById(name))
    }
    
    static killConnectionsByNamePrefix(name){
        Object.keys(pool).filter(n => n.startsWith(name + '|') === true).forEach(name => this.killConnectionById(name))
    }
    
    static killConnection(db) {
        for(let id in pool) if(pool.hasOwnProperty(id)) {
            if(pool[id].mysqlClient === db){
                this.killConnectionById(id)
                return
            }
        }
        throw Error('There is no such connection: ' + db);
    }
    
    
    static killConnectionById(id) {
        let conn = pool[id]
        if(!conn) return console.error('Can\'t end missing connection:', id)
        
        if (conn.mysqlClient) {
            // console.log(`[${id}] End mysql connection..`)
            conn.mysqlClient.disconnect().catch(console.error)
        }
        if(conn.sshClient) {
            // console.log(`[${id}] End ssh connection..`)
            conn.sshClient.disconnect()
        }
        delete pool[id]
    }
    
    /**
     * @param {string} query
     * @param {Array} params
     * @return {string}
     */
    static trace(query, params) {
        for (let p of params) {
            query = query.replace('?', p === null ? 'NULL' : `'${p}'`)
        }
        console.log(query)
        return query
    }
    
    
}


module.exports = DatabasePool