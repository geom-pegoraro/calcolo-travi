/**
 * EngToolbox — Modulo C: Motore di Calcolo Statica Trave
 * Trave appoggiata-appoggiata (Simply Supported Beam)
 * Carichi: distribuiti (UDL) e puntuali (Point Load)
 * Output: Reazioni, V(x), M(x), δ(x)
 */

// ─── Profili IPE / HE ────────────────────────────────────────────────────────
export const PROFILI = {
  IPE: {
    'IPE 100': { h:100, b:55,  tf:5.7,  tw:4.1,  A:10.3,  Iy:171,    Wy:34.2,  E:210000 },
    'IPE 120': { h:120, b:64,  tf:6.3,  tw:4.4,  A:13.2,  Iy:318,    Wy:53.0,  E:210000 },
    'IPE 140': { h:140, b:73,  tf:6.9,  tw:4.7,  A:16.4,  Iy:541,    Wy:77.3,  E:210000 },
    'IPE 160': { h:160, b:82,  tf:7.4,  tw:5.0,  A:20.1,  Iy:869,    Wy:109,   E:210000 },
    'IPE 180': { h:180, b:91,  tf:8.0,  tw:5.3,  A:23.9,  Iy:1317,   Wy:146,   E:210000 },
    'IPE 200': { h:200, b:100, tf:8.5,  tw:5.6,  A:28.5,  Iy:1943,   Wy:194,   E:210000 },
    'IPE 220': { h:220, b:110, tf:9.2,  tw:5.9,  A:33.4,  Iy:2772,   Wy:252,   E:210000 },
    'IPE 240': { h:240, b:120, tf:9.8,  tw:6.2,  A:39.1,  Iy:3892,   Wy:324,   E:210000 },
    'IPE 270': { h:270, b:135, tf:10.2, tw:6.6,  A:45.9,  Iy:5790,   Wy:429,   E:210000 },
    'IPE 300': { h:300, b:150, tf:10.7, tw:7.1,  A:53.8,  Iy:8356,   Wy:557,   E:210000 },
    'IPE 330': { h:330, b:160, tf:11.5, tw:7.5,  A:62.6,  Iy:11770,  Wy:713,   E:210000 },
    'IPE 360': { h:360, b:170, tf:12.7, tw:8.0,  A:72.7,  Iy:16270,  Wy:904,   E:210000 },
    'IPE 400': { h:400, b:180, tf:13.5, tw:8.6,  A:84.5,  Iy:23130,  Wy:1156,  E:210000 },
    'IPE 450': { h:450, b:190, tf:14.6, tw:9.4,  A:98.8,  Iy:33740,  Wy:1500,  E:210000 },
    'IPE 500': { h:500, b:200, tf:16.0, tw:10.2, A:116,   Iy:48200,  Wy:1928,  E:210000 },
    'IPE 550': { h:550, b:210, tf:17.2, tw:11.1, A:134,   Iy:67120,  Wy:2441,  E:210000 },
    'IPE 600': { h:600, b:220, tf:19.0, tw:12.0, A:156,   Iy:92080,  Wy:3069,  E:210000 },
  },
  HEA: {
    'HEA 100': { h:96,  b:100, tf:8.0,  tw:5.0,  A:21.2,  Iy:349,    Wy:72.8,  E:210000 },
    'HEA 120': { h:114, b:120, tf:8.0,  tw:5.0,  A:25.3,  Iy:606,    Wy:106,   E:210000 },
    'HEA 140': { h:133, b:140, tf:8.5,  tw:5.5,  A:31.4,  Iy:1033,   Wy:155,   E:210000 },
    'HEA 160': { h:152, b:160, tf:9.0,  tw:6.0,  A:38.8,  Iy:1673,   Wy:220,   E:210000 },
    'HEA 180': { h:171, b:180, tf:9.5,  tw:6.0,  A:45.3,  Iy:2510,   Wy:294,   E:210000 },
    'HEA 200': { h:190, b:200, tf:10.0, tw:6.5,  A:53.8,  Iy:3692,   Wy:389,   E:210000 },
    'HEA 220': { h:210, b:220, tf:11.0, tw:7.0,  A:64.3,  Iy:5410,   Wy:515,   E:210000 },
    'HEA 240': { h:230, b:240, tf:12.0, tw:7.5,  A:76.8,  Iy:7763,   Wy:675,   E:210000 },
    'HEA 260': { h:250, b:260, tf:12.5, tw:7.5,  A:86.8,  Iy:10450,  Wy:836,   E:210000 },
    'HEA 280': { h:270, b:280, tf:13.0, tw:8.0,  A:97.3,  Iy:13670,  Wy:1013,  E:210000 },
    'HEA 300': { h:290, b:300, tf:14.0, tw:8.5,  A:112,   Iy:18260,  Wy:1260,  E:210000 },
  },
  HEB: {
    'HEB 100': { h:100, b:100, tf:10.0, tw:6.0,  A:26.0,  Iy:450,    Wy:89.9,  E:210000 },
    'HEB 120': { h:120, b:120, tf:11.0, tw:6.5,  A:34.0,  Iy:864,    Wy:144,   E:210000 },
    'HEB 140': { h:140, b:140, tf:12.0, tw:7.0,  A:43.0,  Iy:1509,   Wy:215,   E:210000 },
    'HEB 160': { h:160, b:160, tf:13.0, tw:8.0,  A:54.3,  Iy:2492,   Wy:311,   E:210000 },
    'HEB 180': { h:180, b:180, tf:14.0, tw:8.5,  A:65.3,  Iy:3831,   Wy:426,   E:210000 },
    'HEB 200': { h:200, b:200, tf:15.0, tw:9.0,  A:78.1,  Iy:5696,   Wy:570,   E:210000 },
    'HEB 220': { h:220, b:220, tf:16.0, tw:9.5,  A:91.0,  Iy:8091,   Wy:736,   E:210000 },
    'HEB 240': { h:240, b:240, tf:17.0, tw:10.0, A:106,   Iy:11260,  Wy:938,   E:210000 },
    'HEB 260': { h:260, b:260, tf:17.5, tw:10.0, A:118,   Iy:14920,  Wy:1148,  E:210000 },
    'HEB 280': { h:280, b:280, tf:18.0, tw:10.5, A:131,   Iy:19270,  Wy:1376,  E:210000 },
    'HEB 300': { h:300, b:300, tf:19.0, tw:11.0, A:149,   Iy:25170,  Wy:1678,  E:210000 },
  }
}

