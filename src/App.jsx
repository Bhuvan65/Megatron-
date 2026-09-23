import { Suspense, lazy, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor, Scroll, ScrollControls, useScroll } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import MegatronModel from './MegatronModel.jsx'
import PhysicsPlayground from './PhysicsPlayground.jsx'
import HUD from './HUD.jsx'
import { useTelemetry } from './useTelemetry.js'
import { C, SCROLL, SECTIONS } from './tokens.js'
import { getState, setHangarOpen, setState, useStore } from './store.js'

const BabylonHangar = lazy(() => import('./BabylonHangar.jsx'))
const PAGES = 6

function ScrollBridge() {
  const scroll = useScroll()
  useFrame(() => {
    const offset = scroll.offset
    const s = getState()
    let section = SECTIONS[0][0]
    for (let i = 0; i < SECTIONS.length; i++) if (offset >= SECTIONS[i][1][0]) section = SECTIONS[i][0]
    if (Math.abs(s.offset - offset) > 0.001 || s.section !== section) {
      setState({ offset: Math.round(offset * 1000) / 1000, section })
    }
  })
  return null
}

// Scroll html moves (pages-1) viewports over offset 0..1; center each headline on its range midpoint
const top = ([start, length]) => `${start === 0 ? 0 : (start + length / 2) * (PAGES - 1) * 100}vh`

function Headlines() {
  return (
    <>
      <section className="section-block" style={{ top: top(SCROLL.hero) }}>
        <span className="kicker">UNIT 01 // REACTOR-CORE MECHA</span>
        <h2>Mega<em>tron</em></h2>
        <p>Hard-surface chrome armor wrapped around a live arc reactor. Scroll to power up the inspection sequence.</p>
        <div className="hazard-thin" style={{ width: 180 }} />
        <span className="credit">Developed by Bhuvan and Tony Stark</span>
      </section>
      <section className="section-block" style={{ top: top(SCROLL.rotate) }}>
        <span className="kicker">SEQ 02 // TURNTABLE</span>
        <h2>Full <em>360°</em> sweep</h2>
        <p>Every plate machined from a single procedural blueprint. No meshes shipped, no textures loaded.</p>
      </section>
      <section className="section-block" style={{ top: top(SCROLL.explode) }}>
        <span className="kicker">SEQ 03 // DISASSEMBLY</span>
        <h2>Armor <strong>exploded</strong></h2>
        <p>Each panel releases along its own vector, exposing the reactor ring and gunmetal frame beneath.</p>
      </section>
      <section className="section-block" style={{ top: top(SCROLL.physics) }}>
        <span className="kicker">SEQ 04 // DEBRIS FIELD</span>
        <h2>Zero-<em>G</em> field</h2>
        <p>64 rigid bodies orbit the core. Move your cursor to repel them, or toggle gravity from the HUD.</p>
      </section>
      <section className="section-block" style={{ top: top(SCROLL.hangar) }}>
        <span className="kicker">SEQ 05 // HANGAR ACCESS</span>
        <h2>Enter the <strong>hangar</strong></h2>
        <p>Walk the bay in first person. WASD to move, click to lock the view, ESC to exit.</p>
        <button className="hud-btn amber brackets" style={{ alignSelf: 'flex-start', pointerEvents: 'auto' }} onClick={() => setHangarOpen(true)}>
          Enter hangar
        </button>
      </section>
    </>
  )
}

function Effects({ degraded }) {
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1} intensity={degraded ? 0.6 : 1.2} radius={0.7} />
      <Vignette offset={0.3} darkness={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

function Lights() {
  return (
    <>
      <directionalLight position={[4, 6, 5]} intensity={0.7} color={C.chromeHi} />
      <pointLight position={[-4, 1.5, -2]} intensity={40} distance={14} color={C.cyan} />
      <pointLight position={[0, -3.5, 2.5]} intensity={22} distance={9} color={C.amber} />
      <pointLight position={[2.5, 2, -4]} intensity={35} distance={14} color={C.violet} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.1} color="#cfe6ff" position={[0, 5, -2]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={2.4} color={C.cyan} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[0.6, 8, 1]} />
        <Lightformer form="rect" intensity={1.6} color={C.amber} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[0.6, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[4, 3, 5]} rotation-y={-0.7} scale={[1.2, 5, 1]} />
        <Lightformer form="rect" intensity={1} color={C.violet} position={[0, 2, -6]} rotation-y={Math.PI} scale={[8, 2, 1]} />
      </Environment>
    </>
  )
}

export default function App() {
  const hangarOpen = useStore((s) => s.hangarOpen)
  const telemetry = useTelemetry()
  const [dpr, setDpr] = useState(1.75)
  const [degraded, setDegraded] = useState(false)

  return (
    <>
      <Canvas
        dpr={[1, dpr]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 40, position: [0, 0.5, 9], near: 0.1, far: 100 }}
        frameloop={hangarOpen ? 'never' : 'always'}
        style={{ position: 'fixed', inset: 0 }}
      >
        <color attach="background" args={[C.bg]} />
        <fog attach="fog" args={[C.bg, 12, 26]} />
        <PerformanceMonitor
          onDecline={() => { setDpr(1); setDegraded(true) }}
          onIncline={() => { setDpr(1.75); setDegraded(false) }}
          flipflops={3}
          onFallback={() => { setDpr(1); setDegraded(true) }}
        />
        <Suspense fallback={null}>
          <ScrollControls pages={PAGES} damping={0.25}>
            <Lights />
            <MegatronModel coreLoad={telemetry.data.coreLoad} />
            <PhysicsPlayground />
            <ScrollBridge />
            <Scroll html style={{ width: '100%' }}>
              <Headlines />
            </Scroll>
          </ScrollControls>
          <Effects degraded={degraded} />
        </Suspense>
      </Canvas>
      <HUD telemetry={telemetry} />
      {hangarOpen && (
        <Suspense fallback={<div className="panel display" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', color: C.cyan, fontSize: 12 }}>Pressurizing hangar…</div>}>
          <BabylonHangar onClose={() => setHangarOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
