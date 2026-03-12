import { useState } from 'react'
import { Download, Upload, X, Database, AlertTriangle, CheckCircle } from 'lucide-react'
import { exportDB, importDB } from '../db/database'

export default function BackupManager({ onClose }) {
  const [status, setStatus] = useState(null) // null | 'ok' | 'err'
  const [msg, setMsg] = useState('')
  const [importing, setImporting] = useState(false)

  async function handleExport() {
    try {
      const data = await exportDB()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `engtoolbox-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('ok')
      setMsg('Backup esportato con successo')
    } catch(e) {
      setStatus('err')
      setMsg('Errore durante l\'export: ' + e.message)
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.clienti && !data.preventivi && !data.travi) throw new Error('File non valido')
      await importDB(data)
      setStatus('ok')
      setMsg('Database ripristinato. Ricarica la pagina per vedere le modifiche.')
    } catch(e) {
      setStatus('err')
      setMsg('Errore durante l\'import: ' + e.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="eng-card animate-fade-in" style={{width:480, padding:24}}>
        <div className="flex items-center justify-between mb-6">
          <div className="eng-section-title">
            <Database size={18}/>
            GESTIONE BACKUP
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20}/>
          </button>
        </div>

        {status && (
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 14px', borderRadius:6, marginBottom:16,
            background: status==='ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${status==='ok' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
            color: status==='ok' ? 'var(--accent-green)' : 'var(--accent-red)',
            fontSize:'0.85rem'
          }}>
            {status==='ok' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
            {msg}
          </div>
        )}

        <div style={{
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)',
          borderRadius:6, padding:'10px 14px', marginBottom:20,
          display:'flex', gap:8, fontSize:'0.8rem', color:'var(--accent-amber)'
        }}>
          <AlertTriangle size={16} style={{flexShrink:0, marginTop:1}}/>
          <span>L'import sovrascrive tutti i dati esistenti. Esegui prima un backup.</span>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <button className="eng-btn eng-btn-success" onClick={handleExport}
            style={{justifyContent:'center', padding:'14px 16px'}}>
            <Download size={18}/>
            <div>
              <div>ESPORTA</div>
              <div style={{fontSize:'0.65rem', fontFamily:'JetBrains Mono', fontWeight:400, textTransform:'lowercase', opacity:0.8}}>backup .json</div>
            </div>
          </button>

          <label className="eng-btn eng-btn-primary" style={{justifyContent:'center', padding:'14px 16px', cursor:'pointer'}}>
            <Upload size={18}/>
            <div>
              <div>{importing ? 'CARICAMENTO...' : 'IMPORTA'}</div>
              <div style={{fontSize:'0.65rem', fontFamily:'JetBrains Mono', fontWeight:400, textTransform:'lowercase', opacity:0.8}}>ripristina .json</div>
            </div>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing}/>
          </label>
        </div>

        <div style={{marginTop:16, padding:'8px 12px', background:'var(--bg-secondary)', borderRadius:6}}>
          <div style={{fontFamily:'JetBrains Mono', fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4}}>
            Storage Info
          </div>
          <div style={{fontFamily:'JetBrains Mono', fontSize:'0.75rem', color:'var(--text-secondary)'}}>
            Engine: IndexedDB (Dexie.js) · Limite: ~50% spazio disco disponibile
          </div>
        </div>
      </div>
    </div>
  )
}
