import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { CuboidCollider, InstancedRigidBodies, Physics, RigidBody } from '@react-three/rapier'
import { BoxGeometry, Color, IcosahedronGeometry, MeshStandardMaterial, Plane, Vector3 } from 'three'
import gsap from 'gsap'
import { C, SCROLL } from './tokens.js'
import { useStore } from './store.js'

const COUNT = 32
const RADIUS = 6
const FLOOR_Y = -3.5
const REPEL_RADIUS = 2.4
const Z_PLANE = new Plane(new Vector3(0, 0, 1), 0)
const _hit = new Vector3()
const _imp = new Vector3()
const _white = new Color('#ffffff')
const ACCENTS = [new Color(C.amber), new Color(C.violet)]
const ACTIVE = [SCROLL.physics[0] - 0.03, SCROLL.physics[1] + 0.06]

const rand = (a, b) => a + Math.random() * (b - a)

const makeInstances = (prefix) => Array.from({ length: COUNT }, (_, i) => {
  // uniform point in a sphere: cube-root radius, random direction
  const r = RADIUS * Math.cbrt(Math.random())
  const th = Math.random() * Math.PI * 2
  const ph = Math.acos(2 * Math.random() - 1)
  const s = rand(0.12, 0.34)
  return {
    key: `${prefix}${i}`,
    position: [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th) - 1],
    rotation: [rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)],
    scale: [s, s, s],
    linearVelocity: [rand(-1, 1), rand(-1, 1), rand(-1, 1)],
    angularVelocity: [rand(-2, 2), rand(-2, 2), rand(-2, 2)]
  }
})

const makeMaterial = () => {
  const m = new MeshStandardMaterial({ color: C.chromeHi, metalness: 1, roughness: 0.2, envMapIntensity: 1.4, transparent: true, opacity: 0 })
  m.onBeforeCompile = (shader) => {
    // accent instances (non-white instance color) get a fresnel rim emission pushed past the bloom threshold
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
#ifdef USE_COLOR
  float accent = step(0.5, 3.0 - (vColor.r + vColor.g + vColor.b));
  float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.5);
  totalEmissiveRadiance += vColor.rgb * accent * (0.35 + rim * 5.0);
#endif`
    )
  }
  m.customProgramCacheKey = () => 'debris-rim'
  return m
}

function DebrisSet({ geometry, material, colliders, prefix, gravity }) {
  const bodies = useRef()
  const mesh = useRef()
  const instances = useMemo(() => makeInstances(prefix), [prefix])
  const { camera, raycaster, pointer } = useThree()

  useEffect(() => {
    const m = mesh.current
    for (let i = 0; i < COUNT; i++) m.setColorAt(i, Math.random() < 0.2 ? ACCENTS[i % 2] : _white)
    m.instanceColor.needsUpdate = true
  }, [])

  useEffect(() => {
    if (gravity || !bodies.current) return
    bodies.current.forEach((b) => b && b.applyImpulse({ x: rand(-0.3, 0.3), y: rand(0.6, 1.4), z: rand(-0.3, 0.3) }, true))
  }, [gravity])

  useFrame(() => {
    const list = bodies.current
    const m = mesh.current
    if (!list || !m || material.opacity < 0.01) return
    raycaster.setFromCamera(pointer, camera)
    const hasHit = raycaster.ray.intersectPlane(Z_PLANE, _hit) !== null
    const arr = m.instanceMatrix.array
    for (let i = 0; i < list.length; i++) {
      const b = list[i]
      if (!b) continue
      const o = i * 16
      const x = arr[o + 12], y = arr[o + 13], z = arr[o + 14]
      const mass = b.mass()
      if (!gravity) {
        const d = Math.hypot(x, y, z)
        if (d > RADIUS) {
          const k = -(d - RADIUS) * 0.02 * mass / d
          b.applyImpulse(_imp.set(x * k, y * k, z * k), true)
        }
      }
      if (hasHit) {
        const dx = x - _hit.x, dy = y - _hit.y, dz = z - _hit.z
        const d = Math.hypot(dx, dy, dz)
        if (d < REPEL_RADIUS && d > 1e-4) {
          const k = (1 - d / REPEL_RADIUS) * 0.18 * mass / d
          b.applyImpulse(_imp.set(dx * k, dy * k, dz * k), true)
        }
      }
    }
  })

  return (
    <InstancedRigidBodies
      ref={bodies}
      instances={instances}
      colliders={colliders}
      restitution={0.6}
      linearDamping={0.05}
      angularDamping={0.05}
    >
      <instancedMesh ref={mesh} args={[geometry, material, COUNT]} frustumCulled={false} />
    </InstancedRigidBodies>
  )
}

