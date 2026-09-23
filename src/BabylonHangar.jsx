import { useEffect, useRef, useState } from 'react'
import {
  Color3, Color4, DynamicTexture, Engine, GlowLayer, HemisphericLight, MeshBuilder, PBRMaterial,
  PointerEventTypes, Scene, SpotLight, StandardMaterial, TransformNode, UniversalCamera, Vector3
} from '@babylonjs/core'
import { C, FONT } from './tokens.js'

const W = 30, H = 14, D = 40
const TERMINALS = [
  { id: 'T-01', label: 'REACTOR DIAGNOSTICS', pos: [-12, 1.1, -8], color: C.cyan, glow: 'cyan' },
  { id: 'T-02', label: 'ARMOR FABRICATION', pos: [12, 1.1, -8], color: C.amber, glow: 'amber' },
  { id: 'T-03', label: 'NEURAL UPLINK', pos: [0, 1.1, -17], color: C.violet, glow: 'violet' }
]

const hex = (h) => Color3.FromHexString(h)

function drawFloor(albedo, emissive) {
  const size = albedo.getSize().width
  const a = albedo.getContext()
  const e = emissive.getContext()
  const ppmX = size / W, ppmZ = size / D
  a.fillStyle = '#0a0e13'
  a.fillRect(0, 0, size, size)
  e.fillStyle = '#000000'
  e.fillRect(0, 0, size, size)
  e.strokeStyle = C.cyan
  a.strokeStyle = '#123a44'
  for (let x = 0; x <= W; x++) {
    const px = x * ppmX
    e.lineWidth = x % 5 === 0 ? 3 : 1
    a.lineWidth = e.lineWidth
    e.globalAlpha = x % 5 === 0 ? 0.9 : 0.35
    e.beginPath(); e.moveTo(px, 0); e.lineTo(px, size); e.stroke()
    a.beginPath(); a.moveTo(px, 0); a.lineTo(px, size); a.stroke()
  }
  for (let z = 0; z <= D; z++) {
    const pz = z * ppmZ
    e.lineWidth = z % 5 === 0 ? 3 : 1
    a.lineWidth = e.lineWidth
    e.globalAlpha = z % 5 === 0 ? 0.9 : 0.35
    e.beginPath(); e.moveTo(0, pz); e.lineTo(size, pz); e.stroke()
    a.beginPath(); a.moveTo(0, pz); a.lineTo(size, pz); a.stroke()
  }
  e.globalAlpha = 1
  const stripes = (ctx, x, y, w, h, color) => {
    ctx.save()
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
    ctx.fillStyle = '#0C1117'; ctx.fillRect(x, y, w, h)
    ctx.fillStyle = color
    const step = 36
    for (let i = -h; i < w + h; i += step) {
      ctx.beginPath()
      ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + step / 2, y + h); ctx.lineTo(x + i + step / 2 + h, y); ctx.lineTo(x + i + h, y)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
  const band = 0.9 * ppmX
  stripes(a, 0, 0, size, band, C.amber)
  stripes(a, 0, size - band, size, band, C.amber)
  stripes(a, 0, 0, band, size, C.amber)
  stripes(a, size - band, 0, band, size, C.amber)
  const cx = size / 2, cz = size / 2
  a.save()
  a.beginPath(); a.arc(cx, cz, 4.2 * ppmX, 0, Math.PI * 2); a.arc(cx, cz, 3.4 * ppmX, 0, Math.PI * 2, true); a.clip('evenodd')
  stripes(a, cx - 5 * ppmX, cz - 5 * ppmX, 10 * ppmX, 10 * ppmX, C.amber)
  a.restore()
  e.strokeStyle = C.cyan; e.lineWidth = 4
  e.beginPath(); e.arc(cx, cz, 4.4 * ppmX, 0, Math.PI * 2); e.stroke()
  albedo.update(); emissive.update()
}

function buildMiniMecha(scene, mats) {
  const root = new TransformNode('miniMecha', scene)
  const part = (name, mesh, pos, mat) => {
    mesh.position.set(pos[0], pos[1], pos[2])
    mesh.material = mat
    mesh.parent = root
    return mesh
  }
  part('torso', MeshBuilder.CreateBox('torso', { width: 1.5, height: 1.2, depth: 0.8 }, scene), [0, 3.1, 0], mats.chrome)
  part('helmet', MeshBuilder.CreateBox('helmet', { width: 0.7, height: 0.62, depth: 0.66 }, scene), [0, 4.2, 0], mats.chrome)
  part('visor', MeshBuilder.CreateBox('visor', { width: 0.56, height: 0.1, depth: 0.05 }, scene), [0, 4.23, 0.34], mats.cyan)
  part('ring', MeshBuilder.CreateTorus('ring', { diameter: 0.56, thickness: 0.12, tessellation: 40 }, scene), [0, 3.05, 0.44], mats.chrome).rotation.x = Math.PI / 2
  part('core', MeshBuilder.CreateIcoSphere('core', { radius: 0.19, subdivisions: 1 }, scene), [0, 3.05, 0.46], mats.cyan)
  part('abdomen', MeshBuilder.CreateCylinder('abdomen', { diameterTop: 0.9, diameterBottom: 1.1, height: 0.5, tessellation: 8 }, scene), [0, 2.3, 0], mats.gunmetal)
  part('hips', MeshBuilder.CreateBox('hips', { width: 1.1, height: 0.35, depth: 0.6 }, scene), [0, 1.9, 0], mats.chrome)
  for (const s of [-1, 1]) {
    part(`pauldron${s}`, MeshBuilder.CreateSphere(`pauldron${s}`, { diameter: 0.84, slice: 0.5, segments: 16 }, scene), [s * 1.0, 3.57, 0], mats.chrome)
    part(`arm${s}`, MeshBuilder.CreateCapsule(`arm${s}`, { radius: 0.18, height: 0.96 }, scene), [s * 1.05, 3.0, 0], mats.gunmetal)
    part(`forearm${s}`, MeshBuilder.CreateBox(`forearm${s}`, { width: 0.36, height: 0.75, depth: 0.4 }, scene), [s * 1.1, 2.2, 0.08], mats.chrome)
    part(`thigh${s}`, MeshBuilder.CreateCapsule(`thigh${s}`, { radius: 0.22, height: 1.14 }, scene), [s * 0.35, 1.25, 0], mats.gunmetal)
    part(`knee${s}`, MeshBuilder.CreatePolyhedron(`knee${s}`, { type: 1, size: 0.14 }, scene), [s * 0.38, 0.8, 0.26], mats.amber)
    part(`shin${s}`, MeshBuilder.CreateBox(`shin${s}`, { width: 0.42, height: 0.9, depth: 0.5 }, scene), [s * 0.38, 0.3, 0.02], mats.chrome)
  }
  root.scaling.setAll(0.9)
  return root
}

export default function BabylonHangar({ onClose }) {
  const canvasRef = useRef()
  const [hover, setHover] = useState(null)
  const [locked, setLocked] = useState(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: 'high-performance' }, true)
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.75))
    const scene = new Scene(engine)
    scene.clearColor = Color4.FromHexString(`${C.bg}FF`)
    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = 0.028
    scene.fogColor = hex(C.bg)
    scene.gravity = new Vector3(0, -0.5, 0)
    scene.collisionsEnabled = true

    const camera = new UniversalCamera('cam', new Vector3(0, 1.7, 14), scene)
    camera.setTarget(new Vector3(0, 2.2, 0))
    camera.attachControl(canvas, true)
    camera.inputs.removeByType('FreeCameraTouchInput')
    camera.applyGravity = true
    camera.checkCollisions = true
    camera.ellipsoid = new Vector3(0.5, 0.85, 0.5)
    camera.minZ = 0.05
    camera.speed = 0.22
    camera.angularSensibility = 2200
    camera.keysUp = [87, 38]
    camera.keysDown = [83, 40]
    camera.keysLeft = [65, 37]
    camera.keysRight = [68, 39]

    new HemisphericLight('hemi', new Vector3(0, 1, 0), scene).intensity = 0.25

    const mats = {
      obsidian: Object.assign(new PBRMaterial('obsidian', scene), { albedoColor: hex(C.panel), metallic: 0.6, roughness: 0.55 }),
      chrome: Object.assign(new PBRMaterial('chrome', scene), { albedoColor: hex(C.chromeHi), metallic: 0.85, roughness: 0.22 }),
      gunmetal: Object.assign(new PBRMaterial('gunmetal', scene), { albedoColor: hex(C.chromeLo), metallic: 0.9, roughness: 0.45 }),
      cyan: Object.assign(new StandardMaterial('cyanGlow', scene), { emissiveColor: hex(C.cyan), diffuseColor: Color3.Black(), disableLighting: true }),
      amber: Object.assign(new StandardMaterial('amberGlow', scene), { emissiveColor: hex(C.amber), diffuseColor: Color3.Black(), disableLighting: true }),
      violet: Object.assign(new StandardMaterial('violetGlow', scene), { emissiveColor: hex(C.violet), diffuseColor: Color3.Black(), disableLighting: true })
    }

    const floorAlbedo = new DynamicTexture('floorAlbedo', { width: 2048, height: 2048 }, scene, true)
    const floorEmissive = new DynamicTexture('floorEmissive', { width: 2048, height: 2048 }, scene, true)
    drawFloor(floorAlbedo, floorEmissive)
    const floorMat = new PBRMaterial('floor', scene)
    floorMat.albedoTexture = floorAlbedo
    floorMat.emissiveTexture = floorEmissive
    floorMat.emissiveColor = Color3.White()
    floorMat.metallic = 0.7
    floorMat.roughness = 0.35

    const box = (name, w, h, d, x, y, z, mat, collide = true) => {
      const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene)
      m.position.set(x, y, z)
      m.material = mat
      m.checkCollisions = collide
      return m
    }
    const floor = MeshBuilder.CreateGround('floor', { width: W, height: D }, scene)
    floor.material = floorMat
    floor.checkCollisions = true
    box('ceiling', W, 0.3, D, 0, H + 0.15, 0, mats.obsidian)
    box('wallL', 0.4, H, D, -W / 2 - 0.2, H / 2, 0, mats.obsidian)
    box('wallR', 0.4, H, D, W / 2 + 0.2, H / 2, 0, mats.obsidian)
    box('wallB', W, H, 0.4, 0, H / 2, -D / 2 - 0.2, mats.obsidian)
    box('wallF', W, H, 0.4, 0, H / 2, D / 2 + 0.2, mats.obsidian)
    for (let z = -D / 2 + 2; z <= D / 2 - 2; z += 4) {
      box(`rib${z}`, W, 0.5, 0.35, 0, H - 0.25, z, mats.chrome, false)
      box(`ribL${z}`, 0.35, H, 0.35, -W / 2 + 0.18, H / 2, z, mats.chrome)
      box(`ribR${z}`, 0.35, H, 0.35, W / 2 - 0.18, H / 2, z, mats.chrome)
      box(`strip${z}`, W - 2, 0.06, 0.08, 0, H - 0.52, z, z % 8 === 2 || z % 8 === -6 ? mats.cyan : mats.violet, false)
    }
    box('doorFrame', 8, 6, 0.3, 0, 3, -D / 2 + 0.1, mats.gunmetal)
    box('doorStripe', 8, 0.25, 0.32, 0, 6.1, -D / 2 + 0.1, mats.amber, false)

    const pedestal = MeshBuilder.CreateCylinder('pedestal', { diameterTop: 5, diameterBottom: 6, height: 0.8, tessellation: 48 }, scene)
    pedestal.position.y = 0.4
    pedestal.material = mats.gunmetal
    pedestal.checkCollisions = true
    const pedRing = MeshBuilder.CreateTorus('pedRing', { diameter: 5.1, thickness: 0.08, tessellation: 64 }, scene)
    pedRing.position.y = 0.82
    pedRing.material = mats.cyan
    const mecha = buildMiniMecha(scene, mats)
    mecha.position.y = 0.8

    const center = new Vector3(0, 2, 0)
    const terminals = TERMINALS.map((t) => {
      const anchor = new TransformNode(`${t.id}anchor`, scene)
      anchor.position.set(t.pos[0], 0, t.pos[2])
      anchor.lookAt(new Vector3(0, 0, 0))
      const base = box(`${t.id}base`, 1.6, 1.8, 0.8, 0, 0.9, 0, mats.gunmetal)
      const screen = box(`${t.id}screen`, 1.3, 0.8, 0.06, 0, 1.45, 0.44, mats[t.glow], false)
      base.parent = anchor
      screen.parent = anchor
      screen.rotation.x = -0.25
      base.metadata = { terminal: t }
      screen.metadata = { terminal: t }
      return screen
    })
    const spot = (name, pos, color, intensity) => {
      const s = new SpotLight(name, new Vector3(...pos), new Vector3(0, -1, 0), Math.PI / 4, 8, scene)
      s.diffuse = hex(color)
      s.specular = hex(color)
      s.setDirectionToTarget(center)
      s.intensity = intensity
      s.range = 40
      return s
    }
    spot('spotCyan', [-9, H - 1, 8], C.cyan, 260)
    spot('spotAmber', [9, H - 1, 8], C.amber, 200)
    spot('spotViolet', [0, H - 1, -12], C.violet, 240)
    spot('spotWhite', [0, H - 0.8, 2], '#FFFFFF', 320)

    const glow = new GlowLayer('glow', scene, { mainTextureSamples: 2 })
    glow.intensity = 0.8

    let t = 0
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000
      t += dt
      mecha.rotation.y += dt * 0.35
      pedRing.scaling.setAll(1 + Math.sin(t * 2.2) * 0.015)
      terminals.forEach((m, i) => { m.visibility = 0.8 + Math.sin(t * 3 + i * 2) * 0.2 })
    })

    let last = null
    scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERMOVE) return
      const isLocked = document.pointerLockElement === canvas
      const x = isLocked ? engine.getRenderWidth() / 2 : scene.pointerX
      const y = isLocked ? engine.getRenderHeight() / 2 : scene.pointerY
      const pick = scene.pick(x, y, (m) => !!(m.metadata && m.metadata.terminal))
      const hit = pick && pick.hit && pick.distance < 12 ? pick.pickedMesh.metadata.terminal : null
      const key = hit ? hit.id : null
      if (key !== last) {
        last = key
        const scale = engine.getHardwareScalingLevel()
        setHover(hit ? { ...hit, x: isLocked ? window.innerWidth / 2 : x * scale, y: isLocked ? window.innerHeight / 2 : y * scale } : null)
      }
    })

    const requestLock = (e) => { if (e.pointerType !== 'touch' && document.pointerLockElement !== canvas) canvas.requestPointerLock() }
    const onLockChange = () => setLocked(document.pointerLockElement === canvas)
    let touchId = null, tx = 0, ty = 0
    const onTouchDown = (e) => { if (e.pointerType === 'touch' && touchId === null) { touchId = e.pointerId; tx = e.clientX; ty = e.clientY } }
    const onTouchMove = (e) => {
      if (e.pointerId !== touchId) return
      camera.rotation.y += (e.clientX - tx) * 0.005
      camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x + (e.clientY - ty) * 0.005))
      tx = e.clientX; ty = e.clientY
    }
    const onTouchUp = (e) => { if (e.pointerId === touchId) touchId = null }
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    const onResize = () => engine.resize()

    canvas.addEventListener('click', requestLock)
    canvas.addEventListener('pointerdown', onTouchDown)
    canvas.addEventListener('pointermove', onTouchMove)
    canvas.addEventListener('pointerup', onTouchUp)
    canvas.addEventListener('pointercancel', onTouchUp)
    document.addEventListener('pointerlockchange', onLockChange)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    canvas.focus()
    engine.runRenderLoop(() => scene.render())

    return () => {
      canvas.removeEventListener('click', requestLock)
      canvas.removeEventListener('pointerdown', onTouchDown)
      canvas.removeEventListener('pointermove', onTouchMove)
      canvas.removeEventListener('pointerup', onTouchUp)
      canvas.removeEventListener('pointercancel', onTouchUp)
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    }
  }, [])

  return (
    <div className="fade-enter" style={{ position: 'fixed', inset: 0, zIndex: 60, background: C.bg }}>
      <canvas ref={canvasRef} tabIndex={0} style={{ width: '100%', height: '100%', outline: 'none' }} />
      <div className="scanlines" style={{ position: 'absolute', zIndex: 1 }} />
      <div className="hazard" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, zIndex: 2 }} />
      <div className="panel brackets" style={{ position: 'absolute', left: 20, top: 24, zIndex: 2, padding: '10px 14px', pointerEvents: 'none' }}>
        <div className="display" style={{ fontSize: 12, color: C.amber }}>HANGAR BAY 07</div>
        <div className="mono" style={{ fontSize: 11, color: C.text2, marginTop: 6, lineHeight: 1.6 }}>
          WASD / ARROWS · MOVE<br />{locked ? 'MOUSE · LOOK  ·  ESC · RELEASE' : 'CLICK · LOCK VIEW  ·  DRAG (TOUCH) · LOOK'}<br />ESC · EXIT HANGAR
        </div>
      </div>
      <button className="hud-btn amber brackets" style={{ position: 'absolute', right: 20, top: 24, zIndex: 3 }} onClick={() => closeRef.current()}>
        Close ✕
      </button>
      {locked && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 14, height: 14, marginLeft: -7, marginTop: -7, zIndex: 2, pointerEvents: 'none', border: `1px solid ${C.cyan}`, borderRadius: '50%' }} />
      )}
      {hover && (
        <div
          className="panel brackets"
          style={{
            position: 'absolute', left: hover.x + 18, top: hover.y - 18, zIndex: 3, pointerEvents: 'none',
            padding: '8px 12px', borderColor: hover.color, fontFamily: FONT.mono, fontSize: 11, color: C.text
          }}
        >
          <div className="display" style={{ fontSize: 11, color: hover.color }}>{hover.id}</div>
          <div style={{ marginTop: 4 }}>{hover.label}</div>
        </div>
      )}
    </div>
  )
}
