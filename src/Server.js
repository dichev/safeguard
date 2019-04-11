'use strict'

const http = require('http')
const prefix = require('./lib/Utils').prefix
const Metrics = require('./actions/Metrics')

const PORT = require('./config/Config').server.port
const HTTP_BAD_REQUEST = 400
const AVAILABLE_METHODS = [
    'GET /heartbeat',
    'GET /metrics',
]


class Server {
    
    constructor(){
        this._server = null
    }
    
    routes(request, response){
        const {method, url} = request
        console.log(prefix('http') + `${method} ${url} (client: ${request.connection.remoteAddress}, user-agent: ${request.headers['user-agent']})`)
    
        if (method === 'GET' && url === '/heartbeat') {
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ success: true }))
        }
        else if (method === 'GET' && url === '/metrics') {
            response.setHeader('Content-Type', 'text/plain')
            response.end(Metrics.exportAll())
        }
        else {
            response.setHeader('Content-Type', 'application/json')
            response.statusCode = HTTP_BAD_REQUEST
            response.end(JSON.stringify({
                success: false,
                error: 'This request is not allowed. Available: ' + AVAILABLE_METHODS.join(' | ')
            }))
        }
    }
    
    
    listen(){
        if(this._server) throw Error('Server already started!')
        
        this._server = http.createServer(this.routes.bind(this))
        this._server.listen(PORT, (err) => {
            if (err) throw Error(err)
            console.log(prefix('http') + `HTTP server is listening on http://localhost:${PORT}`)
            console.log(prefix('http') + `Available methods:\n` + prefix('http') + AVAILABLE_METHODS.join('\n'+ prefix('http')))
            console.log(prefix('http') + `-------------------------------------------------------------------`)
        })
    }
    
}

module.exports = Server

