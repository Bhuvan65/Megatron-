import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { C, FONT } from './tokens.js'
import { setHangarOpen, toggleGravity, useStore } from './store.js'

const READOUTS = [
  { key: 'reactorTemp', label: 'Reactor temp', unit: 'K', min: 2800, max: 3600, fmt: (v) => v.toFixed(0) },
  { key: 'coreLoad', label: 'Core load', unit: '%', min: 0, max: 100, fmt: (v) => v.toFixed(1) },
  { key: 'outputGw', label: 'Output', unit: 'GW', min: 0, max: 6, fmt: (v) => v.toFixed(2) },
  { key: 'integrity', label: 'Hull integrity', unit: '%', min: 0, max: 100, fmt: (v) => v.toFixed(1) }
]

const statusColor = (status, link) => (link === 'SIMULATED' ? C.violet : status === 'NOMINAL' ? C.cyan : C.amber)

function Sparkline({ history, k, min, max, color }) {
  const w = 120, h = 26
  if (history.length < 2) return <svg width={w} height={h} />
  const step = w / (history.length - 1)
  const pts = history.map((s, i) => `${(i * step).toFixed(1)},${(h - ((s[k] - min) / (max - min)) * h).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity=".08" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  )
}

function Readout({ r, data, history, color }) {
  const v = data[r.key]
  const pct = Math.min(1, Math.max(0, (v - r.min) / (r.max - r.min)))
  return (
    <div className="hud-reveal" style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
        <span style={{ fontFamily: FONT.body, fontSize: 13, letterSpacing: '.18em', textTransform: 'uppercase', color: C.text2 }}>{r.label}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 15, color: C.text }}>{r.fmt(v)}<span style={{ color: C.text2, fontSize: 11, marginLeft: 4 }}>{r.unit}</span></span>
      </div>
      <div style={{ height: 3, background: C.edge }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: color, boxShadow: `0 0 8px ${color}`, transition: 'width .35s cubic-bezier(.65,0,.35,1)' }} />
      </div>
      <Sparkline history={history} k={r.key} min={r.min} max={r.max} color={color} />
    </div>
  )
}

export default function HUD({ telemetry }) {
  const { data, history, link } = telemetry
  const gravity = useStore((s) => s.gravity)
  const section = useStore((s) => s.section)
  const offset = useStore((s) => s.offset)
  const hangarOpen = useStore((s) => s.hangarOpen)
  const root = useRef()
  const color = statusColor(data.status, link)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
      tl.from('.hud-top', { yPercent: -120, opacity: 0, duration: 0.7 })
        .from('.hud-left', { xPercent: -30, opacity: 0, duration: 0.6 }, '-=0.3')
        .from('.hud-reveal', { opacity: 0, x: -12, duration: 0.35, stagger: 0.08 }, '-=0.3')
        .from('.hud-right > *', { x: 24, opacity: 0, duration: 0.45, stagger: 0.1 }, '-=0.5')
        .from('.hud-bottom', { yPercent: 120, opacity: 0, duration: 0.55 }, '-=0.4')
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none', visibility: hangarOpen ? 'hidden' : 'visible' }}>
      <div className="scanlines" />

      <header className="hud-top panel" style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderWidth: '0 0 1px' }}>
        <div className="display" style={{ fontSize: 14, color }}>
          MEGATRON <span style={{ color: C.text2 }}>//</span> <span style={{ animation: data.status === 'CRITICAL' ? 'mc-blink 0.6s steps(2) infinite' : 'none' }}>{data.status}</span>
        </div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '.16em', color: link === 'LIVE' ? C.cyanDim : link === 'SIMULATED' ? C.violet : C.text2 }}>
          LINK {link} · {new Date(data.ts || Date.now()).toISOString().slice(11, 19)}Z
        </div>
        <style>{'@keyframes mc-blink { to { opacity: .25; } }'}</style>
      </header>
      <div className="hazard-thin" style={{ position: 'absolute', top: 41, left: 0, width: 220 }} />

      <aside className="hud-left panel brackets" style={{ position: 'absolute', left: 20, top: 72, width: 220, padding: 14, display: 'grid', gap: 12 }}>
        <div className="display" style={{ fontSize: 10, color: C.cyan }}>REACTOR TELEMETRY</div>
        {READOUTS.map((r) => <Readout key={r.key} r={r} data={data} history={history} color={color} />)}
      </aside>

      <div className="hud-right" style={{ position: 'absolute', right: 20, top: 72, display: 'grid', gap: 10, justifyItems: 'end' }}>
        <button className={`hud-btn brackets${gravity ? ' amber' : ''}`} onClick={toggleGravity} aria-pressed={gravity}>
          {gravity ? 'GRAV · 9.81' : 'ZERO-G'}
        </button>
        <button className="hud-btn amber brackets" onClick={() => setHangarOpen(true)}>ENTER HANGAR</button>
      </div>

      <footer className="hud-bottom" style={{ position: 'absolute', left: 20, right: 20, bottom: 18, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 11, letterSpacing: '.2em', color: C.text2 }}>
          <span>SEQ // <span style={{ color: C.cyan }}>{section}</span></span>
          <span>{String(Math.round(offset * 100)).padStart(3, '0')}%</span>
        </div>
        <div style={{ height: 2, background: C.edge, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${offset * 100}%`, background: `linear-gradient(90deg, ${C.cyanDim}, ${C.cyan})`, boxShadow: `0 0 10px ${C.cyan}` }} />
        </div>
      </footer>
    </div>
  )
}
