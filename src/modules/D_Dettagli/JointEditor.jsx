/**
 * JointEditor.jsx — Pannello input parametrico completo per giunti in acciaio
 * Features: tipo giunto, piastra, bulloni (griglia + posizionamento libero x,y),
 *           stiffener, saldature, materiali
 */
import { useState, useCallback } from 'react'
import { Plus, Trash2, Move, Grid, Settings2, Zap, Layers } from 'lucide-react'
import { JOINT_TYPES, gridBoltLayout, baseBoltLayout, defaultJointConfig, defaultStiffeners, defaultWelds } from './JointCalc'

const MATERIALS = ['S235', 'S275', 'S355', 'S420']
const BOLT_CLASSES = ['4.6', '5.6', '6.8', '8.8', '10.9']
const BOLT_DIAMS = [12, 16, 20, 24, 27, 30]
const WELD_TYPES = ['cordone_angolo', 'a_piena_penetrazione', 'parziale_penetrazione', 'a_tappo']
const WELD_LABELS = {
  cordone_angolo: 'Cordone d\'angolo',
  a_piena_penetrazione: 'Piena penetrazione (CJP)',
  parziale_penetrazione: 'Parziale penetrazione (PJP)',
  a_tappo: 'A tappo / rondella',
}

// ── Bolt canvas editor (free x,y positioning) ────────────────────────────────
function BoltCanvas({ bolts, onChange, plateW, plateH, boltDiam }) {
  const [dragging, setDragging] = useState(null)
  const [mode, setMode] = useState('move')  // 'move' | 'add' | 'delete'

  const CVW = 220, CVH = 240
  const scX = (CVW - 30) / (plateW || 200)
  const scY = (CVH - 30) / (plateH || 300)
  const sc  = Math.min(scX, scY)
  const ox  = CVW / 2   // origin x (plate center)
  const oy  = CVH / 2   // origin y

  const toSvg  = (mm, axis) => axis === 'x' ? ox + mm * sc : oy + mm * sc
  const toMm   = (px, axis) => axis === 'x' ? (px - ox) / sc : (px - oy) / sc
  const r      = Math.max(4, (boltDiam || 20) * sc / 2)

  function handleSvgClick(e) {
    if (mode !== 'add') return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const mx = Math.round(toMm(px, 'x'))
    const my = Math.round(toMm(py, 'y'))
    // clamp inside plate
    const clampX = Math.max(-plateW / 2 + boltDiam, Math.min(plateW / 2 - boltDiam, mx))
    const clampY = Math.max(-plateH / 2 + boltDiam, Math.min(plateH / 2 - boltDiam, my))
    onChange([...bolts, { id: Date.now().toString(), x: clampX, y: clampY }])
  }

  function handleMouseDown(e, idx) {
    if (mode === 'delete') {
      onChange(bolts.filter((_, i) => i !== idx))
      return
    }
    if (mode === 'move') {
      e.stopPropagation()
      setDragging(idx)
    }
  }

  function handleMouseMove(e) {
    if (dragging === null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = Math.round(toMm(e.clientX - rect.left, 'x'))
    const my = Math.round(toMm(e.clientY - rect.top, 'y'))
    const clampX = Math.max(-plateW / 2 + boltDiam, Math.min(plateW / 2 - boltDiam, mx))
    const clampY = Math.max(-plateH / 2 + boltDiam, Math.min(plateH / 2 - boltDiam, my))
    const updated = bolts.map((b, i) => i === dragging ? { ...b, x: clampX, y: clampY } : b)
    onChange(updated)
  }

  const btnStyle = (active) => ({
    padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontSize: '0.65rem',
    fontFamily: 'JetBrains Mono', border: '1px solid var(--border)',
    background: active ? 'rgba(59,130,246,0.25)' : 'transparent',
    color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-muted)', marginRight: 4 }}>
          MODALITÀ:
        </span>
        <button style={btnStyle(mode === 'move')}   onClick={() => setMode('move')}>  <Move size={9}/> SPOSTA</button>
        <button style={btnStyle(mode === 'add')}    onClick={() => setMode('add')}>   <Plus size={9}/> AGGIUNGI</button>
        <button style={btnStyle(mode === 'delete')} onClick={() => setMode('delete')}><Trash2 size={9}/> ELIMINA</button>
      </div>

      <svg
        width={CVW} height={CVH}
        style={{
          background: 'var(--bg-primary)', borderRadius: 6,
          border: '1px solid var(--border)', cursor: mode === 'add' ? 'crosshair' : mode === 'delete' ? 'not-allowed' : 'default',
          display: 'block',
        }}
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        {/* Plate outline */}
        <rect
          x={ox - plateW * sc / 2} y={oy - plateH * sc / 2}
          width={plateW * sc} height={plateH * sc}
          fill="rgba(59,130,246,0.05)" stroke="#3b82f6" strokeWidth={1.5}/>

        {/* Centre lines */}
        <line x1={ox} y1={oy - plateH * sc / 2 - 4} x2={ox} y2={oy + plateH * sc / 2 + 4}
          stroke="rgba(59,130,246,0.2)" strokeWidth={0.8} strokeDasharray="4,3"/>
        <line x1={ox - plateW * sc / 2 - 4} y1={oy} x2={ox + plateW * sc / 2 + 4} y2={oy}
          stroke="rgba(59,130,246,0.2)" strokeWidth={0.8} strokeDasharray="4,3"/>

        {/* Bolts */}
        {bolts.map((bl, i) => (
          <g key={bl.id || i} onMouseDown={(e) => handleMouseDown(e, i)}
            style={{ cursor: mode === 'move' ? 'grab' : mode === 'delete' ? 'pointer' : 'default' }}>
            <circle cx={toSvg(bl.x, 'x')} cy={toSvg(bl.y, 'y')} r={r}
              fill="none" stroke={dragging === i ? '#06b6d4' : '#94a3b8'} strokeWidth={1.5}/>
            <circle cx={toSvg(bl.x, 'x')} cy={toSvg(bl.y, 'y')} r={r * 0.38}
              fill={dragging === i ? '#06b6d4' : '#94a3b8'} opacity={0.7}/>
            <text x={toSvg(bl.x, 'x') + r + 2} y={toSvg(bl.y, 'y') + 3}
              fontSize={6} fill="#475569" fontFamily="JetBrains Mono">
              {i + 1}
            </text>
          </g>
        ))}

        {/* Labels */}
        <text x={ox} y={CVH - 3} textAnchor="middle" fontSize={6.5} fill="#334155" fontFamily="JetBrains Mono">
          {plateW}×{plateH} mm · {bolts.length} bulloni
        </text>
      </svg>

      {/* Bolt coords table */}
      {bolts.length > 0 && (
        <div style={{ marginTop: 6, maxHeight: 100, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem', fontFamily: 'JetBrains Mono' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>#</th>
                <th style={{ padding: '2px 4px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>X [mm]</th>
                <th style={{ padding: '2px 4px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Y [mm]</th>
                <th style={{ padding: '2px 4px', borderBottom: '1px solid var(--border)' }}></th>
              </tr>
            </thead>
            <tbody>
              {bolts.map((bl, i) => (
                <tr key={bl.id || i} style={{ color: 'var(--text-secondary)' }}>
                  <td style={{ padding: '2px 4px' }}>{i + 1}</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                    <input type="number" value={bl.x}
                      onChange={e => onChange(bolts.map((b, j) => j === i ? { ...b, x: +e.target.value } : b))}
                      style={{ width: 48, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textAlign: 'right' }}/>
                  </td>
                  <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                    <input type="number" value={bl.y}
                      onChange={e => onChange(bolts.map((b, j) => j === i ? { ...b, y: +e.target.value } : b))}
                      style={{ width: 48, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textAlign: 'right' }}/>
                  </td>
                  <td style={{ padding: '2px 4px' }}>
                    <button onClick={() => onChange(bolts.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: 0 }}>
                      <Trash2 size={10}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Grid preset generator ──────────────────────────────────────────────────
function GridPreset({ cfg, onApply }) {
  const [nR, setNR] = useState(4)
  const [nC, setNC] = useState(2)
  const [pitch, setPitch] = useState(70)
  const [edge, setEdge]   = useState(40)

  function apply() {
    const bolts = gridBoltLayout({
      nRows: nR, nCols: nC, pitch,
      edgeDist: edge,
      plateW: cfg.plate?.w || 140,
      plateH: cfg.plate?.h || 280,
    })
    onApply(bolts)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
      {[['File', nR, setNR, 1, 8], ['Col.', nC, setNC, 1, 4],
        ['Passo', pitch, setPitch, 30, 150], ['Bordo', edge, setEdge, 20, 80]].map(([lbl, val, set, min, max]) => (
        <div key={lbl}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 2 }}>{lbl}</div>
          <input type="number" value={val} min={min} max={max} onChange={e => set(+e.target.value)}
            style={{ width: 52, padding: '3px 6px', borderRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}/>
        </div>
      ))}
      <button onClick={apply} className="eng-btn eng-btn-secondary" style={{ padding: '5px 10px', fontSize: '0.7rem' }}>
        <Grid size={11}/> APPLICA GRIGLIA
      </button>
    </div>
  )
}

// ── Main JointEditor ──────────────────────────────────────────────────────────
export default function JointEditor({ jointConfig, onChange, profilo }) {
  const [activeTab, setActiveTab] = useState('piastra')  // piastra | bulloni | stiffener | saldature

  if (!jointConfig) return null
  const cfg = jointConfig
  const tipo = cfg.tipo

  const update = useCallback((patch) => onChange({ ...cfg, ...patch }), [cfg, onChange])
  const updatePlate = useCallback((patch) => onChange({ ...cfg, plate: { ...cfg.plate, ...patch } }), [cfg, onChange])
  const updateBolts = useCallback((bolts) => onChange({ ...cfg, bolts }), [cfg, onChange])

  const tabs = [
    { id: 'piastra',   label: 'PIASTRA',    icon: <Layers size={11}/> },
    { id: 'bulloni',   label: 'BULLONI',    icon: <Grid size={11}/> },
    { id: 'stiffener', label: 'STIFFENER',  icon: <Settings2 size={11}/> },
    { id: 'saldature', label: 'SALDATURE',  icon: <Zap size={11}/> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 3 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '5px 4px', borderRadius: 4, cursor: 'pointer', fontSize: '0.65rem',
              fontFamily: 'JetBrains Mono', fontWeight: 600, letterSpacing: '0.05em',
              border: '1px solid var(--border)',
              background: activeTab === t.id ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: PIASTRA ── */}
      {activeTab === 'piastra' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Larghezza [mm]', 'w', 80, 400],
            ['Altezza [mm]',   'h', 80, 600],
            ['Spessore [mm]',  't', 6,  50],
          ].map(([lbl, key, min, max]) => (
            <div key={key}>
              <label className="eng-label" style={{ fontSize: '0.62rem' }}>{lbl}</label>
              <input className="eng-input" type="number" min={min} max={max}
                value={cfg.plate?.[key] || 0}
                onChange={e => updatePlate({ [key]: +e.target.value })}/>
            </div>
          ))}
          <div>
            <label className="eng-label" style={{ fontSize: '0.62rem' }}>Materiale</label>
            <select className="eng-select" value={cfg.materialePiastra || 'S355'}
              onChange={e => update({ materialePiastra: e.target.value })}>
              {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {tipo === 'baseplateconc' && (
            <>
              <div>
                <label className="eng-label" style={{ fontSize: '0.62rem' }}>Grout [mm]</label>
                <input className="eng-input" type="number" min={10} max={100}
                  value={cfg.groutThickness || 30}
                  onChange={e => update({ groutThickness: +e.target.value })}/>
              </div>
              <div>
                <label className="eng-label" style={{ fontSize: '0.62rem' }}>Lungh. Tirafondi [mm]</label>
                <input className="eng-input" type="number" min={100} max={1200}
                  value={cfg.anchorLength || 400}
                  onChange={e => update({ anchorLength: +e.target.value })}/>
              </div>
            </>
          )}
          {tipo === 'cleat' && (
            <>
              <div>
                <label className="eng-label" style={{ fontSize: '0.62rem' }}>Squadretta L [mm]</label>
                <input className="eng-input" type="number" min={50} max={200}
                  value={cfg.cleat?.w || 90}
                  onChange={e => update({ cleat: { ...cfg.cleat, w: +e.target.value } })}/>
              </div>
              <div>
                <label className="eng-label" style={{ fontSize: '0.62rem' }}>N° Squadrette</label>
                <select className="eng-select" value={cfg.nCleats || 2}
                  onChange={e => update({ nCleats: +e.target.value })}>
                  <option value={1}>1 (singola)</option>
                  <option value={2}>2 (doppia)</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: BULLONI ── */}
      {activeTab === 'bulloni' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="eng-label" style={{ fontSize: '0.62rem' }}>Diametro [mm]</label>
              <select className="eng-select" value={cfg.boltDiam || 20}
                onChange={e => update({ boltDiam: +e.target.value })}>
                {BOLT_DIAMS.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </div>
            <div>
              <label className="eng-label" style={{ fontSize: '0.62rem' }}>Classe</label>
              <select className="eng-select" value={cfg.boltClass || '8.8'}
                onChange={e => update({ boltClass: e.target.value })}>
                {BOLT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Grid preset */}
          <div className="eng-card" style={{ padding: 10 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              GENERA GRIGLIA BULLONI
            </div>
            <GridPreset cfg={cfg} onApply={updateBolts}/>
          </div>

          {/* Canvas editor */}
          <div className="eng-card" style={{ padding: 10 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              POSIZIONAMENTO LIBERO — Clicca sulla piastra per aggiungere bulloni
            </div>
            <BoltCanvas
              bolts={cfg.bolts || []}
              onChange={updateBolts}
              plateW={cfg.plate?.w || 140}
              plateH={cfg.plate?.h || 280}
              boltDiam={cfg.boltDiam || 20}
            />
          </div>
        </div>
      )}

      {/* ── Tab: STIFFENER ── */}
      {activeTab === 'stiffener' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="eng-btn eng-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.72rem', alignSelf: 'flex-start' }}
            onClick={() => {
              const newSt = {
                id: Date.now().toString(), label: `Stiffener ${(cfg.stiffeners || []).length + 1}`,
                side: 'top', w: 60, h: 80, t: 8, posX: 0, posY: 0, enabled: true,
              }
              update({ stiffeners: [...(cfg.stiffeners || []), newSt] })
            }}>
            <Plus size={12}/> AGGIUNGI STIFFENER
          </button>

          {(cfg.stiffeners || []).map((st, idx) => (
            <div key={st.id} className="eng-card" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <input value={st.label}
                  onChange={e => {
                    const s = [...cfg.stiffeners]; s[idx] = { ...s[idx], label: e.target.value }
                    update({ stiffeners: s })
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', fontWeight: 700, width: 140 }}/>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={st.enabled}
                      onChange={e => {
                        const s = [...cfg.stiffeners]; s[idx] = { ...s[idx], enabled: e.target.checked }
                        update({ stiffeners: s })
                      }}/>
                    ATTIVO
                  </label>
                  <button onClick={() => update({ stiffeners: cfg.stiffeners.filter((_, i) => i !== idx) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)' }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {[['W [mm]','w',10,200],['H [mm]','h',10,300],['t [mm]','t',4,30],
                  ['posX [mm]','posX',-300,300],['posY [mm]','posY',-300,300]].map(([lbl,key,min,max]) => (
                  <div key={key}>
                    <label className="eng-label" style={{ fontSize: '0.58rem' }}>{lbl}</label>
                    <input className="eng-input" type="number" min={min} max={max} value={st[key] || 0}
                      style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                      onChange={e => {
                        const s = [...cfg.stiffeners]; s[idx] = { ...s[idx], [key]: +e.target.value }
                        update({ stiffeners: s })
                      }}/>
                  </div>
                ))}
                <div>
                  <label className="eng-label" style={{ fontSize: '0.58rem' }}>LATO</label>
                  <select className="eng-select" value={st.side || 'top'}
                    style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                    onChange={e => {
                      const s = [...cfg.stiffeners]; s[idx] = { ...s[idx], side: e.target.value }
                      update({ stiffeners: s })
                    }}>
                    <option value="top">Superiore</option>
                    <option value="bottom">Inferiore</option>
                    <option value="web">Anima</option>
                    <option value="both">Entrambi</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          {(cfg.stiffeners || []).length === 0 && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              Nessun stiffener configurato
            </div>
          )}
        </div>
      )}

      {/* ── Tab: SALDATURE ── */}
      {activeTab === 'saldature' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(cfg.welds || []).map((w, idx) => (
            <div key={w.id} className="eng-card" style={{ padding: 10 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: 8 }}>
                {w.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label className="eng-label" style={{ fontSize: '0.58rem' }}>TIPO</label>
                  <select className="eng-select" value={w.tipo}
                    style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                    onChange={e => {
                      const ws = [...cfg.welds]; ws[idx] = { ...ws[idx], tipo: e.target.value }
                      update({ welds: ws })
                    }}>
                    {Object.entries(WELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="eng-label" style={{ fontSize: '0.58rem' }}>
                    {w.tipo === 'a_piena_penetrazione' ? 'Spessore (auto)' : 'Gola a [mm]'}
                  </label>
                  <input className="eng-input" type="number" min={0} max={25}
                    value={w.a || 0}
                    disabled={w.tipo === 'a_piena_penetrazione'}
                    style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                    onChange={e => {
                      const ws = [...cfg.welds]; ws[idx] = { ...ws[idx], a: +e.target.value }
                      update({ welds: ws })
                    }}/>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="eng-label" style={{ fontSize: '0.58rem' }}>NOTE</label>
                  <input className="eng-input" value={w.note || ''}
                    style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                    onChange={e => {
                      const ws = [...cfg.welds]; ws[idx] = { ...ws[idx], note: e.target.value }
                      update({ welds: ws })
                    }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
