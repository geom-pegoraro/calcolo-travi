/**
 * Joint3D.jsx — Visualizzazione 3D Three.js per giunti parametrici
 * Supporta: endplate, beambeam, baseplateconc, cleat
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Maximize2, Minimize2, RotateCcw, Eye } from 'lucide-react'

const MM = 0.001  // mm → m

export default function Joint3D({ jointConfig, profilo, traveL = 3 }) {
  const mountRef  = useRef()
  const sceneRef  = useRef({})
  const [height,      setHeight]      = useState(380)
  const [isFullscreen,setFullscreen]  = useState(false)
  const [wireframe,   setWireframe]   = useState(false)
  const dragRef = useRef({ active: false, startY: 0, startH: 0 })

  // ── Resize handle ──
  const onDragStart = useCallback((e) => {
    dragRef.current = { active: true, startY: e.clientY, startH: height }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }, [height])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return
      setHeight(Math.max(200, Math.min(900, dragRef.current.startH + (e.clientY - dragRef.current.startY))))
    }
    const onUp = () => { dragRef.current.active = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const resetCamera = useCallback(() => {
    const s = sceneRef.current
    if (!s.spherical) return
    s.spherical.theta = 0.6; s.spherical.phi = 1.1; s.spherical.radius = 1.8
    if (s.target) { s.target.x = 0; s.target.y = 0; s.target.z = 0 }
  }, [])

  // ── Main Three.js init ──
  useEffect(() => {
    let THREE, animId

    async function init() {
      if (!window.THREE) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      THREE = window.THREE
      const mount = mountRef.current
      if (!mount) return

      const W = mount.clientWidth || 600
      const H = mount.clientHeight || height

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setClearColor(0x0f172a, 1)
      mount.appendChild(renderer.domElement)
      sceneRef.current.renderer = renderer

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x0f172a, 0.8)
      sceneRef.current.scene = scene

      // Grid
      const grid = new THREE.GridHelper(4, 20, 0x1e3a5f, 0x1e293b)
      grid.position.y = -0.8
      scene.add(grid)

      // Lights
      scene.add(new THREE.AmbientLight(0x334155, 1.2))
      const dir1 = new THREE.DirectionalLight(0xffffff, 1.4)
      dir1.position.set(3, 5, 4); dir1.castShadow = true; scene.add(dir1)
      const dir2 = new THREE.DirectionalLight(0x3b82f6, 0.6)
      dir2.position.set(-3, 2, -3); scene.add(dir2)
      const pt = new THREE.PointLight(0x06b6d4, 0.8, 6)
      pt.position.set(0, 1.5, 1); scene.add(pt)

      const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 100)
      sceneRef.current.camera = camera

      // Build joint scene
      buildJointScene(THREE, scene, jointConfig, profilo, traveL, wireframe)
      sceneRef.current.meshes = scene.children.filter(o => o.isMesh || o.isGroup)

      // Controls
      const controls = createOrbitControls(THREE, camera, renderer.domElement)
      sceneRef.current.controls  = controls
      sceneRef.current.spherical = controls.spherical
      sceneRef.current.target    = controls.target

      function animate() {
        animId = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      const ro = new ResizeObserver(() => {
        if (!mount) return
        const w = mount.clientWidth, h = mount.clientHeight
        if (w < 10 || h < 10) return
        camera.aspect = w / h; camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      })
      ro.observe(mount)
      sceneRef.current.ro = ro
    }

    init()

    return () => {
      cancelAnimationFrame(animId)
      sceneRef.current.ro?.disconnect()
      sceneRef.current.renderer?.domElement?.remove()
      sceneRef.current.renderer?.dispose()
    }
  }, [jointConfig, profilo, traveL, wireframe])

  return (
    <div style={{
      position: isFullscreen ? 'fixed' : 'relative',
      inset: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 1000 : 'auto',
      background: isFullscreen ? 'var(--bg-primary)' : 'transparent',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 10px', background: 'var(--bg-secondary)',
        border: '1px solid var(--border)', borderBottom: 'none',
        borderRadius: isFullscreen ? 0 : '8px 8px 0 0',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'rgba(148,163,184,0.5)', letterSpacing: '0.08em' }}>
          LMB·rotate &nbsp;|&nbsp; RMB·pan &nbsp;|&nbsp; SCROLL·zoom
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setWireframe(w => !w)}
            title="Toggle wireframe"
            style={{
              background: wireframe ? 'rgba(59,130,246,0.2)' : 'transparent',
              border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px',
              cursor: 'pointer', color: wireframe ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontFamily: 'JetBrains Mono', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 3,
            }}>
            <Eye size={11}/> WIRE
          </button>
          <button onClick={resetCamera} title="Reset camera"
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <RotateCcw size={11}/>
          </button>
          <button onClick={() => setFullscreen(f => !f)} title="Fullscreen"
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {isFullscreen ? <Minimize2 size={11}/> : <Maximize2 size={11}/>}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={mountRef} style={{
        width: '100%',
        height: isFullscreen ? 'calc(100vh - 60px)' : height,
        border: '1px solid var(--border)',
        borderRadius: isFullscreen ? 0 : '0 0 8px 8px',
        overflow: 'hidden',
      }}/>

      {/* Resize handle */}
      {!isFullscreen && (
        <div onMouseDown={onDragStart}
          style={{
            height: 8, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderTop: 'none', borderRadius: '0 0 8px 8px', cursor: 'ns-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <div style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--border)' }}/>
        </div>
      )}
    </div>
  )
}

