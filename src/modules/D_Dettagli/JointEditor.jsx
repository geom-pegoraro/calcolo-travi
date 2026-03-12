/**
 * JointEditor.jsx — Pannello input parametrico completo
 * Tab: PIASTRA · BULLONI · STIFFENER · SALDATURE · HOST · ANCORAGGI · FONDAZIONE
 */
import { useState, useCallback } from 'react'
import { Plus, Trash2, Move, Grid, Settings2, Zap, Layers, Building2, Anchor, Cpu } from 'lucide-react'
import {
  JOINT_TYPES, HOST_TYPES, CONCRETE_PROPS, FOUNDATION_TYPES, SLAB_TYPES,
  gridBoltLayout, baseBoltLayout,
  defaultHostConfig, defaultChemicalAnchorConfig, defaultFoundationConfig, defaultSlabConfig,
} from './JointCalc'

const MATERIALS    = ['S235', 'S275', 'S355', 'S420']
const BOLT_CLASSES = ['4.6', '5.6', '6.8', '8.8', '10.9']
const BOLT_DIAMS   = [8, 10, 12, 16, 20, 24, 27, 30]
const WELD_LABELS  = {
  cordone_angolo:         'Cordone d\'angolo',
  a_piena_penetrazione:   'Piena penetrazione (CJP)',
  parziale_penetrazione:  'Parziale penetrazione (PJP)',
  a_tappo:                'A tappo / rondella',
}
const RESIN_TYPES      = ['epossidica', 'vinilestere', 'poliestere', 'ibrida']
const BAR_MATERIALS    = ['zinco', 'inox_a2', 'inox_a4', 'carbonio']
const BAR_MAT_LABELS   = { zinco: 'Zincato', inox_a2: 'Inox A2', inox_a4: 'Inox A4', carbonio: 'Carbonio' }
const PROFILE_SERIES   = ['HEB', 'HEA', 'IPE', 'HEM', 'UPN', 'RHS']
const CONCRETE_CLASSES = Object.keys(CONCRETE_PROPS)

