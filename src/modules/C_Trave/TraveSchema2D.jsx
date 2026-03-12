/**
 * Schema statico 2D — SVG dinamico
 * Carichi: direzione (su/giù), posizione libera, tipo (distribuito/puntuale/entrambi)
 * Vincoli: direzione reazione, numero e posizione pilastri configurabili
 */
import { useState } from 'react'
import { Settings, ChevronDown, ChevronUp } from 'lucide-react'

export default function TraveSchema2D({ L, carichi = [], RA, RB, schemaConfig, onSchemaConfigChange }) {
  const [showConfig, setShowConfig] = useState(false)

  const cfg = schemaConfig || {
    reactionAUp: true,
    reactionBUp: true,
    extraSupports: [],
  }

  // SVG più alto per dare spazio alle frecce reazione sotto i vincoli
  const W = 700, H = 320
  const padX = 70, padY = 55
  const beamY = 130                   // trave più in alto → più spazio sotto
  const beamW = W - 2 * padX
  const scale = beamW / (L || 1)
  const toX = (m) => padX + m * scale

  const BEAM_C  = '#3b82f6'
  const DIST_C  = '#06b6d4'
  const POINT_C = '#f59e0b'
  const REACT_C = '#10b981'
  const TEXT_C  = '#94a3b8'
  const SUPP_C  = '#94a3b8'

  // ── Arrow component ──
  const Arrow = ({ x, y, up = true, color, label = '', len = 34 }) => {
    const y1   = up ? y - len : y
    const y2   = up ? y : y + len
    const tipY = up ? y1 : y2
    const arrowD = up
      ? `M${x},${tipY} L${x-5},${tipY+11} L${x+5},${tipY+11} Z`
      : `M${x},${tipY} L${x-5},${tipY-11} L${x+5},${tipY-11} Z`
    // Label SOTTO la coda della freccia (mai sovrapposta alla freccia stessa)
    const lblY = up ? y2 + 13 : y1 - 5
    return (
      <g>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={2.5}/>
        <path d={arrowD} fill={color}/>
        {label && (
          <text x={x} y={lblY} textAnchor="middle"
            fontSize={8.5} fill={color} fontFamily="JetBrains Mono">{label}</text>
        )}
      </g>
    )
  }

  // ── Hinge symbol (altezza totale ~32px) ──
  const Hinge = ({ x, y, color }) => (
    <g>
      <polygon points={`${x},${y} ${x-11},${y+22} ${x+11},${y+22}`}
        fill="none" stroke={color} strokeWidth={2}/>
      <line x1={x-15} y1={y+24} x2={x+15} y2={y+24} stroke={color} strokeWidth={2}/>
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={x-15+i*7.5} y1={y+24} x2={x-20+i*7.5} y2={y+32}
          stroke={color} strokeWidth={1.5}/>
      ))}
    </g>
  )

  // ── Roller symbol (altezza totale ~34px) ──
  const Roller = ({ x, y, color }) => (
    <g>
      <polygon points={`${x},${y} ${x-11},${y+22} ${x+11},${y+22}`}
        fill="none" stroke={color} strokeWidth={2}/>
      <circle cx={x-7}  cy={y+27} r={3} fill="none" stroke={color} strokeWidth={1.5}/>
      <circle cx={x+7}  cy={y+27} r={3} fill="none" stroke={color} strokeWidth={1.5}/>
      <line x1={x-15} y1={y+31} x2={x+15} y2={y+31} stroke={color} strokeWidth={2}/>
    </g>
  )

  // ── Extra support ──
  const ExtraSupport = ({ x, y, up, color }) => (
    <g>
      <line x1={x} y1={y} x2={x} y2={up ? y - 28 : y + 28}
        stroke={color} strokeWidth={3}/>
      <line x1={x-10} y1={up ? y-28 : y+28} x2={x+10} y2={up ? y-28 : y+28}
        stroke={color} strokeWidth={2}/>
      {[0,1,2,3,4].map(i => (
        <line key={i}
          x1={x-10+i*5} y1={up ? y-28 : y+28}
          x2={x-15+i*5} y2={up ? y-36 : y+36}
          stroke={color} strokeWidth={1.2}/>
      ))}
    </g>
  )

  // Calcola la base dei simboli vincolo (punto più basso della cerniera/carrello)
  // Hinge: beamY+10 (base trave) + 32px simbolo = beamY+42
  // Roller: beamY+10 + 34px = beamY+44  → usiamo beamY+44 come baseline comune
  const SUPPORT_BOTTOM = beamY + 10 + 34   // y più bassa del vincolo

  // Le frecce di reazione partono 10px sotto il vincolo, verso il basso
  const REACTION_TOP = SUPPORT_BOTTOM + 10

  return (
    <div style={{ position: 'relative' }}>
      {/* Config toggle */}
      <button
        onClick={() => setShowConfig(s => !s)}
        style={{
          position: 'absolute', top: 6, right: 6, zIndex: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'JetBrains Mono', fontSize: '0.6rem',
          color: 'var(--text-muted)',
        }}>
        <Settings size={11}/>
        SCHEMA
        {showConfig ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
      </button>

      {/* Config panel */}
      {showConfig && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 12, marginBottom: 8,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          fontSize: '0.72rem', fontFamily: 'JetBrains Mono',
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>REAZIONE A</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[true, false].map(up => (
                <button key={String(up)}
                  onClick={() => onSchemaConfigChange?.({ ...cfg, reactionAUp: up })}
                  style={{
                    padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem',
                    border: '1px solid var(--border)',
                    background: cfg.reactionAUp === up ? 'rgba(59,130,246,0.2)' : 'transparent',
                    color: cfg.reactionAUp === up ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  }}>
                  {up ? '↑ SU (default)' : '↓ GIÙ'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>REAZIONE B</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[true, false].map(up => (
                <button key={String(up)}
                  onClick={() => onSchemaConfigChange?.({ ...cfg, reactionBUp: up })}
                  style={{
                    padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem',
                    border: '1px solid var(--border)',
                    background: cfg.reactionBUp === up ? 'rgba(59,130,246,0.2)' : 'transparent',
                    color: cfg.reactionBUp === up ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  }}>
                  {up ? '↑ SU (default)' : '↓ GIÙ'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
              APPOGGI INTERMEDI
              <button
                onClick={() => onSchemaConfigChange?.({
                  ...cfg,
                  extraSupports: [...(cfg.extraSupports || []), { pos: L / 2, up: false }]
                })}
                style={{
                  marginLeft: 10, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--accent-cyan)', fontSize: '0.65rem',
                }}>
                + AGGIUNGI
              </button>
            </div>
            {(cfg.extraSupports || []).map((sup, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 20 }}>#{idx+1}</span>
                <input
                  type="number" min={0} max={L} step={0.1}
                  value={sup.pos}
                  onChange={e => {
                    const s = [...cfg.extraSupports]
                    s[idx] = { ...s[idx], pos: +e.target.value }
                    onSchemaConfigChange?.({ ...cfg, extraSupports: s })
                  }}
                  style={{
                    width: 60, padding: '2px 6px', borderRadius: 4,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.72rem', fontFamily: 'JetBrains Mono',
                  }}
                />
                <span style={{ color: 'var(--text-muted)' }}>m</span>
                {[false, true].map(up => (
                  <button key={String(up)}
                    onClick={() => {
                      const s = [...cfg.extraSupports]
                      s[idx] = { ...s[idx], up }
                      onSchemaConfigChange?.({ ...cfg, extraSupports: s })
                    }}
                    style={{
                      padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: '0.65rem',
                      border: '1px solid var(--border)',
                      background: sup.up === up ? 'rgba(59,130,246,0.2)' : 'transparent',
                      color: sup.up === up ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    }}>
                    {up ? '↑' : '↓'}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const s = cfg.extraSupports.filter((_, i) => i !== idx)
                    onSchemaConfigChange?.({ ...cfg, extraSupports: s })
                  }}
                  style={{
                    padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--accent-red)', fontSize: '0.65rem',
                  }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SVG Schema */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>

        {/* Grid lines */}
        {Array.from({ length: Math.floor(L) + 1 }, (_, i) => i).map(i => (
          <line key={i} x1={toX(i)} y1={padY - 10} x2={toX(i)} y2={H - 20}
            stroke="rgba(51,65,85,0.4)" strokeWidth={0.8} strokeDasharray="3,4"/>
        ))}

        {/* ── Carichi distribuiti ── */}
        {carichi.filter(c => c.tipo === 'distribuito').map((c, idx) => {
          const xS = toX(c.posizione || 0)
          const xE = toX(c.lunghezza ? (c.posizione || 0) + c.lunghezza : L)
          const count = Math.max(3, Math.floor((xE - xS) / 22))
          const spacing = (xE - xS) / (count - 1 || 1)
          const up = c.direzioneUp === true
          const ah = 32
          const lineY = up ? beamY + 12 + ah : beamY - 12 - ah
          const arrowTip = up ? beamY + 12 : beamY - 5
          return (
            <g key={`dist-${idx}`}>
              <line x1={xS} y1={lineY} x2={xE} y2={lineY} stroke={DIST_C} strokeWidth={2}/>
              {Array.from({ length: count }, (_, i) => {
                const ax = xS + i * spacing
                return (
                  <g key={i}>
                    <line x1={ax} y1={lineY} x2={ax} y2={arrowTip} stroke={DIST_C} strokeWidth={1.5}/>
                    {up
                      ? <polygon points={`${ax},${arrowTip} ${ax-4},${arrowTip+10} ${ax+4},${arrowTip+10}`} fill={DIST_C}/>
                      : <polygon points={`${ax},${arrowTip} ${ax-4},${arrowTip-10} ${ax+4},${arrowTip-10}`} fill={DIST_C}/>
                    }
                  </g>
                )
              })}
              <text x={(xS+xE)/2} y={up ? lineY+14 : lineY-6}
                textAnchor="middle" fontSize={8.5} fill={DIST_C} fontFamily="JetBrains Mono">
                q={c.valore} kN/m
              </text>
            </g>
          )
        })}

        {/* ── Carichi puntuali ── */}
        {carichi.filter(c => c.tipo === 'puntuale').map((c, idx) => {
          const up = c.direzioneUp === true
          return (
            <Arrow key={`pt-${idx}`}
              x={toX(c.posizione)} y={up ? beamY+8 : beamY-5}
              up={up} color={POINT_C} label={`${c.valore}kN`}/>
          )
        })}

        {/* ── Trave ── */}
        <rect x={padX} y={beamY} width={beamW} height={10} fill={BEAM_C} rx={2}/>

        {/* ── Vincolo A: Cerniera ── */}
        <Hinge x={padX} y={beamY+10} color={REACT_C}/>

        {/* ── Vincolo B: Carrello ── */}
        <Roller x={W-padX} y={beamY+10} color={REACT_C}/>

        {/* ── Appoggi intermedi ── */}
        {(cfg.extraSupports || []).map((sup, idx) => {
          const sx = toX(Math.min(Math.max(sup.pos, 0), L))
          return (
            <ExtraSupport key={idx} x={sx} y={sup.up ? beamY : beamY+10}
              up={sup.up} color={SUPP_C}/>
          )
        })}

        {/* ── Reazioni ── ben separate dai simboli vincolo ──
            La freccia parte da REACTION_TOP verso il basso (coda) e punta in su/giù.
            La label è sempre SOTTO la freccia, mai sovrapposta al triangolo.
        */}
        {RA != null && (
          <g>
            {/* Linea verticale dalla base del vincolo */}
            <line
              x1={padX} y1={SUPPORT_BOTTOM}
              x2={padX} y2={REACTION_TOP}
              stroke={REACT_C} strokeWidth={1} strokeDasharray="3,3" opacity={0.4}/>
            <Arrow
              x={padX}
              y={cfg.reactionAUp ? REACTION_TOP + 40 : REACTION_TOP}
              up={cfg.reactionAUp}
              color={REACT_C}
              label={`RA=${RA?.toFixed(1)}kN`}
              len={38}
            />
          </g>
        )}
        {RB != null && (
          <g>
            <line
              x1={W-padX} y1={SUPPORT_BOTTOM}
              x2={W-padX} y2={REACTION_TOP}
              stroke={REACT_C} strokeWidth={1} strokeDasharray="3,3" opacity={0.4}/>
            <Arrow
              x={W-padX}
              y={cfg.reactionBUp ? REACTION_TOP + 40 : REACTION_TOP}
              up={cfg.reactionBUp}
              color={REACT_C}
              label={`RB=${RB?.toFixed(1)}kN`}
              len={38}
            />
          </g>
        )}

        {/* ── Quota L ── */}
        <line x1={padX} y1={H-10} x2={W-padX} y2={H-10} stroke={TEXT_C} strokeWidth={1}/>
        <line x1={padX} y1={H-15} x2={padX} y2={H-5} stroke={TEXT_C} strokeWidth={1}/>
        <line x1={W-padX} y1={H-15} x2={W-padX} y2={H-5} stroke={TEXT_C} strokeWidth={1}/>
        <text x={W/2} y={H-2} textAnchor="middle" fontSize={8.5} fill={TEXT_C} fontFamily="JetBrains Mono">
          L = {L} m
        </text>

        {/* ── Labels A/B ── */}
        <text x={padX}   y={beamY-5} textAnchor="middle" fontSize={9} fill={TEXT_C} fontFamily="Rajdhani" fontWeight={700}>A</text>
        <text x={W-padX} y={beamY-5} textAnchor="middle" fontSize={9} fill={TEXT_C} fontFamily="Rajdhani" fontWeight={700}>B</text>
      </svg>
    </div>
  )
}
