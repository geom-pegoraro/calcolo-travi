import { useState, useCallback } from 'react'
import { Plus, Trash2, Calculator, Cpu, Zap, AlertTriangle } from 'lucide-react'
import { verificaSezione, verificaLegno, PROFILI, getProfilo, isLegno } from './TraveCalc'
import { solveBeam, suggerisciGiunto } from './StiffnessEngine'
import TraveCharts   from './TraveCharts'
import TraveSchema2D from './TraveSchema2D'
import Trave3D       from './Trave3D'

const DEFAULT_VINCOLI = [
  { id: 1, tipo: 'hinge',  x: 0,    label: 'A', materiale: 'acciaio', soglia: null, k: 10000 },
  { id: 2, tipo: 'roller', x: null, label: 'B', materiale: 'acciaio', soglia: null, k: 10000 },
]
const DEFAULT_CARICHI = [
  { id: 1, tipo: 'distribuito', valore: 15, posizione: 0, lunghezza: null, direzioneUp: false },
]
const TIPI_VINCOLO = [
  { value: 'hinge',  label: 'Cerniera',       icon: '△', desc: 'Blocca Ry — rotazione libera' },
  { value: 'roller', label: 'Carrello',        icon: '○', desc: 'Blocca solo Ry' },
  { value: 'fixed',  label: 'Incastro',        icon: '▪', desc: 'Blocca Ry + momento Mz' },
  { value: 'spring', label: 'App. Elastico',   icon: '⌇', desc: 'Molla verticale K [kN/m]' },
]
const MATERIALI_VINCOLO = ['acciaio', 'calcestruzzo', 'legno', 'muratura']

