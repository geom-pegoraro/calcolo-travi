/**
 * JointSVG.jsx — Disegni 2D quotati parametrici per tutti i tipi di giunto
 * Supporta: endplate, beambeam, baseplateconc, cleat
 */

const STEEL  = '#3b82f6'
const PLATE  = '#1d4ed8'
const BOLT   = '#94a3b8'
const WELD   = '#f59e0b'
const STIFF  = '#0ea5e9'
const CONC   = '#78716c'
const DIM    = '#475569'
const TEXT   = '#94a3b8'
const AXIS   = 'rgba(59,130,246,0.25)'

// ── Dimension line helper ──────────────────────────────────────────────────
function DimH({ x1, x2, y, label, above = true }) {
  const my = above ? y - 14 : y + 14
  const ty = above ? y - 17 : y + 22
  return (
    <g fontSize={7.5} fontFamily="JetBrains Mono" fill={DIM}>
      <line x1={x1} y1={my} x2={x2} y2={my} stroke={DIM} strokeWidth={0.8}/>
      <line x1={x1} y1={my - 4} x2={x1} y2={my + 4} stroke={DIM} strokeWidth={0.8}/>
      <line x1={x2} y1={my - 4} x2={x2} y2={my + 4} stroke={DIM} strokeWidth={0.8}/>
      <text x={(x1 + x2) / 2} y={ty} textAnchor="middle">{label}</text>
    </g>
  )
}
function DimV({ x, y1, y2, label, right = true }) {
  const mx = right ? x + 14 : x - 14
  const tx = right ? x + 28 : x - 6
  return (
    <g fontSize={7.5} fontFamily="JetBrains Mono" fill={DIM}>
      <line x1={mx} y1={y1} x2={mx} y2={y2} stroke={DIM} strokeWidth={0.8}/>
      <line x1={mx - 4} y1={y1} x2={mx + 4} y2={y1} stroke={DIM} strokeWidth={0.8}/>
      <line x1={mx - 4} y1={y2} x2={mx + 4} y2={y2} stroke={DIM} strokeWidth={0.8}/>
      <text x={tx} y={(y1 + y2) / 2} textAnchor="middle" dominantBaseline="middle"
        transform={`rotate(-90,${tx},${(y1 + y2) / 2})`}>{label}</text>
    </g>
  )
}

// ── Bolt symbol ────────────────────────────────────────────────────────────
function BoltSym({ cx, cy, r, diam }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={BOLT} strokeWidth={1.2}/>
      <circle cx={cx} cy={cy} r={r * 0.38} fill={BOLT} opacity={0.7}/>
      <line x1={cx - r * 1.4} y1={cy} x2={cx + r * 1.4} y2={cy} stroke={BOLT} strokeWidth={0.7} opacity={0.5}/>
      <line x1={cx} y1={cy - r * 1.4} x2={cx} y2={cy + r * 1.4} stroke={BOLT} strokeWidth={0.7} opacity={0.5}/>
    </g>
  )
}

// ── Weld symbol ─────────────────────────────────────────────────────────────
function WeldSym({ x, y, a, top = true }) {
  const s = Math.max(4, Math.min(10, a * 0.7))
  const pts = top
    ? `${x},${y} ${x - s * 1.8},${y - s * 1.8} ${x - s * 1.8},${y}`
    : `${x},${y} ${x - s * 1.8},${y + s * 1.8} ${x - s * 1.8},${y}`
  return <polygon points={pts} fill={WELD} opacity={0.85}/>
}

// ─────────────────────────────────────────────────────────────────────────────
export default function JointSVG({ jointConfig, profilo }) {
  if (!jointConfig) return null
  const tipo = jointConfig.tipo

  if (tipo === 'endplate')      return <EndplateSVG cfg={jointConfig} p={profilo}/>
  if (tipo === 'beambeam')      return <BeamBeamSVG cfg={jointConfig} p={profilo}/>
  if (tipo === 'baseplateconc') return <BasePlateSVG cfg={jointConfig} p={profilo}/>
  if (tipo === 'cleat')         return <CleatSVG cfg={jointConfig} p={profilo}/>
  return null
}

