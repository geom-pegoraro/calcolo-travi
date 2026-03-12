/**
 * TraveSchema2D.jsx — Schema statico 2D con simboli corretti per tutti i vincoli
 * Supporta: hinge, roller, fixed, spring + n vincoli in posizioni libere
 */
import { useState } from 'react'
import { Settings, ChevronDown, ChevronUp } from 'lucide-react'

// ── Simboli vincoli ───────────────────────────────────────────────────────────

const Hinge = ({ x, y, color }) => (
  <g>
    <polygon points={`${x},${y} ${x-12},${y+22} ${x+12},${y+22}`}
      fill="none" stroke={color} strokeWidth={2}/>
    <line x1={x-15} y1={y+23} x2={x+15} y2={y+23} stroke={color} strokeWidth={1.5}/>
    {[0,1,2,3,4].map(i=>(
      <line key={i} x1={x-15+i*7.5} y1={y+23} x2={x-20+i*7.5} y2={y+31}
        stroke={color} strokeWidth={1.2}/>
    ))}
  </g>
)

const Roller = ({ x, y, color }) => (
  <g>
    <polygon points={`${x},${y} ${x-12},${y+22} ${x+12},${y+22}`}
      fill="none" stroke={color} strokeWidth={2}/>
    <circle cx={x-7} cy={y+27} r={3.5} fill="none" stroke={color} strokeWidth={1.5}/>
    <circle cx={x+7} cy={y+27} r={3.5} fill="none" stroke={color} strokeWidth={1.5}/>
    <line x1={x-15} y1={y+32} x2={x+15} y2={y+32} stroke={color} strokeWidth={1.5}/>
  </g>
)

const Fixed = ({ x, y, color }) => (
  <g>
    {/* Muro verticale */}
    <line x1={x} y1={y-16} x2={x} y2={y+16} stroke={color} strokeWidth={3}/>
    {/* Tratteggio muro */}
    {[-12,-6,0,6,12].map(dy=>(
      <line key={dy} x1={x} y1={y+dy} x2={x-10} y2={y+dy+8} stroke={color} strokeWidth={1.2}/>
    ))}
    {/* Connessione alla trave */}
    <line x1={x} y1={y} x2={x+4} y2={y} stroke={color} strokeWidth={2}/>
  </g>
)

const Spring = ({ x, y, color }) => {
  const coils = 5, h = 30, w = 12
  const coilH = h / (coils + 1)
  let pts = `${x},${y} ${x},${y + coilH * 0.5}`
  for (let i = 0; i < coils; i++) {
    const y0 = y + coilH * (0.5 + i)
    const y1 = y + coilH * (1 + i)
    pts += ` ${x + (i%2===0 ? w : -w)},${(y0+y1)/2}`
    pts += ` ${x},${y1}`
  }
  pts += ` ${x},${y + h}`
  return (
    <g>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round"/>
      {/* Base */}
      <line x1={x-12} y1={y+h} x2={x+12} y2={y+h} stroke={color} strokeWidth={1.5}/>
      {[-8,-2,4,10].map((dx,i)=>(
        <line key={i} x1={x+dx-12} y1={y+h} x2={x+dx-17} y2={y+h+8} stroke={color} strokeWidth={1.2}/>
      ))}
    </g>
  )
}

// ── Freccia reazione ──────────────────────────────────────────────────────────
const Arrow = ({ x, y, up, color, label, len = 38 }) => {
  const y2   = up ? y - len : y + len
  const arwY = up ? y2 : y
  const arwD = up ? 1 : -1
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y2} stroke={color} strokeWidth={2}/>
      <polygon
        points={`${x},${arwY} ${x-5},${arwY+arwD*11} ${x+5},${arwY+arwD*11}`}
        fill={color}/>
      <text x={x} y={up ? y2 - 6 : y2 + 13}
        textAnchor="middle" fontSize={8} fill={color} fontFamily="JetBrains Mono" fontWeight={700}>
        {label}
      </text>
    </g>
  )
}

