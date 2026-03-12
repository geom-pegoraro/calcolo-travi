/**
 * Disegno costruttivo SVG parametrico — Giunto Trave-Pilastro
 * Tipi: Piastra di Testa (end plate), Squadretta d'Anima (web cleat), Piastra Inferiore
 */

export function AnchorSVG({ config = {} }) {
  const {
    tipo      = 'endplate',  // 'endplate' | 'cleat' | 'bottomplate'
    bPlate    = 140,   // larghezza piastra [mm]
    hPlate    = 280,   // altezza piastra [mm]
    tPlate    = 12,    // spessore piastra [mm]
    nBoltsV   = 4,     // numero bulloni verticali
    nBoltsH   = 2,     // numero bulloni per fila
    boltDiam  = 20,    // diametro bullone [mm]
    edgeDist  = 40,    // distanza bordo [mm]
    boltPitch = 70,    // passo bulloni [mm]
    hBeam     = 270,   // altezza trave [mm]
    bFlange   = 135,   // larghezza ala trave [mm]
    tFlange   = 10.2,  // spessore ala [mm]
    tWeb      = 6.6,   // spessore anima [mm]
    weld      = 6,     // cordone saldatura [mm]
    showDims  = true,
  } = config

  // Scale per SVG (fit in 400x500)
  const svgW = 420, svgH = 480
  const maxDim = Math.max(hPlate, bPlate, hBeam) * 1.4
  const sc = Math.min((svgW - 80) / maxDim, (svgH - 80) / maxDim)
  const cx = svgW / 2
  const cy = svgH / 2 - 20

  // Colors
  const STEEL  = '#3b82f6'
  const WELD   = '#f59e0b'
  const BOLT   = '#94a3b8'
  const DIM    = '#475569'
  const TEXT   = '#94a3b8'
  const COLUMN = '#1e40af'

  // Scale helper
  const s = (v) => v * sc

  // ── Pilastro (sfondo) ──
  const colW = s(180), colH = s(600)
  const col = { x: cx + s(bPlate/2), y: cy - colH/2, w: colW, h: colH }

  // ── Piastra ──
  const plate = {
    x: cx - s(bPlate/2),
    y: cy - s(hPlate/2),
    w: s(bPlate),
    h: s(hPlate)
  }

  // ── Trave (IPE semplificata) ──
  const beamX = cx - s(bPlate/2) - s(hBeam) * 0.7
  const beamH = s(hBeam)
  const beamY = cy - beamH/2
  const flangeH = s(tFlange)
  const webW    = s(tWeb)
  const flangeW = s(bFlange)

  // ── Bulloni ──
  const bolts = []
  const rows = nBoltsV
  const cols = nBoltsH
  const rowSpacing = s(boltPitch)
  const colSpacing = s(boltPitch)
  const startY = cy - s(hPlate/2) + s(edgeDist)
  const startX = cx - s((cols-1)/2 * boltPitch)

  for (let r = 0; r < rows; r++) {
    for (let c2 = 0; c2 < cols; c2++) {
      bolts.push({
        x: startX + c2 * colSpacing,
        y: startY + r * rowSpacing
      })
    }
  }

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`}
      style={{background:'var(--bg-secondary)',borderRadius:8,border:'1px solid var(--border)'}}>

      {/* ── Pilastro ── */}
      <rect x={col.x} y={col.y} width={col.w} height={col.h}
        fill={COLUMN} fillOpacity={0.3} stroke={COLUMN} strokeWidth={1.5}/>
      <text x={col.x + col.w/2} y={col.y + 20} textAnchor="middle"
        fontSize={9} fill={TEXT} fontFamily="JetBrains Mono">PILASTRO</text>

      {/* ── Trave - ala inferiore ── */}
      <rect x={beamX} y={cy + beamH/2 - flangeH}
        width={flangeW} height={flangeH} fill={STEEL} fillOpacity={0.8}/>
      {/* ── Trave - ala superiore ── */}
      <rect x={beamX} y={beamY} width={flangeW} height={flangeH}
        fill={STEEL} fillOpacity={0.8}/>
      {/* ── Trave - anima ── */}
      <rect x={beamX + s(bFlange/2 - tWeb/2)} y={beamY + flangeH}
        width={webW} height={beamH - 2*flangeH} fill={STEEL} fillOpacity={0.6}/>

      {/* ── Saldature (triangoli) ── */}
      {[
        [cx - s(bPlate/2), cy - beamH/2 + flangeH, true],   // flangia sup
        [cx - s(bPlate/2), cy + beamH/2 - flangeH, false],  // flangia inf
      ].map(([wx, wy, top], i) => {
        const ws = s(weld)
        return (
          <polygon key={i}
            points={`${wx},${wy} ${wx-ws*2},${top?wy-ws*2:wy+ws*2} ${wx-ws*2},${wy}`}
            fill={WELD} opacity={0.9}/>
        )
      })}

      {/* ── Piastra ── */}
      <rect x={plate.x} y={plate.y} width={plate.w} height={plate.h}
        fill={STEEL} fillOpacity={0.15} stroke={STEEL} strokeWidth={2}/>
      <text x={cx} y={plate.y - 8} textAnchor="middle"
        fontSize={9} fill={STEEL} fontFamily="JetBrains Mono" fontWeight="bold">
        PL {bPlate}×{hPlate}×{tPlate}
      </text>

      {/* ── Bulloni ── */}
      {bolts.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={s(boltDiam/2)} fill="none" stroke={BOLT} strokeWidth={1.5}/>
          <circle cx={b.x} cy={b.y} r={s(boltDiam/2)*0.4} fill={BOLT} opacity={0.6}/>
          <line x1={b.x - s(boltDiam/2)*1.4} y1={b.y} x2={b.x + s(boltDiam/2)*1.4} y2={b.y}
            stroke={BOLT} strokeWidth={0.8} opacity={0.5}/>
          <line x1={b.x} y1={b.y - s(boltDiam/2)*1.4} x2={b.x} y2={b.y + s(boltDiam/2)*1.4}
            stroke={BOLT} strokeWidth={0.8} opacity={0.5}/>
        </g>
      ))}

      {/* ── Quote ── */}
      {showDims && (
        <g fontSize={8} fontFamily="JetBrains Mono" fill={DIM}>
          {/* Altezza piastra */}
          <line x1={plate.x - 15} y1={plate.y} x2={plate.x - 15} y2={plate.y + plate.h}
            stroke={DIM} strokeWidth={0.8}/>
          <line x1={plate.x - 20} y1={plate.y} x2={plate.x - 10} y2={plate.y}
            stroke={DIM} strokeWidth={0.8}/>
          <line x1={plate.x - 20} y1={plate.y + plate.h} x2={plate.x - 10} y2={plate.y + plate.h}
            stroke={DIM} strokeWidth={0.8}/>
          <text x={plate.x - 8} y={cy} textAnchor="end" dominantBaseline="middle"
            transform={`rotate(-90,${plate.x-30},${cy})`}>
            {hPlate}
          </text>

          {/* Larghezza piastra */}
          <line x1={plate.x} y1={plate.y + plate.h + 15} x2={plate.x + plate.w} y2={plate.y + plate.h + 15}
            stroke={DIM} strokeWidth={0.8}/>
          <text x={cx} y={plate.y + plate.h + 26} textAnchor="middle">{bPlate}</text>

          {/* Bullone label */}
          {bolts.length > 0 && (
            <text x={bolts[0].x + s(boltDiam/2) + 5} y={bolts[0].y + 3} fontSize={7.5}>
              Ø{boltDiam}
            </text>
          )}
        </g>
      )}

      {/* ── Title ── */}
      <text x={svgW/2} y={svgH - 10} textAnchor="middle"
        fontSize={8} fill={TEXT} fontFamily="JetBrains Mono" opacity={0.5}>
        GIUNTO TRAVE-PILASTRO — PIASTRA DI TESTA
      </text>
    </svg>
  )
}

export default AnchorSVG
