import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { createTelemetrySim } from './telemetrySim.js'

const HISTORY = 40
const MAX_FAILS = 3
const FLUSH_MS = 250
const INITIAL = { reactorTemp: 3100, coreLoad: 50, outputGw: 3, integrity: 97, status: 'NOMINAL', ts: 0 }

export function useTelemetry() {
  const [snap, setSnap] = useState({ data: INITIAL, history: [], link: 'CONNECTING' })
  const buf = useRef({ data: INITIAL, history: [], link: 'CONNECTING', dirty: false })

  useEffect(() => {
    const b = buf.current
    let fails = 0
    let sim = null
    const push = (sample) => {
      b.data = sample
      b.history = b.history.length >= HISTORY ? [...b.history.slice(1), sample] : [...b.history, sample]
      b.dirty = true
    }
    const setLink = (link) => { if (b.link !== link) { b.link = link; b.dirty = true } }
    const startSim = () => {
      if (sim) return
      const next = createTelemetrySim()
      push(next())
      sim = setInterval(() => push(next()), 500)
      setLink('SIMULATED')
    }
    const stopSim = () => { clearInterval(sim); sim = null }

    const socket = io('/', { transports: ['websocket'], reconnectionDelay: 500, reconnectionDelayMax: 3000, timeout: 4000 })
    socket.on('connect', () => { fails = 0; stopSim(); setLink('LIVE') })
    socket.on('connect_error', () => { fails += 1; if (fails >= MAX_FAILS) startSim() })
    socket.on('disconnect', () => setLink(sim ? 'SIMULATED' : 'CONNECTING'))
    socket.on('telemetry', (sample) => { if (!sim) push(sample) })

    const flush = setInterval(() => {
      if (!b.dirty) return
      b.dirty = false
      setSnap({ data: b.data, history: b.history, link: b.link })
    }, FLUSH_MS)

    return () => { clearInterval(flush); stopSim(); socket.close() }
  }, [])

  return snap
}