// ─── ENDPLATE ────────────────────────────────────────────────────────────────
function EndplateSVG({ cfg, p }) {
  const SVG_W = 500, SVG_H = 480
  const hB = p?.h || 270, bF = p?.b || 135, tfB = p?.tf || 10.2, twB = p?.tw || 6.6
  const pH = cfg.plate?.h || 280, pW = cfg.plate?.w || 140, pT = cfg.plate?.t || 15
  const weld = cfg.welds?.[0]?.a || 6

  const maxDim = Math.max(pH, pW, hB) * 1.5
  const sc = Math.min((SVG_W - 100) / maxDim, (SVG_H - 80) / maxDim)
  const cx = SVG_W / 2 - 30, cy = SVG_H / 2

  const s = v => v * sc

  // plate
  const px = cx - s(pW / 2), py = cy - s(pH / 2)
  // beam left of plate
  const beamRx = px, beamLx = px - s(hB * 0.8)
  const beamTy = cy - s(hB / 2), beamBy = cy + s(hB / 2)
  // column right of plate
  const colLx = cx + s(pW / 2), colW = s(200)

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>

      {/* Column */}
      <rect x={colLx} y={cy - s(350)} width={colW} height={s(700)}
        fill={STEEL} fillOpacity={0.1} stroke={STEEL} strokeWidth={1.5} strokeDasharray="4,3"/>
      <text x={colLx + colW / 2} y={cy - s(310)} textAnchor="middle"
        fontSize={8} fill={TEXT} fontFamily="JetBrains Mono">PILASTRO</text>

      {/* Beam flanges & web */}
      <rect x={beamLx} y={beamTy} width={s(hB * 0.8)} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={beamLx} y={beamBy - s(tfB)} width={s(hB * 0.8)} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={beamLx + s((bF - twB) / 2)} y={beamTy + s(tfB)} width={s(twB)} height={s(hB - 2 * tfB)} fill={STEEL} fillOpacity={0.6}/>

      {/* Stiffeners */}
      {(cfg.stiffeners || []).filter(st => st.enabled).map((st, i) => {
        const sw = st.w || 60, sh = st.h || 80, sty = st.posY || 0
        const sy_svg = cy + s(sty) - s(sh / 2)
        return (
          <g key={i}>
            <rect x={beamLx + s((bF - twB) / 2) - s(sw)} y={sy_svg} width={s(sw)} height={s(sh)}
              fill={STIFF} fillOpacity={0.6} stroke={STIFF} strokeWidth={1}/>
            <rect x={beamLx + s((bF + twB) / 2)} y={sy_svg} width={s(sw)} height={s(sh)}
              fill={STIFF} fillOpacity={0.6} stroke={STIFF} strokeWidth={1}/>
          </g>
        )
      })}

      {/* Weld symbols */}
      <WeldSym x={px} y={beamTy + s(tfB)} a={weld} top={true}/>
      <WeldSym x={px} y={beamBy - s(tfB)} a={weld} top={false}/>

      {/* End plate */}
      <rect x={px} y={py} width={s(pW)} height={s(pH)}
        fill={PLATE} fillOpacity={0.2} stroke={PLATE} strokeWidth={2}/>
      <text x={cx} y={py - 8} textAnchor="middle" fontSize={8.5} fill={PLATE} fontFamily="JetBrains Mono" fontWeight="bold">
        PL {pW}×{pH}×{pT}
      </text>

      {/* Bolts */}
      {(cfg.bolts || []).map((bl, i) => (
        <BoltSym key={i}
          cx={cx + s(bl.x)} cy={cy + s(bl.y)}
          r={s((cfg.boltDiam || 20) / 2)} diam={cfg.boltDiam || 20}/>
      ))}
      {cfg.bolts?.length > 0 && (
        <text x={cx + s(cfg.bolts[0].x) + s(cfg.boltDiam || 20) / 2 * sc + 4}
          y={cy + s(cfg.bolts[0].y) + 3} fontSize={7.5} fill={BOLT} fontFamily="JetBrains Mono">
          Ø{cfg.boltDiam||20} cl.{cfg.boltClass||'8.8'}
        </text>
      )}

      {/* Dimensions */}
      <DimH x1={px} x2={px + s(pW)} y={py + s(pH)} label={`${pW}`} above={false}/>
      <DimV x={px} y1={py} y2={py + s(pH)} label={`${pH}`} right={false}/>
      <DimH x1={beamLx} x2={px} y={beamTy} label={`~${Math.round(hB * 0.8)}`}/>

      {/* Bolt pitch annotation */}
      {(cfg.bolts || []).length >= 2 && (() => {
        const b0 = cfg.bolts[0], b1 = cfg.bolts[1]
        const pitch = Math.round(Math.abs(b1.y - b0.y))
        return pitch > 0 ? (
          <DimV x={px + s(pW)} y1={cy + s(b0.y)} y2={cy + s(b1.y)} label={`p=${pitch}`}/>
        ) : null
      })()}

      {/* Title */}
      <text x={SVG_W / 2} y={SVG_H - 6} textAnchor="middle"
        fontSize={7.5} fill={TEXT} fontFamily="JetBrains Mono" opacity={0.5}>
        GIUNTO TRAVE-PILASTRO — PIASTRA DI TESTA
      </text>
    </svg>
  )
}

