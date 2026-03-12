import { useState, useCallback } from 'react'
import { Plus, Trash2, Calculator, Cpu, RefreshCw } from 'lucide-react'
import { calcolaTrave, verificaSezione, PROFILI, getProfilo } from './TraveCalc'
import TraveCharts  from './TraveCharts'
import TraveSchema2D from './TraveSchema2D'
import Trave3D      from './Trave3D'

const DEFAULT_CARICHI = [
  { id:1, tipo:'distribuito', valore:15, posizione:0, lunghezza:null },
]

export default function Trave({ onDataChange }) {
  const [L,    setL]    = useState(6)
  const [tipoP,setTipoP]= useState('IPE')
  const [nomeP,setNomeP]= useState('IPE 270')
  const [E,    setE]    = useState(210000)
  const [fyk,  setFyk]  = useState(355)
  const [carichi, setCarichi] = useState(DEFAULT_CARICHI)
  const [result, setResult]   = useState(null)
  const [verifica, setVerifica]= useState(null)
  const [tab3D, setTab3D] = useState(false)

  const profilo = getProfilo(nomeP)
  const profiliSerie = Object.keys(PROFILI[tipoP] || {})

  function addCarico() {
    setCarichi(c => [...c, { id: Date.now(), tipo:'puntuale', valore:10, posizione: L/2, lunghezza:null }])
  }
  function removeCarico(id) { setCarichi(c => c.filter(x => x.id !== id)) }
  function updateCarico(id, key, val) {
    setCarichi(c => c.map(x => x.id===id ? {...x,[key]:val} : x))
  }

  const calcola = useCallback(() => {
    const Iy = profilo?.Iy || 5790
    const Eval = E || 210000
    const res = calcolaTrave({ L: +L, E: Eval, Iy, carichi })
    const ver = verificaSezione(res.Mmax, profilo, +fyk)
    setResult(res)
    setVerifica(ver)
    onDataChange?.({ L:+L, profilo: nomeP, profiloData: profilo, carichi, result: res, verifica: ver })
  }, [L, profilo, E, carichi, fyk])

  const ResultCard = ({label, val, unit, color='var(--accent-blue)'}) => (
    <div className="eng-card" style={{padding:'12px 16px',textAlign:'center'}}>
      <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',textTransform:'uppercase',
        letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:4}}>{label}</div>
      <div style={{fontFamily:'JetBrains Mono',fontSize:'1.3rem',fontWeight:700,color}}>{val}</div>
      <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',color:'var(--text-muted)'}}>{unit}</div>
    </div>
  )

  return (
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'grid', gridTemplateColumns:'340px 1fr', gap:20, alignItems:'start'}}>

        {/* ── LEFT: Input panel ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Geometria */}
          <div className="eng-card" style={{padding:16}}>
            <div className="eng-section-title" style={{marginBottom:14,fontSize:'0.85rem'}}>
              <Cpu size={15}/>GEOMETRIA & SEZIONE
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{gridColumn:'1/-1'}}>
                <label className="eng-label">Luce L [m]</label>
                <input className="eng-input" type="number" min={0.5} max={50} step={0.1}
                  value={L} onChange={e=>setL(+e.target.value)}/>
              </div>
              <div>
                <label className="eng-label">Tipo Profilo</label>
                <select className="eng-select" value={tipoP}
                  onChange={e=>{setTipoP(e.target.value);setNomeP(Object.keys(PROFILI[e.target.value])[6]||'')}}>
                  {Object.keys(PROFILI).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="eng-label">Serie</label>
                <select className="eng-select" value={nomeP} onChange={e=>setNomeP(e.target.value)}>
                  {profiliSerie.map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            {profilo && (
              <div style={{marginTop:12,padding:'8px 10px',background:'var(--bg-secondary)',borderRadius:6,
                display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {[['h',profilo.h,'mm'],['b',profilo.b,'mm'],['Iy',profilo.Iy,'cm⁴'],
                  ['Wy',profilo.Wy,'cm³'],['A',profilo.A,'cm²'],['tw',profilo.tw,'mm']].map(([k,v,u])=>(
                  <div key={k} style={{textAlign:'center'}}>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:'0.6rem',color:'var(--text-muted)'}}>{k}</div>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:'0.78rem',color:'var(--accent-cyan)',fontWeight:600}}>{v}</div>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:'0.55rem',color:'var(--text-muted)'}}>{u}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materiale */}
          <div className="eng-card" style={{padding:16}}>
            <div className="eng-section-title" style={{marginBottom:12,fontSize:'0.85rem'}}>MATERIALE</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label className="eng-label">E [MPa]</label>
                <input className="eng-input" type="number" value={E} onChange={e=>setE(+e.target.value)}/>
              </div>
              <div>
                <label className="eng-label">fyk [MPa]</label>
                <select className="eng-select" value={fyk} onChange={e=>setFyk(+e.target.value)}>
                  <option value={235}>S235</option>
                  <option value={275}>S275</option>
                  <option value={355}>S355</option>
                  <option value={420}>S420</option>
                </select>
              </div>
            </div>
          </div>

          {/* Carichi */}
          <div className="eng-card" style={{padding:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div className="eng-section-title" style={{fontSize:'0.85rem'}}>CARICHI</div>
              <button className="eng-btn eng-btn-secondary" style={{padding:'4px 10px',fontSize:'0.75rem'}}
                onClick={addCarico}><Plus size={13}/>ADD</button>
            </div>
            {carichi.map((c,idx) => (
              <div key={c.id} style={{
                padding:'10px',marginBottom:8,borderRadius:6,
                background:'var(--bg-secondary)',border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <select className="eng-select" style={{width:'auto',padding:'4px 8px',fontSize:'0.78rem'}}
                    value={c.tipo} onChange={e=>updateCarico(c.id,'tipo',e.target.value)}>
                    <option value="distribuito">Distribuito (kN/m)</option>
                    <option value="puntuale">Puntuale (kN)</option>
                  </select>
                  <button onClick={()=>removeCarico(c.id)}
                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent-red)'}}>
                    <Trash2 size={14}/>
                  </button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                  <div>
                    <label className="eng-label" style={{fontSize:'0.6rem'}}>
                      {c.tipo==='distribuito' ? 'q [kN/m]' : 'P [kN]'}
                    </label>
                    <input className="eng-input" style={{padding:'4px 8px',fontSize:'0.8rem'}}
                      type="number" step="0.1" value={c.valore}
                      onChange={e=>updateCarico(c.id,'valore',+e.target.value)}/>
                  </div>
                  <div>
                    <label className="eng-label" style={{fontSize:'0.6rem'}}>Pos. [m]</label>
                    <input className="eng-input" style={{padding:'4px 8px',fontSize:'0.8rem'}}
                      type="number" step="0.1" min={0} max={L} value={c.posizione}
                      onChange={e=>updateCarico(c.id,'posizione',+e.target.value)}/>
                  </div>
                  {c.tipo==='distribuito' && (
                    <div>
                      <label className="eng-label" style={{fontSize:'0.6rem'}}>Lung. [m]</label>
                      <input className="eng-input" style={{padding:'4px 8px',fontSize:'0.8rem'}}
                        type="number" step="0.1" min={0} max={L}
                        value={c.lunghezza ?? ''}
                        placeholder={`=${L}`}
                        onChange={e=>updateCarico(c.id,'lunghezza',e.target.value===''?null:+e.target.value)}/>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="eng-btn eng-btn-primary" style={{width:'100%',justifyContent:'center',padding:'12px'}}
            onClick={calcola}>
            <Calculator size={17}/>CALCOLA
          </button>
        </div>

        {/* ── RIGHT: Results ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Schema 2D */}
          <div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',textTransform:'uppercase',
              letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:6}}>SCHEMA STATICO</div>
            <TraveSchema2D L={L} carichi={carichi} RA={result?.RA} RB={result?.RB}/>
          </div>

          {result && (
            <>
              {/* Risultati chiave */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8}}>
                <ResultCard label="RA" val={result.RA.toFixed(2)} unit="kN" color="var(--accent-green)"/>
                <ResultCard label="RB" val={result.RB.toFixed(2)} unit="kN" color="var(--accent-green)"/>
                <ResultCard label="Vmax" val={result.Vmax.toFixed(2)} unit="kN" color="var(--accent-blue)"/>
                <ResultCard label="Mmax" val={result.Mmax.toFixed(2)} unit="kN·m" color="var(--accent-amber)"/>
                <ResultCard label="δmax" val={(result.dmax).toFixed(3)} unit="mm" color="var(--accent-cyan)"/>
                <ResultCard label="L/δ" val={result.dmax > 0 ? Math.round(result.L*1000/result.dmax) : '∞'} unit="" color="var(--text-primary)"/>
              </div>

              {/* Verifica sezione */}
              {verifica && (
                <div className="eng-card" style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:16}}>
                  <div style={{
                    width:52, height:52, borderRadius:8, display:'flex',alignItems:'center',justifyContent:'center',
                    background: verifica.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `2px solid ${verifica.ok ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                    fontSize:'1.2rem'
                  }}>
                    {verifica.ok ? '✓' : '✗'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Rajdhani',fontWeight:700,fontSize:'0.9rem',
                      color: verifica.ok ? 'var(--accent-green)' : 'var(--accent-red)'}}>
                      VERIFICA FLESSIONE EC3 — {verifica.ok ? 'SODDISFATTA' : 'NON SODDISFATTA'}
                    </div>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:'0.75rem',color:'var(--text-secondary)',marginTop:2}}>
                      MEd = {result.Mmax.toFixed(2)} kN·m · MRd = {verifica.Mrd.toFixed(2)} kN·m ·{' '}
                      <span style={{color: verifica.ok ? 'var(--accent-green)' : 'var(--accent-red)',fontWeight:700}}>
                        η = {verifica.eta.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2D/3D */}
              <div>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  {['DIAGRAMMI','3D MODEL'].map(t => (
                    <button key={t} onClick={()=>setTab3D(t==='3D MODEL')}
                      style={{
                        fontFamily:'Rajdhani',fontWeight:600,fontSize:'0.78rem',
                        letterSpacing:'0.08em', padding:'6px 14px', borderRadius:6,
                        border:'none', cursor:'pointer',
                        background: (tab3D===(t==='3D MODEL')) ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)',
                        color: (tab3D===(t==='3D MODEL')) ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        borderBottom: (tab3D===(t==='3D MODEL')) ? '2px solid var(--accent-blue)' : '2px solid transparent',
                      }}>
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
            <div style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              padding:48,border:'2px dashed var(--border)',borderRadius:12,gap:12
            }}>
              <Calculator size={40} style={{color:'var(--text-muted)'}}/>
              <div style={{fontFamily:'Rajdhani',fontWeight:600,fontSize:'1rem',
                color:'var(--text-muted)',textAlign:'center'}}>
                Configura i parametri e premi CALCOLA
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
