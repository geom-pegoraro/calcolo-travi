import { useEffect, useRef } from 'react'

export default function Trave3D({ L = 6, profilo = null, carichi = [] }) {
  const mountRef = useRef()
  const sceneRef = useRef({})

  useEffect(() => {
    let THREE, OrbitControls
    let animId

    async function init() {
      // Load Three.js from CDN
      if (!window.THREE) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      THREE = window.THREE

      // Manual OrbitControls (r128 compatible inline implementation)
      const mount = mountRef.current
      if (!mount) return

      const W = mount.clientWidth  || 600
      const H = mount.clientHeight || 400

      // ── Renderer ──
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setClearColor(0x0f172a, 1)
      mount.appendChild(renderer.domElement)
      sceneRef.current.renderer = renderer

      // ── Scene ──
      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x0f172a, 0.02)

      // ── Grid ──
      const grid = new THREE.GridHelper(30, 30, 0x1e3a5f, 0x1e293b)
      grid.position.y = -1.5
      scene.add(grid)

      // ── Lights ──
      scene.add(new THREE.AmbientLight(0x1e3a5f, 0.8))
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
      dirLight.position.set(5, 8, 6)
      dirLight.castShadow = true
      scene.add(dirLight)
      const pointLight = new THREE.PointLight(0x3b82f6, 1.5, 20)
      pointLight.position.set(-3, 4, 2)
      scene.add(pointLight)

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 200)
      camera.position.set(L*0.6, L*0.5, L*0.8)
      camera.lookAt(0, 0, 0)

      // ── BEAM ──
      buildScene(THREE, scene, L, profilo, carichi)

      // ── Inline OrbitControls ──
      const controls = createOrbitControls(THREE, camera, renderer.domElement)
      sceneRef.current.controls = controls

      // ── Animate ──
      function animate() {
        animId = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      // ── Resize ──
      const ro = new ResizeObserver(() => {
        const w = mount.clientWidth, h = mount.clientHeight
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

  return (
    <div ref={mountRef} style={{
      width:'100%', height:320, borderRadius:8,
      border:'1px solid var(--border)', overflow:'hidden', position:'relative'
    }}>
      <div style={{position:'absolute',top:8,right:10,
        fontFamily:'JetBrains Mono',fontSize:'0.6rem',
        color:'rgba(148,163,184,0.5)',letterSpacing:'0.08em',zIndex:10}}>
        🖱 DRAG·SCROLL·RMOUSE
      </div>
    </div>
  )
}

// ─── Build 3D scene ───────────────────────────────────────────────────────────
function buildScene(THREE, scene, L, profilo, carichi) {
  // Dimensions
  const h  = profilo ? profilo.h / 1000 : 0.3   // mm → m
  const b  = profilo ? profilo.b / 1000 : 0.15
  const tf = profilo ? profilo.tf / 1000 : 0.012
  const tw = profilo ? profilo.tw / 1000 : 0.007

  // ── Materials ──
  const steelMat = new THREE.MeshPhongMaterial({
    color: 0x3b82f6, specular: 0x88aaff, shininess: 80,
    transparent: true, opacity: 0.92
  })
  const supportMat = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 40 })
  const loadMat    = new THREE.MeshPhongMaterial({ color: 0xf59e0b })

  const center = L / 2

  // ── IPE/HE profile (3 boxes: top flange, web, bottom flange) ──
  const addBox = (w, ht, d, x, y, z, mat) => {
    const geo  = new THREE.BoxGeometry(w, ht, d)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    scene.add(mesh)
    return mesh
  }

  // Bottom flange
  addBox(L, tf, b, 0, 0, 0, steelMat)
  // Web
  addBox(L, h - 2*tf, tw, 0, (h-2*tf)/2 + tf, 0, steelMat)
  // Top flange
  addBox(L, tf, b, 0, h - tf/2, 0, steelMat)

  // Shift everything down by h/2
  scene.children.filter(o => o.isMesh).forEach(m => { m.position.y -= h/2 })

  // ── Supports ──
  const supportH = 0.4
  const supportW = b * 1.5

  // Support A (Pin) — triangle shape using cylinder
  const pinGeo = new THREE.CylinderGeometry(0, supportW/2, supportH, 4)
  const pinA   = new THREE.Mesh(pinGeo, supportMat)
  pinA.position.set(-center, -h/2 - supportH/2, 0)
  pinA.rotation.y = Math.PI/4
  scene.add(pinA)

  // Support B (Roller)
  const rollerGeo = new THREE.CylinderGeometry(0, supportW/2, supportH, 4)
  const rollerB   = new THREE.Mesh(rollerGeo, supportMat)
  rollerB.position.set(center, -h/2 - supportH/2, 0)
  rollerB.rotation.y = Math.PI/4
  scene.add(rollerB)

  // Roller wheel
  const wheelGeo = new THREE.TorusGeometry(0.07, 0.025, 8, 16)
  const wheel    = new THREE.Mesh(wheelGeo, new THREE.MeshPhongMaterial({color:0x64748b}))
  wheel.position.set(center, -h/2 - supportH - 0.04, 0)
  wheel.rotation.x = Math.PI/2
  scene.add(wheel)

  // Base plates
  ;[pinA, rollerB].forEach((s, idx) => {
    const plateGeo  = new THREE.BoxGeometry(supportW*1.5, 0.04, b*2)
    const plateMesh = new THREE.Mesh(plateGeo, supportMat)
    plateMesh.position.set(s.position.x, -h/2 - supportH - 0.06, 0)
    scene.add(plateMesh)
  })

  // ── Pilastri (colonne) ──
  const colH = 1.5
  const colW = 0.12
  ;[-center, center].forEach(cx => {
    const colGeo = new THREE.BoxGeometry(colW, colH, colW)
    const col    = new THREE.Mesh(colGeo, new THREE.MeshPhongMaterial({color:0x334155}))
    col.position.set(cx, -h/2 - supportH - colH/2 - 0.08, 0)
    col.receiveShadow = true
    scene.add(col)
  })

  // ── Carichi (frecce 3D) ──
  carichi.forEach(c => {
    if (c.tipo === 'puntuale') {
      const x = c.posizione - center
      addArrow3D(THREE, scene, x, h/2 + 0.3, 0, 0, -0.4, 0, loadMat)
    } else if (c.tipo === 'distribuito') {
      const xs = c.posizione || 0
      const xe = c.lunghezza ? xs + c.lunghezza : L
      const n  = Math.max(3, Math.floor((xe - xs) * 2))
      for (let i = 0; i <= n; i++) {
        const x = xs + (xe - xs) * i / n - center
        addArrow3D(THREE, scene, x, h/2 + 0.25, 0, 0, -0.35, 0, loadMat)
      }
    }
  })

  // ── Axes helper ──
  const axes = new THREE.AxesHelper(0.8)
  axes.position.set(-center - 0.5, -h/2, 0)
  scene.add(axes)
}

function addArrow3D(THREE, scene, x, y, z, dx, dy, dz, mat) {
  const dir    = new THREE.Vector3(dx, dy, dz).normalize()
  const len    = 0.35
  const color  = 0xf59e0b
  const arrow  = new THREE.ArrowHelper(dir, new THREE.Vector3(x, y, z), len, color, 0.12, 0.07)
  scene.add(arrow)
}

// ─── Inline OrbitControls (r128) ─────────────────────────────────────────────
function createOrbitControls(THREE, camera, domElement) {
  const state = {
    isRotating: false, isPanning: false,
    prev: { x: 0, y: 0 },
    spherical: { theta: 0.8, phi: 1.0, radius: camera.position.length() },
    target: new THREE.Vector3(),
    panOffset: new THREE.Vector3(),
  }

  const updateCamera = () => {
    const { theta, phi, radius } = state.spherical
    camera.position.set(
      state.target.x + radius * Math.sin(phi) * Math.sin(theta),
      state.target.y + radius * Math.cos(phi),
      state.target.z + radius * Math.sin(phi) * Math.cos(theta)
    )
    camera.lookAt(state.target)
  }

  domElement.addEventListener('mousedown', e => {
    if (e.button === 0) state.isRotating = true
    if (e.button === 2) state.isPanning  = true
    state.prev = { x: e.clientX, y: e.clientY }
  })
  domElement.addEventListener('mouseup', () => { state.isRotating = false; state.isPanning = false })
  domElement.addEventListener('mousemove', e => {
    const dx = e.clientX - state.prev.x
    const dy = e.clientY - state.prev.y
    state.prev = { x: e.clientX, y: e.clientY }
    if (state.isRotating) {
      state.spherical.theta -= dx * 0.005
      state.spherical.phi    = Math.max(0.1, Math.min(Math.PI - 0.1, state.spherical.phi + dy * 0.005))
    }
    if (state.isPanning) {
      const panScale = state.spherical.radius * 0.001
      state.target.x -= dx * panScale
      state.target.y += dy * panScale
    }
  })
  domElement.addEventListener('wheel', e => {
    state.spherical.radius = Math.max(1, Math.min(50, state.spherical.radius + e.deltaY * 0.01))
  }, { passive: true })
  domElement.addEventListener('contextmenu', e => e.preventDefault())

  updateCamera()
  return { update: updateCamera }
}
