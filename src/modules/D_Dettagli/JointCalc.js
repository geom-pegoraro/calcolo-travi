/**
 * JointCalc.js — Motore di calcolo giunti in acciaio/CA
 * Normativa: EN 1993-1-8 (EC3) per giunti acciaio
 *            EN 1992-1-1 (EC2) per ancoraggi su calcestruzzo
 *            ETAG 001 / EN 1504 per ancoraggi chimici
 *
 * γM2 = 1.25  (resistenza bulloni)
 * γM0 = 1.00  (resistenza sezione)
 * γc  = 1.50  (calcestruzzo)
 */

// ─── Costanti normative ─────────────────────────────────────────────────────
export const GM2 = 1.25
export const GM0 = 1.00
export const GC  = 1.50

// ─── Tabelle materiali ──────────────────────────────────────────────────────

export const FUB = { '4.6': 400, '5.6': 500, '6.8': 600, '8.8': 800, '10.9': 1000 }

export const STEEL_PROPS = {
  S235: { fy: 235, fu: 360 },
  S275: { fy: 275, fu: 430 },
  S355: { fy: 355, fu: 510 },
  S420: { fy: 420, fu: 520 },
}

export const CONCRETE_PROPS = {
  'C16/20': { fck: 16, fctm: 1.9,  fcm: 24 },
  'C20/25': { fck: 20, fctm: 2.2,  fcm: 28 },
  'C25/30': { fck: 25, fctm: 2.6,  fcm: 33 },
  'C28/35': { fck: 28, fctm: 2.77, fcm: 36 },
  'C30/37': { fck: 30, fctm: 2.9,  fcm: 38 },
  'C32/40': { fck: 32, fctm: 3.0,  fcm: 40 },
  'C35/45': { fck: 35, fctm: 3.2,  fcm: 43 },
  'C40/50': { fck: 40, fctm: 3.5,  fcm: 48 },
}

export const BOLT_NET_AREA = {
  8: 36.6, 10: 58.0, 12: 84.3, 14: 115,
  16: 157, 20: 245,  24: 353,  27: 459, 30: 561,
}

// ─── Bolt layout generators ─────────────────────────────────────────────────

export function gridBoltLayout({ nRows, nCols, pitch, edgeDist, plateW, plateH }) {
  const bolts = []
  const startX = -(nCols - 1) * pitch / 2
  const startY = -plateH / 2 + edgeDist
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      bolts.push({ id: `${r}-${c}`, x: startX + c * pitch, y: startY + r * pitch })
    }
  }
  return bolts
}

export function baseBoltLayout({ plateW, plateH, edgeDist }) {
  const hx = plateW / 2 - edgeDist
  const hy = plateH / 2 - edgeDist
  return [
    { id: 'tl', x: -hx, y: -hy }, { id: 'tr', x: hx, y: -hy },
    { id: 'bl', x: -hx, y:  hy }, { id: 'br', x: hx, y:  hy },
  ]
}

// ─── Stiffener / Weld presets ───────────────────────────────────────────────

export function defaultStiffeners(tipo, profilo) {
  const h  = profilo?.h  || 270
  const b  = profilo?.b  || 135
  const tf = profilo?.tf || 10.2
  const tw = profilo?.tw || 6.6
  if (tipo === 'endplate') {
    return [
      { id: 'st1', label: 'Fazzoletto Sup', side: 'top',    w: (b - tw) / 2 - 10, h: 80, t: 8, posX: 0, posY:  h / 2 - tf - 40, enabled: true },
      { id: 'st2', label: 'Fazzoletto Inf', side: 'bottom', w: (b - tw) / 2 - 10, h: 80, t: 8, posX: 0, posY: -(h / 2 - tf - 40), enabled: true },
    ]
  }
  if (tipo === 'beambeam') {
    return [{ id: 'st1', label: 'Irrigidimento Anima', side: 'web', w: (b - tw) / 2 - 5, h: h - 2 * tf - 10, t: 8, posX: 0, posY: 0, enabled: false }]
  }
  return []
}