// ─── Build joint scene ────────────────────────────────────────────────────────

function buildJointScene(THREE, scene, cfg, profilo, traveL, wireframe) {
  if (!cfg) return

  const h  = (profilo?.h  || 270) * MM
  const b  = (profilo?.b  || 135) * MM
  const tf = (profilo?.tf || 10.2) * MM
  const tw = (profilo?.tw || 6.6)  * MM
  const pw = (cfg.plate?.w || 140) * MM
  const ph = (cfg.plate?.h || 280) * MM
  const pt = (cfg.plate?.t || 15)  * MM

  // ── Materials ── (beam/column: light blue like CAD reference; plate/cleat: green)
  const matSteel = new THREE.MeshPhongMaterial({ color: 0x5ab4f0, specular: 0xaaddff, shininess: 90, wireframe })
  const matPlate = new THREE.MeshPhongMaterial({ color: 0x22c55e, specular: 0x86efac, shininess: 100, wireframe })
  const matBolt  = new THREE.MeshPhongMaterial({ color: 0x94a3b8, specular: 0xffffff, shininess: 120, wireframe })
  const matWeld  = new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x92400e, emissiveIntensity: 0.3, wireframe })
  const matStiff = new THREE.MeshPhongMaterial({ color: 0x22c55e, specular: 0x86efac, shininess: 80, wireframe })
  const matConc  = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 10, wireframe })
  const matCol   = new THREE.MeshPhongMaterial({ color: 0x5ab4f0, specular: 0xaaddff, shininess: 70, wireframe })

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    m.castShadow = true; m.receiveShadow = true
    scene.add(m)
    return m
  }

  const box  = (w, h, d) => new THREE.BoxGeometry(w, h, d)
  const cyl  = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg)

  // ── IPE beam helper (centered at origin, extending along -X) ──
  function addBeam(len, offsetX = 0, offsetY = 0, mat = matSteel) {
    const cx = offsetX - len / 2
    // bottom flange
    add(box(len, tf, b), mat, cx, offsetY - h / 2 + tf / 2, 0)
    // top flange
    add(box(len, tf, b), mat, cx, offsetY + h / 2 - tf / 2, 0)
    // web
    add(box(len, h - 2 * tf, tw), mat, cx, offsetY, 0)
  }

  // ─────────────────────────────────────────────────────────────────────
  if (cfg.tipo === 'endplate') {
    // Beam (left side, pointing toward plate)
    addBeam(traveL * 0.5, -pt / 2 - traveL * 0.25, 0)

    // End plate
    add(box(pt, ph, pw), matPlate, -pt / 2, 0, 0)

    // Column (vertical HEB/IPE) — shifted so front flange touches the plate face
    const colW = 0.2, colH = 1.2, colT = 0.015
    const colX = pt / 2 + colT / 2   // front face of column flange = right face of plate
    add(box(colT, colH, colW), matCol, colX, 0, 0)           // web
    add(box(colT, colH, colT), matCol, colX, 0,  colW / 2)   // flange right
    add(box(colT, colH, colT), matCol, colX, 0, -colW / 2)   // flange left

    // Bolts on plate — shank spans from left face of plate through column flange
    ;(cfg.bolts || []).forEach(bl => {
      const bx = bl.x * MM, by = bl.y * MM
      const bd = (cfg.boltDiam || 20) * MM
      const shankL = pt + colT + 0.02   // crosses plate + column flange
      const shankCx = 0                  // centered on plate mid-plane (x=0 = center of plate)
      // shank
      add(cyl(bd / 2, bd / 2, shankL), matBolt, shankCx, by, bx, 0, 0, Math.PI / 2)
      // head (left side, outside plate)
      add(cyl(bd * 0.9, bd * 0.9, bd * 0.6, 6), matBolt, -pt / 2 - bd * 0.3, by, bx, 0, 0, Math.PI / 2)
      // nut (right side, outside column flange)
      add(cyl(bd * 0.9, bd * 0.9, bd * 0.6, 6), matBolt, pt / 2 + colT + bd * 0.3, by, bx, 0, 0, Math.PI / 2)
    })

    // Stiffeners (on beam side, against plate)
    ;(cfg.stiffeners || []).filter(s => s.enabled).forEach(s => {
      const sw = (s.w || 60) * MM, sh = (s.h || 80) * MM, st = (s.t || 8) * MM
      const sy = (s.posY || 0) * MM
      // two sides, flush against beam flanges, touching plate
      add(box(sh, st, sw), matStiff, -pt / 2 - sh / 2, sy,  (b / 2 - sw / 2))
      add(box(sh, st, sw), matStiff, -pt / 2 - sh / 2, sy, -(b / 2 - sw / 2))
    })

    // Weld lines (amber strips along flanges)
    const weldT = (cfg.welds?.[0]?.a || 6) * MM || 0.006
    ;[-1, 1].forEach(sign => {
      const wy = sign * (h / 2 - tf)
      add(box(0.005, weldT, pw), matWeld, -pt / 2, wy, 0)
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  if (cfg.tipo === 'beambeam') {
    // Beam A (left)
    addBeam(traveL * 0.45, -pt / 2 - traveL * 0.45 / 2, 0)
    // Beam B (right)
    addBeam(traveL * 0.45, pt / 2 + traveL * 0.45 / 2, 0, new THREE.MeshPhongMaterial({ color: 0x5ab4f0, specular: 0xaaddff, shininess: 90, wireframe }))

    // Splice plate (vertical, covers web)
    add(box(pt, ph, pw), matPlate, 0, 0, 0)

    // Bolts — two sides
    ;(cfg.bolts || []).forEach(bl => {
      const bx = bl.x * MM, by = bl.y * MM
      const bd = (cfg.boltDiam || 20) * MM
      const shankL = pt + 0.03
      add(cyl(bd / 2, bd / 2, shankL), matBolt, 0, by, bx, 0, 0, Math.PI / 2)
      add(cyl(bd * 0.9, bd * 0.9, bd * 0.6, 6), matBolt, shankL / 2 + bd * 0.3, by, bx, 0, 0, Math.PI / 2)
      add(cyl(bd * 0.9, bd * 0.9, bd * 0.6, 6), matBolt, -shankL / 2 - bd * 0.3, by, bx, 0, 0, Math.PI / 2)
    })

    // Welds
    const weldT = (cfg.welds?.[0]?.a || 6) * MM || 0.006
    ;[-1, 1].forEach(sign => {
      const wy = sign * (h / 2 - tf)
      add(box(0.005, weldT, pw), matWeld, -pt / 2 - 0.003, wy, 0)
      add(box(0.005, weldT, pw), matWeld,  pt / 2 + 0.003, wy, 0)
    })
  }

  // ─────────────────────────────────────────────────────────────────────
  if (cfg.tipo === 'baseplateconc') {
    // Column (vertical beam)
    const colLen = 0.6
    add(box(tf, colLen, b), matSteel, 0, colLen / 2, 0)  // bottom flange
    add(box(tf, colLen, b), matSteel, 0, colLen / 2, 0)  // top flange (same visual simplification)
    add(box(tw, colLen, h - 2 * tf), matSteel, 0, colLen / 2, 0)  // web

    // Base plate
    add(box(pw, pt, ph), matPlate, 0, -pt / 2, 0)

    // Grout layer
    const grout = (cfg.groutThickness || 30) * MM
    add(box(pw * 1.1, grout, ph * 1.1), matConc, 0, -pt - grout / 2, 0)

    // Concrete block
    add(box(pw * 1.5, 0.15, ph * 1.5), matConc, 0, -pt - grout - 0.075, 0)

    // Anchor bolts
    ;(cfg.bolts || []).forEach(bl => {
      const bz = bl.x * MM, bx = bl.y * MM
      const bd = (cfg.boltDiam || 24) * MM
      const ancLen = (cfg.anchorLength || 400) * MM
      add(cyl(bd / 2, bd / 2, ancLen), matBolt, bx, -pt - grout - ancLen / 2, bz)
      // Hook at bottom
      add(cyl(bd * 0.9, bd * 0.9, bd * 0.6, 6), matBolt, bx, -pt - grout - ancLen + bd * 0.3, bz)
      // Nut at top
      add(cyl(bd * 0.9, bd * 0.9, bd * 0.6, 6), matBolt, bx, 0, bz)
    })

    // Welds
    const weldT = (cfg.welds?.[0]?.a || 8) * MM || 0.008
    add(box(pw, weldT, weldT), matWeld, 0, -weldT / 2, ph / 2)
    add(box(pw, weldT, weldT), matWeld, 0, -weldT / 2, -ph / 2)
  }

  // ─────────────────────────────────────────────────────────────────────
  if (cfg.tipo === 'cleat') {
    // Beam
    addBeam(traveL * 0.5, -traveL * 0.25, 0)

    const cw = (cfg.cleat?.w || 90) * MM
    const ch = (cfg.cleat?.h || (profilo?.h || 270) * MM - 2 * tf - 10 * MM)
    const ct = (cfg.cleat?.t || 10) * MM

    // Two cleats (one each side of web)
    ;[-1, 1].forEach(sign => {
      const zOff = sign * (tw / 2 + ct / 2)
      // vertical leg (against support)
      add(box(ct, ch, cw), matPlate, cw / 2, 0, zOff)
      // horizontal leg (against beam web)
      add(box(cw, ch, ct), matPlate, 0, 0, zOff + sign * (cw / 2 + ct / 2))
    })

    // Bolts on web
    ;(cfg.bolts || []).forEach(bl => {
      const by = bl.y * MM, bz = bl.x * MM
      const bd = (cfg.boltDiam || 20) * MM
      const shankL = 0.06
      add(cyl(bd / 2, bd / 2, shankL), matBolt, cw / 2, by, bz, 0, 0, Math.PI / 2)
      add(cyl(bd * 0.9, bd * 0.9, bd * 0.6, 6), matBolt, cw / 2 + shankL / 2 + bd * 0.3, by, bz, 0, 0, Math.PI / 2)
    })

    // Support surface
    add(box(0.02, 0.8, 0.4), matCol, cw + 0.01, 0, 0)
  }
}

// ─── OrbitControls with damping ───────────────────────────────────────────────
function createOrbitControls(THREE, camera, domElement) {
  const spherical = { theta: 0.6, phi: 1.1, radius: 1.8 }
  const target    = new THREE.Vector3()
  const vel       = { theta: 0, phi: 0 }
  const DAMP      = 0.86
  const state     = { rotating: false, panning: false, prev: { x: 0, y: 0 } }

  const updateCamera = () => {
    const { theta, phi, radius } = spherical
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    )
    camera.lookAt(target)
  }

  domElement.addEventListener('mousedown', e => {
    if (e.button === 0) state.rotating = true
    if (e.button === 2) state.panning  = true
    state.prev = { x: e.clientX, y: e.clientY }
  })
  window.addEventListener('mouseup', () => { state.rotating = false; state.panning = false })
  window.addEventListener('mousemove', e => {
    const dx = e.clientX - state.prev.x, dy = e.clientY - state.prev.y
    state.prev = { x: e.clientX, y: e.clientY }
    if (state.rotating) { vel.theta -= dx * 0.007; vel.phi += dy * 0.007 }
    if (state.panning)  { const s = spherical.radius * 0.001; target.x -= dx * s; target.y += dy * s }
  })
  domElement.addEventListener('wheel', e => {
    spherical.radius = Math.max(0.3, Math.min(8, spherical.radius + e.deltaY * 0.001))
  }, { passive: true })
  domElement.addEventListener('contextmenu', e => e.preventDefault())

  // Touch
  let lastDist = null
  domElement.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { state.rotating = true; state.prev = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    if (e.touches.length === 2) { state.rotating = false; lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) }
  }, { passive: true })
  domElement.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && state.rotating) {
      const dx = e.touches[0].clientX - state.prev.x, dy = e.touches[0].clientY - state.prev.y
      state.prev = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      vel.theta -= dx * 0.007; vel.phi += dy * 0.007
    }
    if (e.touches.length === 2 && lastDist) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      spherical.radius = Math.max(0.3, Math.min(8, spherical.radius * (lastDist / d))); lastDist = d
    }
  }, { passive: true })
  domElement.addEventListener('touchend', () => { state.rotating = false; lastDist = null }, { passive: true })

  updateCamera()
  return {
    spherical, target,
    update() {
      spherical.theta += vel.theta; spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi + vel.phi))
      vel.theta *= DAMP; vel.phi *= DAMP
      updateCamera()
    }
  }
}
