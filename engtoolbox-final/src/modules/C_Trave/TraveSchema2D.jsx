/**
 * Schema statico 2D — SVG dinamico
 * Visualizza: trave, vincoli (cerniera/carrello), carichi distribuiti e puntuali
 */
export default function TraveSchema2D({ L, carichi = [], RA, RB }) {
  const W = 600, H = 200
  const padX = 60, padY = 60
  const beamY = H / 2
  const beamW = W - 2 * padX
  const scale = beamW / (L || 1)  // px per metro

  const toX = (m) => padX + m * scale

  // Colori
  const BEAM_C  = '#3b82f6'
  const DIST_C  = '#06b6d4'
  const POINT_C = '#f59e0b'
  const REACT_C = '#10b981'
  const TEXT_C  = '#94a3b8'

  // Arrow marker
  const Arrow = ({ x, y, up = true, color = POINT_C, label = '' }) => {
    const len = 35
    const y1 = up ? y - len : y
    const y2 = up ? y : y + len
    const tipY = up ? y1 : y2
    const arrowD = up
      ? `M${x},${tipY} L${x-6},${tipY+12} L${x+6},${tipY+12} Z`
      : `M${x},${tipY} L${x-6},${tipY-12} L${x+6},${tipY-12} Z`
    return (
      <g>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={2.5}/>
        <path d={arrowD} fill={color}/>
        {label && <text x={x} y={up ? tipY-6 : tipY+18} textAnchor="middle"
          fontSize={9} fill={color} fontFamily="JetBrains Mono">{label}</text>}
      </g>
    )
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{background:'var(--bg-secondary)',borderRadius:8,border:'1px solid var(--border)'}}>

      {/* Grid lines */}
      {Array.from({length:Math.floor(L)+1},(_,i)=>i).map(i=>(
        <line key={i} x1={toX(i)} y1={padY} x2={toX(i)} y2={H-padY+10}
          stroke="rgba(51,65,85,0.4)" strokeWidth={0.8} strokeDasharray="3,4"/>
      ))}

      {/* ── Carichi distribuiti ── */}
      {carichi.filter(c=>c.tipo==='distribuito').map((c,idx) => {
        const xS   = toX(c.posizione || 0)
        const xE   = toX(c.lunghezza ? (c.posizione||0)+c.lunghezza : L)
        const arrowCount = Math.max(3, Math.floor((xE-xS)/20))
        const arrowSpacing = (xE-xS)/(arrowCount-1||1)
        const q    = Math.abs(c.valore)
        const qMax = 40
        const ah   = Math.min(qMax, q * 3 + 15)
        return (
          <g key={idx}>
            {/* Top line */}
            <line x1={xS} y1={beamY-ah-8} x2={xE} y2={beamY-ah-8}
              stroke={DIST_C} strokeWidth={2}/>
            {Array.from({length:arrowCount},(_,i)=>{
              const ax = xS + i*arrowSpacing
              return (
                <g key={i}>
                  <line x1={ax} y1={beamY-ah-8} x2={ax} y2={beamY-5}
                    stroke={DIST_C} strokeWidth={1.5}/>
                  <polygon points={`${ax},${beamY-5} ${ax-4},${beamY-14} ${ax+4},${beamY-14}`}
                    fill={DIST_C}/>
                </g>
              )
            })}
            <text x={(xS+xE)/2} y={beamY-ah-14} textAnchor="middle"
              fontSize={9} fill={DIST_C} fontFamily="JetBrains Mono">
              q={c.valore} kN/m
            </text>
          </g>
        )
      })}

      {/* ── Carichi puntuali ── */}
      {carichi.filter(c=>c.tipo==='puntuale').map((c,idx) => (
        <Arrow key={idx} x={toX(c.posizione)} y={beamY-5} up={true}
          color={POINT_C} label={`${c.valore}kN`}/>
      ))}

      {/* ── Trave ── */}
      <rect x={padX} y={beamY} width={beamW} height={10}
        fill={BEAM_C} rx={2}/>

      {/* ── Vincolo A: Cerniera ── */}
      <polygon
        points={`${padX},${beamY+10} ${padX-12},${beamY+28} ${padX+12},${beamY+28}`}
        fill="none" stroke={REACT_C} strokeWidth={2}/>
      <line x1={padX-16} y1={beamY+30} x2={padX+16} y2={beamY+30}
        stroke={REACT_C} strokeWidth={2}/>
      {Array.from({length:5},(_,i)=>(
        <line key={i} x1={padX-16+i*8} y1={beamY+30} x2={padX-22+i*8} y2={beamY+38}
          stroke={REACT_C} strokeWidth={1.5}/>
      ))}

      {/* ── Vincolo B: Carrello ── */}
      <polygon
        points={`${W-padX},${beamY+10} ${W-padX-12},${beamY+28} ${W-padX+12},${beamY+28}`}
        fill="none" stroke={REACT_C} strokeWidth={2}/>
      <circle cx={W-padX-8}  cy={beamY+32} r={3} fill="none" stroke={REACT_C} strokeWidth={1.5}/>
      <circle cx={W-padX+8}  cy={beamY+32} r={3} fill="none" stroke={REACT_C} strokeWidth={1.5}/>
      <line x1={W-padX-16} y1={beamY+36} x2={W-padX+16} y2={beamY+36}
        stroke={REACT_C} strokeWidth={2}/>

      {/* ── Reazioni ── */}
      {RA!=null && <Arrow x={padX} y={beamY+38} up={false}
        color={REACT_C} label={`RA=${RA?.toFixed(1)}kN`}/>}
      {RB!=null && <Arrow x={W-padX} y={beamY+38} up={false}
        color={REACT_C} label={`RB=${RB?.toFixed(1)}kN`}/>}

      {/* ── Quote ── */}
      <line x1={padX} y1={H-8} x2={W-padX} y2={H-8} stroke={TEXT_C} strokeWidth={1}/>
      <line x1={padX} y1={H-13} x2={padX} y2={H-3} stroke={TEXT_C} strokeWidth={1}/>
      <line x1={W-padX} y1={H-13} x2={W-padX} y2={H-3} stroke={TEXT_C} strokeWidth={1}/>
      <text x={W/2} y={H-1} textAnchor="middle" fontSize={9} fill={TEXT_C} fontFamily="JetBrains Mono">
        L = {L} m
      </text>

      {/* ── Labels A/B ── */}
      <text x={padX} y={beamY-4} textAnchor="middle" fontSize={9} fill={TEXT_C} fontFamily="Rajdhani" fontWeight={700}>A</text>
      <text x={W-padX} y={beamY-4} textAnchor="middle" fontSize={9} fill={TEXT_C} fontFamily="Rajdhani" fontWeight={700}>B</text>
    </svg>
  )
}
