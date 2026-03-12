/**
 * Dettagli.jsx — Modulo D aggiornato
 * Integra: JointEditor, Joint3D, JointSVG, JointCalc, verifica bulloni, report PDF
 */
import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getProfilo } from '../../db/database'
import { FileText, Download, Eye, BarChart2, Cpu } from 'lucide-react'
import JointEditor from './JointEditor'
import Joint3D     from './Joint3D'
import JointSVG    from './JointSVG'
import { JOINT_TYPES, defaultJointConfig, verificaBulloni } from './JointCalc'
import { generateReportPDF } from './reportPDF'

export default function Dettagli({ traveData }) {
  const clienti = useLiveQuery(() => db.clienti.toArray(), [])

  const [progetto,   setProgetto]   = useState({ nome: '', indirizzo: '', rev: '00' })
  const [clienteId,  setClienteId]  = useState('')
  const [tipoGiunto, setTipoGiunto] = useState('endplate')
  const [jointCfg,   setJointCfg]   = useState(() =>
    defaultJointConfig('endplate', traveData?.profiloData || null)
  )
  const [viewMode,   setViewMode]   = useState('svg')   // 'svg' | '3d'
  const [generating, setGenerating] = useState(false)

  const clienteMap = {}
  ;(clienti || []).forEach(c => { clienteMap[c.id] = c })

  // Switch joint type and reset config
  const handleTipoChange = useCallback((t) => {
    setTipoGiunto(t)
    setJointCfg(defaultJointConfig(t, traveData?.profiloData || null))
  }, [traveData])

  // Verifica bulloni
  const vb = verificaBulloni({
    Vmax_kN:  traveData?.result?.Vmax || 0,
    Mmax_kNm: traveData?.result?.Mmax || 0,
    joint: jointCfg,
  })

  async function doReport() {
    setGenerating(true)
    try {
      const prof = await getProfilo()
      const cli  = clienteMap[clienteId] || null
      await generateReportPDF({
        progetto, cliente: cli, profilo: prof,
        traveData, anchorConfig: jointCfg,
      })
    } finally {
      setGenerating(false)
    }
  }

  const profilo = traveData?.profiloData || null

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
                <input className="eng-input" value={progetto.nome} placeholder="Es. Capannone Via Roma"
                  onChange={e => setProgetto(p => ({ ...p, nome: e.target.value }))}/>
              </div>
              <div>
                <label className="eng-label">Indirizzo</label>
                <input className="eng-input" value={progetto.indirizzo}
                  onChange={e => setProgetto(p => ({ ...p, indirizzo: e.target.value }))}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="eng-label">Rev.</label>
                  <input className="eng-input" value={progetto.rev}
                    onChange={e => setProgetto(p => ({ ...p, rev: e.target.value }))}/>
                </div>
                <div>
                  <label className="eng-label">Cliente</label>
                  <select className="eng-select" value={clienteId}
                    onChange={e => setClienteId(+e.target.value)}>
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
                <button key={key}
                  onClick={() => handleTipoChange(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                    border: tipoGiunto === key ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                    background: tipoGiunto === key ? 'rgba(59,130,246,0.12)' : 'transparent',
                    color: tipoGiunto === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    textAlign: 'left',
                  }}>
                  <span style={{ fontSize: '1.1rem', minWidth: 24 }}>{info.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                      {info.label}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {info.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor parametrico */}
          <div className="eng-card" style={{ padding: 16 }}>
            <div className="eng-section-title" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
              <BarChart2 size={15}/>PARAMETRI GIUNTO
            </div>
            <JointEditor
              jointConfig={jointCfg}
              onChange={setJointCfg}
              profilo={profilo}
            />
          </div>

          {/* Verifica bulloni */}
          {vb && (
            <div className="eng-card" style={{ padding: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                VERIFICA BULLONI EC3 (SEMPLIFICATA)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  ['N° bulloni', vb.n, ''],
                  ['Fv,Rd/bullone', vb.Fv_Rd.toFixed(1), 'kN'],
                  ['V per bullone', vb.Vb.toFixed(1), 'kN'],
                  ['η taglio',  vb.etaV.toFixed(3), vb.etaV <= 1 ? '✓' : '✗'],
                  ['Fb,M max',  vb.Fb_M.toFixed(1), 'kN'],
                  ['η momento', vb.etaM.toFixed(3), vb.etaM <= 1 ? '✓' : '✗'],
                ].map(([lbl, val, unit]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '3px 0', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{lbl}</span>
                    <span style={{
                      fontFamily: 'JetBrains Mono', fontSize: '0.68rem', fontWeight: 600,
                      color: unit === '✓' ? 'var(--accent-green)' : unit === '✗' ? 'var(--accent-red)' : 'var(--text-primary)',
                    }}>
                      {val} {unit !== '✓' && unit !== '✗' ? unit : unit}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6,
                background: vb.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${vb.ok ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center',
                color: vb.ok ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {vb.ok ? '✓ VERIFICA BULLONI SODDISFATTA' : '✗ VERIFICA BULLONI NON SODDISFATTA'}
              </div>
            </div>
          )}

          {/* Riepilogo trave dal Modulo C */}
          {traveData?.result && (
            <div className="eng-card" style={{ padding: 14 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
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
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '4px 0', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', fontWeight: 600,
                    color: k === 'Verifica' ? (traveData.verifica?.ok ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-primary)',
                  }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <button className="eng-btn eng-btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 14 }}
            onClick={doReport} disabled={generating}>
            <Download size={17}/>
            {generating ? 'GENERAZIONE...' : 'GENERA REPORT PDF'}
          </button>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              VISUALIZZAZIONE
            </div>
            {[['svg', <Eye size={12}/>, '2D QUOTATO'], ['3d', <Cpu size={12}/>, '3D MODEL']].map(([id, icon, lbl]) => (
              <button key={id} onClick={() => setViewMode(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.78rem',
                  letterSpacing: '0.06em', border: 'none',
                  background: viewMode === id ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)',
                  color: viewMode === id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  borderBottom: viewMode === id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                }}>
                {icon}{lbl}
              </button>
            ))}
          </div>

          {/* SVG view */}
          {viewMode === 'svg' && (
            <div>
              <JointSVG jointConfig={jointCfg} profilo={profilo}/>
            </div>
          )}

          {/* 3D view */}
          {viewMode === '3d' && (
            <Joint3D
              jointConfig={jointCfg}
              profilo={profilo}
              traveL={traveData?.L || 3}
            />
          )}

          {/* Component summary */}
          <div className="eng-card" style={{ padding: 14 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>
              RIEPILOGO COMPONENTI GIUNTO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { label: 'Piastra', val: `${jointCfg.plate?.w}×${jointCfg.plate?.h}×${jointCfg.plate?.t} mm`, color: 'var(--accent-blue)' },
                { label: 'Bulloni', val: `${jointCfg.bolts?.length || 0} × M${jointCfg.boltDiam||20} cl.${jointCfg.boltClass||'8.8'}`, color: 'var(--text-primary)' },
                { label: 'Materiale', val: jointCfg.materialePiastra || 'S355', color: 'var(--accent-cyan)' },
                { label: 'Stiffener', val: `${(jointCfg.stiffeners||[]).filter(s=>s.enabled).length} attivi`, color: 'var(--accent-cyan)' },
                { label: 'Saldature', val: `${jointCfg.welds?.length || 0} cordoni`, color: 'var(--accent-amber)' },
                { label: 'Verifica', val: vb ? (vb.ok ? '✓ OK' : '✗ N.V.') : '—', color: vb?.ok ? 'var(--accent-green)' : vb ? 'var(--accent-red)' : 'var(--text-muted)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="eng-card" style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Weld legend */}
            {(jointCfg.welds || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  SALDATURE
                </div>
                {jointCfg.welds.map((w, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0',
                    borderBottom: '1px solid rgba(51,65,85,0.3)', fontFamily: 'JetBrains Mono', fontSize: '0.65rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{w.label}</span>
                    <span style={{ color: 'var(--accent-amber)' }}>
                      {w.tipo === 'a_piena_penetrazione' ? 'CJP' : `a=${w.a}mm`}
                      {w.note ? ` · ${w.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
