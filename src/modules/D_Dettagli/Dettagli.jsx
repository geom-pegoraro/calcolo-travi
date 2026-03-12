/**
 * Dettagli.jsx — Modulo D v2
 * Integra: JointEditor, Joint3D, JointSVG, JointCalc v2
 * Features: verifica geometrica EC3, coefficiente ρ, ancoraggi chimici, host CA/acciaio
 */
import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getProfilo } from '../../db/database'
import { FileText, Download, Eye, BarChart2, Cpu, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import JointEditor from './JointEditor'
import Joint3D     from './Joint3D'
import JointSVG    from './JointSVG'
import {
  JOINT_TYPES, HOST_TYPES,
  defaultJointConfig,
  verificaBulloni,
  verificaGeometria,
  verificaSaldature,
  calcChemicalAnchor,
} from './JointCalc'
import { generateReportPDF } from './reportPDF'

// ─── Componente badge sfruttamento ρ ────────────────────────────────────────
function RhoBadge({ rho, label = 'ρ combinato' }) {
  if (rho == null) return null
  const pct  = Math.min(rho * 100, 200)
  const ok   = rho <= 1.0
  const warn = rho > 0.85 && rho <= 1.0
  const color = !ok ? 'var(--accent-red)' : warn ? 'var(--accent-amber)' : 'var(--accent-green)'
  const bg    = !ok ? 'rgba(239,68,68,0.1)' : warn ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'

  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, background: bg, border: `1px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '1.1rem', fontWeight: 700, color }}>
          {rho.toFixed(3)}
        </span>
      </div>
      {/* Barra progresso */}
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(51,65,85,0.5)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(pct, 100)}%`, background: color, transition: 'width 0.3s ease' }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)' }}>0%</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', fontWeight: 700, color }}>
          {!ok ? '✗ N.V.' : warn ? '⚠ PROSSIMO AL LIMITE' : '✓ VERIFICATO'}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)' }}>100%</span>
      </div>
    </div>
  )
}

// ─── Pannello errori geometrici ──────────────────────────────────────────────
function GeomPanel({ errors, warnings }) {
  if (!errors.length && !warnings.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
        <CheckCircle size={14} color="var(--accent-green)"/>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: 'var(--accent-green)' }}>
          Geometria bulloni conforme EC3 Tab. 3.3
        </span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {errors.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <XCircle size={13} color="var(--accent-red)" style={{ marginTop: 1, flexShrink: 0 }}/>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', color: 'var(--accent-red)', lineHeight: 1.5 }}>{e}</span>
        </div>
      ))}
      {warnings.map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle size={13} color="var(--accent-amber)" style={{ marginTop: 1, flexShrink: 0 }}/>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', color: 'var(--accent-amber)', lineHeight: 1.5 }}>{w}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Risultati ancoraggi chimici ─────────────────────────────────────────────
function AnchorResults({ cfg }) {
  if (!cfg?.enabled) return null
  const res = calcChemicalAnchor(cfg)
  return (
    <div className="eng-card" style={{ padding: 14 }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
        ANCORAGGI CHIMICI — ETAG 001
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[
          ['N_Rd (cono cls)', `${res.N_Rd_c} kN`, res.N_Rd_c > 0],
          ['N_Rd (barra)',    `${res.N_Rd_bar} kN`, res.N_Rd_bar > 0],
          ['N_Rd design',    `${res.N_Rd} kN`, true],
          ['V_Rd (bond)',     `${res.V_Rd} kN`, true],
          ['ψ_s (bordo)',     res.psi_s.toFixed(3), true],
          ['c_cr',            `${res.c_cr} mm`, true],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', color: 'var(--text-muted)' }}>{lbl}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)' }}>{val}</span>
          </div>
        ))}
      </div>
      {[...res.errors.map(e => ({ msg: e, type: 'error' })), ...res.warnings.map(w => ({ msg: w, type: 'warn' }))].map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 8px', marginBottom: 4, borderRadius: 5, background: item.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${item.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
          {item.type === 'error' ? <XCircle size={12} color="var(--accent-red)"/> : <AlertTriangle size={12} color="var(--accent-amber)"/>}
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: item.type === 'error' ? 'var(--accent-red)' : 'var(--accent-amber)', lineHeight: 1.5 }}>{item.msg}</span>
        </div>
      ))}
      {res.errors.length === 0 && res.warnings.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <CheckCircle size={12} color="var(--accent-green)"/>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'var(--accent-green)' }}>Distanze conformi ETAG 001</span>
        </div>
      )}
    </div>
  )
}

