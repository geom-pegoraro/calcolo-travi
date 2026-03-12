/**
 * Joint3D.jsx — Visualizzazione 3D Three.js per giunti parametrici
 * Supporta: endplate, beambeam, baseplateconc, cleat
 *
 * INTERAZIONE: attiva SOLO quando isFullscreen=true
 *   Fuori dal fullscreen il canvas è completamente passivo (nessun drag, zoom, pan)
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Maximize2, Minimize2, RotateCcw, Eye } from 'lucide-react'

const MM = 0.001

export default function Joint3D({ jointConfig, profilo, traveL = 3 }) {
  const mountRef        = useRef()
  const sceneRef        = useRef({})
  const isFullscreenRef = useRef(false)
  const [height,        setHeight]     = useState(380)
  const [isFullscreen,  setFullscreen] = useState(false)
  const [wireframe,     setWireframe]  = useState(false)
  const dragRef = useRef({ active: false, startY: 0, startH: 0 })

  useEffect(() => { isFullscreenRef.current = isFullscreen }, [isFullscreen])

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
    const onUp = () => {
      dragRef.current.active = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const resetCamera = useCallback(() => {
    const s = sceneRef.current
    if (!s.spherical) return
    s.spherical.theta = 0.6; s.spherical.phi = 1.1; s.spherical.radius = 1.8
    if (s.target) { s.target.x = 0; s.target.y = 0; s.target.z = 0 }
  }, [])

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

      const grid = new THREE.GridHelper(4, 20, 0x1e3a5f, 0x1e293b)
      grid.position.y = -0.8
      scene.add(grid)

      scene.add(new THREE.AmbientLight(0x334155, 1.2))
      const dir1 = new THREE.DirectionalLight(0xffffff, 1.4)
      dir1.position.set(3, 5, 4); dir1.castShadow = true; scene.add(dir1)
      const dir2 = new THREE.DirectionalLight(0x3b82f6, 0.6)
      dir2.position.set(-3, 2, -3); scene.add(dir2)
      const ptLight = new THREE.PointLight(0x06b6d4, 0.8, 6)
      ptLight.position.set(0, 1.5, 1); scene.add(ptLight)

      const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 100)
      sceneRef.current.camera = camera

      buildJointScene(THREE, scene, jointConfig, profilo, traveL, wireframe)

      const controls = createOrbitControls(THREE, camera, renderer.domElement, isFullscreenRef)
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
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: '0.58rem',
          color: isFullscreen ? 'rgba(148,163,184,0.5)' : 'rgba(148,163,184,0.2)',
          letterSpacing: '0.08em',
        }}>
          {isFullscreen ? 'LMB·rotate  |  RMB·pan  |  SCROLL·zoom' : '[ espandi per interagire ]'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {isFullscreen && (
            <>
              <button onClick={() => setWireframe(w => !w)} title="Toggle wireframe"
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
            </>
          )}
          <button
            onClick={() => setFullscreen(f => !f)}
            title={isFullscreen ? 'Esci da fullscreen' : 'Espandi per interagire'}
            style={{
              background: isFullscreen ? 'transparent' : 'rgba(59,130,246,0.12)',
              border: `1px solid ${isFullscreen ? 'var(--border)' : 'rgba(59,130,246,0.4)'}`,
              borderRadius: 4, padding: '3px 6px', cursor: 'pointer',
              color: isFullscreen ? 'var(--text-muted)' : 'var(--accent-blue)',
              display: 'flex', alignItems: 'center',
            }}>
            {isFullscreen ? <Minimize2 size={11}/> : <Maximize2 size={11}/>}
          </button>
        </div>
      </div>

      {/* Canvas — pointer-events disabilitati fuori dal fullscreen */}
      <div ref={mountRef} style={{
        width: '100%',
        height: isFullscreen ? 'calc(100vh - 60px)' : height,
        border: '1px solid var(--border)',
        borderRadius: isFullscreen ? 0 : '0 0 8px 8px',
        overflow: 'hidden',
        pointerEvents: isFullscreen ? 'auto' : 'none',
        cursor: isFullscreen ? 'grab' : 'default',
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

// ═══════════════════════════════════════════════════════════════════════════════
// buildJointScene
// ═══════════════════════════════════════════════════════════════════════════════
function buildJointScene(THREE, scene, cfg, profilo, traveL, wireframe) {
  if (!cfg) return

  const h  = (profilo?.h  || 270) * MM
  const b  = (profilo?.b  || 135) * MM
  const tf = (profilo?.tf || 10.2) * MM
  const tw = (profilo?.tw || 6.6)  * MM
  const pw = (cfg.plate?.w || 140) * MM
  const ph = (cfg.plate?.h || 280) * MM
  const pt = (cfg.plate?.t || 15)  * MM

  const matSteel = new THREE.MeshPhongMaterial({ color: 0x5ab4f0, specular: 0xaaddff, shininess: 90,  wireframe })
  const matPlate = new THREE.MeshPhongMaterial({ color: 0x22c55e, specular: 0x86efac, shininess: 100, wireframe })
  const matBolt  = new THREE.MeshPhongMaterial({ color: 0xef4444, specular: 0xff8888, shininess: 120, wireframe })
  const matWeld  = new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x92400e, emissiveIntensity: 0.3, wireframe })
  const matStiff = new THREE.MeshPhongMaterial({ color: 0x22c55e, specular: 0x86efac, shininess: 80,  wireframe })
  const matConc  = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 10, wireframe })
  const matCol   = new THREE.MeshPhongMaterial({ color: 0x5ab4f0, specular: 0xaaddff, shininess: 70,  wireframe })

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz)
    m.castShadow = true; m.receiveShadow = true
    scene.add(m); return m
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
  const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg)

  // Trave IPE verso SINISTRA — faceX = faccia destra
  function addBeam(len, faceX, offsetY = 0, mat = matSteel) {
    const cx = faceX - len / 2
    add(box(len, tf, b),        mat, cx, offsetY - h/2 + tf/2, 0)
    add(box(len, tf, b),        mat, cx, offsetY + h/2 - tf/2, 0)
    add(box(len, h - 2*tf, tw), mat, cx, offsetY, 0)
  }

  // Trave IPE verso DESTRA — faceX = faccia sinistra
  function addBeamRight(len, faceX, offsetY = 0, mat = matSteel) {
    const cx = faceX + len / 2
    add(box(len, tf, b),        mat, cx, offsetY - h/2 + tf/2, 0)
    add(box(len, tf, b),        mat, cx, offsetY + h/2 - tf/2, 0)
    add(box(len, h - 2*tf, tw), mat, cx, offsetY, 0)
  }

  // Pilastro HE verticale — faceX = sua faccia destra (verso la trave)
  function addColumnRight(faceX = 0) {
    const cFT = 0.015, cW = 0.2, cH = 1.4
    const cX = faceX - cFT / 2
    add(box(cFT, cH, cW),  matCol, cX, 0, 0)
    add(box(cFT, cH, cFT), matCol, cX, 0,  cW/2)
    add(box(cFT, cH, cFT), matCol, cX, 0, -cW/2)
    return { cFT, cW, cH }
  }

  // Pilastro HE verticale — faceX = sua faccia sinistra (verso la trave)
  function addColumnLeft(faceX = 0) {
    const cFT = 0.015, cW = 0.2, cH = 1.4
    const cX = faceX + cFT / 2
    add(box(cFT, cH, cW),  matCol, cX, 0, 0)
    add(box(cFT, cH, cFT), matCol, cX, 0,  cW/2)
    add(box(cFT, cH, cFT), matCol, cX, 0, -cW/2)
    return { cFT, cW, cH }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENDPLATE
  // ══════════════════════════════════════════════════════════════════════════
  if (cfg.tipo === 'endplate') {
    add(box(pt, ph, pw), matPlate, 0, 0, 0)
    addBeam(traveL * 0.5, -pt / 2)
    const { cFT } = addColumnLeft(pt / 2)

    ;(cfg.bolts || []).forEach(bl => {
      const bz = bl.x * MM, by = bl.y * MM
      const bd = (cfg.boltDiam || 20) * MM
      const sL = pt + cFT + 0.025
      add(cyl(bd/2, bd/2, sL),         matBolt,  0,                   by, bz, 0, 0, Math.PI/2)
      add(cyl(bd*.9, bd*.9, bd*.6, 6), matBolt, -(pt/2 + bd*.35),     by, bz, 0, 0, Math.PI/2)
      add(cyl(bd*.9, bd*.9, bd*.6, 6), matBolt,  pt/2 + cFT + bd*.35, by, bz, 0, 0, Math.PI/2)
    })

    ;(cfg.stiffeners || []).filter(s => s.enabled).forEach(s => {
      const sw = (s.w||60)*MM, sh = (s.h||80)*MM, st = (s.t||8)*MM, sy = (s.posY||0)*MM
      add(box(sh, st, sw), matStiff, -pt/2 - sh/2, sy,  b/2 - sw/2)
      add(box(sh, st, sw), matStiff, -pt/2 - sh/2, sy, -(b/2 - sw/2))
    })

    const wT = (cfg.welds?.[0]?.a || 6) * MM
    ;[-1, 1].forEach(s => add(box(0.005, wT, pw), matWeld, -pt/2, s*(h/2 - tf), 0))
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BEAMBEAM
  // ══════════════════════════════════════════════════════════════════════════
  if (cfg.tipo === 'beambeam') {
    add(box(pt, ph, pw), matPlate, 0, 0, 0)
    addBeam(traveL * 0.45, -pt / 2)
    addBeamRight(traveL * 0.45, pt / 2, 0, matCol)

    ;(cfg.bolts || []).forEach(bl => {
      const bz = bl.x * MM, by = bl.y * MM
      const bd = (cfg.boltDiam || 20) * MM
      const sL = pt + 0.025
      add(cyl(bd/2, bd/2, sL),         matBolt,  0,               by, bz, 0, 0, Math.PI/2)
      add(cyl(bd*.9, bd*.9, bd*.6, 6), matBolt, -(pt/2 + bd*.35), by, bz, 0, 0, Math.PI/2)
      add(cyl(bd*.9, bd*.9, bd*.6, 6), matBolt,  pt/2 + bd*.35,   by, bz, 0, 0, Math.PI/2)
    })

    const wT = (cfg.welds?.[0]?.a || 6) * MM
    ;[-1, 1].forEach(s => {
      add(box(0.005, wT, pw), matWeld, -pt/2, s*(h/2 - tf), 0)
      add(box(0.005, wT, pw), matWeld,  pt/2, s*(h/2 - tf), 0)
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BASEPLATECONC
  // ══════════════════════════════════════════════════════════════════════════
  if (cfg.tipo === 'baseplateconc') {
    add(box(pw, pt, ph), matPlate, 0, 0, 0)
    const colLen = 0.6
    add(box(tf, colLen, b),        matSteel, 0, pt/2 + colLen/2, 0)
    add(box(tf, colLen, b),        matSteel, 0, pt/2 + colLen/2, 0)
    add(box(tw, colLen, h - 2*tf), matSteel, 0, pt/2 + colLen/2, 0)

    const grout = (cfg.groutThickness || 30) * MM
    add(box(pw*1.1, grout, ph*1.1), matConc, 0, -pt/2 - grout/2, 0)
    add(box(pw*1.5, 0.15,  ph*1.5), matConc, 0, -pt/2 - grout - 0.075, 0)

    ;(cfg.bolts || []).forEach(bl => {
      const bx = bl.y * MM, bz = bl.x * MM
      const bd = (cfg.boltDiam || 24) * MM
      const aL = (cfg.anchorLength || 400) * MM
      add(cyl(bd/2, bd/2, aL),         matBolt, bx, -pt/2 - grout - aL/2, bz)
      add(cyl(bd*.9, bd*.9, bd*.6, 6), matBolt, bx,  pt/2 + bd*.3,        bz)
    })

    const wT = (cfg.welds?.[0]?.a || 8) * MM
    add(box(pw, wT, wT), matWeld, 0, -wT/2,  ph/2)
    add(box(pw, wT, wT), matWeld, 0, -wT/2, -ph/2)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLEAT — giunto angolare squadretta d'anima
  //
  // Come in foto:
  //   - Pilastro HE verticale (blu) a sinistra, faccia destra flangia = x=0
  //   - Squadretta ad L (verde) bullonata sulla flangia del pilastro
  //     · gamba verticale spessa ct in X, larga cw in Z, alta ch in Y
  //     · gamba orizzontale spessa ct in Z, larga cw in X, alta ch in Y
  //   - Trave IPE (blu) a destra, anima toccata dalla gamba orizzontale
  //   - Bulloni rossi che attraversano flangia pilastro + gamba verticale
  // ══════════════════════════════════════════════════════════════════════════
  if (cfg.tipo === 'cleat') {
    const cw = (cfg.cleat?.w || 90) * MM    // lunghezza gamba (in Z e in X)
    const ch = (cfg.cleat?.h || (h - 2*tf - 0.005))
    const ct = (cfg.cleat?.t || 10) * MM    // spessore squadretta

    const cFT = 0.015   // spessore flangia pilastro

    // Pilastro HE: flangia destra a x = 0
    const colW = 0.2, colH = 1.4
    add(box(cFT, colH, colW),  matCol, -cFT/2, 0, 0)          // anima
    add(box(cFT, colH, cFT),   matCol, -cFT/2, 0,  colW/2)   // flangia dx
    add(box(cFT, colH, cFT),   matCol, -cFT/2, 0, -colW/2)   // flangia sx

    // Squadrette (due — una per ogni lato dell'anima della trave)
    ;[-1, 1].forEach(sign => {
      const zBase = sign * tw / 2   // bordo esterno dell'anima

      // GAMBA VERTICALE: tra flangia pilastro (x=0) e anima trave (spessore ct in X)
      // centrata in Z attorno a zBase + sign*ct/2
      add(box(ct, ch, cw), matPlate,
        ct / 2,
        0,
        zBase + sign * cw / 2
      )

      // GAMBA ORIZZONTALE: parte da x=ct e si estende verso la trave per cw
      // posizionata contro l'anima della trave (lato esterno)
      add(box(cw, ch, ct), matPlate,
        ct + cw / 2,
        0,
        zBase + sign * ct / 2
      )
    })

    // Trave: faccia sinistra dell'anima a x = ct + cw (dopo le gambe orizzontali)
    addBeamRight(traveL * 0.5, ct + cw)

    // Bulloni: attraversano flangia pilastro (cFT) + gamba verticale (ct)
    // disposti in griglia sulla gamba verticale
    ;(cfg.bolts || []).forEach(bl => {
      const by = bl.y * MM
      const bd = (cfg.boltDiam || 20) * MM
      const sL = cFT + ct + 0.015
      const bxCenter = (ct - cFT) / 2   // centrato tra faccia esterna flangia e faccia esterna gamba
      ;[-1, 1].forEach(sign => {
        const bz = sign * (tw/2 + cw * 0.4)
        add(cyl(bd/2, bd/2, sL),         matBolt, bxCenter, by, bz, 0, 0, Math.PI/2)
        add(cyl(bd*.9, bd*.9, bd*.6, 6), matBolt, bxCenter + sL/2 + bd*.3, by, bz, 0, 0, Math.PI/2)
        add(cyl(bd*.9, bd*.9, bd*.6, 6), matBolt, bxCenter - sL/2 - bd*.3, by, bz, 0, 0, Math.PI/2)
      })
    })

    // Saldature gamba orizzontale → anima trave
    const wT = (cfg.welds?.[0]?.a || 6) * MM
    ;[-1, 1].forEach(sign => {
      add(box(wT, ch, wT), matWeld, ct + cw - wT/2, 0, sign * (tw/2 + ct + wT/2))
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OrbitControls — interazione SOLO se isFullscreenRef.current === true
// ═══════════════════════════════════════════════════════════════════════════════
function createOrbitControls(THREE, camera, domElement, isFullscreenRef) {
  const spherical = { theta: 0.6, phi: 1.1, radius: 1.8 }
  const target    = new THREE.Vector3()
  const vel       = { theta: 0, phi: 0 }
  const DAMP      = 0.86
  const state     = { rotating: false, panning: false, prev: { x: 0, y: 0 } }

  const active = () => isFullscreenRef?.current === true

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
    if (!active()) return
    if (e.button === 0) state.rotating = true
    if (e.button === 2) state.panning  = true
    state.prev = { x: e.clientX, y: e.clientY }
  })
  window.addEventListener('mouseup', () => { state.rotating = false; state.panning = false })
  window.addEventListener('mousemove', e => {
    if (!active()) { state.rotating = false; state.panning = false; return }
    const dx = e.clientX - state.prev.x, dy = e.clientY - state.prev.y
    state.prev = { x: e.clientX, y: e.clientY }
    if (state.rotating) { vel.theta -= dx * 0.007; vel.phi += dy * 0.007 }
    if (state.panning)  { const s = spherical.radius * 0.001; target.x -= dx * s; target.y += dy * s }
  })

  domElement.addEventListener('wheel', e => {
    if (!active()) return
    e.preventDefault()
    spherical.radius = Math.max(0.3, Math.min(8, spherical.radius + e.deltaY * 0.001))
  }, { passive: false })

  domElement.addEventListener('contextmenu', e => { if (active()) e.preventDefault() })

  let lastDist = null
  domElement.addEventListener('touchstart', e => {
    if (!active()) return
    if (e.touches.length === 1) { state.rotating = true; state.prev = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    if (e.touches.length === 2) { state.rotating = false; lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) }
  }, { passive: true })
  domElement.addEventListener('touchmove', e => {
    if (!active()) return
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
      spherical.theta += vel.theta
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi + vel.phi))
      vel.theta *= DAMP; vel.phi *= DAMP
      updateCamera()
    }
  }
}