export default function Trave({ onDataChange }) {
  const [L,       setL]      = useState(6)
  const [tipoP,   setTipoP]  = useState('IPE')
  const [nomeP,   setNomeP]  = useState('IPE 270')
  const [E,       setE]      = useState(210000)
  const [fyk,     setFyk]    = useState(355)
  const [kmod,    setKmod]   = useState(0.8)
  const [carichi, setCarichi]= useState(DEFAULT_CARICHI)
  const [vincoli, setVincoli]= useState(DEFAULT_VINCOLI)
  const [result,  setResult] = useState(null)
  const [verifica,setVerifica]=useState(null)
  const [tab3D,   setTab3D]  = useState(false)
  const [schemaCfg, setSchemaCfg] = useState({ reactionAUp: true, reactionBUp: true, extraSupports: [] })
  const [suggestOpen, setSuggestOpen] = useState(null)

  const profilo      = getProfilo(nomeP)
  const legno        = isLegno(tipoP)
  const profiliSerie = Object.keys(PROFILI[tipoP] || {})

  function handleTipoChange(t) {
    const firstKey = Object.keys(PROFILI[t] || {})[0] || ''
    const firstP   = PROFILI[t]?.[firstKey]
    setTipoP(t); setNomeP(firstKey)
    if (firstP?.E) setE(firstP.E)
  }

  const addVincolo    = () => setVincoli(v => [...v, { id: Date.now(), tipo: 'roller', x: +(L/2).toFixed(1), label: `R${v.length+1}`, materiale: 'acciaio', soglia: null, k: 10000 }])
  const removeVincolo = id => setVincoli(v => v.filter(x => x.id !== id))
  const updateVincolo = (id, key, val) => setVincoli(v => v.map(x => x.id === id ? { ...x, [key]: val } : x))

  const addCarico    = () => setCarichi(c => [...c, { id: Date.now(), tipo: 'puntuale', valore: 10, posizione: +(L/2).toFixed(1), lunghezza: null, direzioneUp: false }])
  const removeCarico = id => setCarichi(c => c.filter(x => x.id !== id))
  const updateCarico = (id, key, v) => setCarichi(c => c.map(x => x.id === id ? { ...x, [key]: v } : x))

  const calcola = useCallback(() => {
    const p = getProfilo(nomeP)
    const Iy = p?.Iy || 5790
    const Ev = E || 210000
    // EI [kN·m²] = E[MPa]*1000 [kN/m²] * Iy[cm⁴]*1e-8 [m⁴]
    const EI_kNm2 = (Ev * 1000) * (Iy * 1e-8)
    const vincoliFinali = vincoli.map(v => ({ ...v, x: v.x === null ? L : +v.x }))
    const res = solveBeam({ L: +L, EI: EI_kNm2, vincoli: vincoliFinali, carichi })
    const ver = legno ? verificaLegno(res.Mmax, p, tipoP, kmod) : verificaSezione(res.Mmax, p, +fyk)
    setResult(res); setVerifica(ver); setSuggestOpen(null)
    onDataChange?.({ L: +L, profilo: nomeP, profiloData: p, carichi, vincoli: vincoliFinali, result: res, verifica: ver })
  }, [L, nomeP, E, carichi, vincoli, fyk, kmod, legno, tipoP, onDataChange])

  const RC = ({ label, val, unit, color='var(--accent-blue)' }) => (
    <div className="eng-card" style={{ padding:'10px 12px', textAlign:'center' }}>
      <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.58rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:3 }}>{label}</div>
      <div style={{ fontFamily:'JetBrains Mono', fontSize:'1.1rem', fontWeight:700, color }}>{val}</div>
      <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.6rem', color:'var(--text-muted)' }}>{unit}</div>
    </div>
  )

  return (
    <div style={{ padding:'20px 24px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20, alignItems:'start' }}>

        {/* ══ LEFT ══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Geometria */}
          <div className="eng-card" style={{ padding:16 }}>
            <div className="eng-section-title" style={{ marginBottom:14, fontSize:'0.85rem' }}><Cpu size={15}/>GEOMETRIA & SEZIONE</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="eng-label">Luce L [m]</label>
                <input className="eng-input" type="number" min={0.5} max={50} step={0.1} value={L} onChange={e => setL(+e.target.value)}/>
              </div>
              <div>
                <label className="eng-label">Tipo Profilo</label>
                <select className="eng-select" value={tipoP} onChange={e => handleTipoChange(e.target.value)}>
                  <optgroup label="── Acciaio ──">{['IPE','HEA','HEB'].map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
                  <optgroup label="── Legno Lam. ──">{['GL24h','GL28h','GL32h'].map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
                  <optgroup label="── Legno Mass. ──">{['C24','C16'].map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
                </select>
              </div>
              <div>
                <label className="eng-label">Sezione</label>
                <select className="eng-select" value={nomeP} onChange={e => setNomeP(e.target.value)}>
                  {profiliSerie.map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            {profilo && (
              <div style={{ marginTop:12, padding:'8px 10px', background:'var(--bg-secondary)', borderRadius:6, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {[['h',profilo.h,'mm'],['b',profilo.b,'mm'],['Iy',profilo.Iy,'cm⁴'],['Wy',profilo.Wy,'cm³'],['A',profilo.A,'cm²'],['E',profilo.E,'MPa']].map(([k,v,u])=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.6rem', color:'var(--text-muted)' }}>{k}</div>
                    <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.78rem', color:'var(--accent-cyan)', fontWeight:600 }}>{v}</div>
                    <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.55rem', color:'var(--text-muted)' }}>{u}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materiale */}
          <div className="eng-card" style={{ padding:16 }}>
            <div className="eng-section-title" style={{ marginBottom:12, fontSize:'0.85rem' }}>MATERIALE</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label className="eng-label">E [MPa]</label><input className="eng-input" type="number" value={E} onChange={e=>setE(+e.target.value)}/></div>
              {legno ? (
                <div><label className="eng-label">kmod</label>
                  <select className="eng-select" value={kmod} onChange={e=>setKmod(+e.target.value)}>
                    <option value={0.6}>0.60 Perm.</option><option value={0.7}>0.70 Lungo</option>
                    <option value={0.8}>0.80 Medio</option><option value={0.9}>0.90 Corto</option>
                    <option value={1.1}>1.10 Istant.</option>
                  </select>
                </div>
              ) : (
                <div><label className="eng-label">fyk [MPa]</label>
                  <select className="eng-select" value={fyk} onChange={e=>setFyk(+e.target.value)}>
                    <option value={235}>S235</option><option value={275}>S275</option>
                    <option value={355}>S355</option><option value={420}>S420</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── VINCOLI ── */}
          <div className="eng-card" style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="eng-section-title" style={{ fontSize:'0.85rem' }}>VINCOLI & APPOGGI</div>
              <button className="eng-btn eng-btn-secondary" style={{ padding:'4px 10px', fontSize:'0.75rem' }} onClick={addVincolo}><Plus size={13}/>ADD</button>
            </div>
            {vincoli.map((v) => (
              <div key={v.id} style={{ padding:10, marginBottom:8, borderRadius:6, background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <input value={v.label} onChange={e=>updateVincolo(v.id,'label',e.target.value)}
                    style={{ width:36, padding:'3px 6px', background:'transparent', border:'1px solid var(--border)', borderRadius:4, color:'var(--accent-cyan)', fontFamily:'JetBrains Mono', fontSize:'0.78rem', fontWeight:700, textAlign:'center' }}/>
                  <select className="eng-select" style={{ flex:1, padding:'4px 8px', fontSize:'0.78rem' }}
                    value={v.tipo} onChange={e=>updateVincolo(v.id,'tipo',e.target.value)}>
                    {TIPI_VINCOLO.map(t=><option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                  {vincoli.length > 2 && (
                    <button onClick={()=>removeVincolo(v.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent-red)', padding:0 }}><Trash2 size={13}/></button>
                  )}
                </div>
                <div style={{ display:'grid', gridTemplateColumns: v.tipo==='spring' ? '1fr 1fr 1fr' : '1fr 1fr', gap:6 }}>
                  <div>
                    <label className="eng-label" style={{ fontSize:'0.6rem' }}>x [m]</label>
                    <input className="eng-input" type="number" step="0.1" min={0} max={L}
                      style={{ padding:'4px 8px', fontSize:'0.8rem' }}
                      value={v.x===null ? L : v.x} onChange={e=>updateVincolo(v.id,'x',+e.target.value)}/>
                  </div>
                  <div>
                    <label className="eng-label" style={{ fontSize:'0.6rem' }}>Su</label>
                    <select className="eng-select" value={v.materiale||'acciaio'} style={{ padding:'4px 8px', fontSize:'0.75rem' }}
                      onChange={e=>updateVincolo(v.id,'materiale',e.target.value)}>
                      {MATERIALI_VINCOLO.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {v.tipo==='spring' && (
                    <div>
                      <label className="eng-label" style={{ fontSize:'0.6rem' }}>K [kN/m]</label>
                      <input className="eng-input" type="number" min={1} value={v.k||10000}
                        style={{ padding:'4px 8px', fontSize:'0.8rem' }}
                        onChange={e=>updateVincolo(v.id,'k',+e.target.value)}/>
                    </div>
                  )}
                </div>
                <div style={{ marginTop:6 }}>
                  <label className="eng-label" style={{ fontSize:'0.58rem' }}>Soglia allarme [kN] <span style={{ color:'var(--text-muted)' }}>(opz.)</span></label>
                  <input className="eng-input" type="number" min={0} value={v.soglia??''} placeholder="nessun limite"
                    style={{ padding:'3px 8px', fontSize:'0.75rem' }}
                    onChange={e=>updateVincolo(v.id,'soglia',e.target.value===''?null:+e.target.value)}/>
                </div>
                <div style={{ marginTop:4, fontFamily:'JetBrains Mono', fontSize:'0.6rem', color:'var(--text-muted)' }}>
                  {TIPI_VINCOLO.find(t=>t.value===v.tipo)?.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Carichi */}
          <div className="eng-card" style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="eng-section-title" style={{ fontSize:'0.85rem' }}>CARICHI</div>
              <button className="eng-btn eng-btn-secondary" style={{ padding:'4px 10px', fontSize:'0.75rem' }} onClick={addCarico}><Plus size={13}/>ADD</button>
            </div>
            {carichi.map(c=>(
              <div key={c.id} style={{ padding:10, marginBottom:8, borderRadius:6, background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, gap:6 }}>
                  <select className="eng-select" style={{ width:'auto', padding:'4px 8px', fontSize:'0.78rem' }}
                    value={c.tipo} onChange={e=>updateCarico(c.id,'tipo',e.target.value)}>
                    <option value="distribuito">Distribuito (kN/m)</option>
                    <option value="puntuale">Puntuale (kN)</option>
                  </select>
                  <div style={{ display:'flex', gap:3 }}>
                    {[false,true].map(up=>(
                      <button key={String(up)} onClick={()=>updateCarico(c.id,'direzioneUp',up)}
                        style={{ padding:'3px 8px', borderRadius:4, cursor:'pointer', fontSize:'0.85rem', border:'1px solid var(--border)',
                          background:c.direzioneUp===up?'rgba(59,130,246,0.2)':'transparent',
                          color:c.direzioneUp===up?'var(--accent-blue)':'var(--text-muted)' }}>
                        {up?'↑':'↓'}
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>removeCarico(c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent-red)' }}><Trash2 size={14}/></button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                  <div>
                    <label className="eng-label" style={{ fontSize:'0.6rem' }}>{c.tipo==='distribuito'?'q [kN/m]':'P [kN]'}</label>
                    <input className="eng-input" type="number" step="0.1" value={c.valore}
                      style={{ padding:'4px 8px', fontSize:'0.8rem' }} onChange={e=>updateCarico(c.id,'valore',+e.target.value)}/>
                  </div>
                  <div>
                    <label className="eng-label" style={{ fontSize:'0.6rem' }}>Pos. [m]</label>
                    <input className="eng-input" type="number" step="0.1" min={0} max={L} value={c.posizione}
                      style={{ padding:'4px 8px', fontSize:'0.8rem' }} onChange={e=>updateCarico(c.id,'posizione',+e.target.value)}/>
                  </div>
                  {c.tipo==='distribuito' && (
                    <div>
                      <label className="eng-label" style={{ fontSize:'0.6rem' }}>Lung. [m]</label>
                      <input className="eng-input" type="number" step="0.1" min={0} max={L} value={c.lunghezza??''} placeholder={`=${L}`}
                        style={{ padding:'4px 8px', fontSize:'0.8rem' }}
                        onChange={e=>updateCarico(c.id,'lunghezza',e.target.value===''?null:+e.target.value)}/>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="eng-btn eng-btn-primary" style={{ width:'100%', justifyContent:'center', padding:12 }} onClick={calcola}>
            <Calculator size={17}/>CALCOLA
          </button>
        </div>

        {/* ══ RIGHT ══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:6 }}>SCHEMA STATICO</div>
            <TraveSchema2D L={L} carichi={carichi}
              vincoli={vincoli.map(v=>({...v, x: v.x===null ? L : +v.x}))}
              RA={result?.RA} RB={result?.RB} reazioni={result?.reazioni}
              schemaConfig={schemaCfg} onSchemaConfigChange={setSchemaCfg}/>
          </div>

          {result && (
            <>
              {/* Cards reazioni + risultati */}
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(7, result.reazioni.length+4)},1fr)`, gap:8 }}>
                {result.reazioni.map((r,i)=>{
                  const vInfo = vincoli.find(v=>Math.abs((v.x===null?L:+v.x)-r.x)<0.01)
                  return <RC key={i} label={vInfo?.label||`R${i+1}`} val={r.Ry.toFixed(2)} unit="kN" color="var(--accent-green)"/>
                })}
                <RC label="Vmax" val={result.Vmax.toFixed(2)} unit="kN"   color="var(--accent-blue)"/>
                <RC label="Mmax" val={result.Mmax.toFixed(2)} unit="kN·m" color="var(--accent-amber)"/>
                <RC label="δmax" val={result.dmax.toFixed(3)} unit="mm"   color="var(--accent-cyan)"/>
                <RC label="L/δ"  val={result.dmax>0?Math.round(result.L*1000/result.dmax):'∞'} unit="" color="var(--text-primary)"/>
              </div>

              {/* Tabella reazioni */}
              <div className="eng-card" style={{ padding:14 }}>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:10 }}>
                  TABELLA REAZIONI VINCOLARI
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.72rem', fontFamily:'JetBrains Mono' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['Vincolo','Tipo','x [m]','Ry [kN]','Mz [kN·m]','Stato','→ Giunto'].map(h=>(
                        <th key={h} style={{ padding:'4px 8px', textAlign: h.includes('kN')?'right':'left', color:'var(--text-muted)', fontWeight:600, fontSize:'0.65rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.reazioni.map((r,idx)=>{
                      const vInfo   = vincoli.find(v=>Math.abs((v.x===null?L:+v.x)-r.x)<0.01)
                      const soglia  = vInfo?.soglia
                      const overload= soglia && Math.abs(r.Ry)>soglia
                      const suggest = suggerisciGiunto(r.tipo, vInfo?.materiale)
                      return (
                        <tr key={idx} style={{ borderBottom:'1px solid rgba(51,65,85,0.5)', background:overload?'rgba(239,68,68,0.07)':'transparent' }}>
                          <td style={{ padding:'5px 8px', color:'var(--accent-cyan)', fontWeight:700 }}>{vInfo?.label||`R${idx+1}`}</td>
                          <td style={{ padding:'5px 8px', color:'var(--text-secondary)' }}>{TIPI_VINCOLO.find(t=>t.value===r.tipo)?.label||r.tipo}</td>
                          <td style={{ padding:'5px 8px', color:'var(--text-secondary)' }}>{r.x.toFixed(2)}</td>
                          <td style={{ padding:'5px 8px', textAlign:'right', color:overload?'var(--accent-red)':'var(--accent-green)', fontWeight:700 }}>
                            {r.Ry.toFixed(2)}{overload&&<AlertTriangle size={10} style={{ marginLeft:3, display:'inline-block', verticalAlign:'middle' }}/>}
                          </td>
                          <td style={{ padding:'5px 8px', textAlign:'right', color:r.tipo==='fixed'?'var(--accent-amber)':'var(--text-muted)' }}>
                            {r.tipo==='fixed'?r.Mz.toFixed(2):'—'}
                          </td>
                          <td style={{ padding:'5px 8px' }}>
                            {soglia ? (
                              <span style={{ color:overload?'var(--accent-red)':'var(--accent-green)', fontSize:'0.65rem' }}>
                                {overload?'⚠ SOVRACCARICO':'✓ OK'}
                              </span>
                            ) : <span style={{ color:'var(--text-muted)', fontSize:'0.65rem' }}>—</span>}
                          </td>
                          <td style={{ padding:'5px 8px' }}>
                            {suggest && (
                              <button onClick={()=>setSuggestOpen(s=>s===idx?null:idx)}
                                style={{ padding:'2px 7px', borderRadius:4, fontSize:'0.62rem', fontFamily:'JetBrains Mono', cursor:'pointer',
                                  border:'1px solid var(--accent-blue)',
                                  background:suggestOpen===idx?'rgba(59,130,246,0.2)':'transparent',
                                  color:'var(--accent-blue)', display:'flex', alignItems:'center', gap:3 }}>
                                <Zap size={9}/>{suggest.tipoGiunto}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Pannello suggerimento */}
                {suggestOpen !== null && (() => {
                  const r       = result.reazioni[suggestOpen]
                  const vInfo   = vincoli.find(v=>Math.abs((v.x===null?L:+v.x)-r.x)<0.01)
                  const suggest = suggerisciGiunto(r.tipo, vInfo?.materiale)
                  if (!suggest) return null
                  return (
                    <div style={{ marginTop:10, padding:'10px 14px', borderRadius:8, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.3)' }}>
                      <div style={{ fontFamily:'Rajdhani', fontWeight:700, fontSize:'0.85rem', color:'var(--accent-blue)', marginBottom:4 }}>
                        GIUNTO SUGGERITO — {TIPI_VINCOLO.find(t=>t.value===r.tipo)?.label} su {vInfo?.materiale}
                      </div>
                      <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.7rem', color:'var(--text-secondary)', marginBottom:8 }}>
                        {suggest.nota}
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {suggest.boltDiam     && <span style={{ padding:'2px 8px', borderRadius:12, background:'rgba(6,182,212,0.15)', border:'1px solid rgba(6,182,212,0.3)', fontFamily:'JetBrains Mono', fontSize:'0.65rem', color:'var(--accent-cyan)' }}>Ø{suggest.boltDiam} mm</span>}
                        {suggest.boltClass    && <span style={{ padding:'2px 8px', borderRadius:12, background:'rgba(6,182,212,0.15)', border:'1px solid rgba(6,182,212,0.3)', fontFamily:'JetBrains Mono', fontSize:'0.65rem', color:'var(--accent-cyan)' }}>cl. {suggest.boltClass}</span>}
                        {suggest.anchorLength && <span style={{ padding:'2px 8px', borderRadius:12, background:'rgba(6,182,212,0.15)', border:'1px solid rgba(6,182,212,0.3)', fontFamily:'JetBrains Mono', fontSize:'0.65rem', color:'var(--accent-cyan)' }}>L tirafondi={suggest.anchorLength} mm</span>}
                        {suggest.asolati      && <span style={{ padding:'2px 8px', borderRadius:12, background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', fontFamily:'JetBrains Mono', fontSize:'0.65rem', color:'var(--accent-amber)' }}>⟷ FORI ASOLATI</span>}
                      </div>
                      <div style={{ marginTop:8, fontFamily:'JetBrains Mono', fontSize:'0.65rem', color:'var(--text-muted)' }}>
                        → Vai al Modulo D per dimensionare il giunto completo
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Verifica sezione */}
              {verifica && (
                <div className="eng-card" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ width:52, height:52, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem',
                    background:verifica.ok?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)',
                    border:`2px solid ${verifica.ok?'var(--accent-green)':'var(--accent-red)'}` }}>
                    {verifica.ok?'✓':'✗'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'Rajdhani', fontWeight:700, fontSize:'0.9rem', color:verifica.ok?'var(--accent-green)':'var(--accent-red)' }}>
                      {verifica.tipo==='legno'?`VERIFICA EC5 — `:`VERIFICA EC3 — `}{verifica.ok?'SODDISFATTA':'NON SODDISFATTA'}
                    </div>
                    <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:2 }}>
                      MEd={result.Mmax.toFixed(2)} kN·m · MRd={verifica.Mrd.toFixed(2)} kN·m ·{' '}
                      <span style={{ color:verifica.ok?'var(--accent-green)':'var(--accent-red)', fontWeight:700 }}>η={verifica.eta.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Diagrammi / 3D */}
              <div>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  {['DIAGRAMMI','3D MODEL'].map(t=>(
                    <button key={t} onClick={()=>setTab3D(t==='3D MODEL')}
                      style={{ fontFamily:'Rajdhani', fontWeight:600, fontSize:'0.78rem', letterSpacing:'0.08em',
                        padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
                        background:(tab3D===(t==='3D MODEL'))?'rgba(59,130,246,0.2)':'var(--bg-card)',
                        color:(tab3D===(t==='3D MODEL'))?'var(--accent-blue)':'var(--text-secondary)',
                        borderBottom:(tab3D===(t==='3D MODEL'))?'2px solid var(--accent-blue)':'2px solid transparent' }}>
                      {t}
                    </button>
                  ))}
                </div>
                {!tab3D && <TraveCharts result={result}/>}
                {tab3D  && <Trave3D L={L} profilo={profilo} carichi={carichi}/>}
              </div>
            </>
          )}

          {!result && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              padding:48, border:'2px dashed var(--border)', borderRadius:12, gap:12 }}>
              <Calculator size={40} style={{ color:'var(--text-muted)' }}/>
              <div style={{ fontFamily:'Rajdhani', fontWeight:600, fontSize:'1rem', color:'var(--text-muted)', textAlign:'center' }}>
                Configura vincoli e carichi, poi premi CALCOLA
              </div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:'0.65rem', color:'var(--text-muted)', textAlign:'center', maxWidth:320, lineHeight:1.7 }}>
                Motore: Metodo delle Rigidezze (Stiffness Method)<br/>
                Travi continue · Incastri · Appoggi elastici<br/>
                Tabella reazioni · Suggerimento giunti automatico
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