function Enclosure() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[12, 0.25, 12]} position={[0, FLOOR_Y - 0.25, -1]} />
      <CuboidCollider args={[0.25, 10, 12]} position={[-9, FLOOR_Y + 10, -1]} />
      <CuboidCollider args={[0.25, 10, 12]} position={[9, FLOOR_Y + 10, -1]} />
      <CuboidCollider args={[12, 10, 0.25]} position={[0, FLOOR_Y + 10, -8]} />
      <CuboidCollider args={[12, 10, 0.25]} position={[0, FLOOR_Y + 10, 5.5]} />
    </RigidBody>
  )
}

export default function PhysicsPlayground() {
  const scroll = useScroll()
  const gravity = useStore((s) => s.gravity)
  const camera = useThree((s) => s.camera)
  const [paused, setPaused] = useState(true)
  const floor = useRef()
  const first = useRef(true)

  const geo = useMemo(() => ({ ico: new IcosahedronGeometry(1, 0), box: new BoxGeometry(1.4, 1.4, 1.4) }), [])
  const mat = useMemo(() => ({ ico: makeMaterial(), box: makeMaterial() }), [])
  const floorMat = useMemo(() => new MeshStandardMaterial({ color: C.panel, metalness: 0.9, roughness: 0.45, emissive: new Color(C.cyanDim), emissiveIntensity: 0.15, transparent: true, opacity: 0 }), [])

  useEffect(() => () => {
    geo.ico.dispose(); geo.box.dispose(); mat.ico.dispose(); mat.box.dispose(); floorMat.dispose()
  }, [geo, mat, floorMat])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const base = { x: camera.position.x, y: camera.position.y }
    const tl = gsap.timeline()
    tl.to(camera.position, { x: base.x + 0.14, y: base.y - 0.1, duration: 0.07, ease: 'power3.inOut' })
      .to(camera.position, { x: base.x, y: base.y, duration: 0.28, ease: 'back.out(3)' })
    return () => { tl.kill(); camera.position.x = base.x; camera.position.y = base.y }
  }, [gravity, camera])

  useFrame(() => {
    const fadeIn = scroll.range(SCROLL.physics[0] - 0.05, 0.08)
    const fadeOut = scroll.range(SCROLL.hangar[0] + 0.02, 0.06)
    const o = fadeIn * (1 - fadeOut)
    mat.ico.opacity = o
    mat.box.opacity = o
    floorMat.opacity = gravity ? o * 0.85 : 0
    if (floor.current) floor.current.visible = gravity && o > 0.01
    const nextPaused = !scroll.visible(ACTIVE[0], ACTIVE[1])
    if (nextPaused !== paused) setPaused(nextPaused)
  })

  return (
    <Physics gravity={[0, gravity ? -9.81 : 0, 0]} paused={paused}>
      <DebrisSet geometry={geo.ico} material={mat.ico} colliders="ball" prefix="i" gravity={gravity} />
      <DebrisSet geometry={geo.box} material={mat.box} colliders="cuboid" prefix="b" gravity={gravity} />
      {gravity && <Enclosure />}
      <mesh ref={floor} position={[0, FLOOR_Y - 0.02, -1.25]} rotation-x={-Math.PI / 2} material={floorMat} visible={false}>
        <planeGeometry args={[18, 13.5]} />
      </mesh>
    </Physics>
  )
}
