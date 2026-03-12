import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getProfilo } from '../../db/database'
import { FileText, Settings, Download, Layers } from 'lucide-react'
import AnchorSVG from './AnchorDetail'
import { generateReportPDF } from './reportPDF'

export default function Dettagli({ traveData }) {
  const clienti  = useLiveQuery(() => db.clienti.toArray(), [])
  const [progetto, setProgetto] = useState({ nome:'', indirizzo:'', rev:'00' })
  const [clienteId, setClienteId] = useState('')
  const [anchor, setAnchor] = useState({
    bPlate:140, hPlate:280, tPlate:12,
    nBoltsV:4, nBoltsH:2, boltDiam:20,
    edgeDist:40, boltPitch:70, weld:6, showDims:true
  })
  const [generating, setGenerating] = useState(false)

  const clienteMap = {}
  ;(clienti||[]).forEach(c => clienteMap[c.id] = c)

  async function doReport() {
    setGenerating(true)
    try {
      const prof = await getProfilo()
      const cli  = clienteMap[clienteId] || null
      await generateReportPDF({
        progetto, cliente: cli, profilo: prof,
        traveData, anchorConfig: anchor,
      })
    } finally {
      setGenerating(false)
    }
  }

  const numInput = (label, key, min, max, step=1) => (
    <div>
      <label className="eng-label">{label}</label>
      <input className="eng-input" type="number" min={min} max={max} step={step}
        value={anchor[key]} onChange={e=>setAnchor(a=>({...a,[key]:+e.target.value}))}/>
    </div>
  )

  return (
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'grid', gridTemplateColumns:'380px 1fr', gap:20, alignItems:'start'}}>

        {/* ── LEFT panel ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Dati progetto */}
          <div className="eng-card" style={{padding:16}}>
            <div className="eng-section-title" style={{marginBottom:14,fontSize:'0.85rem'}}>
              <FileText size={15}/>DATI PROGETTO
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <label className="eng-label">Nome Progetto</label>
                <input className="eng-input" value={progetto.nome}
                  onChange={e=>setProgetto(p=>({...p,nome:e.target.value}))}
                  placeholder="Es. Capannone Via Roma"/>
              </div>
              <div>
                <label className="eng-label">Indirizzo</label>
                <input className="eng-input" value={progetto.indirizzo}
                  onChange={e=>setProgetto(p=>({...p,indirizzo:e.target.value}))}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label className="eng-label">Rev.</label>
                  <input className="eng-input" value={progetto.rev}
                    onChange={e=>setProgetto(p=>({...p,rev:e.target.value}))}/>
                </div>
                <div>
                  <label className="eng-label">Cliente</label>
                  <select className="eng-select" value={clienteId}
                    onChange={e=>setClienteId(+e.target.value)}>
                    <option value="">— Seleziona —</option>
                    {(clienti||[]).map(c=><option key={c.id} value={c.id}>{c.ragioneSociale}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Configurazione ancoraggio */}
          <div className="eng-card" style={{padding:16}}>
            <div className="eng-section-title" style={{marginBottom:14,fontSize:'0.85rem'}}>
              <Settings size={15}/>GIUNTO TRAVE-PILASTRO
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              {numInput('Largh. Piastra [mm]','bPlate',100,300)}
              {numInput('Alt. Piastra [mm]','hPlate',150,500)}
              {numInput('Sp. Piastra [mm]','tPlate',8,30)}
              {numInput('File Bulloni','nBoltsV',2,6)}
              {numInput('Bulloni/Fila','nBoltsH',1,4)}
              {numInput('Ø Bullone [mm]','boltDiam',12,36)}
              {numInput('Dist. Bordo [mm]','edgeDist',25,80)}
              {numInput('Passo [mm]','boltPitch',50,120)}
              {numInput('Saldatura a [mm]','weld',3,12)}
            </div>
            <div style={{marginTop:10}}>
              <label className="eng-label">Tipo Acciaio Piastra</label>
              <select className="eng-select">
                <option>S235</option><option>S275</option><option selected>S355</option>
              </select>
            </div>
          </div>

          {/* Riepilogo trave */}
          {traveData?.result && (
            <div className="eng-card" style={{padding:14}}>
              <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',textTransform:'uppercase',
                letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:8}}>
                DATI DA MODULO C
              </div>
              {[
                ['Profilo',   traveData.profilo],
                ['Luce',      `${traveData.L} m`],
                ['Mmax',      `${traveData.result.Mmax.toFixed(2)} kN·m`],
                ['δmax',      `${traveData.result.dmax.toFixed(3)} mm`],
                ['Verifica',  traveData.verifica?.ok ? '✓ OK' : '✗ N.V.'],
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',
                  padding:'4px 0',borderBottom:'1px solid rgba(51,65,85,0.5)'}}>
                  <span style={{fontFamily:'JetBrains Mono',fontSize:'0.72rem',color:'var(--text-muted)'}}>{k}</span>
                  <span style={{fontFamily:'JetBrains Mono',fontSize:'0.75rem',
                    color: k==='Verifica' ? (traveData.verifica?.ok?'var(--accent-green)':'var(--accent-red)') : 'var(--text-primary)',
                    fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <button className="eng-btn eng-btn-primary"
            style={{width:'100%',justifyContent:'center',padding:14}}
            onClick={doReport} disabled={generating}>
            <Download size={17}/>
            {generating ? 'GENERAZIONE...' : 'GENERA REPORT PDF'}
          </button>
        </div>

        {/* ── RIGHT: SVG Preview ── */}
        <div>
          <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',textTransform:'uppercase',
            letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:8}}>
            PARTICOLARE COSTRUTTIVO — PREVIEW LIVE
          </div>
          <AnchorSVG config={{
            ...anchor,
            hBeam: traveData?.profiloData?.h || 270,
            bFlange: traveData?.profiloData?.b || 135,
            tFlange: traveData?.profiloData?.tf || 10.2,
            tWeb: traveData?.profiloData?.tw || 6.6,
          }}/>

          <div className="eng-card" style={{padding:14,marginTop:14}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',textTransform:'uppercase',
              letterSpacing:'0.1em',color:'var(--accent-amber)',marginBottom:8}}>
              ℹ CONTENUTO REPORT PDF
            </div>
            <div style={{fontSize:'0.82rem',color:'var(--text-secondary)',lineHeight:1.8}}>
              {[
                '1. Dati generali progetto e cliente',
                '2. Input analisi (sezione, materiale)',
                '3. Carichi applicati',
                '4. Risultati: reazioni, V·M·δ, verifica EC3',
                '5. Diagrammi sollecitazioni (se disponibili)',
                '6. Screenshot modello 3D (se disponibile)',
                '7. Particolare costruttivo ancoraggio',
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                  <span style={{color:'var(--accent-cyan)',fontFamily:'JetBrains Mono',fontSize:'0.7rem',marginTop:2}}>▸</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
