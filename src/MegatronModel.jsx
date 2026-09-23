import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import {
  BoxGeometry, CapsuleGeometry, Color, CylinderGeometry, IcosahedronGeometry, MathUtils,
  MeshStandardMaterial, OctahedronGeometry, SphereGeometry, TorusGeometry
} from 'three'
import { C, SCROLL, easeInOut } from './tokens.js'

const GEO = {
  box: BoxGeometry, cyl: CylinderGeometry, sphere: SphereGeometry, torus: TorusGeometry,
  ico: IcosahedronGeometry, capsule: CapsuleGeometry, octa: OctahedronGeometry
}

const HALF_PI = Math.PI / 2
const TAU = Math.PI * 2

const mirror = (part) => [
  { ...part, id: `${part.id}L`, pos: [-part.pos[0], part.pos[1], part.pos[2]], dir: [-part.dir[0], part.dir[1], part.dir[2]], rot: part.rot && [part.rot[0], -part.rot[1], -part.rot[2]] },
  { ...part, id: `${part.id}R` }
]

const PARTS = [
  { id: 'helmet', geo: 'box', args: [0.7, 0.62, 0.66], pos: [0, 2.15, 0], mat: 'chrome', dir: [0, 1, 0.2], dist: 1.4 },
  { id: 'crest', geo: 'box', args: [0.12, 0.3, 0.72], pos: [0, 2.52, -0.02], mat: 'gunmetal', dir: [0, 1, -0.2], dist: 2.1 },
  { id: 'visor', geo: 'box', args: [0.56, 0.1, 0.05], pos: [0, 2.18, 0.34], mat: 'cyan', dir: [0, 0.6, 1], dist: 1.9 },
  ...mirror({ id: 'horn', geo: 'cyl', args: [0.02, 0.07, 0.42, 6], pos: [0.36, 2.42, 0], rot: [0, 0, -0.5], mat: 'amber', dir: [1, 1, 0], dist: 1.9 }),
  { id: 'neck', geo: 'cyl', args: [0.18, 0.22, 0.3, 12], pos: [0, 1.75, 0], mat: 'gunmetal', dir: [0, 1, 0], dist: 0.6 },
  { id: 'torso', geo: 'box', args: [1.5, 1.2, 0.8], pos: [0, 1.05, 0], mat: 'chrome', dir: [0, 0, -1], dist: 0.8 },
  ...mirror({ id: 'chest', geo: 'box', args: [0.6, 0.5, 0.12], pos: [0.42, 1.3, 0.44], mat: 'gunmetal', dir: [1, 0.2, 1], dist: 1.3 }),
  ...mirror({ id: 'flank', geo: 'box', args: [0.04, 0.9, 0.5], pos: [0.77, 1.05, 0], mat: 'amber', dir: [1, 0, 0], dist: 1.1 }),
  { id: 'reactorRing', geo: 'torus', args: [0.28, 0.06, 12, 40], pos: [0, 1.0, 0.44], mat: 'chrome', dir: [0, 0, 1], dist: 2.0 },
  { id: 'core', geo: 'ico', args: [0.19, 1], pos: [0, 1.0, 0.46], mat: 'core', dir: [0, 0, 1], dist: 2.7 },
  ...mirror({ id: 'thruster', geo: 'cyl', args: [0.14, 0.2, 0.6, 12], pos: [0.32, 1.2, -0.58], rot: [HALF_PI, 0, 0], mat: 'gunmetal', dir: [0.3, 0.2, -1], dist: 1.5 }),
  ...mirror({ id: 'exhaust', geo: 'cyl', args: [0.12, 0.12, 0.04, 12], pos: [0.32, 1.2, -0.9], rot: [HALF_PI, 0, 0], mat: 'violet', dir: [0.3, 0.2, -1], dist: 2.1 }),
  { id: 'abdomen', geo: 'cyl', args: [0.45, 0.55, 0.5, 8], pos: [0, 0.25, 0], mat: 'gunmetal', dir: [0, -0.3, -1], dist: 0.6 },
  { id: 'hips', geo: 'box', args: [1.1, 0.35, 0.6], pos: [0, -0.15, 0], mat: 'chrome', dir: [0, -1, 0], dist: 0.7 },
  ...mirror({ id: 'pauldron', geo: 'sphere', args: [0.42, 24, 16, 0, TAU, 0, HALF_PI], pos: [1.0, 1.52, 0], mat: 'chrome', dir: [1, 0.6, 0], dist: 1.8 }),
  ...mirror({ id: 'pauldronTrim', geo: 'torus', args: [0.41, 0.035, 8, 40], pos: [1.0, 1.52, 0], rot: [HALF_PI, 0, 0], mat: 'amber', dir: [1, 0.6, 0], dist: 1.8 }),
  ...mirror({ id: 'upperArm', geo: 'capsule', args: [0.18, 0.6, 6, 12], pos: [1.05, 0.95, 0], mat: 'gunmetal', dir: [1, 0, 0], dist: 1.3 }),
  ...mirror({ id: 'lowerArm', geo: 'box', args: [0.36, 0.75, 0.4], pos: [1.1, 0.15, 0.08], mat: 'chrome', dir: [1, -0.4, 0.3], dist: 1.6 }),
  ...mirror({ id: 'fist', geo: 'box', args: [0.3, 0.28, 0.32], pos: [1.1, -0.36, 0.1], mat: 'gunmetal', dir: [0.6, -1, 0.4], dist: 1.9 }),
  ...mirror({ id: 'thigh', geo: 'capsule', args: [0.22, 0.7, 6, 12], pos: [0.35, -0.8, 0], mat: 'gunmetal', dir: [0.6, -1, 0], dist: 1.2 }),
  ...mirror({ id: 'knee', geo: 'octa', args: [0.14], pos: [0.38, -1.25, 0.26], mat: 'amber', dir: [0.5, -0.4, 1], dist: 1.9 }),
  ...mirror({ id: 'shin', geo: 'box', args: [0.42, 0.9, 0.5], pos: [0.38, -1.75, 0.02], mat: 'chrome', dir: [0.7, -1, 0.2], dist: 1.6 }),
  ...mirror({ id: 'foot', geo: 'box', args: [0.46, 0.2, 0.75], pos: [0.4, -2.3, 0.12], mat: 'gunmetal', dir: [0.4, -1, 0.6], dist: 1.8 })
].map((p) => {
  const l = Math.hypot(p.dir[0], p.dir[1], p.dir[2]) || 1
  return { ...p, dir: [p.dir[0] / l, p.dir[1] / l, p.dir[2] / l] }
})

