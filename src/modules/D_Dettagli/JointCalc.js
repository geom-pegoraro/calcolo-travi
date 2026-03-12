/**
 * JointCalc.js — Logica parametrica giunti in acciaio
 * Tipi: endplate (trave-pilastro), beambeam (trave-trave),
 *       baseplateconc (trave-cls), cleat (squadretta d'anima)
 */

// ─── Bolt layout generators ─────────────────────────────────────────────────

/**
 * Genera layout bulloni standard a griglia
 */
export function gridBoltLayout({ nRows, nCols, pitch, edgeDist, plateW, plateH }) {
  const bolts = []
  const startX = -(nCols - 1) * pitch / 2
  const startY = -plateH / 2 + edgeDist
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      bolts.push({
        id: `${r}-${c}`,
        x: startX + c * pitch,   // relativo al centro piastra [mm]
        y: startY + r * pitch,   // dall'alto verso il basso [mm]
      })
    }
  }
  return bolts
}

/**
 * Genera layout bulloni per piastra base (4 angoli + opz. centro)
 */
export function baseBoltLayout({ plateW, plateH, edgeDist }) {
  const hx = plateW / 2 - edgeDist
  const hy = plateH / 2 - edgeDist
  return [
    { id: 'tl', x: -hx, y: -hy },
    { id: 'tr', x:  hx, y: -hy },
    { id: 'bl', x: -hx, y:  hy },
    { id: 'br', x:  hx, y:  hy },
  ]
}

// ─── Stiffener presets ──────────────────────────────────────────────────────

export function defaultStiffeners(tipo, profilo) {
  const h  = profilo?.h  || 270
  const b  = profilo?.b  || 135
  const tf = profilo?.tf || 10.2
  const tw = profilo?.tw || 6.6

  if (tipo === 'endplate') {
    return [
      { id: 'st1', label: 'Fazzoletto Sup', side: 'top',
        w: (b - tw) / 2 - 10, h: 80, t: 8,
        posX: 0, posY: h / 2 - tf - 40, enabled: true },
      { id: 'st2', label: 'Fazzoletto Inf', side: 'bottom',
        w: (b - tw) / 2 - 10, h: 80, t: 8,
        posX: 0, posY: -(h / 2 - tf - 40), enabled: true },
    ]
  }
  if (tipo === 'beambeam') {
    return [
      { id: 'st1', label: 'Irrigidimento Anima', side: 'web',
        w: (b - tw) / 2 - 5, h: h - 2 * tf - 10, t: 8,
        posX: 0, posY: 0, enabled: false },
    ]
  }
  return []
}

// ─── Weld definitions ──────────────────────────────────────────────────────

