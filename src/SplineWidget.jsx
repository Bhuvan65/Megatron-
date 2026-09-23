import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { C } from './tokens.js'
import { useStore } from './store.js'

const Spline = lazy(() => import('@splinetool/react-spline'))
const SCENE = import.meta.env.VITE_SPLINE_SCENE
const LOAD_TIMEOUT = 12000
const FADE_MS = 450

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    this.props.onError(error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function MicroCore() {
  const root = useRef()

  useEffect(() => {
    const el = root.current
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const nx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth
        const ny = (e.clientY - (r.top + r.height / 2)) / window.innerHeight
        el.style.setProperty('--px', `${(nx * 28).toFixed(2)}px`)
        el.style.setProperty('--py', `${(ny * 28).toFixed(2)}px`)
        el.style.setProperty('--rx', `${(-ny * 18).toFixed(2)}deg`)
        el.style.setProperty('--ry', `${(nx * 18).toFixed(2)}deg`)
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div ref={root} className="micro-core">
      <style>{`
        .micro-core { width: 100%; height: 100%; display: grid; place-items: center; perspective: 800px; }
        .micro-core svg { width: min(100%, 100vmin); height: 100%; overflow: visible;
          transform: translate(var(--px, 0), var(--py, 0)) rotateX(var(--rx, 0)) rotateY(var(--ry, 0));
          transition: transform .35s cubic-bezier(.65, 0, .35, 1); }
        .micro-core .ring { transform-box: fill-box; transform-origin: center; }
        .micro-core .r1 { animation: mc-spin 14s linear infinite; }
        .micro-core .r2 { animation: mc-spin 9s linear infinite reverse; }
        .micro-core .r3 { animation: mc-spin 5s linear infinite; }
        .micro-core .dot { transform-box: fill-box; transform-origin: center; animation: mc-pulse 1.6s cubic-bezier(.65, 0, .35, 1) infinite; }
        .micro-core .halo { animation: mc-halo 1.6s cubic-bezier(.65, 0, .35, 1) infinite; }
        @keyframes mc-spin { to { transform: rotate(360deg); } }
        @keyframes mc-pulse { 0%, 100% { transform: scale(.8); } 50% { transform: scale(1.25); } }
        @keyframes mc-halo { 0%, 100% { opacity: .25; } 50% { opacity: .7; } }
      `}</style>
      <svg viewBox="-120 -120 240 240" aria-hidden="true">
        <defs>
          <radialGradient id="mc-glow">
            <stop offset="0" stopColor={C.cyan} stopOpacity=".55" />
            <stop offset="1" stopColor={C.cyan} stopOpacity="0" />
          </radialGradient>
          <filter id="mc-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <circle r="92" fill="url(#mc-glow)" className="halo" />
        <g className="ring r1" fill="none" stroke={C.cyan} strokeWidth="2">
          <circle r="100" strokeDasharray="62 18 8 18" opacity=".8" />
          <circle r="100" strokeDasharray="62 18 8 18" filter="url(#mc-blur)" />
        </g>
        <g className="ring r2" fill="none" stroke={C.cyan} strokeWidth="3">
          <circle r="74" strokeDasharray="4 10" opacity=".9" />
          <path d="M -74 0 A 74 74 0 0 1 0 -74" stroke={C.amber} strokeWidth="2" />
        </g>
        <g className="ring r3" fill="none" stroke={C.cyanDim} strokeWidth="6">
          <circle r="48" strokeDasharray="30 20" />
          <circle r="48" stroke={C.cyan} strokeWidth="1.5" strokeDasharray="30 20" />
        </g>
        <g stroke={C.chromeMid} strokeWidth="1" opacity=".6">
          <line x1="-118" y1="0" x2="-106" y2="0" /><line x1="106" y1="0" x2="118" y2="0" />
          <line x1="0" y1="-118" x2="0" y2="-106" /><line x1="0" y1="106" x2="0" y2="118" />
        </g>
        <circle r="18" fill={C.panel} stroke={C.cyan} strokeWidth="1.5" />
        <circle r="8" fill={C.amber} className="dot" />
        <circle r="14" fill={C.amber} opacity=".35" filter="url(#mc-blur)" className="dot" />
      </svg>
    </div>
  )
}

function SplineScene() {
  const [state, setState] = useState(SCENE ? 'loading' : 'failed')

  useEffect(() => {
    if (state !== 'loading') return
    const id = setTimeout(() => setState('failed'), LOAD_TIMEOUT)
    const onReject = (e) => {
      const msg = String(e.reason && (e.reason.message || e.reason))
      if (/spline|scene|fetch|load/i.test(msg)) setState('failed')
    }
    window.addEventListener('unhandledrejection', onReject)
    return () => { clearTimeout(id); window.removeEventListener('unhandledrejection', onReject) }
  }, [state])

  if (state === 'failed') return <MicroCore />
  const fallback = <MicroCore />
  return (
    <ErrorBoundary fallback={fallback} onError={() => setState('failed')}>
      <Suspense fallback={fallback}>
        <div style={{ position: 'absolute', inset: 0, opacity: state === 'ready' ? 1 : 0, transition: `opacity ${FADE_MS}ms` }}>
          <Spline scene={SCENE} onLoad={() => setState('ready')} style={{ width: '100%', height: '100%' }} />
        </div>
        {state === 'loading' && <div style={{ position: 'absolute', inset: 0 }}>{fallback}</div>}
      </Suspense>
    </ErrorBoundary>
  )
}

export default function SplineWidget() {
  const active = useStore((s) => s.splineActive)
  const hangarOpen = useStore((s) => s.hangarOpen)
  const want = active && !hangarOpen
  const [mounted, setMounted] = useState(want)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (want) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    setShown(false)
    const id = setTimeout(() => setMounted(false), FADE_MS)
    return () => clearTimeout(id)
  }, [want])

  if (!mounted) return null
  return (
    <div
      className="brackets"
      style={{
        position: 'fixed', right: '4vw', top: '50%', width: '40vw', height: '40vh', zIndex: 10,
        transform: `translateY(-50%) scale(${shown ? 1 : 0.94})`, opacity: shown ? 1 : 0,
        transition: `opacity ${FADE_MS}ms cubic-bezier(.65,0,.35,1), transform ${FADE_MS}ms cubic-bezier(.65,0,.35,1)`,
        pointerEvents: 'none'
      }}
    >
      <SplineScene />
      <span className="mono" style={{ position: 'absolute', left: 12, bottom: 8, fontSize: 10, letterSpacing: '.2em', color: C.text2 }}>
        MICRO-CORE // {SCENE ? 'SPLINE LINK' : 'LOCAL RENDER'}
      </span>
    </div>
  )
}
