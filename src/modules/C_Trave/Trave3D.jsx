import { useEffect, useRef, useState, useCallback } from 'react'
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'

export default function Trave3D({ L = 6, profilo = null, carichi = [] }) {
  const mountRef  = useRef()
  const sceneRef  = useRef({})
  const [height, setHeight]       = useState(340)
  const [isFullscreen, setFullscreen] = useState(false)
  const dragRef   = useRef({ active: false, startY: 0, startH: 0 })

  // ── Resize handle drag ──
  const onDragStart = useCallback((e) => {
    dragRef.current = { active: true, startY: e.clientY, startH: height }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }, [height])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return
      const delta = e.clientY - dragRef.current.startY
      setHeight(Math.max(200, Math.min(900, dragRef.current.startH + delta)))
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

  // ── Reset camera ──
  const resetCamera = useCallback(() => {
    const s = sceneRef.current
    if (!s.spherical) return
    s.spherical.theta  = 0.8
    s.spherical.phi    = 1.0
    s.spherical.radius = L * 1.3
    if (s.target) { s.target.x = 0; s.target.y = 0; s.target.z = 0 }
  }, [L])

  // ── Three.js init ──
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

      const W = mount.clientWidth  || 600
      const H = mount.clientHeight || height

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setClearColor(0x0f172a, 1)
      mount.appendChild(renderer.domElement)
      sceneRef.current.renderer = renderer

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x0f172a, 0.015)
      sceneRef.current.scene = scene

      const grid = new THREE.GridHelper(30, 30, 0x1e3a5f, 0x1e293b)
      grid.position.y = -1.5
      scene.add(grid)

      scene.add(new THREE.AmbientLight(0x1e3a5f, 0.8))
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
      dirLight.position.set(5, 8, 6)
      dirLight.castShadow = true
      scene.add(dirLight)
      const pointLight = new THREE.PointLight(0x3b82f6, 1.5, 20)
      pointLight.position.set(-3, 4, 2)
      scene.add(pointLight)
      sceneRef.current.pointLight = pointLight

      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200)
      sceneRef.current.camera = camera

      buildScene(THREE, scene, L, profilo, carichi)

      const controls = createOrbitControls(THREE, camera, renderer.domElement, L)
      sceneRef.current.controls  = controls
      sceneRef.current.spherical = controls.spherical
      sceneRef.current.target    = controls.target

      // Animate with smooth damping
      function animate() {
        animId = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      // ResizeObserver
      const ro = new ResizeObserver(() => {
        if (!mount) return
        const w = mount.clientWidth
        const h = mount.clientHeight
        if (w < 10 || h < 10) return
        camera.aspect = w / h
        camera.updateProjectionMatrix()
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
  }, [L, profilo?.h, profilo?.b, carichi.length])

  const panelH = isFullscreen ? '100vh' : height

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
        padding: '4px 8px',
        background: 'var(--bg-secondary)',
        borderRadius: isFullscreen ? '0' : '8px 8px 0 0',
        border: '1px solid var(--border)',
        borderBottom: 'none',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: '0.6rem',
          color: 'rgba(148,163,184,0.6)', letterSpacing: '0.08em',
        }}>
          🖱 LMB·rotate &nbsp; RMB·pan &nbsp; SCROLL·zoom
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={resetCamera} title="Reset camera"
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 4, padding: '3px 6px', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}>
            <RotateCcw size={12}/>
          </button>
          <button onClick={() => setFullscreen(f => !f)} title="Fullscreen"
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 4, padding: '3px 6px', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}>
            {isFullscreen ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
          </button>
        </div>
      </div>

      {/* Canvas mount */}
      <div ref={mountRef} style={{
        width: '100%',
        height: isFullscreen ? 'calc(100vh - 60px)' : panelH,
        border: '1px solid var(--border)',
        borderRadius: isFullscreen ? 0 : '0 0 8px 8px',
        overflow: 'hidden',
        position: 'relative',
        transition: isFullscreen ? 'none' : 'height 0.05s',
      }}/>

      {/* Resize handle (only when not fullscreen) */}
      {!isFullscreen && (
        <div
          onMouseDown={onDragStart}
          style={{
            height: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            cursor: 'ns-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <div style={{
            width: 32, height: 3, borderRadius: 2,
            background: 'var(--border)',
          }}/>
        </div>
      )}
    </div>
  )
}