// ─── Verifica saldature display ──────────────────────────────────────────────
function WeldResults({ weldResults }) {
  if (!weldResults?.length) return null
  return (
    <div className="eng-card" style={{ padding: 14 }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
        VERIFICA SALDATURE EC3 §4.5.3
      </div>
      {weldResults.map((w, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', gap: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', color: 'var(--text-secondary)', flex: 1 }}>{w.label}</span>
          {w.status === 'CJP' ? (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'var(--accent-cyan)', padding: '1px 6px', borderRadius: 3, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.1)' }}>CJP</span>
          ) : w.status === '—' ? (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'var(--text-muted)' }}>—</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', color: 'var(--text-muted)' }}>η={w.eta?.toFixed(3)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', fontWeight: 700, color: w.ok ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {w.ok ? '✓' : '✗'} {w.status}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Dettagli({ traveData }) {
  const clienti = useLiveQuery(() => db.clienti.toArray(), [])

  const [progetto,    setProgetto]   = useState({ nome: '', indirizzo: '', rev: '00' })
  const [clienteId,   setClienteId]  = useState('')
  const [tipoGiunto,  setTipoGiunto] = useState('endplate')
  const [jointCfg,    setJointCfg]   = useState(() => defaultJointConfig('endplate', traveData?.profiloData || null))
  const [viewMode,    setViewMode]   = useState('svg')
  const [generating,  setGenerating] = useState(false)

  const clienteMap = {}
  ;(clienti || []).forEach(c => { clienteMap[c.id] = c })

  const handleTipoChange = useCallback((t) => {
    setTipoGiunto(t)
    setJointCfg(defaultJointConfig(t, traveData?.profiloData || null))
  }, [traveData])

  const Vmax   = traveData?.result?.Vmax  || 0
  const Mmax   = traveData?.result?.Mmax  || 0
  const profilo = traveData?.profiloData  || null

  // Verifiche
  const geom       = verificaGeometria({ joint: jointCfg, profilo })
  const vb         = verificaBulloni({ Vmax_kN: Vmax, Mmax_kNm: Mmax, joint: jointCfg })
  const weldResults = verificaSaldature({ joint: jointCfg, profilo, Vmax_kN: Vmax, Mmax_kNm: Mmax })

  async function doReport() {
    setGenerating(true)
    try {
      const prof = await getProfilo()
      const cli  = clienteMap[clienteId] || null
      await generateReportPDF({ progetto, cliente: cli, profilo: prof, traveData, anchorConfig: jointCfg })
    } finally { setGenerating(false) }
  }

  // Colore header host
  const hostInfo = HOST_TYPES[jointCfg.hostType] || HOST_TYPES.steel_column

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ══ LEFT PANEL ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Dati progetto */}
          <div className="eng-card" style={{ padding: 16 }}>
            <div className="eng-section-title" style={{ marginBottom: 14, fontSize: '0.85rem' }}>
              <FileText size={15}/>DATI PROGETTO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label className="eng-label">Nome Progetto</label>
                <input className="eng-input" value={progetto.nome} placeholder="Es. Capannone Via Roma" onChange={e => setProgetto(p => ({ ...p, nome: e.target.value }))}/>
              </div>
              <div>
                <label className="eng-label">Indirizzo</label>
                <input className="eng-input" value={progetto.indirizzo} onChange={e => setProgetto(p => ({ ...p, indirizzo: e.target.value }))}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="eng-label">Rev.</label>
                  <input className="eng-input" value={progetto.rev} onChange={e => setProgetto(p => ({ ...p, rev: e.target.value }))}/>
                </div>
                <div>
                  <label className="eng-label">Cliente</label>
                  <select className="eng-select" value={clienteId} onChange={e => setClienteId(+e.target.value)}>
                    <option value="">— Seleziona —</option>
                    {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.ragioneSociale}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tipo giunto */}
          <div className="eng-card" style={{ padding: 16 }}>
            <div className="eng-section-title" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
              <Cpu size={15}/>TIPO GIUNTO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(JOINT_TYPES).map(([key, info]) => (
                <button key={key} onClick={() => handleTipoChange(key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', border: tipoGiunto === key ? '1px solid var(--accent-blue)' : '1px solid var(--border)', background: tipoGiunto === key ? 'rgba(59,130,246,0.12)' : 'transparent', color: tipoGiunto === key ? 'var(--accent-blue)' : 'var(--text-secondary)', textAlign: 'left' }}>
                  <span style={{ fontSize: '1.1rem', minWidth: 24 }}>{info.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em' }}>{info.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 1 }}>{info.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Host attivo — badge informativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <span style={{ fontSize: '1.2rem' }}>{hostInfo.icon}</span>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Elemento Host</div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>{hostInfo.label}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              {hostInfo.group === 'ca' ? 'EC2' : hostInfo.group === 'acciaio' ? 'EC3' : '—'}
            </div>
          </div>

          {/* Editor parametrico */}
          <div className="eng-card" style={{ padding: 16 }}>
            <div className="eng-section-title" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
              <BarChart2 size={15}/>PARAMETRI GIUNTO
            </div>
            <JointEditor jointConfig={jointCfg} onChange={setJointCfg} profilo={profilo}/>
          </div>

          {/* ─── VERIFICA GEOMETRICA ─── */}
          <div className="eng-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {geom.ok
                ? <CheckCircle size={14} color="var(--accent-green)"/>
                : <XCircle size={14} color="var(--accent-red)"/>}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                VERIFICA GEOMETRICA EC3 TAB. 3.3
              </span>
            </div>
            <GeomPanel errors={geom.errors} warnings={geom.warnings}/>
            {geom.details && (
              <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[['e₁', geom.details.e1, geom.details.e1_min], ['e₂', geom.details.e2, geom.details.e2_min]].map(([lbl, val, min]) => (
                  <div key={lbl} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', color: val >= min ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {lbl}={val}mm (min {min.toFixed(0)})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── VERIFICA BULLONI + ρ ─── */}
          {vb && (
            <div className="eng-card" style={{ padding: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
                VERIFICA BULLONI EC3 §6
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                {[
                  ['N° bulloni',     vb.n,              ''],
                  ['As netta',        `${vb.As} mm²`,   ''],
                  ['Fv,Rd',           `${vb.Fv_Rd} kN`, ''],
                  ['Fb,Rd',           `${vb.Fb_Rd} kN`, ''],
                  ['Governa',         vb.governs,        ''],
                  ['F_bolt,Rd',       `${vb.Fbolt_Rd} kN`, ''],
                  ['V per bullone',   `${vb.Vb} kN`,     ''],
                  ['η taglio',        vb.etaV.toFixed(3), vb.etaV <= 1 ? '✓' : '✗'],
                  ['F_M (max bolt)', `${vb.Fb_M} kN`,   ''],
                  ['η momento',       vb.etaM.toFixed(3), vb.etaM <= 1 ? '✓' : '✗'],
                ].map(([lbl, val, unit]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', color: 'var(--text-muted)' }}>{lbl}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.66rem', fontWeight: 600, color: unit === '✓' ? 'var(--accent-green)' : unit === '✗' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                      {val}{unit && unit !== '✓' && unit !== '✗' ? '' : unit}
                    </span>
                  </div>
                ))}
              </div>
              <RhoBadge rho={vb.rho} label="ρ combinato (SRSS V+M)"/>
            </div>
          )}

          {/* ─── VERIFICA SALDATURE ─── */}
          <WeldResults weldResults={weldResults}/>

          {/* ─── ANCORAGGI CHIMICI ─── */}
          <AnchorResults cfg={jointCfg.chemicalAnchor}/>

          {/* Riepilogo Modulo C */}
          {traveData?.result && (
            <div className="eng-card" style={{ padding: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                DATI DA MODULO C
              </div>
              {[
                ['Profilo',  traveData.profilo],
                ['Luce',     `${traveData.L} m`],
                ['Mmax',     `${traveData.result.Mmax.toFixed(2)} kN·m`],
                ['Vmax',     `${traveData.result.Vmax.toFixed(2)} kN`],
                ['δmax',     `${traveData.result.dmax.toFixed(3)} mm`],
                ['Verifica', traveData.verifica?.ok ? '✓ OK' : '✗ N.V.'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', fontWeight: 600, color: k === 'Verifica' ? (traveData.verifica?.ok ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <button className="eng-btn eng-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={doReport} disabled={generating}>
            <Download size={17}/>
            {generating ? 'GENERAZIONE...' : 'GENERA REPORT PDF'}
          </button>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>VISUALIZZAZIONE</div>
            {[['svg', <Eye size={12}/>, '2D QUOTATO'], ['3d', <Cpu size={12}/>, '3D MODEL']].map(([id, icon, lbl]) => (
              <button key={id} onClick={() => setViewMode(id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.06em', border: 'none', background: viewMode === id ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)', color: viewMode === id ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: viewMode === id ? '2px solid var(--accent-blue)' : '2px solid transparent' }}>
                {icon}{lbl}
              </button>
            ))}
          </div>

          {/* Indicatore errori geometrici sopra il viewer */}
          {(!geom.ok || geom.warnings.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, background: !geom.ok ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${!geom.ok ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
              {!geom.ok ? <XCircle size={14} color="var(--accent-red)"/> : <AlertTriangle size={14} color="var(--accent-amber)"/>}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: !geom.ok ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                {!geom.ok ? `${geom.errors.length} errore/i geometrico/i — vedi pannello sinistra` : `${geom.warnings.length} avviso/i geometrico/i`}
              </span>
            </div>
          )}

          {viewMode === 'svg' && <JointSVG jointConfig={jointCfg} profilo={profilo}/>}
          {viewMode === '3d'  && <Joint3D jointConfig={jointCfg} profilo={profilo} traveL={traveData?.L || 3}/>}

          {/* Riepilogo componenti */}
          <div className="eng-card" style={{ padding: 14 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
              RIEPILOGO COMPONENTI GIUNTO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { label: 'Piastra',    val: `${jointCfg.plate?.w}×${jointCfg.plate?.h}×${jointCfg.plate?.t} mm`, color: 'var(--accent-blue)' },
                { label: 'Bulloni',    val: `${jointCfg.bolts?.length||0} × M${jointCfg.boltDiam||20} cl.${jointCfg.boltClass||'8.8'}`, color: 'var(--text-primary)' },
                { label: 'Materiale',  val: jointCfg.materialePiastra || 'S355', color: 'var(--accent-cyan)' },
                { label: 'Host',       val: hostInfo.label, color: 'var(--accent-amber)' },
                { label: 'Stiffener',  val: `${(jointCfg.stiffeners||[]).filter(s=>s.enabled).length} attivi`, color: 'var(--accent-cyan)' },
                { label: 'ρ globale',  val: vb ? vb.rho.toFixed(3) : '—', color: vb ? (vb.ok ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-muted)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="eng-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', fontWeight: 700, color, wordBreak: 'break-word' }}>{val}</div>
                </div>
              ))}
            </div>

            {(jointCfg.welds||[]).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 6 }}>SALDATURE</div>
                {jointCfg.welds.map((w, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'JetBrains Mono', fontSize: '0.65rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{w.label}</span>
                    <span style={{ color: 'var(--accent-amber)' }}>
                      {w.tipo === 'a_piena_penetrazione' ? 'CJP' : `a=${w.a}mm`}{w.note ? ` · ${w.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fondazione / Solaio riepilogo */}
          {(jointCfg.foundation || jointCfg.slab) && (
            <div className="eng-card" style={{ padding: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
                FONDAZIONE / SOLAIO
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {jointCfg.foundation && [
                  ['Fondazione', jointCfg.foundation.tipo || '—'],
                  ['Dim. [mm]',  `${jointCfg.foundation.width}×${jointCfg.foundation.height}`],
                  ['Magrone',   `${jointCfg.foundation.magrone} mm`],
                  ['Cls fond.', jointCfg.foundation.classCls],
                ].map(([k,v]) => (
                  <div key={k} className="eng-card" style={{ padding: '7px 10px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
                {jointCfg.slab && [
                  ['Solaio', jointCfg.slab.tipoSolaio || '—'],
                  ['Spessore', `${jointCfg.slab.spessore} mm`],
                  ['Rete ES', jointCfg.slab.rete || '—'],
                  ['Pioli', jointCfg.slab.studs?.enabled ? `Ø${jointCfg.slab.studs.diam}@${jointCfg.slab.studs.spacing}` : 'No'],
                ].map(([k,v]) => (
                  <div key={k} className="eng-card" style={{ padding: '7px 10px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
