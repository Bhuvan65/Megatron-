import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { C, FONT } from './tokens.js'
import { setHangarOpen, toggleGravity, useStore } from './store.js'

const statusColor = (status, link) => (link === 'SIMULATED' ? C.violet : status === 'NOMINAL' ? C.cyan : C.amber)

export default function HUD({ telemetry }) {
  const { data, link } = telemetry
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
        .from('.hud-right > *', { x: 24, opacity: 0, duration: 0.45, stagger: 0.1 }, '-=0.5')
        .from('.hud-bottom', { yPercent: 120, opacity: 0, duration: 0.55 }, '-=0.4')
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none', visibility: hangarOpen ? 'hidden' : 'visible' }}>
      <header className="hud-top panel" style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderWidth: '0 0 1px' }}>
        <div className="display" style={{ fontSize: 14, color, whiteSpace: 'nowrap' }}>
          MEGATRON <span style={{ color: C.text2 }}>//</span> <span style={{ animation: data.status === 'CRITICAL' ? 'mc-blink 0.6s steps(2) infinite' : 'none' }}>{data.status}</span>
        </div>
        <div className="mono hud-link" style={{ fontSize: 11, letterSpacing: '.16em', color: link === 'LIVE' ? C.cyanDim : link === 'SIMULATED' ? C.violet : C.text2 }}>
          LINK {link} · {new Date(data.ts || Date.now()).toISOString().slice(11, 19)}Z
        </div>
        <style>{'@keyframes mc-blink { to { opacity: .25; } }'}</style>
      </header>
      <div className="hazard-thin" style={{ position: 'absolute', top: 41, left: 0, width: 220 }} />

      <div className="hud-right" style={{ position: 'absolute', right: 20, top: 72, display: 'grid', gap: 10, justifyItems: 'end' }}>
        <button className={`hud-btn brackets${gravity ? ' amber' : ''}`} onClick={toggleGravity} aria-pressed={gravity}>
          {gravity ? 'GRAV · 9.81' : 'ZERO-G'}
        </button>
        <button className="hud-btn amber brackets" onClick={() => setHangarOpen(true)}>ENTER HANGAR</button>
      </div>

      <footer className="hud-bottom" style={{ position: 'absolute', left: 20, right: 20, bottom: 18, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 11, letterSpacing: '.2em', color: C.text2 }}>
          <span>SEQ // <span style={{ color: C.cyan }}>{section}</span></span>
          <span style={{ color: C.chromeMid }}>DEVELOPED BY <span style={{ color: C.text }}>BHUVAN</span> AND <span style={{ color: C.amber }}>TONY STARK</span></span>
          <span>{String(Math.round(offset * 100)).padStart(3, '0')}%</span>
        </div>
        <div style={{ height: 2, background: C.edge, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${offset * 100}%`, background: `linear-gradient(90deg, ${C.cyanDim}, ${C.cyan})`, boxShadow: `0 0 10px ${C.cyan}` }} />
        </div>
      </footer>
    </div>
  )
}