// ─── BEAM-BEAM ────────────────────────────────────────────────────────────────
function BeamBeamSVG({ cfg, p }) {
  const SVG_W = 500, SVG_H = 440
  const hB = p?.h || 270, bF = p?.b || 135, tfB = p?.tf || 10.2, twB = p?.tw || 6.6
  const pH = cfg.plate?.h || 260, pW = cfg.plate?.w || 200, pT = cfg.plate?.t || 12

  const sc = Math.min((SVG_W - 100) / (pW * 3), (SVG_H - 80) / (hB * 1.5))
  const cx = SVG_W / 2, cy = SVG_H / 2

  const s = v => v * sc
  const px = cx - s(pW / 2), py = cy - s(pH / 2)
  const beamLen = s(hB * 0.7)

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>

      {/* Beam A (left) */}
      <rect x={px - beamLen} y={cy - s(hB / 2)} width={beamLen} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={px - beamLen} y={cy + s(hB / 2) - s(tfB)} width={beamLen} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={px - beamLen + s((bF - twB) / 2)} y={cy - s(hB / 2 - tfB)} width={s(twB)} height={s(hB - 2 * tfB)} fill={STEEL} fillOpacity={0.5}/>

      {/* Beam B (right) */}
      <rect x={cx + s(pW / 2)} y={cy - s(hB / 2)} width={beamLen} height={s(tfB)} fill={STEEL} fillOpacity={0.5}/>
      <rect x={cx + s(pW / 2)} y={cy + s(hB / 2) - s(tfB)} width={beamLen} height={s(tfB)} fill={STEEL} fillOpacity={0.5}/>
      <rect x={cx + s(pW / 2) + s((bF - twB) / 2)} y={cy - s(hB / 2 - tfB)} width={s(twB)} height={s(hB - 2 * tfB)} fill={STEEL} fillOpacity={0.35}/>

      {/* Splice plate */}
      <rect x={px} y={py} width={s(pW)} height={s(pH)}
        fill={PLATE} fillOpacity={0.2} stroke={PLATE} strokeWidth={2}/>
      <text x={cx} y={py - 8} textAnchor="middle" fontSize={8.5} fill={PLATE} fontFamily="JetBrains Mono" fontWeight="bold">
        PL {pW}×{pH}×{pT}
      </text>

      {/* Bolts */}
      {(cfg.bolts || []).map((bl, i) => (
        <BoltSym key={i} cx={cx + s(bl.x)} cy={cy + s(bl.y)}
          r={s((cfg.boltDiam || 20) / 2)} diam={cfg.boltDiam || 20}/>
      ))}

      {/* Centreline */}
      <line x1={cx} y1={cy - s(hB / 2) - 16} x2={cx} y2={cy + s(hB / 2) + 16}
        stroke={AXIS} strokeWidth={1} strokeDasharray="6,3"/>
      <text x={cx + 4} y={cy - s(hB / 2) - 8} fontSize={7} fill={AXIS} fontFamily="JetBrains Mono">CL</text>

      {/* Dimensions */}
      <DimH x1={px} x2={cx + s(pW / 2)} y={py + s(pH)} label={`${pW}`} above={false}/>
      <DimV x={px} y1={py} y2={py + s(pH)} label={`${pH}`} right={false}/>

      <text x={SVG_W / 2} y={SVG_H - 6} textAnchor="middle"
        fontSize={7.5} fill={TEXT} fontFamily="JetBrains Mono" opacity={0.5}>
        GIUNTO TRAVE-TRAVE — PIASTRA DI CONTINUITÀ
      </text>
    </svg>
  )
}

