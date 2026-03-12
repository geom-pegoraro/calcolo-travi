import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, upsert, remove, getProfilo, saveProfilo } from '../../db/database'
import { calcolaFiscale, formatCurrency, formatDate, generateNumeroPreventivo } from './fiscale'
import { FileText, Users, User, Plus, Trash2, Edit2, Download, ChevronDown, ChevronUp, Save } from 'lucide-react'
import Modal from '../../components/Modal'
import { generatePreventivoPDF } from './pdfPreventivo'

// ─── Sub-views ────────────────────────────────────────────────────────────────
const VIEWS = ['Preventivi','Clienti','Profilo']

export default function Preventivi() {
  const [view, setView] = useState('Preventivi')

  return (
    <div style={{padding:'20px 24px'}}>
      {/* Sub-tabs */}
      <div style={{display:'flex', gap:8, marginBottom:20}}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{
              fontFamily:'Rajdhani', fontWeight:600, fontSize:'0.8rem',
              letterSpacing:'0.08em', textTransform:'uppercase',
              padding:'6px 16px', borderRadius:6, border:'none', cursor:'pointer',
              background: view===v ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)',
              color: view===v ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: view===v ? '2px solid var(--accent-blue)' : '2px solid transparent',
            }}>
            {v==='Preventivi' && <FileText size={13} style={{display:'inline',marginRight:5}}/>}
            {v==='Clienti' && <Users size={13} style={{display:'inline',marginRight:5}}/>}
            {v==='Profilo' && <User size={13} style={{display:'inline',marginRight:5}}/>}
            {v}
          </button>
        ))}
      </div>
      {view === 'Preventivi' && <PreventiviList />}
      {view === 'Clienti'    && <ClientiList />}
      {view === 'Profilo'    && <ProfiloForm />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVENTIVI LIST
// ═══════════════════════════════════════════════════════════════════════════════
function PreventiviList() {
  const preventivi = useLiveQuery(() => db.preventivi.orderBy('createdAt').reverse().toArray(), [])
  const clienti    = useLiveQuery(() => db.clienti.toArray(), [])
  const [editId, setEditId]   = useState(null)
  const [showForm, setShowForm] = useState(false)

  const clienteMap = {}
  ;(clienti||[]).forEach(c => clienteMap[c.id] = c)

  async function handleDelete(id) {
    if (confirm('Eliminare questo preventivo?')) {
      await remove('preventivi', id)
      await db.prestazioni.where('preventivoId').equals(id).delete()
    }
  }

  async function handlePDF(prev) {
    const cliente = clienteMap[prev.clienteId]
    const profilo = await getProfilo()
    const prestazioni = await db.prestazioni.where('preventivoId').equals(prev.id).toArray()
    generatePreventivoPDF({ preventivo: prev, cliente, profilo, prestazioni })
  }

  const statoBadge = (s) => {
    const map = { bozza:['#f59e0b','rgba(245,158,11,0.15)'], inviato:['#3b82f6','rgba(59,130,246,0.15)'], accettato:['#10b981','rgba(16,185,129,0.15)'], rifiutato:['#ef4444','rgba(239,68,68,0.15)'] }
    const [c,bg] = map[s] || map.bozza
    return <span className="eng-badge" style={{color:c,background:bg}}>{s}</span>
  }

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
        <div className="eng-section-title"><FileText size={18}/>PREVENTIVI</div>
        <button className="eng-btn eng-btn-primary" onClick={() => {setEditId(null);setShowForm(true)}}>
          <Plus size={16}/>NUOVO
        </button>
      </div>

      <div className="eng-card" style={{overflow:'hidden'}}>
        <table className="eng-table">
          <thead>
            <tr>
              <th>N°</th><th>DATA</th><th>CLIENTE</th><th>IMPONIBILE</th><th>TOTALE</th><th>STATO</th><th style={{width:100}}>AZIONI</th>
            </tr>
          </thead>
          <tbody>
            {(!preventivi||preventivi.length===0) && (
              <tr><td colSpan={7} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>
                Nessun preventivo. Creane uno nuovo.
              </td></tr>
            )}
            {(preventivi||[]).map(p => {
              const cl = clienteMap[p.clienteId]
              return (
                <tr key={p.id}>
                  <td><span style={{fontFamily:'JetBrains Mono',fontSize:'0.8rem',color:'var(--accent-cyan)'}}>{p.numero}</span></td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:'0.8rem'}}>{formatDate(p.data)}</td>
                  <td>{cl?.ragioneSociale || <span style={{color:'var(--text-muted)'}}>N/D</span>}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:'0.85rem'}}>{formatCurrency(p.imponibile||0)}</td>
                  <td style={{fontFamily:'JetBrains Mono',fontSize:'0.85rem',color:'var(--accent-green)',fontWeight:700}}>{formatCurrency(p.totale||0)}</td>
                  <td>{statoBadge(p.stato)}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="eng-btn eng-btn-secondary" style={{padding:'4px 8px'}}
                        onClick={() => {setEditId(p.id);setShowForm(true)}}>
                        <Edit2 size={13}/>
                      </button>
                      <button className="eng-btn" style={{padding:'4px 8px',background:'rgba(16,185,129,0.15)',color:'var(--accent-green)',border:'none'}}
                        onClick={() => handlePDF(p)}>
                        <Download size={13}/>
                      </button>
                      <button className="eng-btn eng-btn-danger" style={{padding:'4px 8px'}}
                        onClick={() => handleDelete(p.id)}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PreventivoModal
          editId={editId}
          clienti={clienti||[]}
          preventivi={preventivi||[]}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVENTIVO MODAL (form + calcoli)
// ═══════════════════════════════════════════════════════════════════════════════
function PreventivoModal({ editId, clienti, preventivi, onClose }) {
  const [data, setData] = useState({
    clienteId:'', numero:'', data: new Date().toISOString().slice(0,10),
    oggetto:'', stato:'bozza', note:'', applicaRitenuta:true, applicaIva:true
  })
  const [prestazioni, setPrestazioni] = useState([{ descrizione:'', quantita:1, prezzoUnitario:0 }])
  const [fiscale, setFiscale] = useState(null)

  useEffect(() => {
    if (editId) {
      db.preventivi.get(editId).then(p => {
        if(p) setData(p)
        db.prestazioni.where('preventivoId').equals(editId).toArray().then(ps => {
          if(ps.length) setPrestazioni(ps)
        })
      })
    } else {
      setData(d => ({...d, numero: generateNumeroPreventivo(preventivi)}))
    }
  }, [editId])

  useEffect(() => {
    const imponibile = prestazioni.reduce((s,p) => s + (p.quantita||0)*(p.prezzoUnitario||0), 0)
    setFiscale(calcolaFiscale(imponibile, { applicaRitenuta: data.applicaRitenuta, applicaIva: data.applicaIva }))
  }, [prestazioni, data.applicaRitenuta, data.applicaIva])

  function addRow() { setPrestazioni(p => [...p, {descrizione:'',quantita:1,prezzoUnitario:0}]) }
  function removeRow(i) { setPrestazioni(p => p.filter((_,idx)=>idx!==i)) }
  function updateRow(i,k,v) { setPrestazioni(p => p.map((r,idx)=>idx===i?{...r,[k]:v}:r)) }

  async function save() {
    const rec = {
      ...data,
      imponibile: fiscale?.imponibile||0,
      totale: fiscale?.totale||0,
    }
    let id = editId
    if (editId) {
      await db.preventivi.put(rec)
    } else {
      id = await db.preventivi.add({ ...rec, createdAt: new Date().toISOString() })
    }
    // Salva prestazioni
    await db.prestazioni.where('preventivoId').equals(id).delete()
    await db.prestazioni.bulkAdd(prestazioni.map(p => ({ ...p, preventivoId: id, quantita:+p.quantita, prezzoUnitario:+p.prezzoUnitario })))
    onClose()
  }

  const field = (label, key, type='text', extra={}) => (
    <div>
      <label className="eng-label">{label}</label>
      <input className="eng-input" type={type} value={data[key]||''} onChange={e=>setData(d=>({...d,[key]:e.target.value}))} {...extra}/>
    </div>
  )

  return (
    <Modal title={editId ? 'MODIFICA PREVENTIVO' : 'NUOVO PREVENTIVO'} onClose={onClose} width={760}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16}}>
        {field('Numero','numero')}
        {field('Data','data','date')}
        <div>
          <label className="eng-label">Stato</label>
          <select className="eng-select" value={data.stato} onChange={e=>setData(d=>({...d,stato:e.target.value}))}>
            <option value="bozza">Bozza</option>
            <option value="inviato">Inviato</option>
            <option value="accettato">Accettato</option>
            <option value="rifiutato">Rifiutato</option>
          </select>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <label className="eng-label">Cliente</label>
        <select className="eng-select" value={data.clienteId} onChange={e=>setData(d=>({...d,clienteId:+e.target.value}))}>
          <option value="">-- Seleziona cliente --</option>
          {clienti.map(c => <option key={c.id} value={c.id}>{c.ragioneSociale}</option>)}
        </select>
      </div>
      <div style={{marginBottom:16}}>
        <label className="eng-label">Oggetto</label>
        <input className="eng-input" value={data.oggetto||''} onChange={e=>setData(d=>({...d,oggetto:e.target.value}))}/>
      </div>

      {/* Prestazioni */}
      <div style={{marginBottom:8}} className="eng-section-title" style={{fontSize:'0.85rem',marginBottom:10}}>PRESTAZIONI</div>
      <div className="eng-card" style={{marginBottom:12,overflow:'hidden'}}>
        <table className="eng-table" style={{fontSize:'0.8rem'}}>
          <thead><tr><th style={{width:'50%'}}>Descrizione</th><th>Q.tà</th><th>Prezzo Unit.</th><th>Subtotale</th><th/></tr></thead>
          <tbody>
            {prestazioni.map((p,i) => (
              <tr key={i}>
                <td><input className="eng-input" style={{fontSize:'0.8rem'}} value={p.descrizione} onChange={e=>updateRow(i,'descrizione',e.target.value)}/></td>
                <td><input className="eng-input" style={{fontSize:'0.8rem',width:60}} type="number" value={p.quantita} onChange={e=>updateRow(i,'quantita',e.target.value)}/></td>
                <td><input className="eng-input" style={{fontSize:'0.8rem',width:100}} type="number" step="0.01" value={p.prezzoUnitario} onChange={e=>updateRow(i,'prezzoUnitario',e.target.value)}/></td>
                <td style={{fontFamily:'JetBrains Mono',fontWeight:700,color:'var(--accent-cyan)'}}>{formatCurrency(p.quantita*p.prezzoUnitario||0)}</td>
                <td><button onClick={()=>removeRow(i)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent-red)'}}><Trash2 size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:'8px 12px'}}>
          <button className="eng-btn eng-btn-secondary" style={{fontSize:'0.75rem'}} onClick={addRow}><Plus size={13}/>Aggiungi riga</button>
        </div>
      </div>

      {/* Opzioni fiscali + Riepilogo */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
        <div className="eng-card" style={{padding:14}}>
          <div style={{fontFamily:'JetBrains Mono',fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:10}}>Opzioni Fiscali</div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:8,fontSize:'0.85rem'}}>
            <input type="checkbox" checked={data.applicaRitenuta} onChange={e=>setData(d=>({...d,applicaRitenuta:e.target.checked}))} style={{accentColor:'var(--accent-blue)'}}/>
            Ritenuta d'acconto (20%)
          </label>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.85rem'}}>
            <input type="checkbox" checked={data.applicaIva} onChange={e=>setData(d=>({...d,applicaIva:e.target.checked}))} style={{accentColor:'var(--accent-blue)'}}/>
            IVA (22%)
          </label>
        </div>

        {fiscale && (
          <div className="eng-card" style={{padding:14}}>
            {[
              ['Imponibile', fiscale.imponibile, 'var(--text-primary)'],
              ['Contributo 4%', fiscale.contributoIntegrativo, 'var(--text-secondary)'],
              ['Ritenuta -20%', -fiscale.ritenuta, 'var(--accent-red)'],
              ['IVA 22%', fiscale.iva, 'var(--text-secondary)'],
              ['TOTALE FATTURA', fiscale.totale, 'var(--accent-green)'],
              ['DA INCASSARE', fiscale.daIncassare, 'var(--accent-cyan)'],
            ].map(([label,val,color]) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0',borderBottom:label==='IVA 22%'?'1px solid var(--border)':'none'}}>
                <span style={{fontFamily:'JetBrains Mono',fontSize:'0.7rem',color:'var(--text-muted)'}}>{label}</span>
                <span style={{fontFamily:'JetBrains Mono',fontSize:'0.8rem',fontWeight:label.includes('TOTALE')||label.includes('INCASSARE')?700:400,color}}>{formatCurrency(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display:'flex', justifyContent:'flex-end', gap:10}}>
        <button className="eng-btn eng-btn-secondary" onClick={onClose}>ANNULLA</button>
        <button className="eng-btn eng-btn-primary" onClick={save}><Save size={15}/>SALVA</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTI LIST
// ═══════════════════════════════════════════════════════════════════════════════
function ClientiList() {
  const clienti = useLiveQuery(() => db.clienti.orderBy('ragioneSociale').toArray(), [])
  const [editCliente, setEditCliente] = useState(null)
  const [showForm, setShowForm] = useState(false)

  async function handleDelete(id) {
    if (confirm('Eliminare questo cliente?')) await remove('clienti', id)
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div className="eng-section-title"><Users size={18}/>CLIENTI</div>
        <button className="eng-btn eng-btn-primary" onClick={()=>{setEditCliente(null);setShowForm(true)}}>
          <Plus size={16}/>NUOVO
        </button>
      </div>
      <div className="eng-card" style={{overflow:'hidden'}}>
        <table className="eng-table">
          <thead><tr><th>RAGIONE SOCIALE</th><th>P.IVA / CF</th><th>EMAIL</th><th>TEL</th><th style={{width:90}}>AZIONI</th></tr></thead>
          <tbody>
            {(!clienti||clienti.length===0) && (
              <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Nessun cliente registrato.</td></tr>
            )}
            {(clienti||[]).map(c => (
              <tr key={c.id}>
                <td style={{fontWeight:500}}>{c.ragioneSociale}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:'0.8rem'}}>{c.piva||c.cf||'—'}</td>
                <td style={{fontSize:'0.85rem'}}>{c.email||'—'}</td>
                <td style={{fontFamily:'JetBrains Mono',fontSize:'0.8rem'}}>{c.tel||'—'}</td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="eng-btn eng-btn-secondary" style={{padding:'4px 8px'}}
                      onClick={()=>{setEditCliente(c);setShowForm(true)}}><Edit2 size={13}/></button>
                    <button className="eng-btn eng-btn-danger" style={{padding:'4px 8px'}}
                      onClick={()=>handleDelete(c.id)}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <ClienteModal cliente={editCliente} onClose={()=>setShowForm(false)}/>}
    </div>
  )
}

function ClienteModal({ cliente, onClose }) {
  const [data, setData] = useState(cliente || { ragioneSociale:'', piva:'', cf:'', email:'', tel:'', indirizzo:'', citta:'', cap:'' })
  const f = (label, key, type='text') => (
    <div>
      <label className="eng-label">{label}</label>
      <input className="eng-input" type={type} value={data[key]||''} onChange={e=>setData(d=>({...d,[key]:e.target.value}))}/>
    </div>
  )
  async function save() {
    await upsert('clienti', data)
    onClose()
  }
  return (
    <Modal title={cliente ? 'MODIFICA CLIENTE' : 'NUOVO CLIENTE'} onClose={onClose} width={560}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <div style={{gridColumn:'1/-1'}}>{f('Ragione Sociale / Nome','ragioneSociale')}</div>
        {f('Partita IVA','piva')}
        {f('Codice Fiscale','cf')}
        {f('Email','email','email')}
        {f('Telefono','tel','tel')}
        <div style={{gridColumn:'1/-1'}}>{f('Indirizzo','indirizzo')}</div>
        {f('Città','citta')}
        {f('CAP','cap')}
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
        <button className="eng-btn eng-btn-secondary" onClick={onClose}>ANNULLA</button>
        <button className="eng-btn eng-btn-primary" onClick={save}><Save size={15}/>SALVA</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILO PROFESSIONALE
// ═══════════════════════════════════════════════════════════════════════════════
function ProfiloForm() {
  const [data, setData] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { getProfilo().then(setData) }, [])

  async function save() {
    await saveProfilo(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const f = (label, key, type='text', cols=1) => (
    <div style={cols>1?{gridColumn:`span ${cols}`}:{}}>
      <label className="eng-label">{label}</label>
      <input className="eng-input" type={type} value={data[key]||''} onChange={e=>setData(d=>({...d,[key]:e.target.value}))}/>
    </div>
  )

  return (
    <div style={{maxWidth:640}}>
      <div className="eng-section-title" style={{marginBottom:20}}><User size={18}/>PROFILO PROFESSIONALE</div>
      <div className="eng-card" style={{padding:24}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {f('Nome e Cognome','nome','text',2)}
          {f('Ordine / Albo','albo')}
          {f('Numero Iscrizione','iscrizioneAlbo')}
          {f('Partita IVA','piva')}
          {f('Codice Fiscale','cf')}
          {f('Indirizzo Studio','indirizzo','text',2)}
          {f('Città','citta')}
          {f('CAP','cap')}
          {f('Telefono','tel','tel')}
          {f('Email','email','email')}
          {f('Cassa Previdenziale','cassa')}
          {f('IBAN','iban','text',2)}
        </div>
        <div style={{marginTop:20,display:'flex',alignItems:'center',gap:12}}>
          <button className="eng-btn eng-btn-primary" onClick={save}><Save size={15}/>SALVA PROFILO</button>
          {saved && <span style={{fontFamily:'JetBrains Mono',fontSize:'0.75rem',color:'var(--accent-green)'}}>✓ Salvato</span>}
        </div>
      </div>
    </div>
  )
}