// ─── Main calculation function ───────────────────────────────────────────────

/**
 * Calcola la statica completa della trave
 * @param {Object} params
 * @param {number} params.L      - Luce [m]
 * @param {number} params.E      - Modulo elastico [MPa = N/mm²]
 * @param {number} params.Iy     - Momento d'inerzia [cm⁴]
 * @param {Array}  params.carichi - Array di carichi
 * @param {number} params.N      - Numero di punti di calcolo
 */
export function calcolaTrave({ L, E, Iy, carichi = [], N = 200 }) {
  // Conversioni: tutto in N, mm
  const Lmm = L * 1000       // m → mm
  const EI  = E * Iy * 1e4   // MPa*cm⁴ → N·mm² (1 cm⁴ = 1e4 mm⁴)

  // ─── Reazioni ───
  let RA = 0, RB = 0

  for (const c of carichi) {
    if (c.tipo === 'puntuale') {
      const a  = c.posizione * 1000  // m → mm
      const P  = c.valore * 1000     // kN → N
      const b  = Lmm - a
      RB += P * a / Lmm
      RA += P * b / Lmm
    } else if (c.tipo === 'distribuito') {
      // Carico distribuito uniforme su tutta la luce (o su tratto)
      const xS = (c.posizione || 0) * 1000
      const xE = c.lunghezza ? (c.posizione + c.lunghezza) * 1000 : Lmm
      const q  = c.valore   // kN/m = N/mm
      const Ftot = q * (xE - xS)
      const xC   = (xS + xE) / 2  // centroide
      RB += Ftot * xC / Lmm
      RA += Ftot * (Lmm - xC) / Lmm
    }
  }

  // ─── Diagrammi ───
  const xs = Array.from({ length: N + 1 }, (_, i) => (i / N) * Lmm)
  const V  = new Array(N + 1).fill(0)
  const M  = new Array(N + 1).fill(0)
  const d  = new Array(N + 1).fill(0)

  for (let i = 0; i <= N; i++) {
    const x = xs[i]
    let v = RA, m = RA * x

    for (const c of carichi) {
      if (c.tipo === 'puntuale') {
        const a = c.posizione * 1000
        const P = c.valore * 1000
        if (x > a) { v -= P; m -= P * (x - a) }
      } else if (c.tipo === 'distribuito') {
        const xS = (c.posizione || 0) * 1000
        const xE = c.lunghezza ? (c.posizione + c.lunghezza) * 1000 : Lmm
        const q  = c.valore
        if (x > xS) {
          const dx = Math.min(x, xE) - xS
          v -= q * dx
          m -= q * dx * (x - xS - dx / 2)
        }
      }
    }

    V[i] = v / 1000   // N → kN
    M[i] = m / 1e6    // N·mm → kN·m
  }

  // ─── Freccia con integrazione numerica (metodo dell'equazione differenziale) ───
  // EI·δ'' = M(x) → integrazione doppia con Simpson
  const dx   = Lmm / N
  const EIkNm2 = EI / 1e6 // N·mm² → kN·m²  ... (1 N·mm² = 1e-6 kN·m²)

  // Prima integrazione: slope θ(x) = ∫M(x)dx / EI + C1
  const theta = new Array(N + 1).fill(0)
  for (let i = 1; i <= N; i++) {
    theta[i] = theta[i-1] + (M[i-1] + M[i]) / 2 * (dx / 1000) // dx in m
  }
  // Condizione al contorno: δ(0)=0, δ(L)=0 → C1 = -theta[N]/L
  const C1 = -theta[N] / L

  // Seconda integrazione: δ(x) = ∫θ(x)dx + C1·x
  const delta = new Array(N + 1).fill(0)
  for (let i = 1; i <= N; i++) {
    const xi = xs[i] / 1000  // mm → m
    delta[i] = delta[i-1] + (theta[i-1] + theta[i]) / 2 * (dx / 1000)
    delta[i] += C1 * (dx / 1000)
  }
  // Normalizza per EI
  for (let i = 0; i <= N; i++) {
    d[i] = (delta[i] / EIkNm2) * 1000  // m → mm
  }

  // ─── Valori caratteristici ───
  const Vmax = Math.max(...V.map(Math.abs))
  const Mmax = Math.max(...M.map(Math.abs))
  const dmax = Math.max(...d.map(Math.abs))
  const dmin = Math.min(...d)

  // Posizione momento massimo
  const MmaxIdx = M.reduce((mi,v,i,a) => Math.abs(v)>Math.abs(a[mi]) ? i : mi, 0)
  const xMmax   = xs[MmaxIdx] / 1000  // m

  return {
    RA: RA / 1000,  // kN
    RB: RB / 1000,  // kN
    xs: xs.map(x => +(x/1000).toFixed(4)),  // m
    V, M, d,
    Vmax: +Vmax.toFixed(3),
    Mmax: +Mmax.toFixed(3),
    dmax: +dmax.toFixed(4),
    dmin: +dmin.toFixed(4),
    xMmax: +xMmax.toFixed(3),
    EI: EIkNm2,
    L,
  }
}

