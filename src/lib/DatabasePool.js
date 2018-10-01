'use strict'

const SSHClient = require('dopamine-toolbox').SSHClient
const MySQL = require('dopamine-toolbox').MySQL;
const EventEmitter = require('events').EventEmitter

const emitter = new EventEmitter()

// TODO: move me to toolbox
class Database {
   
    
    /**
     * @param {string} name
     * @param {object} cfg
     * @return mysql
     */
    static async getInstance(name, cfg) {
        let key = name + '|' + cfg.database
        
        if (!this._connections) this._connections = {}
        if (!this._connections[key]) {
            this._connections[key] = {
                state: 'init',
                emitter: new EventEmitter(),
                mysqlClient: null,
                sshClient: null
            }
        }
        
        
        let instance = this._connections[key]
        
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
            await new Promise((resolve, reject) => {
                instance.emitter.once('CONNECTED', () => resolve)
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
        return {mysqlClient, sshClient }
    }
    
    static killAllConnections(){
        Object.keys(this._connections).forEach(name => Database.killConnection(name))
    }
    
    static killOperatorConnections(operator){
        Object.keys(this._connections)
              .filter(name => name.startsWith(operator))
              .forEach(name => Database.killConnection(name))
    }
    
    static killConnection(db) {
        for(let id in this._connections) if(this._connections.hasOwnProperty(id)) {
            if(this._connections[id].mysqlClient === db){
                Database.killConnectionById(id)
                return
            }
        }
        throw Error('There is no such connection: ' + db);
    }
    
    
    static killConnectionById(id) {
        let conn = this._connections[id]
        if(!conn) return console.error('Can\'t end missing connection:', id)
        
        if (conn.mysqlClient) {
            // console.log(`[${id}] End mysql connection..`)
            conn.mysqlClient.disconnect()
        }
        if(conn.sshClient) {
            // console.log(`[${id}] End ssh connection..`)
            conn.sshClient.disconnect()
        }
        delete this._connections[id]
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


module.exports = Database