// ─── BASE PLATE ───────────────────────────────────────────────────────────────
function BasePlateSVG({ cfg, p }) {
  const SVG_W = 480, SVG_H = 500
  const hB = p?.h || 270, bF = p?.b || 135, tfB = p?.tf || 10.2, twB = p?.tw || 6.6
  const pH = cfg.plate?.h || 370, pW = cfg.plate?.w || 370, pT = cfg.plate?.t || 20
  const grout = cfg.groutThickness || 30

  const sc = Math.min((SVG_W - 120) / (pW * 1.3), (SVG_H - 80) / (pW * 1.5))
  const cx = SVG_W / 2, cy = SVG_H / 2 - 20

  const s = v => v * sc

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>

      {/* Concrete block */}
      <rect x={cx - s(pW * 0.75)} y={cy + s(pT) + s(grout)}
        width={s(pW * 1.5)} height={s(120)}
        fill={CONC} fillOpacity={0.5} stroke={CONC} strokeWidth={1.5}/>
      {/* Grout */}
      <rect x={cx - s(pW / 2) - 4} y={cy + s(pT)}
        width={s(pW) + 8} height={s(grout)}
        fill="#a8a29e" fillOpacity={0.5} stroke="#a8a29e" strokeWidth={1}/>
      <text x={cx + s(pW / 2) + 8} y={cy + s(pT) + s(grout / 2) + 3}
        fontSize={7} fill={CONC} fontFamily="JetBrains Mono">grout {grout}mm</text>

      {/* Base plate */}
      <rect x={cx - s(pW / 2)} y={cy} width={s(pW)} height={s(pT)}
        fill={PLATE} fillOpacity={0.4} stroke={PLATE} strokeWidth={2}/>
      <text x={cx} y={cy + s(pT) + 10} textAnchor="middle"
        fontSize={8} fill={PLATE} fontFamily="JetBrains Mono">PL {pW}×{pH}×{pT}</text>

      {/* Column above */}
      <rect x={cx - s(bF / 2)} y={cy - s(hB * 0.6)} width={s(bF)} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={cx - s(bF / 2)} y={cy - s(tfB)} width={s(bF)} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={cx - s(twB / 2)} y={cy - s(hB * 0.6) + s(tfB)} width={s(twB)} height={s(hB * 0.6) - 2 * s(tfB)} fill={STEEL} fillOpacity={0.6}/>

      {/* Anchor bolts */}
      {(cfg.bolts || []).map((bl, i) => {
        const bx = cx + s(bl.y), by = cy + s(pT) + s(grout) + 6
        const ancLen = s(cfg.anchorLength || 400) * 0.3
        const bd = s((cfg.boltDiam || 24) / 2)
        return (
          <g key={i}>
            <line x1={bx} y1={cy} x2={bx} y2={by + ancLen} stroke={BOLT} strokeWidth={Math.max(1.5, bd)}/>
            <BoltSym cx={bx} cy={cy - 4} r={Math.max(4, bd)} diam={cfg.boltDiam || 24}/>
            <line x1={bx - bd * 3} y1={by + ancLen} x2={bx + bd * 3} y2={by + ancLen} stroke={BOLT} strokeWidth={1.5}/>
          </g>
        )
      })}

      {/* Weld triangles */}
      {[
        [cx - s(bF / 2), cy, false],
        [cx + s(bF / 2), cy, false],
      ].map(([wx, wy, top], i) => (
        <WeldSym key={i} x={wx} y={wy} a={cfg.welds?.[0]?.a || 8} top={top}/>
      ))}

      {/* Dimensions */}
      <DimH x1={cx - s(pW / 2)} x2={cx + s(pW / 2)} y={cy} label={`${pW}`}/>
      <DimV x={cx + s(pW / 2)} y1={cy} y2={cy + s(pT)} label={`${pT}`}/>

      <text x={SVG_W / 2} y={SVG_H - 6} textAnchor="middle"
        fontSize={7.5} fill={TEXT} fontFamily="JetBrains Mono" opacity={0.5}>
        TRAVE-CALCESTRUZZO — PIASTRA BASE
      </text>
    </svg>
  )
}