// ── Bolt canvas ─────────────────────────────────────────────────────────────
function BoltCanvas({ bolts, onChange, plateW, plateH, boltDiam }) {
  const [dragging, setDragging] = useState(null)
  const [mode, setMode] = useState('move')
  const CVW = 220, CVH = 240
  const sc  = Math.min((CVW - 30) / (plateW || 200), (CVH - 30) / (plateH || 300))
  const ox  = CVW / 2, oy = CVH / 2
  const toSvg = (mm, ax) => ax === 'x' ? ox + mm * sc : oy + mm * sc
  const toMm  = (px, ax) => ax === 'x' ? (px - ox) / sc : (px - oy) / sc
  const r     = Math.max(4, (boltDiam || 20) * sc / 2)

  function handleSvgClick(e) {
    if (mode !== 'add') return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = Math.round(toMm(e.clientX - rect.left, 'x'))
    const my = Math.round(toMm(e.clientY - rect.top,  'y'))
    const cx = Math.max(-plateW / 2 + boltDiam, Math.min(plateW / 2 - boltDiam, mx))
    const cy = Math.max(-plateH / 2 + boltDiam, Math.min(plateH / 2 - boltDiam, my))
    onChange([...bolts, { id: Date.now().toString(), x: cx, y: cy }])
  }
  function handleMouseDown(e, idx) {
    if (mode === 'delete') { onChange(bolts.filter((_, i) => i !== idx)); return }
    if (mode === 'move')   { e.stopPropagation(); setDragging(idx) }
  }
  function handleMouseMove(e) {
    if (dragging === null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = Math.round(toMm(e.clientX - rect.left, 'x'))
    const my = Math.round(toMm(e.clientY - rect.top,  'y'))
    const cx = Math.max(-plateW / 2 + boltDiam, Math.min(plateW / 2 - boltDiam, mx))
    const cy = Math.max(-plateH / 2 + boltDiam, Math.min(plateH / 2 - boltDiam, my))
    onChange(bolts.map((b, i) => i === dragging ? { ...b, x: cx, y: cy } : b))
  }
  const btnS = (a) => ({ padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'JetBrains Mono', border: '1px solid var(--border)', background: a ? 'rgba(59,130,246,0.25)' : 'transparent', color: a ? 'var(--accent-blue)' : 'var(--text-muted)' })
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-muted)', marginRight: 4 }}>MODALITÀ:</span>
        <button style={btnS(mode==='move')}   onClick={() => setMode('move')}>  <Move size={9}/> SPOSTA</button>
        <button style={btnS(mode==='add')}    onClick={() => setMode('add')}>   <Plus size={9}/> AGGIUNGI</button>
        <button style={btnS(mode==='delete')} onClick={() => setMode('delete')}><Trash2 size={9}/> ELIMINA</button>
      </div>
      <svg width={CVW} height={CVH}
        style={{ background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)', cursor: mode === 'add' ? 'crosshair' : mode === 'delete' ? 'not-allowed' : 'default', display: 'block' }}
        onClick={handleSvgClick} onMouseMove={handleMouseMove} onMouseUp={() => setDragging(null)} onMouseLeave={() => setDragging(null)}>
        <rect x={ox - plateW*sc/2} y={oy - plateH*sc/2} width={plateW*sc} height={plateH*sc} fill="rgba(59,130,246,0.05)" stroke="#3b82f6" strokeWidth={1.5}/>
        <line x1={ox} y1={oy-plateH*sc/2-4} x2={ox} y2={oy+plateH*sc/2+4} stroke="rgba(59,130,246,0.2)" strokeWidth={0.8} strokeDasharray="4,3"/>
        <line x1={ox-plateW*sc/2-4} y1={oy} x2={ox+plateW*sc/2+4} y2={oy} stroke="rgba(59,130,246,0.2)" strokeWidth={0.8} strokeDasharray="4,3"/>
        {bolts.map((bl, i) => (
          <g key={bl.id || i} onMouseDown={(e) => handleMouseDown(e, i)} style={{ cursor: mode === 'move' ? 'grab' : mode === 'delete' ? 'pointer' : 'default' }}>
            <circle cx={toSvg(bl.x,'x')} cy={toSvg(bl.y,'y')} r={r} fill="none" stroke={dragging===i ? '#06b6d4' : '#94a3b8'} strokeWidth={1.5}/>
            <circle cx={toSvg(bl.x,'x')} cy={toSvg(bl.y,'y')} r={r*0.38} fill={dragging===i ? '#06b6d4' : '#94a3b8'} opacity={0.7}/>
            <text x={toSvg(bl.x,'x')+r+2} y={toSvg(bl.y,'y')+3} fontSize={6} fill="#475569" fontFamily="JetBrains Mono">{i+1}</text>
          </g>
        ))}
        <text x={ox} y={CVH-3} textAnchor="middle" fontSize={6.5} fill="#334155" fontFamily="JetBrains Mono">{plateW}×{plateH} mm · {bolts.length} bulloni</text>
      </svg>
      {bolts.length > 0 && (
        <div style={{ marginTop: 6, maxHeight: 100, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem', fontFamily: 'JetBrains Mono' }}>
            <thead><tr style={{ color: 'var(--text-muted)' }}>
              <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>#</th>
              <th style={{ padding: '2px 4px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>X</th>
              <th style={{ padding: '2px 4px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Y</th>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid var(--border)' }}></th>
            </tr></thead>
            <tbody>{bolts.map((bl, i) => (
              <tr key={bl.id||i} style={{ color: 'var(--text-secondary)' }}>
                <td style={{ padding: '2px 4px' }}>{i+1}</td>
                <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                  <input type="number" value={bl.x} onChange={e => onChange(bolts.map((b,j) => j===i ? {...b, x: +e.target.value} : b))} style={{ width: 48, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textAlign: 'right' }}/>
                </td>
                <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                  <input type="number" value={bl.y} onChange={e => onChange(bolts.map((b,j) => j===i ? {...b, y: +e.target.value} : b))} style={{ width: 48, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textAlign: 'right' }}/>
                </td>
                <td style={{ padding: '2px 4px' }}>
                  <button onClick={() => onChange(bolts.filter((_,j)=>j!==i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: 0 }}><Trash2 size={10}/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Grid preset ──────────────────────────────────────────────────────────────
function GridPreset({ cfg, onApply }) {
  const [nR, setNR] = useState(4), [nC, setNC] = useState(2)
  const [pitch, setPitch] = useState(70), [edge, setEdge] = useState(40)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
      {[['File', nR, setNR, 1, 8], ['Col.', nC, setNC, 1, 4], ['Passo', pitch, setPitch, 30, 150], ['Bordo', edge, setEdge, 20, 80]].map(([lbl, val, set, min, max]) => (
        <div key={lbl}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 2 }}>{lbl}</div>
          <input type="number" value={val} min={min} max={max} onChange={e => set(+e.target.value)} style={{ width: 52, padding: '3px 6px', borderRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.7rem' }}/>
        </div>
      ))}
      <button onClick={() => onApply(gridBoltLayout({ nRows: nR, nCols: nC, pitch, edgeDist: edge, plateW: cfg.plate?.w || 140, plateH: cfg.plate?.h || 280 }))} className="eng-btn eng-btn-secondary" style={{ padding: '5px 10px', fontSize: '0.7rem' }}>
        <Grid size={11}/> APPLICA GRIGLIA
      </button>
    </div>
  )
}

// ── Sezione row helper ────────────────────────────────────────────────────────
function Row({ label, children }) {
  return (
    <div>
      <label className="eng-label" style={{ fontSize: '0.62rem' }}>{label}</label>
      {children}
    </div>
  )
}
function NumInput({ value, onChange, min, max, step = 1 }) {
  return <input className="eng-input" type="number" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}/>
}

// ══════════════════════════════════════════════════════════════════════════════
// Main JointEditor
// ══════════════════════════════════════════════════════════════════════════════
export default function JointEditor({ jointConfig, onChange, profilo }) {
  const [activeTab, setActiveTab] = useState('piastra')
  if (!jointConfig) return null
  const cfg  = jointConfig
  const tipo = cfg.tipo

  const update       = useCallback((patch) => onChange({ ...cfg, ...patch }), [cfg, onChange])
  const updatePlate  = useCallback((patch) => onChange({ ...cfg, plate: { ...cfg.plate, ...patch } }), [cfg, onChange])
  const updateBolts  = useCallback((bolts)  => onChange({ ...cfg, bolts }), [cfg, onChange])
  const updateHost   = useCallback((patch) => onChange({ ...cfg, hostConfig: { ...cfg.hostConfig, ...patch } }), [cfg, onChange])
  const updateAnchor = useCallback((patch) => onChange({ ...cfg, chemicalAnchor: { ...cfg.chemicalAnchor, ...patch } }), [cfg, onChange])
  const updateFound  = useCallback((patch) => onChange({ ...cfg, foundation: { ...cfg.foundation, ...patch } }), [cfg, onChange])
  const updateSlab   = useCallback((patch) => onChange({ ...cfg, slab: { ...cfg.slab, ...patch } }), [cfg, onChange])

  const tabs = [
    { id: 'piastra',    label: 'PIASTRA',    icon: <Layers size={10}/> },
    { id: 'bulloni',    label: 'BULLONI',    icon: <Grid size={10}/> },
    { id: 'stiffener',  label: 'STIFF.',     icon: <Settings2 size={10}/> },
    { id: 'saldature',  label: 'SALDATURE',  icon: <Zap size={10}/> },
    { id: 'host',       label: 'HOST',       icon: <Building2 size={10}/> },
    { id: 'ancoraggi',  label: 'ANCORAGGI',  icon: <Anchor size={10}/> },
    { id: 'fondazione', label: 'FOND./SOL.', icon: <Cpu size={10}/> },
  ]

  const hostType   = cfg.hostType || 'steel_column'
  const hostCfg    = cfg.hostConfig || defaultHostConfig(hostType)
  const anchorCfg  = cfg.chemicalAnchor || defaultChemicalAnchorConfig()
  const foundCfg   = cfg.foundation || defaultFoundationConfig()
  const slabCfg    = cfg.slab || defaultSlabConfig()
  const isCAHost   = ['rc_column', 'rc_beam', 'rc_wall', 'foundation'].includes(hostType)

  const labelStyle = { fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }
  const sectionTitle = (txt) => <div style={{ ...labelStyle, marginTop: 12, marginBottom: 8, color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(6,182,212,0.2)', paddingBottom: 4 }}>{txt}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Tab bar — scrollable su mobile */}
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: '0 0 auto', padding: '5px 7px', borderRadius: 4, cursor: 'pointer', fontSize: '0.6rem', fontFamily: 'JetBrains Mono', fontWeight: 600, letterSpacing: '0.04em', border: '1px solid var(--border)', background: activeTab === t.id ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── PIASTRA ── */}
      {activeTab === 'piastra' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['Larghezza [mm]','w',80,400],['Altezza [mm]','h',80,600],['Spessore [mm]','t',6,50]].map(([lbl,key,min,max]) => (
            <Row key={key} label={lbl}><input className="eng-input" type="number" min={min} max={max} value={cfg.plate?.[key]||0} onChange={e => updatePlate({ [key]: +e.target.value })}/></Row>
          ))}
          <Row label="Materiale">
            <select className="eng-select" value={cfg.materialePiastra||'S355'} onChange={e => update({ materialePiastra: e.target.value })}>
              {MATERIALS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Row>
          {tipo === 'baseplateconc' && <>
            <Row label="Grout [mm]"><input className="eng-input" type="number" min={10} max={100} value={cfg.groutThickness||30} onChange={e => update({ groutThickness: +e.target.value })}/></Row>
            <Row label="Lungh. Tirafondi [mm]"><input className="eng-input" type="number" min={100} max={1200} value={cfg.anchorLength||400} onChange={e => update({ anchorLength: +e.target.value })}/></Row>
          </>}
          {tipo === 'cleat' && <>
            <Row label="Squadretta L [mm]"><input className="eng-input" type="number" min={50} max={200} value={cfg.cleat?.w||90} onChange={e => update({ cleat: { ...cfg.cleat, w: +e.target.value } })}/></Row>
            <Row label="N° Squadrette">
              <select className="eng-select" value={cfg.nCleats||2} onChange={e => update({ nCleats: +e.target.value })}>
                <option value={1}>1 (singola)</option><option value={2}>2 (doppia)</option>
              </select>
            </Row>
          </>}
        </div>
      )}

      {/* ── BULLONI ── */}
      {activeTab === 'bulloni' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Row label="Diametro [mm]">
              <select className="eng-select" value={cfg.boltDiam||20} onChange={e => update({ boltDiam: +e.target.value })}>
                {BOLT_DIAMS.map(d => <option key={d} value={d}>M{d}</option>)}
              </select>
            </Row>
            <Row label="Classe">
              <select className="eng-select" value={cfg.boltClass||'8.8'} onChange={e => update({ boltClass: e.target.value })}>
                {BOLT_CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Row>
          </div>
          <div className="eng-card" style={{ padding: 10 }}>
            <div style={labelStyle}>GENERA GRIGLIA BULLONI</div>
            <GridPreset cfg={cfg} onApply={updateBolts}/>
          </div>
          <div className="eng-card" style={{ padding: 10 }}>
            <div style={labelStyle}>POSIZIONAMENTO LIBERO</div>
            <BoltCanvas bolts={cfg.bolts||[]} onChange={updateBolts} plateW={cfg.plate?.w||140} plateH={cfg.plate?.h||280} boltDiam={cfg.boltDiam||20}/>
          </div>
        </div>
      )}

      {/* ── STIFFENER ── */}
      {activeTab === 'stiffener' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="eng-btn eng-btn-secondary" style={{ padding: '5px 10px', fontSize: '0.72rem', alignSelf: 'flex-start' }}
            onClick={() => update({ stiffeners: [...(cfg.stiffeners||[]), { id: Date.now().toString(), label: `Stiffener ${(cfg.stiffeners||[]).length+1}`, side: 'top', w: 60, h: 80, t: 8, posX: 0, posY: 0, enabled: true }] })}>
            <Plus size={12}/> AGGIUNGI STIFFENER
          </button>
          {(cfg.stiffeners||[]).map((st, idx) => (
            <div key={st.id} className="eng-card" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <input value={st.label} onChange={e => { const s=[...cfg.stiffeners]; s[idx]={...s[idx],label:e.target.value}; update({stiffeners:s}) }} style={{ background:'transparent',border:'none',color:'var(--accent-cyan)',fontFamily:'JetBrains Mono',fontSize:'0.75rem',fontWeight:700,width:140 }}/>
                <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                  <label style={{ display:'flex',alignItems:'center',gap:4,fontFamily:'JetBrains Mono',fontSize:'0.65rem',color:'var(--text-muted)',cursor:'pointer' }}>
                    <input type="checkbox" checked={st.enabled} onChange={e => { const s=[...cfg.stiffeners]; s[idx]={...s[idx],enabled:e.target.checked}; update({stiffeners:s}) }}/> ATTIVO
                  </label>
                  <button onClick={() => update({ stiffeners: cfg.stiffeners.filter((_,i)=>i!==idx) })} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent-red)' }}><Trash2 size={12}/></button>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6 }}>
                {[['W [mm]','w',10,200],['H [mm]','h',10,300],['t [mm]','t',4,30],['posX','posX',-300,300],['posY','posY',-300,300]].map(([lbl,key,min,max]) => (
                  <div key={key}>
                    <label className="eng-label" style={{ fontSize:'0.58rem' }}>{lbl}</label>
                    <input className="eng-input" type="number" min={min} max={max} value={st[key]||0} style={{ padding:'3px 6px',fontSize:'0.75rem' }} onChange={e => { const s=[...cfg.stiffeners]; s[idx]={...s[idx],[key]:+e.target.value}; update({stiffeners:s}) }}/>
                  </div>
                ))}
                <div>
                  <label className="eng-label" style={{ fontSize:'0.58rem' }}>LATO</label>
                  <select className="eng-select" value={st.side||'top'} style={{ padding:'3px 6px',fontSize:'0.75rem' }} onChange={e => { const s=[...cfg.stiffeners]; s[idx]={...s[idx],side:e.target.value}; update({stiffeners:s}) }}>
                    <option value="top">Superiore</option><option value="bottom">Inferiore</option>
                    <option value="web">Anima</option><option value="both">Entrambi</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          {(cfg.stiffeners||[]).length === 0 && <div style={{ fontFamily:'JetBrains Mono',fontSize:'0.72rem',color:'var(--text-muted)',textAlign:'center',padding:20 }}>Nessun stiffener configurato</div>}
        </div>
      )}

      {/* ── SALDATURE ── */}
      {activeTab === 'saldature' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(cfg.welds||[]).map((w, idx) => (
            <div key={w.id} className="eng-card" style={{ padding: 10 }}>
              <div style={{ fontFamily:'JetBrains Mono',fontSize:'0.7rem',color:'var(--accent-cyan)',fontWeight:700,marginBottom:8 }}>{w.label}</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                <div>
                  <label className="eng-label" style={{ fontSize:'0.58rem' }}>TIPO</label>
                  <select className="eng-select" value={w.tipo} style={{ padding:'3px 6px',fontSize:'0.7rem' }} onChange={e => { const ws=[...cfg.welds]; ws[idx]={...ws[idx],tipo:e.target.value}; update({welds:ws}) }}>
                    {Object.entries(WELD_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="eng-label" style={{ fontSize:'0.58rem' }}>{w.tipo==='a_piena_penetrazione' ? 'Spessore (auto)' : 'Gola a [mm]'}</label>
                  <input className="eng-input" type="number" min={0} max={25} value={w.a||0} disabled={w.tipo==='a_piena_penetrazione'} style={{ padding:'3px 6px',fontSize:'0.75rem' }} onChange={e => { const ws=[...cfg.welds]; ws[idx]={...ws[idx],a:+e.target.value}; update({welds:ws}) }}/>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label className="eng-label" style={{ fontSize:'0.58rem' }}>NOTE</label>
                  <input className="eng-input" value={w.note||''} style={{ padding:'3px 6px',fontSize:'0.75rem' }} onChange={e => { const ws=[...cfg.welds]; ws[idx]={...ws[idx],note:e.target.value}; update({welds:ws}) }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── HOST ── */}
      {activeTab === 'host' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Selezione tipo host */}
          <div>
            <div style={labelStyle}>ELEMENTO DI SUPPORTO</div>
            <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
              {Object.entries(HOST_TYPES).map(([key, info]) => (
                <button key={key} onClick={() => update({ hostType: key, hostConfig: defaultHostConfig(key) })}
                  style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:6,cursor:'pointer',textAlign:'left', border: hostType===key ? '1px solid var(--accent-blue)' : '1px solid var(--border)', background: hostType===key ? 'rgba(59,130,246,0.1)' : 'transparent', color: hostType===key ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                  <span style={{ fontSize:'1.1rem',minWidth:20 }}>{info.icon}</span>
                  <div>
                    <div style={{ fontFamily:'Rajdhani',fontWeight:700,fontSize:'0.8rem',letterSpacing:'0.04em' }}>{info.label}</div>
                    <div style={{ fontFamily:'JetBrains Mono',fontSize:'0.58rem',color:'var(--text-muted)',marginTop:1 }}>{info.desc}</div>
                  </div>
                  {info.group === 'ca' && <span style={{ marginLeft:'auto',fontFamily:'JetBrains Mono',fontSize:'0.55rem',padding:'1px 5px',borderRadius:3,background:'rgba(6,182,212,0.15)',color:'var(--accent-cyan)',border:'1px solid rgba(6,182,212,0.3)' }}>C.A.</span>}
                  {info.group === 'acciaio' && <span style={{ marginLeft:'auto',fontFamily:'JetBrains Mono',fontSize:'0.55rem',padding:'1px 5px',borderRadius:3,background:'rgba(59,130,246,0.15)',color:'var(--accent-blue)',border:'1px solid rgba(59,130,246,0.3)' }}>EC3</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Parametri host — Acciaio */}
          {['steel_column','steel_beam'].includes(hostType) && (
            <div className="eng-card" style={{ padding:12 }}>
              {sectionTitle('PROFILO ACCIAIO')}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <Row label="Serie">
                  <select className="eng-select" value={hostCfg.profileSeries||'HEB'} onChange={e => updateHost({ profileSeries: e.target.value })}>
                    {PROFILE_SERIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Row>
                <Row label="Dimensione">
                  <input className="eng-input" value={hostCfg.profileSize||'200'} onChange={e => updateHost({ profileSize: e.target.value })} placeholder="es. 200"/>
                </Row>
                <Row label="Materiale">
                  <select className="eng-select" value={hostCfg.material||'S355'} onChange={e => updateHost({ material: e.target.value })}>
                    {MATERIALS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Row>
              </div>
            </div>
          )}

          {/* Parametri host — C.A. */}
          {isCAHost && (
            <div className="eng-card" style={{ padding:12 }}>
              {sectionTitle('SEZIONE IN C.A.')}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <Row label="Base b [mm]"><NumInput value={hostCfg.width||300} onChange={v => updateHost({ width: v })} min={150} max={2000}/></Row>
                <Row label="Altezza h [mm]"><NumInput value={hostCfg.height||400} onChange={v => updateHost({ height: v })} min={150} max={3000}/></Row>
                <Row label="Classe Cls">
                  <select className="eng-select" value={hostCfg.classCls||'C25/30'} onChange={e => updateHost({ classCls: e.target.value })}>
                    {CONCRETE_CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Row>
                <Row label="Copriferro [mm]"><NumInput value={hostCfg.cover||30} onChange={v => updateHost({ cover: v })} min={15} max={80}/></Row>
                {sectionTitle('ARMATURA PRINCIPALE')}
                <Row label="N° barre"><NumInput value={hostCfg.rebarN||4} onChange={v => updateHost({ rebarN: v })} min={2} max={40}/></Row>
                <Row label="Ø barre [mm]">
                  <select className="eng-select" value={hostCfg.rebarDiam||16} onChange={e => updateHost({ rebarDiam: +e.target.value })}>
                    {[8,10,12,14,16,18,20,22,25,28,30,32].map(d => <option key={d} value={d}>Ø{d}</option>)}
                  </select>
                </Row>
                {sectionTitle('STAFFE')}
                <Row label="Ø staffa [mm]">
                  <select className="eng-select" value={hostCfg.stirrupDiam||8} onChange={e => updateHost({ stirrupDiam: +e.target.value })}>
                    {[6,8,10,12].map(d => <option key={d} value={d}>Ø{d}</option>)}
                  </select>
                </Row>
                <Row label="Passo staffe [mm]"><NumInput value={hostCfg.stirrupSpacing||150} onChange={v => updateHost({ stirrupSpacing: v })} min={50} max={400}/></Row>
              </div>
            </div>
          )}

          {/* Parametri host — Muratura */}
          {hostType === 'masonry' && (
            <div className="eng-card" style={{ padding:12 }}>
              {sectionTitle('MURATURA')}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <Row label="Larghezza [mm]"><NumInput value={hostCfg.width||300} onChange={v => updateHost({ width: v })} min={100} max={1000}/></Row>
                <Row label="Piastra Ripart. [mm]"><NumInput value={hostCfg.plateW||200} onChange={v => updateHost({ plateW: v })} min={100} max={600}/></Row>
                <Row label="Sp. Piastra [mm]"><NumInput value={hostCfg.plateT||15} onChange={v => updateHost({ plateT: v })} min={6} max={40}/></Row>
                <Row label="Ancoraggi passanti">
                  <select className="eng-select" value={hostCfg.boltsThrough?'si':'no'} onChange={e => updateHost({ boltsThrough: e.target.value==='si' })}>
                    <option value="si">Sì</option><option value="no">No</option>
                  </select>
                </Row>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANCORAGGI CHIMICI ── */}
      {activeTab === 'ancoraggi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Toggle abilitazione */}
          <div className="eng-card" style={{ padding:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontFamily:'Rajdhani',fontWeight:700,fontSize:'0.85rem',color:'var(--text-primary)' }}>Ancoraggi Chimici / Meccanici</div>
              <div style={{ fontFamily:'JetBrains Mono',fontSize:'0.6rem',color:'var(--text-muted)' }}>ETAG 001 / EAD 330232 · su supporto cementizio</div>
            </div>
            <label style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer' }}>
              <input type="checkbox" checked={anchorCfg.enabled||false} onChange={e => updateAnchor({ enabled: e.target.checked })}
                style={{ width:16,height:16,accentColor:'var(--accent-blue)' }}/>
              <span style={{ fontFamily:'JetBrains Mono',fontSize:'0.72rem',color: anchorCfg.enabled ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {anchorCfg.enabled ? 'ATTIVO' : 'OFF'}
              </span>
            </label>
          </div>

          {anchorCfg.enabled && (
            <>
              <div className="eng-card" style={{ padding:12 }}>
                {sectionTitle('BARRA DI ANCORAGGIO')}
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                  <Row label="Diametro barra">
                    <select className="eng-select" value={anchorCfg.barDiam||16} onChange={e => updateAnchor({ barDiam: +e.target.value })}>
                      {[8,10,12,16,20,24,27,30].map(d => <option key={d} value={d}>M{d}</option>)}
                    </select>
                  </Row>
                  <Row label="Materiale barra">
                    <select className="eng-select" value={anchorCfg.barMaterial||'zinco'} onChange={e => updateAnchor({ barMaterial: e.target.value })}>
                      {BAR_MATERIALS.map(m => <option key={m} value={m}>{BAR_MAT_LABELS[m]}</option>)}
                    </select>
                  </Row>
                  <Row label="Prof. efficace h_ef [mm]"><NumInput value={anchorCfg.hef||160} onChange={v => updateAnchor({ hef: v })} min={40} max={600}/></Row>
                  <Row label="N° ancoraggi"><NumInput value={anchorCfg.nAnchors||4} onChange={v => updateAnchor({ nAnchors: v })} min={1} max={20}/></Row>
                  <Row label="Tipo resina">
                    <select className="eng-select" value={anchorCfg.resinType||'epossidica'} onChange={e => updateAnchor({ resinType: e.target.value })}>
                      {RESIN_TYPES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </Row>
                  <Row label="Classe calcestruzzo">
                    <select className="eng-select" value={anchorCfg.concreteClass||'C25/30'} onChange={e => updateAnchor({ concreteClass: e.target.value })}>
                      {CONCRETE_CLASSES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Row>
                </div>
              </div>

              <div className="eng-card" style={{ padding:12 }}>
                {sectionTitle('DISTANZE DAL BORDO (EC2 / ETAG)')}
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                  <Row label="Dist. bordo c₁ [mm]"><NumInput value={anchorCfg.edgeDist||100} onChange={v => updateAnchor({ edgeDist: v })} min={20} max={800}/></Row>
                  <Row label="Interasse s₁ [mm]"><NumInput value={anchorCfg.spacing||120} onChange={v => updateAnchor({ spacing: v })} min={30} max={800}/></Row>
                  <Row label="Sp. soletta [mm]"><NumInput value={anchorCfg.slabThickness||200} onChange={v => updateAnchor({ slabThickness: v })} min={80} max={1000}/></Row>
                  <Row label="Elemento arm.">
                    <select className="eng-select" value={anchorCfg.reinforced?'si':'no'} onChange={e => updateAnchor({ reinforced: e.target.value==='si' })}>
                      <option value="si">Armato</option><option value="no">Non armato</option>
                    </select>
                  </Row>
                </div>
                {/* Info limiti */}
                <div style={{ marginTop:10,padding:'8px 10px',borderRadius:6,background:'rgba(6,182,212,0.07)',border:'1px solid rgba(6,182,212,0.2)',fontFamily:'JetBrains Mono',fontSize:'0.62rem',color:'var(--text-muted)' }}>
                  c_cr = 1.5·h_ef = {(1.5*(anchorCfg.hef||160)).toFixed(0)} mm &nbsp;|&nbsp;
                  s_cr = 3·h_ef = {(3*(anchorCfg.hef||160)).toFixed(0)} mm &nbsp;|&nbsp;
                  c_min = max(30, 4d) = {Math.max(30,4*(anchorCfg.barDiam||16))} mm
                </div>
              </div>
            </>
          )}

          {!anchorCfg.enabled && (
            <div style={{ padding:20,textAlign:'center',fontFamily:'JetBrains Mono',fontSize:'0.72rem',color:'var(--text-muted)',border:'1px dashed var(--border)',borderRadius:8 }}>
              Abilita per configurare ancoraggi chimici/meccanici su supporto cementizio
            </div>
          )}
        </div>
      )}

      {/* ── FONDAZIONE / SOLAIO ── */}
      {activeTab === 'fondazione' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Fondazione */}
          <div className="eng-card" style={{ padding:12 }}>
            {sectionTitle('FONDAZIONE')}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              <Row label="Tipo fondazione" style={{ gridColumn:'1/-1' }}>
                <select className="eng-select" value={foundCfg.tipo||'plinto'} onChange={e => updateFound({ tipo: e.target.value })}>
                  {Object.entries(FOUNDATION_TYPES).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </Row>
              <Row label="Larghezza [mm]"><NumInput value={foundCfg.width||800} onChange={v => updateFound({ width: v })} min={300} max={5000}/></Row>
              <Row label="Altezza [mm]"><NumInput value={foundCfg.height||800} onChange={v => updateFound({ height: v })} min={300} max={5000}/></Row>
              <Row label="Profondità [mm]"><NumInput value={foundCfg.depth||600} onChange={v => updateFound({ depth: v })} min={200} max={3000}/></Row>
              <Row label="Classe Cls">
                <select className="eng-select" value={foundCfg.classCls||'C25/30'} onChange={e => updateFound({ classCls: e.target.value })}>
                  {CONCRETE_CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Row>
              {sectionTitle('STRATI')}
              <Row label="Magrone [mm]"><NumInput value={foundCfg.magrone||100} onChange={v => updateFound({ magrone: v })} min={0} max={300}/></Row>
              <Row label="Riempimento [mm]"><NumInput value={foundCfg.riempimento||200} onChange={v => updateFound({ riempimento: v })} min={0} max={1000}/></Row>
              <Row label="Isolamento [mm]"><NumInput value={foundCfg.isolamento||0} onChange={v => updateFound({ isolamento: v })} min={0} max={200}/></Row>
              {sectionTitle('ARMATURA')}
              <Row label="Ø barre fond.">
                <select className="eng-select" value={foundCfg.rebarDiam||16} onChange={e => updateFound({ rebarDiam: +e.target.value })}>
                  {[10,12,14,16,18,20,22,25].map(d => <option key={d} value={d}>Ø{d}</option>)}
                </select>
              </Row>
              <Row label="Passo armatura [mm]"><NumInput value={foundCfg.rebarSpacing||200} onChange={v => updateFound({ rebarSpacing: v })} min={50} max={400}/></Row>
              <Row label="Copriferro [mm]"><NumInput value={foundCfg.cover||50} onChange={v => updateFound({ cover: v })} min={20} max={100}/></Row>
            </div>
          </div>

          {/* Solaio */}
          <div className="eng-card" style={{ padding:12 }}>
            {sectionTitle('SOLAIO')}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
              <Row label="Tipo solaio" style={{ gridColumn:'1/-1' }}>
                <select className="eng-select" value={slabCfg.tipoSolaio||'grecata'} onChange={e => updateSlab({ tipoSolaio: e.target.value })}>
                  {Object.entries(SLAB_TYPES).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </Row>
              <Row label="Spessore tot. [mm]"><NumInput value={slabCfg.spessore||120} onChange={v => updateSlab({ spessore: v })} min={80} max={400}/></Row>
              <Row label="Classe Cls">
                <select className="eng-select" value={slabCfg.classCls||'C25/30'} onChange={e => updateSlab({ classCls: e.target.value })}>
                  {CONCRETE_CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Row>
              {slabCfg.tipoSolaio === 'grecata' && <>
                <Row label="Alt. grecata [mm]"><NumInput value={slabCfg.altezzaGreca||55} onChange={v => updateSlab({ altezzaGreca: v })} min={30} max={150}/></Row>
                <Row label="Sp. calotta [mm]"><NumInput value={slabCfg.spessoreCalotta||65} onChange={v => updateSlab({ spessoreCalotta: v })} min={40} max={200}/></Row>
              </>}
              <Row label="Copriferro [mm]"><NumInput value={slabCfg.copriferro||20} onChange={v => updateSlab({ copriferro: v })} min={10} max={60}/></Row>
              {sectionTitle('RETE ELETTROSALDATA')}
              <div style={{ gridColumn:'1/-1' }}>
                <label className="eng-label" style={{ fontSize:'0.62rem' }}>Denominazione rete</label>
                <select className="eng-select" value={slabCfg.rete||'φ6/20×20'} onChange={e => updateSlab({ rete: e.target.value })}>
                  {['φ6/20×20','φ6/15×15','φ8/20×20','φ8/15×15','φ10/20×20','φ10/15×15','Personalizzata'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {sectionTitle('CONNETTORI A PIOLO (TRAVE COMPOSITA)')}
              <div style={{ gridColumn:'1/-1', display:'flex',alignItems:'center',gap:8 }}>
                <label style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontFamily:'JetBrains Mono',fontSize:'0.7rem',color:'var(--text-secondary)' }}>
                  <input type="checkbox" checked={slabCfg.studs?.enabled||false} onChange={e => updateSlab({ studs: {...slabCfg.studs, enabled: e.target.checked} })}/>
                  Abilita connettori a piolo
                </label>
              </div>
              {slabCfg.studs?.enabled && (
                <>
                  <Row label="Ø piolo [mm]"><NumInput value={slabCfg.studs.diam||19} onChange={v => updateSlab({ studs:{...slabCfg.studs,diam:v} })} min={13} max={25}/></Row>
                  <Row label="Altezza piolo [mm]"><NumInput value={slabCfg.studs.height||100} onChange={v => updateSlab({ studs:{...slabCfg.studs,height:v} })} min={50} max={200}/></Row>
                  <Row label="Passo pioli [mm]"><NumInput value={slabCfg.studs.spacing||200} onChange={v => updateSlab({ studs:{...slabCfg.studs,spacing:v} })} min={50} max={600}/></Row>
                  <Row label="File pioli"><NumInput value={slabCfg.studs.nRows||1} onChange={v => updateSlab({ studs:{...slabCfg.studs,nRows:v} })} min={1} max={3}/></Row>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