const CORE_INDEX = PARTS.findIndex((p) => p.id === 'core')

const glow = (hex, intensity) => new MeshStandardMaterial({ color: '#000000', emissive: new Color(hex), emissiveIntensity: intensity, toneMapped: false, roughness: 0.4 })

export default function MegatronModel({ coreLoad = 50 }) {
  const scroll = useScroll()
  const group = useRef()
  const meshes = useRef([])
  const load = useRef(coreLoad)
  const anim = useRef({ rot: 0, explode: 0, scale: 1 })
  load.current = coreLoad

  const materials = useMemo(() => ({
    chrome: new MeshStandardMaterial({ color: C.chromeHi, metalness: 1, roughness: 0.18, envMapIntensity: 1.4 }),
    gunmetal: new MeshStandardMaterial({ color: C.chromeLo, metalness: 0.9, roughness: 0.45 }),
    cyan: glow(C.cyan, 4),
    core: glow(C.cyan, 5),
    amber: glow(C.amber, 2.6),
    violet: glow(C.violet, 3.5)
  }), [])

  const geometries = useMemo(() => PARTS.map((p) => new GEO[p.geo](...p.args)), [])

  useEffect(() => () => {
    geometries.forEach((g) => g.dispose())
    Object.values(materials).forEach((m) => m.dispose())
  }, [geometries, materials])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const a = anim.current
    const rotT = easeInOut(scroll.range(SCROLL.rotate[0], SCROLL.rotate[1]))
    const sway = Math.sin(t * 0.6) * 0.22 * (1 - rotT)
    a.rot = MathUtils.damp(a.rot, TAU * rotT + sway, 6, delta)
    a.explode = MathUtils.damp(a.explode, easeInOut(scroll.range(SCROLL.explode[0], SCROLL.explode[1])), 7, delta)
    a.scale = MathUtils.damp(a.scale, 1 - scroll.range(SCROLL.physics[0], 0.1), 8, delta)

    // landscape: shift right of the text column; portrait: shrink and lift above the bottom text block
    const landscape = state.size.width / state.size.height > 1.1
    const fit = landscape ? 1 : Math.min(1, state.viewport.width / 4.8)
    g.rotation.y = a.rot
    g.position.x = landscape ? Math.min(1.4, state.viewport.width * 0.12) : 0
    g.position.y = (landscape ? 0.2 : 0.95) + Math.sin(t * 1.1) * 0.05 * (1 - a.explode)
    g.scale.setScalar(0.85 * fit * Math.max(a.scale, 0.0001))
    g.visible = a.scale > 0.002

    for (let i = 0; i < PARTS.length; i++) {
      const p = PARTS[i]
      const m = meshes.current[i]
      const k = p.dist * a.explode * 0.8
      m.position.set(p.pos[0] + p.dir[0] * k, p.pos[1] + p.dir[1] * k, p.pos[2] + p.dir[2] * k)
    }

    // pulse frequency and floor intensity both scale with reported core load (0-100)
    const l = load.current / 100
    const pulse = 0.5 + 0.5 * Math.sin(t * (2 + l * 6))
    materials.core.emissiveIntensity = 3 + l * 4 + pulse * (1.5 + l * 2)
    materials.cyan.emissiveIntensity = 3 + pulse * 1.2
    const core = meshes.current[CORE_INDEX]
    core.rotation.x += delta * (0.6 + l * 2)
    core.rotation.y += delta * (0.9 + l * 3)
    core.scale.setScalar(1 + pulse * 0.12 * (0.5 + l))
  })

  return (
    <group ref={group}>
      {PARTS.map((p, i) => (
        <mesh
          key={p.id}
          ref={(el) => { meshes.current[i] = el }}
          geometry={geometries[i]}
          material={materials[p.mat]}
          position={p.pos}
          rotation={p.rot || [0, 0, 0]}
        />
      ))}
    </group>
  )
}
