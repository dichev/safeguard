'use strict'

const http = require('http')
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const PORT = require('./config/Config').server.port
const HTTP_BAD_REQUEST = 400
const AVAILABLE_METHODS = [
    'GET /heartbeat',
    'GET /metrics',
]

class Server {
    
    constructor(){
        this._server = null
        this._metrics = []
    }
    
    addMetrics(fn){
        this._metrics.push(fn)
    }
    
    routes(request, response){
        const {method, url} = request
        console.log(`${now()} | ${method} ${url}`)
    
        if (method === 'GET' && url === '/heartbeat') {
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ success: true }))
        }
        else if (method === 'GET' && url === '/metrics') {
            response.setHeader('Content-Type', 'text/plain')
            let metrics = this._metrics.map(fn => fn()).filter(m => m.trim() !== '').join('\n')
            response.end(metrics)
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
            console.log(`HTTP server is listening on http://localhost:${PORT}`)
            console.log(`Available methods:\n` + AVAILABLE_METHODS.join('\n'))
        })
    }
    
}

module.exports = Server