// ── Carico distribuito ────────────────────────────────────────────────────────
const DistLoad = ({ x1, x2, beamY, valore, up, color }) => {
  const arrowCount = Math.max(3, Math.round((x2 - x1) / 22))
  const arrows = Array.from({ length: arrowCount }, (_, i) => x1 + i * (x2 - x1) / (arrowCount - 1))
  const lineY  = up ? beamY - 38 : beamY - 10
  const arwLen = 22
  return (
    <g>
      {/* Linea superiore */}
      <line x1={x1} y1={lineY} x2={x2} y2={lineY} stroke={color} strokeWidth={1.5}/>
      {/* Frecce */}
      {arrows.map((ax, i) => {
        const ay1 = lineY, ay2 = up ? beamY + 2 : beamY - 12
        return (
          <g key={i}>
            <line x1={ax} y1={ay1} x2={ax} y2={ay2} stroke={color} strokeWidth={1.2}/>
            <polygon
              points={`${ax},${ay2} ${ax-4},${ay2-(up?1:-1)*9} ${ax+4},${ay2-(up?1:-1)*9}`}
              fill={color}/>
          </g>
        )
      })}
      {/* Label */}
      <text x={(x1+x2)/2} y={lineY - 5} textAnchor="middle" fontSize={9}
        fill={color} fontFamily="JetBrains Mono">
        q={valore} kN/m
      </text>
    </g>
  )
}