// ─── Verifica sezione ──────────────────────────────────────────────────────────

/**
 * Verifica resistenza a flessione (EC3 semplificato)
 */
export function verificaSezione(Mmax_kNm, profilo, fyk = 355) {
  if (!profilo) return null
  // Momento resistente plastico (approssimazione con Wy elastico)
  const Mrd = (profilo.Wy * fyk) / 1e3  // kN·m (Wy in cm³, fyk in MPa → kN/cm²)
  // In realtà: Mrd = Wpl * fyd / gamma_M0
  // Approssimazione: Wpl ≈ 1.15 * Wy (per sezioni I standard)
  const Mpl = profilo.Wy * 1.15  // cm³
  const fyd  = fyk / 1.0         // MPa (gamma_M0 = 1.0)
  const MrdPl = (Mpl * fyd) / 1e3 // kN·m

  const eta = Mmax_kNm / MrdPl
  return {
    Mrd: +MrdPl.toFixed(2),
    eta: +eta.toFixed(3),
    ok: eta <= 1.0,
    fyk, fyd
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function getAllProfili() {
  const result = []
  for (const [tipo, profs] of Object.entries(PROFILI)) {
    for (const [nome, props] of Object.entries(profs)) {
      result.push({ tipo, nome, ...props })
    }
  }
  return result
}

export function getProfilo(nome) {
  for (const profs of Object.values(PROFILI)) {
    if (profs[nome]) return profs[nome]
  }
  return null
}
