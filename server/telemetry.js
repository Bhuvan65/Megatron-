import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { createTelemetrySim } from '../src/telemetrySim.js'

const PORT = Number(process.env.TELEMETRY_PORT) || 3001
const next = createTelemetrySim()
let latest = next()

const http = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
    res.end(JSON.stringify({ ok: true, clients: io.engine.clientsCount, uptime: Math.round(process.uptime()), latest }))
    return
  }
  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('not found')
})

const io = new Server(http, { cors: { origin: '*' } })

io.on('connection', (socket) => socket.emit('telemetry', latest))

const timer = setInterval(() => {
  latest = next()
  io.emit('telemetry', latest)
}, 500)

http.listen(PORT, () => console.log(`[telemetry] socket.io on :${PORT} (GET /health)`))

const shutdown = () => { clearInterval(timer); io.close(); process.exit(0) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