export function defaultWelds(tipo) {
  if (tipo === 'endplate') return [
    { id: 'w1', label: 'Flangia sup → Piastra', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
    { id: 'w2', label: 'Flangia inf → Piastra', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
    { id: 'w3', label: 'Anima → Piastra',       tipo: 'cordone_angolo',       a: 6, note: '' },
  ]
  if (tipo === 'beambeam') return [
    { id: 'w1', label: 'Flangia → Piastra (lato A)', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
    { id: 'w2', label: 'Flangia → Piastra (lato B)', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
    { id: 'w3', label: 'Anima → Piastra',             tipo: 'cordone_angolo',       a: 6, note: '' },
  ]
  if (tipo === 'baseplateconc') return [
    { id: 'w1', label: 'Flangia → Piastra', tipo: 'cordone_angolo', a: 8, note: '' },
    { id: 'w2', label: 'Anima → Piastra',   tipo: 'cordone_angolo', a: 6, note: '' },
  ]
  if (tipo === 'cleat') return [
    { id: 'w1', label: 'Squadretta → Trave', tipo: 'cordone_angolo', a: 6, note: '' },
  ]
  return []
}

// ─── Tipi giunto e host ─────────────────────────────────────────────────────

export const JOINT_TYPES = {
  endplate:      { label: 'Trave-Pilastro (Piastra di Testa)', icon: '⊣',  desc: 'End plate welded to beam, bolted to column flange' },
  beambeam:      { label: 'Trave-Trave (Continuità)',          icon: '⊢⊣', desc: 'Splice plate connecting two beams in-line' },
  baseplateconc: { label: 'Trave-Cal. (Piastra Base)',         icon: '⊥',  desc: 'Base plate on concrete with anchor bolts' },
  cleat:         { label: 'Giunto Angolare (Squadrette)',      icon: '∟',  desc: 'Web cleats bolted to beam web and support' },
}

export const HOST_TYPES = {
  steel_column: { label: 'Pilastro Acciaio',     icon: '🏗️', desc: 'HEB, HEA, IPE, profili composti', group: 'acciaio' },
  steel_beam:   { label: 'Trave Acciaio',         icon: '━',  desc: 'Collegamento su ala trave',       group: 'acciaio' },
  rc_column:    { label: 'Pilastro C.A.',          icon: '▪',  desc: 'Sezione rett., cls + armature',   group: 'ca' },
  rc_beam:      { label: 'Trave / Cordolo C.A.',   icon: '▬',  desc: 'Trave cls con selle Gerber',      group: 'ca' },
  rc_wall:      { label: 'Setto / Parete C.A.',    icon: '▩',  desc: 'Muro strutturale, ancoraggi',     group: 'ca' },
  masonry:      { label: 'Muratura',               icon: '🧱', desc: 'Piastre ripartizione + tasselli', group: 'altro' },
  foundation:   { label: 'Fondazione / Plinto',    icon: '⬛', desc: 'Plinto a bicchiere / trave rov.', group: 'ca' },
}

export function defaultHostConfig(hostType) {
  if (['rc_column', 'rc_beam', 'rc_wall', 'foundation'].includes(hostType)) {
    return { hostType, width: 300, height: 400, classCls: 'C25/30', rebarDiam: 16, rebarN: 4, stirrupDiam: 8, stirrupSpacing: 150, cover: 30 }
  }
  if (['steel_column', 'steel_beam'].includes(hostType)) {
    return { hostType, profileSeries: 'HEB', profileSize: '200', material: 'S355' }
  }
  if (hostType === 'masonry') {
    return { hostType, width: 300, height: 600, plateW: 200, plateH: 200, plateT: 15, boltsThrough: true }
  }
  return { hostType }
}

export function defaultJointConfig(tipo, profilo) {
  const h  = profilo?.h  || 270
  const b  = profilo?.b  || 135
  const tf = profilo?.tf || 10.2
  const tw = profilo?.tw || 6.6

  const defaultHost = tipo === 'baseplateconc' ? 'foundation' : 'steel_column'
  const base = {
    tipo,
    materialePiastra: 'S355',
    materialeBulloni: '8.8',
    boltClass: '8.8',
    welds: defaultWelds(tipo),
    stiffeners: defaultStiffeners(tipo, profilo),
    hostType: defaultHost,
    hostConfig: defaultHostConfig(defaultHost),
    chemicalAnchor: defaultChemicalAnchorConfig(),
    foundation: defaultFoundationConfig(),
    slab: defaultSlabConfig(),
  }

  if (tipo === 'endplate') {
    const plateH = h + 60, plateW = b + 20
    return { ...base, plate: { w: plateW, h: plateH, t: 15 }, bolts: gridBoltLayout({ nRows: 4, nCols: 2, pitch: 70, edgeDist: 40, plateW, plateH }), boltDiam: 20, boltClass: '8.8', showColumn: true, columnProfile: 'HEB 200' }
  }
  if (tipo === 'beambeam') {
    const plateH = h - 2 * tf - 10, plateW = 200
    return { ...base, plate: { w: plateW, h: plateH, t: 12 }, bolts: gridBoltLayout({ nRows: 3, nCols: 2, pitch: 60, edgeDist: 35, plateW, plateH }), boltDiam: 20, boltClass: '8.8' }
  }
  if (tipo === 'baseplateconc') {
    const plateW = b + 100, plateH = h + 100
    return { ...base, plate: { w: plateW, h: plateH, t: 20 }, bolts: baseBoltLayout({ plateW, plateH, edgeDist: 50 }), boltDiam: 24, boltClass: '8.8', anchorLength: 400, groutThickness: 30 }
  }
  if (tipo === 'cleat') {
    return { ...base, cleat: { w: 90, h: h - 2 * tf - 20, t: 10 }, plate: { w: 90, h: h - 2 * tf - 20, t: 10 }, bolts: gridBoltLayout({ nRows: 3, nCols: 1, pitch: 60, edgeDist: 40, plateW: 90, plateH: h - 2 * tf - 20 }), boltDiam: 20, boltClass: '8.8', nCleats: 2 }
  }
  return base
}

// ─── Ancoraggi chimici ──────────────────────────────────────────────────────

export function defaultChemicalAnchorConfig() {
  return {
    enabled: false,
    barDiam: 16,
    hef: 160,
    resinType: 'epossidica',
    barMaterial: 'zinco',
    concreteClass: 'C25/30',
    nAnchors: 4,
    edgeDist: 100,
    spacing: 120,
    slabThickness: 200,
    reinforced: true,
  }
}

/**
 * Calcolo ancoraggio chimico — ETAG 001 / EAD 330232
 * NRd = min(N_Rk,c ; N_Rk,bar) / γ
 */
export function calcChemicalAnchor(cfg) {
  const { barDiam: d, hef, concreteClass, edgeDist: c1, spacing: s1, barMaterial } = cfg
  const concrete = CONCRETE_PROPS[concreteClass] || CONCRETE_PROPS['C25/30']
  const fck  = concrete.fck
  const fctm = concrete.fctm

  // Cono di calcestruzzo — EC2 Annex C / ETAG §5.2.2
  const k1     = 7.7  // cls non fessurato
  const N_Rk_c0 = k1 * Math.sqrt(fck) * Math.pow(hef, 1.5)  // N

  const c_cr   = 1.5 * hef
  const psi_s  = Math.min(1.0, 0.7 + 0.3 * c1 / c_cr)
  const N_Rd_c = (N_Rk_c0 * psi_s) / (GC * 1000)  // kN

  // Rottura barra
  const fuBar  = barMaterial === 'inox_a4' ? 700 : barMaterial === 'inox_a2' ? 500 : 800
  const As     = BOLT_NET_AREA[d] || (Math.PI * (d * 0.8) ** 2 / 4)
  const N_Rd_bar = (fuBar * As) / (GM2 * 1000)  // kN

  // Bond (semplificato)
  const tau_Rk = fctm * 3.5
  const V_Rd_b = (tau_Rk * Math.PI * d * hef) / (GM2 * 1000)  // kN

  const c_min  = Math.max(30, 4 * d)
  const s_min  = Math.max(40, 4 * d)
  const errors = [], warnings = []
  if (c1 < c_min) errors.push(`Dist. bordo c₁=${c1}mm < c_min=${c_min}mm → rischio cono laterale`)
  if (s1 < s_min) warnings.push(`Interasse s₁=${s1}mm < s_min=${s_min}mm → riduzione resistenza`)
  if (hef < 4 * d) warnings.push(`h_ef=${hef}mm < 4d=${4*d}mm (profondità minima)`)

  return {
    N_Rd_c:   +N_Rd_c.toFixed(2),
    N_Rd_bar: +N_Rd_bar.toFixed(2),
    N_Rd:     +Math.min(N_Rd_c, N_Rd_bar).toFixed(2),
    V_Rd:     +V_Rd_b.toFixed(2),
    psi_s:    +psi_s.toFixed(3),
    c_cr:     +c_cr.toFixed(0),
    s_cr:     +(3 * hef).toFixed(0),
    errors, warnings,
  }
}

// ─── Verifica geometrica EC3 Tab. 3.3 ──────────────────────────────────────

export function verificaGeometria({ joint, profilo }) {
  if (!joint?.bolts?.length) return { errors: [], warnings: [], ok: true }

  const errors = [], warnings = []
  const d  = joint.boltDiam || 20
  const d0 = d + (d <= 24 ? 2 : 3)
  const t  = joint.plate?.t || 12
  const tf = profilo?.tf || 10

  // Limiti EC3 Tab. 3.3
  const e1_min = 1.2 * d0
  const e2_min = 1.2 * d0
  const p1_min = 2.2 * d0
  const p2_min = 2.4 * d0
  const e1_max = Math.min(8 * t, 125)
  const p1_max = Math.min(14 * t, 200)

  const ys  = joint.bolts.map(b => b.y)
  const xs  = joint.bolts.map(b => b.x)
  const ph  = joint.plate?.h || 280
  const pw  = joint.plate?.w || 140

  const e1 = Math.min(ph / 2 + Math.min(...ys), ph / 2 - Math.max(...ys))
  const e2 = Math.min(pw / 2 + Math.min(...xs), pw / 2 - Math.max(...xs))

  if (e1 < e1_min) errors.push(`e₁=${e1.toFixed(0)}mm < min ${e1_min.toFixed(0)}mm (EC3 Tab.3.3) — dist. bordo longitud.`)
  if (e2 < e2_min) errors.push(`e₂=${e2.toFixed(0)}mm < min ${e2_min.toFixed(0)}mm (EC3 Tab.3.3) — dist. bordo trasv.`)
  if (e1 > e1_max) warnings.push(`e₁=${e1.toFixed(0)}mm > max ${e1_max.toFixed(0)}mm — bordo eccessivo`)

  const sortedY = [...new Set(ys)].sort((a, b) => a - b)
  const sortedX = [...new Set(xs)].sort((a, b) => a - b)
  for (let i = 1; i < sortedY.length; i++) {
    const p1 = sortedY[i] - sortedY[i - 1]
    if (p1 < p1_min) errors.push(`p₁=${p1.toFixed(0)}mm < min ${p1_min.toFixed(0)}mm (EC3) — passo vert. bulloni`)
    if (p1 > p1_max) warnings.push(`p₁=${p1.toFixed(0)}mm > max ${p1_max.toFixed(0)}mm — passo vert. eccessivo`)
  }
  for (let i = 1; i < sortedX.length; i++) {
    const p2 = sortedX[i] - sortedX[i - 1]
    if (p2 < p2_min) errors.push(`p₂=${p2.toFixed(0)}mm < min ${p2_min.toFixed(0)}mm (EC3) — passo oriz. bulloni`)
  }

  // Saldature: check a_min / a_max
  const tMin = Math.min(t, tf)
  ;(joint.welds || []).forEach(w => {
    if (w.tipo === 'cordone_angolo' && w.a > 0) {
      const a_min = Math.max(3, Math.ceil(Math.sqrt(tMin) - 0.5))
      const a_max = 0.7 * tMin
      if (w.a < a_min) errors.push(`Saldat. "${w.label}": a=${w.a}mm < a_min=${a_min}mm (EC3 §4.5.3)`)
      if (w.a > a_max) warnings.push(`Saldat. "${w.label}": a=${w.a}mm > 0.7t=${a_max.toFixed(1)}mm`)
    }
  })

  return { errors, warnings, ok: errors.length === 0, details: { e1: +e1.toFixed(1), e2: +e2.toFixed(1), d0, e1_min, e2_min, p1_min, p2_min } }
}

// ─── Verifica statica bulloni EC3 §6 ───────────────────────────────────────

export function verificaBulloni({ Vmax_kN, Mmax_kNm, joint }) {
  if (!joint?.bolts?.length) return null

  const n   = joint.bolts.length
  const d   = joint.boltDiam || 20
  const cls = joint.boltClass || '8.8'
  const fub = FUB[cls] || 800
  const As  = BOLT_NET_AREA[d] || (Math.PI * (d * 0.8) ** 2 / 4)

  // Fv,Rd — EC3 §3.6.1 Categoria A (taglio su filetto)
  const alphav = parseFloat(cls) >= 10 ? 0.5 : 0.6
  const Fv_Rd  = (alphav * fub * As) / (GM2 * 1000)  // kN

  // Fb,Rd — EC3 §3.6.1 (rifollamento)
  const fu  = STEEL_PROPS[joint.materialePiastra || 'S355']?.fu || 510
  const t   = joint.plate?.t || 12
  const ph  = joint.plate?.h || 280
  const d0  = d + (d <= 24 ? 2 : 3)
  const ys  = joint.bolts.map(b => b.y)
  const e1  = ph / 2 + Math.min(...ys)
  const ysSort = [...ys].sort((a, b) => a - b)
  const p1  = ysSort.length > 1 ? (ysSort[1] - ysSort[0]) : 200
  const alphab = Math.min(e1 / (3 * d0), p1 / (3 * d0) - 0.25, fub / fu, 1.0)
  const Fb_Rd  = (2.5 * Math.max(alphab, 0.1) * fu * d * t) / (GM2 * 1000)  // kN

  const Fbolt_Rd = Math.min(Fv_Rd, Fb_Rd)

  // Taglio per bullone
  const Vb   = Vmax_kN / n
  const etaV = Fbolt_Rd > 0 ? Vb / Fbolt_Rd : 999

  // Momento — metodo vettoriale (bullone più lontano dal CG)
  let maxDist2 = 0, sumDist2 = 0
  joint.bolts.forEach(b => {
    const d2 = b.x * b.x + b.y * b.y
    sumDist2 += d2
    if (d2 > maxDist2) maxDist2 = d2
  })
  const Fb_M  = sumDist2 > 0 ? (Mmax_kNm * 1e6 * Math.sqrt(maxDist2)) / sumDist2 : 0  // N
  const etaM  = Fb_M / (Fbolt_Rd * 1000)

  // Coefficiente di sfruttamento combinato (SRSS)
  const rho = Math.sqrt(etaV ** 2 + etaM ** 2)

  return {
    n, d, d0, fub, As: +As.toFixed(0), alphav, alphab: +alphab.toFixed(3),
    Fv_Rd: +Fv_Rd.toFixed(2), Fb_Rd: +Fb_Rd.toFixed(2), Fbolt_Rd: +Fbolt_Rd.toFixed(2),
    Vb: +Vb.toFixed(2), etaV: +etaV.toFixed(3),
    Fb_M: +(Fb_M / 1000).toFixed(2), etaM: +etaM.toFixed(3),
    rho: +rho.toFixed(3), ok: rho <= 1.0,
    governs: Fv_Rd <= Fb_Rd ? 'taglio' : 'rifollamento',
  }
}

// ─── Verifica saldature EC3 §4.5.3 ─────────────────────────────────────────

export function verificaSaldature({ joint, profilo, Vmax_kN, Mmax_kNm }) {
  if (!joint?.welds?.length) return []
  const matPiastra = joint.materialePiastra || 'S355'
  const fu    = STEEL_PROPS[matPiastra]?.fu || 510
  const betaW = matPiastra === 'S235' ? 0.8 : matPiastra === 'S275' ? 0.85 : matPiastra === 'S420' ? 1.0 : 0.9
  const fw_Rd = fu / (Math.sqrt(3) * betaW * GM2)
  const h  = profilo?.h  || 270
  const tf = profilo?.tf || 10.2

  return joint.welds.map(w => {
    if (w.tipo === 'a_piena_penetrazione') return { ...w, status: 'CJP', note: 'Res. = mat. base', ok: true }
    const a = w.a || 0
    if (a === 0) return { ...w, status: '—', ok: true }
    let Lw = w.label.toLowerCase().includes('flangia') ? (profilo?.b || 135) * 2 : h - 2 * tf
    const Aw    = a * Lw
    const V_Rd_w = (fw_Rd * Aw) / 1000
    const V_Ed   = Math.sqrt(Vmax_kN ** 2 + (Mmax_kNm * 1000 / (h / 2)) ** 2)
    const eta    = V_Rd_w > 0 ? V_Ed / V_Rd_w : 0
    return { ...w, fw_Rd: +fw_Rd.toFixed(0), Aw: +Aw.toFixed(0), V_Rd_w: +V_Rd_w.toFixed(2), eta: +eta.toFixed(3), ok: eta <= 1.0, status: eta <= 1.0 ? 'OK' : 'N.V.' }
  })
}

// ─── Fondazioni e Solai ─────────────────────────────────────────────────────

export const FOUNDATION_TYPES = {
  plinto:         { label: 'Plinto a Bicchiere',    icon: '⬛' },
  trave_rovescia: { label: 'Trave Rovescia',         icon: '▬' },
  radice:         { label: 'Platea di Fondazione',   icon: '▭' },
}

export const SLAB_TYPES = {
  grecata:   { label: 'Lamiera Grecata',          icon: '〰️' },
  predalles: { label: 'Predalle / Semipredalles', icon: '▭' },
  piena:     { label: 'Soletta Piena C.A.',        icon: '█' },
}

export function defaultFoundationConfig() {
  return {
    tipo: 'plinto',
    width: 800, height: 800, depth: 600,
    magrone: 100, riempimento: 200, isolamento: 0,
    classCls: 'C25/30',
    rebarDiam: 16, rebarSpacing: 200, cover: 50,
  }
}

export function defaultSlabConfig() {
  return {
    tipoSolaio: 'grecata',
    spessore: 120, altezzaGreca: 55, spessoreCalotta: 65,
    rete: 'φ6/20×20', copriferro: 20,
    studs: { enabled: false, diam: 19, height: 100, spacing: 200, nRows: 1 },
    classCls: 'C25/30',
  }
}