export function defaultWelds(tipo) {
  if (tipo === 'endplate') {
    return [
      { id: 'w1', label: 'Flangia sup → Piastra', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
      { id: 'w2', label: 'Flangia inf → Piastra', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
      { id: 'w3', label: 'Anima → Piastra',       tipo: 'cordone_angolo',       a: 6, note: '' },
    ]
  }
  if (tipo === 'beambeam') {
    return [
      { id: 'w1', label: 'Flangia → Piastra (lato A)', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
      { id: 'w2', label: 'Flangia → Piastra (lato B)', tipo: 'a_piena_penetrazione', a: 0, note: 'CJP' },
      { id: 'w3', label: 'Anima → Piastra',             tipo: 'cordone_angolo',       a: 6, note: '' },
    ]
  }
  if (tipo === 'baseplateconc') {
    return [
      { id: 'w1', label: 'Flangia → Piastra', tipo: 'cordone_angolo', a: 8, note: '' },
      { id: 'w2', label: 'Anima → Piastra',   tipo: 'cordone_angolo', a: 6, note: '' },
    ]
  }
  if (tipo === 'cleat') {
    return [
      { id: 'w1', label: 'Squadretta → Trave', tipo: 'cordone_angolo', a: 6, note: '' },
    ]
  }
  return []
}

// ─── Default joint configs per tipo ────────────────────────────────────────

export const JOINT_TYPES = {
  endplate: {
    label: 'Trave-Pilastro (Piastra di Testa)',
    icon: '⊣',
    desc: 'End plate welded to beam, bolted to column flange',
  },
  beambeam: {
    label: 'Trave-Trave (Continuità)',
    icon: '⊢⊣',
    desc: 'Splice plate connecting two beams in-line',
  },
  baseplateconc: {
    label: 'Trave-Cal. (Piastra Base)',
    icon: '⊥',
    desc: 'Base plate on concrete with anchor bolts',
  },
  cleat: {
    label: 'Giunto Angolare (Squadrette)',
    icon: '∟',
    desc: 'Web cleats bolted to beam web and support',
  },
}

export function defaultJointConfig(tipo, profilo) {
  const h  = profilo?.h  || 270
  const b  = profilo?.b  || 135
  const tf = profilo?.tf || 10.2
  const tw = profilo?.tw || 6.6

  const base = {
    tipo,
    materialePiastra: 'S355',
    materialeBulloni: '8.8',
    welds: defaultWelds(tipo),
    stiffeners: defaultStiffeners(tipo, profilo),
  }

  if (tipo === 'endplate') {
    const plateH = h + 60
    const plateW = b + 20
    return {
      ...base,
      plate: { w: plateW, h: plateH, t: 15 },
      bolts: gridBoltLayout({ nRows: 4, nCols: 2, pitch: 70, edgeDist: 40, plateW, plateH }),
      boltDiam: 20,
      boltClass: '8.8',
      showColumn: true,
      columnProfile: 'HEB 200',
    }
  }

  if (tipo === 'beambeam') {
    const plateH = h - 2 * tf - 10
    const plateW = 200
    return {
      ...base,
      plate: { w: plateW, h: plateH, t: 12 },
      bolts: gridBoltLayout({ nRows: 3, nCols: 2, pitch: 60, edgeDist: 35, plateW, plateH }),
      boltDiam: 20,
      boltClass: '8.8',
    }
  }

  if (tipo === 'baseplateconc') {
    const plateW = b + 100
    const plateH = h + 100
    return {
      ...base,
      plate: { w: plateW, h: plateH, t: 20 },
      bolts: baseBoltLayout({ plateW, plateH, edgeDist: 50 }),
      boltDiam: 24,
      boltClass: '8.8',
      anchorLength: 400,
      groutThickness: 30,
    }
  }

  if (tipo === 'cleat') {
    return {
      ...base,
      cleat: { w: 90, h: h - 2 * tf - 20, t: 10 },
      plate: { w: 90, h: h - 2 * tf - 20, t: 10 },
      bolts: gridBoltLayout({ nRows: 3, nCols: 1, pitch: 60, edgeDist: 40, plateW: 90, plateH: h - 2 * tf - 20 }),
      boltDiam: 20,
      boltClass: '8.8',
      nCleats: 2,
    }
  }

  return base
}

// ─── Verifica semplificata EC3 bulloni ─────────────────────────────────────

export function verificaBulloni({ Vmax_kN, Mmax_kNm, joint }) {
  if (!joint?.bolts?.length) return null
  const n    = joint.bolts.length
  const d    = joint.boltDiam || 20
  const cls  = parseFloat(joint.boltClass) || 8.8
  const fub  = cls >= 10 ? 1000 : cls >= 8 ? 800 : 600  // MPa approx

  // Area netta approssimativa
  const As   = Math.PI * (d * 0.8) ** 2 / 4 / 100  // cm²
  const Fv_Rd = (0.6 * fub * As) / 1.25 / 10       // kN per piano taglio

  // Taglio per bullone
  const Vb   = Vmax_kN / n
  const etaV = Vb / Fv_Rd

  // Momento — bullone più sollecitato (distanza massima)
  let maxY = 0
  let sumY2 = 0
  joint.bolts.forEach(b => {
    const y = Math.abs(b.y)
    if (y > maxY) maxY = y
    sumY2 += y * y
  })
  const Fb_M = sumY2 > 0 ? (Mmax_kNm * 1000 * maxY) / sumY2 : 0  // N per bullone
  const etaM = Fb_M / (Fv_Rd * 1000)

  return {
    n, d, fub, As: +As.toFixed(2), Fv_Rd: +Fv_Rd.toFixed(2),
    Vb: +Vb.toFixed(2), etaV: +etaV.toFixed(3),
    Fb_M: +(Fb_M / 1000).toFixed(2), etaM: +etaM.toFixed(3),
    ok: etaV <= 1.0 && etaM <= 1.0,
  }
}
