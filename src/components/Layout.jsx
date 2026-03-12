import { useState, useEffect } from 'react'
import { Settings, Database, Wifi, WifiOff, Menu, X } from 'lucide-react'
import BackupManager from './BackupManager'

export default function Layout({ tabs, activeTab, setActiveTab, children }) {
  const [showBackup, setShowBackup] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  // ✅ FIX: listener dentro useEffect con cleanup
  useEffect(() => {
    const goOnline  = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden grid-bg" style={{background:'var(--bg-primary)'}}>

      {/* ── TOP BAR ── */}
      <header style={{background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)'}}
        className="flex items-center justify-between px-4 py-2 z-40 flex-shrink-0">

        <div className="flex items-center gap-3">
          <button className="lg:hidden p-1 text-slate-400 hover:text-white"
            onClick={() => setSideOpen(s => !s)}>
            {sideOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>

          <div className="flex items-center gap-2">
            {/* Logo */}
            <div style={{
              background:'linear-gradient(135deg,#3b82f6,#06b6d4)',
              width:32, height:32, borderRadius:6,
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <span style={{fontFamily:'Rajdhani',fontWeight:700,fontSize:14,color:'white'}}>ET</span>
            </div>
            <div>
              <div style={{fontFamily:'Rajdhani',fontWeight:700,fontSize:'1.1rem',letterSpacing:'0.08em',color:'var(--text-primary)'}}>
                ENGTOOLBOX
              </div>
              <div style={{fontFamily:'JetBrains Mono',fontSize:'0.6rem',color:'var(--text-muted)',letterSpacing:'0.1em'}}>
                PWA v1.0 · LOCAL-FIRST
              </div>
            </div>
          </div>
        </div>

        {/* Desktop tab bar */}
        <nav className="hidden lg:flex items-center gap-1">
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                fontFamily: 'Rajdhani',
                fontWeight: 600,
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 14px',
                borderRadius: 6,
                border: activeTab===t.id ? '1px solid var(--accent-blue)' : '1px solid transparent',
                background: activeTab===t.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: activeTab===t.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span style={{
            display:'flex', alignItems:'center', gap:4,
            fontFamily:'JetBrains Mono', fontSize:'0.65rem',
            color: online ? 'var(--accent-green)' : 'var(--accent-amber)'
          }}>
            {online ? <Wifi size={12}/> : <WifiOff size={12}/>}
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <button className="eng-btn eng-btn-secondary" style={{padding:'6px 10px'}}
            onClick={() => setShowBackup(true)}>
            <Database size={14}/>
            <span className="hidden sm:inline">BACKUP</span>
          </button>
        </div>
      </header>

      {/* ── MOBILE SIDEBAR ── */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSideOpen(false)}/>
          <nav style={{background:'var(--bg-secondary)',borderRight:'1px solid var(--border)',
            width:240, padding:16, position:'relative', zIndex:1}}>
            <div style={{fontFamily:'Rajdhani',fontWeight:700,fontSize:'0.75rem',
              letterSpacing:'0.15em', color:'var(--text-muted)', marginBottom:12}}>
              MODULI
            </div>
            {tabs.map(t => (
              <button key={t.id}
                onClick={() => { setActiveTab(t.id); setSideOpen(false); }}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  width:'100%', padding:'10px 12px', borderRadius:6, marginBottom:4,
                  fontFamily:'Rajdhani', fontWeight:600, fontSize:'1rem',
                  letterSpacing:'0.05em', textTransform:'uppercase',
                  border:'none', cursor:'pointer', transition:'all 0.15s',
                  background: activeTab===t.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: activeTab===t.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}>
                <span style={{fontSize:'1.2rem'}}>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── CONTENT ── */}
      <main className="flex-1 overflow-auto">
        <div className="animate-fade-in" style={{minHeight:'100%'}}>
          {children}
        </div>
      </main>

      {/* ── STATUS BAR ── */}
      <footer style={{
        background:'var(--bg-secondary)', borderTop:'1px solid var(--border)',
        padding:'4px 16px', display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <span style={{fontFamily:'JetBrains Mono',fontSize:'0.6rem',color:'var(--text-muted)'}}>
          🔒 ELABORAZIONE LOCALE · NESSUN DATO TRASMESSO · STORAGE: INDEXEDDB
        </span>
        <span style={{fontFamily:'JetBrains Mono',fontSize:'0.6rem',color:'var(--text-muted)'}}>
          {new Date().getFullYear()} EngToolbox PWA
        </span>
      </footer>

      {showBackup && <BackupManager onClose={() => setShowBackup(false)}/>}
    </div>
  )
}