// ─── CLEAT ────────────────────────────────────────────────────────────────────
function CleatSVG({ cfg, p }) {
  const SVG_W = 460, SVG_H = 440
  const hB = p?.h || 270, bF = p?.b || 135, tfB = p?.tf || 10.2, twB = p?.tw || 6.6
  const cH = cfg.cleat?.h || hB - 2 * tfB - 20
  const cW = cfg.cleat?.w || 90
  const cT = cfg.cleat?.t || 10

  const sc = Math.min((SVG_W - 100) / (hB * 1.8), (SVG_H - 80) / (hB * 1.4))
  const cx = SVG_W / 2, cy = SVG_H / 2

  const s = v => v * sc

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>

      {/* Beam */}
      <rect x={cx - s(hB * 0.8)} y={cy - s(hB / 2)} width={s(hB * 0.8)} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={cx - s(hB * 0.8)} y={cy + s(hB / 2) - s(tfB)} width={s(hB * 0.8)} height={s(tfB)} fill={STEEL} fillOpacity={0.8}/>
      <rect x={cx - s(hB * 0.8) + s((bF - twB) / 2)} y={cy - s(hB / 2) + s(tfB)}
        width={s(twB)} height={s(hB - 2 * tfB)} fill={STEEL} fillOpacity={0.5}/>

      {/* Support wall */}
      <rect x={cx} y={cy - s(hB * 0.7)} width={s(50)} height={s(hB * 1.4)}
        fill={STEEL} fillOpacity={0.15} stroke={STEEL} strokeWidth={1.5} strokeDasharray="4,3"/>

      {/* Cleats */}
      {/* Vertical leg */}
      <rect x={cx - s(cW)} y={cy - s(cH / 2)} width={s(cT)} height={s(cH)}
        fill={PLATE} fillOpacity={0.7} stroke={PLATE} strokeWidth={1.5}/>
      {/* Horizontal leg */}
      <rect x={cx - s(cW)} y={cy - s(cH / 2)} width={s(cW)} height={s(cT)}
        fill={PLATE} fillOpacity={0.5} stroke={PLATE} strokeWidth={1}/>
      <rect x={cx - s(cW)} y={cy + s(cH / 2) - s(cT)} width={s(cW)} height={s(cT)}
        fill={PLATE} fillOpacity={0.5} stroke={PLATE} strokeWidth={1}/>

      {/* Bolts on web */}
      {(cfg.bolts || []).map((bl, i) => (
        <BoltSym key={i}
          cx={cx - s(cW) + s(cT) + s(cW * 0.4)}
          cy={cy + s(bl.y)}
          r={s((cfg.boltDiam || 20) / 2)}
          diam={cfg.boltDiam || 20}/>
      ))}

      {/* Weld */}
      <WeldSym x={cx} y={cy - s(cH / 2)} a={cfg.welds?.[0]?.a || 6} top={true}/>
      <WeldSym x={cx} y={cy + s(cH / 2)} a={cfg.welds?.[0]?.a || 6} top={false}/>

      {/* Dimensions */}
      <DimH x1={cx - s(cW)} x2={cx} y={cy + s(cH / 2)} label={`${cW}`} above={false}/>
      <DimV x={cx - s(cW)} y1={cy - s(cH / 2)} y2={cy + s(cH / 2)} label={`${cH}`} right={false}/>

      <text x={SVG_W / 2} y={SVG_H - 6} textAnchor="middle"
        fontSize={7.5} fill={TEXT} fontFamily="JetBrains Mono" opacity={0.5}>
        GIUNTO ANGOLARE — SQUADRETTE D'ANIMA
      </text>
    </svg>
  )
}