const PointLoad = ({ x, beamY, valore, up, color }) => {
  const ay2  = up ? beamY + 2 : beamY - 12
  const ay1  = up ? ay2 - 38 : ay2 + 38
  return (
    <g>
      <line x1={x} y1={ay1} x2={x} y2={ay2} stroke={color} strokeWidth={2}/>
      <polygon points={`${x},${ay2} ${x-5},${ay2-(up?1:-1)*11} ${x+5},${ay2-(up?1:-1)*11}`} fill={color}/>
      <text x={x+7} y={ay1 + (up?0:8)} fontSize={8.5} fill={color} fontFamily="JetBrains Mono">
        P={valore}kN
      </text>
    </g>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function TraveSchema2D({ L, carichi = [], vincoli = [], RA, RB, reazioni, schemaConfig, onSchemaConfigChange }) {
  const [showConfig, setShowConfig] = useState(false)

  const cfg = schemaConfig || {
    reactionAUp: true,
    reactionBUp: true,
    extraSupports: [],
  }

  const W = 720, H = 280
  const padX = 80, padY = 60
  const beamY = H / 2 - 10
  const beamW = W - 2 * padX
  const sc    = beamW / (L || 1)
  const toX   = m => padX + m * sc

  const BEAM_C  = '#3b82f6'
  const DIST_C  = '#06b6d4'
  const POINT_C = '#f59e0b'
  const REACT_C = '#10b981'
  const TEXT_C  = '#94a3b8'
  const SPRING_C= '#a78bfa'

  // Supporto base vincolo: altezza simbolo sotto trave
  const SUPPORT_H = { hinge: 34, roller: 34, fixed: 0, spring: 42 }

  const renderSupport = (v, x) => {
    const sy = beamY + 10
    if (v.tipo === 'hinge')  return <Hinge  key={v.id||v.label} x={x} y={sy} color={REACT_C}/>
    if (v.tipo === 'roller') return <Roller key={v.id||v.label} x={x} y={sy} color={REACT_C}/>
    if (v.tipo === 'fixed')  return <Fixed  key={v.id||v.label} x={x} y={beamY} color={REACT_C}/>
    if (v.tipo === 'spring') return <Spring key={v.id||v.label} x={x} y={sy} color={SPRING_C}/>
    return null
  }

  // Calcola supportBase per un vincolo
  const supportBase = (v) => beamY + 10 + (SUPPORT_H[v.tipo] || 34)

  return (
    <div style={{ position: 'relative' }}>

      {/* Config toggle */}
      <button onClick={() => setShowConfig(s => !s)}
        style={{ position:'absolute', top:6, right:6, zIndex:10,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:6, padding:'3px 8px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:4,
          fontFamily:'JetBrains Mono', fontSize:'0.6rem', color:'var(--text-muted)' }}>
        <Settings size={11}/> SCHEMA {showConfig ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
      </button>

      {/* Config panel */}
      {showConfig && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:8, padding:12, marginBottom:8,
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
          fontSize:'0.72rem', fontFamily:'JetBrains Mono' }}>
          {['A','B'].map((lbl, i) => {
            const key = i === 0 ? 'reactionAUp' : 'reactionBUp'
            return (
              <div key={lbl}>
                <div style={{ color:'var(--text-muted)', marginBottom:4 }}>REAZIONE {lbl}</div>
                <div style={{ display:'flex', gap:6 }}>
                  {[true, false].map(up => (
                    <button key={String(up)}
                      onClick={() => onSchemaConfigChange?.({ ...cfg, [key]: up })}
                      style={{ padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:'0.7rem',
                        border:'1px solid var(--border)',
                        background: cfg[key]===up ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: cfg[key]===up ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                      {up ? '↑ SU' : '↓ GIÙ'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <svg width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ background:'var(--bg-secondary)', borderRadius:8, border:'1px solid var(--border)' }}>

        {/* Grid lines */}
        {Array.from({ length: Math.min(Math.floor(L)+1, 20) }, (_, i) => {
          const gx = toX(i)
          return (
            <line key={i} x1={gx} y1={padY * 0.4} x2={gx} y2={H - padY * 0.5}
              stroke="rgba(148,163,184,0.08)" strokeWidth={1} strokeDasharray="4,4"/>
          )
        })}

        {/* Carichi distribuiti */}
        {carichi.filter(c => c.tipo === 'distribuito').map((c, i) => {
          const xS = toX(c.posizione || 0)
          const xE = toX(c.lunghezza ? (c.posizione||0) + c.lunghezza : L)
          return <DistLoad key={i} x1={xS} x2={xE} beamY={beamY} valore={c.valore} up={c.direzioneUp} color={DIST_C}/>
        })}

        {/* Carichi puntuali */}
        {carichi.filter(c => c.tipo === 'puntuale').map((c, i) => (
          <PointLoad key={i} x={toX(c.posizione||0)} beamY={beamY} valore={c.valore} up={c.direzioneUp} color={POINT_C}/>
        ))}

        {/* Trave */}
        <rect x={padX} y={beamY} width={beamW} height={10} fill={BEAM_C} rx={2}/>

        {/* Vincoli */}
        {vincoli.map(v => renderSupport(v, toX(v.x)))}

        {/* Labels K molla */}
        {vincoli.filter(v => v.tipo === 'spring').map(v => (
          <text key={v.id} x={toX(v.x)+14} y={beamY+10+20}
            fontSize={7.5} fill={SPRING_C} fontFamily="JetBrains Mono">
            k={v.k||'?'} kN/m
          </text>
        ))}

        {/* Reazioni — sotto ciascun vincolo */}
        {vincoli.map((v, i) => {
          const vx   = toX(v.x)
          const sBase = supportBase(v)
          const reaz  = reazioni?.find(r => Math.abs(r.x - v.x) < 0.01)
          const Ry    = reaz?.Ry ?? (i === 0 ? RA : i === vincoli.length-1 ? RB : null)
          if (Ry === null || Ry === undefined) return null

          // direzione: reazione = opposta al vincolo (default su per appoggi)
          const up = i === 0 ? cfg.reactionAUp : i === vincoli.length-1 ? cfg.reactionBUp : Ry >= 0
          const arwY = up ? sBase + 38 : sBase + 4
          return (
            <Arrow key={v.id||i} x={vx} y={arwY} up={up}
              color={REACT_C}
              label={`${v.label||`R${i+1}`}=${Math.abs(Ry).toFixed(1)}kN`}
              len={34}/>
          )
        })}

        {/* Momento incastro (Mz) */}
        {(reazioni||[]).filter(r => r.tipo === 'fixed' && Math.abs(r.Mz) > 0.01).map((r, i) => {
          const mx = toX(r.x)
          const radius = 14
          const sign   = r.Mz > 0 ? 1 : -1
          return (
            <g key={i}>
              <path d={`M ${mx} ${beamY-radius} A ${radius} ${radius} 0 0 ${sign>0?1:0} ${mx+sign*radius} ${beamY}`}
                fill="none" stroke="#f59e0b" strokeWidth={2}/>
              <polygon points={`${mx+sign*radius},${beamY} ${mx+sign*(radius-6)},${beamY-5} ${mx+sign*(radius+6)},${beamY-5}`}
                fill="#f59e0b"/>
              <text x={mx+(sign>0?18:-18)} y={beamY-10}
                textAnchor="middle" fontSize={7.5} fill="#f59e0b" fontFamily="JetBrains Mono">
                Mz={r.Mz.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Quote lunghezza */}
        <line x1={padX} y1={H-12} x2={W-padX} y2={H-12} stroke={TEXT_C} strokeWidth={1}/>
        <line x1={padX} y1={H-17} x2={padX} y2={H-7} stroke={TEXT_C} strokeWidth={1}/>
        <line x1={W-padX} y1={H-17} x2={W-padX} y2={H-7} stroke={TEXT_C} strokeWidth={1}/>
        <text x={W/2} y={H-2} textAnchor="middle" fontSize={9} fill={TEXT_C} fontFamily="JetBrains Mono">
          L = {L} m
        </text>

        {/* Quote vincoli intermedi */}
        {vincoli.filter(v => v.x > 0 && v.x < L).map((v,i) => (
          <text key={i} x={toX(v.x)} y={H-2} textAnchor="middle" fontSize={7.5}
            fill="#475569" fontFamily="JetBrains Mono">
            x={v.x}m
          </text>
        ))}
      </svg>
    </div>
  )
}