// ─── Build 3D scene ───────────────────────────────────────────────────────────
function buildScene(THREE, scene, L, profilo, carichi) {
  const h  = profilo ? profilo.h  / 1000 : 0.3
  const b  = profilo ? profilo.b  / 1000 : 0.15
  const tf = profilo ? profilo.tf / 1000 : 0.012
  const tw = profilo ? profilo.tw / 1000 : 0.007
  const isWood = profilo?.legno === true

  const beamColor = isWood ? 0xa0714f : 0x3b82f6
  const steelMat  = new THREE.MeshPhongMaterial({
    color: beamColor, specular: isWood ? 0x604030 : 0x88aaff,
    shininess: isWood ? 20 : 80, transparent: true, opacity: 0.93,
  })
  const supportMat = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 40 })
  const loadMat    = new THREE.MeshPhongMaterial({ color: 0xf59e0b })

  const center = L / 2

  const addBox = (w, ht, d, x, y, z, mat) => {
    const geo  = new THREE.BoxGeometry(w, ht, d)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    scene.add(mesh)
    return mesh
  }

  if (isWood) {
    // Rectangular section for wood
    addBox(L, h, b, 0, h / 2 - h / 2, 0, steelMat)
  } else {
    // I-section: bottom flange, web, top flange
    addBox(L, tf, b, 0, 0,            0, steelMat)
    addBox(L, h - 2 * tf, tw, 0, (h - 2 * tf) / 2 + tf, 0, steelMat)
    addBox(L, tf, b, 0, h - tf / 2,   0, steelMat)
    scene.children.filter(o => o.isMesh).forEach(m => { m.position.y -= h / 2 })
  }

  // ── Supports ──
  const supportH = 0.4
  const supportW = b * 1.5
  ;[{ x: -center, roller: false }, { x: center, roller: true }].forEach(({ x, roller }) => {
    const geo  = new THREE.CylinderGeometry(0, supportW / 2, supportH, 4)
    const mesh = new THREE.Mesh(geo, supportMat)
    mesh.position.set(x, -h / 2 - supportH / 2, 0)
    mesh.rotation.y = Math.PI / 4
    scene.add(mesh)

    if (roller) {
      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.025, 8, 16),
        new THREE.MeshPhongMaterial({ color: 0x64748b })
      )
      wheel.position.set(x, -h / 2 - supportH - 0.04, 0)
      wheel.rotation.x = Math.PI / 2
      scene.add(wheel)
    }

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(supportW * 1.5, 0.04, b * 2), supportMat
    )
    plate.position.set(x, -h / 2 - supportH - 0.06, 0)
    scene.add(plate)
  })

  // Columns
  const colH = 1.5, colW = 0.12
  ;[-center, center].forEach(cx => {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(colW, colH, colW),
      new THREE.MeshPhongMaterial({ color: 0x334155 })
    )
    col.position.set(cx, -h / 2 - supportH - colH / 2 - 0.08, 0)
    col.receiveShadow = true
    scene.add(col)
  })

  // ── Loads (3D arrows) ──
  carichi.forEach(c => {
    const up = c.direzioneUp === true
    const dy = up ? 0.4 : -0.4
    if (c.tipo === 'puntuale') {
      const x = c.posizione - center
      const y = up ? -h / 2 - 0.2 : h / 2 + 0.2
      addArrow3D(THREE, scene, x, y, 0, 0, dy, 0)
    } else if (c.tipo === 'distribuito') {
      const xs = c.posizione || 0
      const xe = c.lunghezza ? xs + c.lunghezza : L
      const n  = Math.max(3, Math.floor((xe - xs) * 2))
      for (let i = 0; i <= n; i++) {
        const x = xs + (xe - xs) * i / n - center
        const y = up ? -h / 2 - 0.18 : h / 2 + 0.18
        addArrow3D(THREE, scene, x, y, 0, 0, dy, 0)
      }
    }
  })

  const axes = new THREE.AxesHelper(0.8)
  axes.position.set(-center - 0.5, -h / 2, 0)
  scene.add(axes)
}

function addArrow3D(THREE, scene, x, y, z, dx, dy, dz) {
  const dir   = new THREE.Vector3(dx, dy, dz).normalize()
  const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(x, y, z), 0.35, 0xf59e0b, 0.12, 0.07)
  scene.add(arrow)
}

// ─── OrbitControls with damping ───────────────────────────────────────────────
function createOrbitControls(THREE, camera, domElement, L) {
  const spherical = { theta: 0.8, phi: 1.0, radius: L * 1.3 }
  const target    = new THREE.Vector3()
  const velocity  = { theta: 0, phi: 0 }
  const DAMP      = 0.88

  const state = {
    isRotating: false, isPanning: false,
    prev: { x: 0, y: 0 },
  }

  const updateCamera = () => {
    const { theta, phi, radius } = spherical
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    )
    camera.lookAt(target)
  }

  // Mouse
  domElement.addEventListener('mousedown', e => {
    if (e.button === 0) state.isRotating = true
    if (e.button === 2) state.isPanning  = true
    state.prev = { x: e.clientX, y: e.clientY }
  })
  window.addEventListener('mouseup', () => { state.isRotating = false; state.isPanning = false })
  window.addEventListener('mousemove', e => {
    if (!state.isRotating && !state.isPanning) return
    const dx = e.clientX - state.prev.x
    const dy = e.clientY - state.prev.y
    state.prev = { x: e.clientX, y: e.clientY }
    if (state.isRotating) {
      velocity.theta -= dx * 0.006
      velocity.phi   += dy * 0.006
    }
    if (state.isPanning) {
      const s = spherical.radius * 0.0012
      target.x -= dx * s
      target.y += dy * s
    }
  })

  // Touch
  let lastTouch = null, lastDist = null
  domElement.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      state.isRotating = true
      state.prev = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    if (e.touches.length === 2) {
      state.isRotating = false
      lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
    }
  }, { passive: true })
  domElement.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && state.isRotating) {
      const dx = e.touches[0].clientX - state.prev.x
      const dy = e.touches[0].clientY - state.prev.y
      state.prev = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      velocity.theta -= dx * 0.006
      velocity.phi   += dy * 0.006
    }
    if (e.touches.length === 2 && lastDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      spherical.radius = Math.max(1, Math.min(50, spherical.radius * (lastDist / dist)))
      lastDist = dist
    }
  }, { passive: true })
  domElement.addEventListener('touchend', () => { state.isRotating = false; lastDist = null }, { passive: true })

  // Scroll zoom
  domElement.addEventListener('wheel', e => {
    spherical.radius = Math.max(1, Math.min(50, spherical.radius + e.deltaY * 0.012))
  }, { passive: true })
  domElement.addEventListener('contextmenu', e => e.preventDefault())

  updateCamera()

  return {
    spherical, target,
    update() {
      // Apply damping
      spherical.theta += velocity.theta
      spherical.phi    = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + velocity.phi))
      velocity.theta  *= DAMP
      velocity.phi    *= DAMP
      updateCamera()
    }
  }
}
