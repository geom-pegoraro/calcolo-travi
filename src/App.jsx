import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Preventivi from './modules/A_Preventivi/Preventivi'
import PDFCrop from './modules/B_PDFCrop/PDFCrop'
import Trave from './modules/C_Trave/Trave'
import Dettagli from './modules/D_Dettagli/Dettagli'

const TABS = [
  { id: 'preventivi', label: 'Preventivi',       short: 'PRV', icon: '📄' },
  { id: 'pdfcrop',    label: 'PDF Crop',          short: 'PDF', icon: '✂️'  },
  { id: 'trave',      label: 'Analisi Trave',     short: 'TRV', icon: '⚙️' },
  { id: 'dettagli',   label: 'Dettagli & Report', short: 'DET', icon: '🔩' },
]

// ─── Versione corrente dell'app ───────────────────────────────────────────────
const APP_VERSION = '1.1.0'

// ─── Changelog — aggiungi qui le future versioni in cima all'array ────────────
const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-03-12',
    changes: [
      'Fix: trave e pilastro ora connessi correttamente nel viewer 3D per tutti i tipi di giunto',
      'Fix: scroll della pagina non interferisce più con lo zoom del modello 3D',
      'Nuovo: piastre e collegamenti colorati in verde nel viewer 3D (come da standard CAD)',
      'Fix: frecce reazione RA/RB nello schema 2D non si sovrappongono più ai vincoli',
      'Miglioramento: schema 2D con più spazio verticale per le reazioni',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-01',
    changes: [
      'Prima release pubblica',
      'Modulo A: Preventivi con gestione clienti e fiscale',
      'Modulo B: PDF Crop con estrazione pagine',
      'Modulo C: Analisi trave IPE/HEA/HEB con diagrammi',
      'Modulo D: Dettagli giunti 2D/3D con verifica bulloni EC3',
      'Report PDF completo con tutti i moduli',
      'PWA: funzionamento offline e installazione su desktop/mobile',
    ],
  },
]

// ─── Chiave localStorage per ricordare l'ultima versione vista ────────────────
const SEEN_VERSION_KEY = 'engtoolbox_seen_version'

// ─── Popup Changelog ──────────────────────────────────────────────────────────
function ChangelogPopup({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: 480,
          maxWidth: '92vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 6, padding: '3px 8px',
              fontFamily: 'JetBrains Mono', fontSize: '0.65rem',
              color: 'var(--accent-blue)', fontWeight: 700, letterSpacing: '0.05em',
            }}>
              v{APP_VERSION}
            </div>
            <span style={{
              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem',
              color: 'var(--text-primary)', letterSpacing: '0.06em',
            }}>
              NOTE DI RILASCIO
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.75rem',
              fontFamily: 'JetBrains Mono',
            }}>
            ✕ CHIUDI
          </button>
        </div>

        {/* Body scrollabile */}
        <div style={{ overflowY: 'auto', padding: '16px 18px', flex: 1 }}>
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version} style={{ marginBottom: i < CHANGELOG.length - 1 ? 24 : 0 }}>
              {/* Versione + data */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              }}>
                <span style={{
                  fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.8rem',
                  color: i === 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}>
                  v{entry.version}
                </span>
                {i === 0 && (
                  <span style={{
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 4, padding: '1px 6px',
                    fontFamily: 'JetBrains Mono', fontSize: '0.6rem',
                    color: 'var(--accent-green)', fontWeight: 700,
                  }}>
                    CORRENTE
                  </span>
                )}
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '0.65rem',
                  color: 'var(--text-muted)', marginLeft: 'auto',
                }}>
                  {entry.date}
                </span>
              </div>

              {/* Lista modifiche */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entry.changes.map((change, ci) => {
                  const isFix  = change.toLowerCase().startsWith('fix')
                  const isNew  = change.toLowerCase().startsWith('nuovo')
                  const isMigl = change.toLowerCase().startsWith('miglioramento')
                  const tag    = isFix ? 'FIX' : isNew ? 'NEW' : isMigl ? 'UPD' : '—'
                  const tagColor = isFix
                    ? 'rgba(245,158,11,0.8)'
                    : isNew
                    ? 'rgba(16,185,129,0.8)'
                    : 'rgba(99,102,241,0.8)'
                  return (
                    <div key={ci} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '6px 10px',
                      background: 'rgba(15,23,42,0.6)',
                      borderRadius: 6,
                      border: '1px solid rgba(51,65,85,0.4)',
                    }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono', fontSize: '0.58rem', fontWeight: 700,
                        color: tagColor, minWidth: 30, paddingTop: 1,
                      }}>
                        {tag}
                      </span>
                      <span style={{
                        fontFamily: 'JetBrains Mono', fontSize: '0.68rem',
                        color: 'var(--text-secondary)', lineHeight: 1.5,
                      }}>
                        {change.replace(/^(Fix|Nuovo|Miglioramento):\s*/i, '')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          fontFamily: 'JetBrains Mono', fontSize: '0.6rem',
          color: 'var(--text-muted)', textAlign: 'center',
        }}>
          EngToolbox PWA · Local-First · geom-pegoraro
        </div>
      </div>
    </div>
  )
}

// ─── Badge versione (fisso in basso a destra) ─────────────────────────────────
function VersionBadge({ hasUpdate, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Note di rilascio"
      style={{
        position: 'fixed', bottom: 14, right: 16, zIndex: 800,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px',
        background: 'var(--bg-card)',
        border: `1px solid ${hasUpdate ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
        borderRadius: 20,
        cursor: 'pointer',
        boxShadow: hasUpdate ? '0 0 12px rgba(16,185,129,0.25)' : 'none',
        transition: 'all 0.2s',
      }}>
      {/* Punto verde pulsante se c'è update */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: hasUpdate ? 'var(--accent-green)' : 'rgba(99,102,241,0.6)',
        boxShadow: hasUpdate ? '0 0 6px var(--accent-green)' : 'none',
        animation: hasUpdate ? 'pulse 1.8s infinite' : 'none',
        flexShrink: 0,
      }}/>
      <span style={{
        fontFamily: 'JetBrains Mono', fontSize: '0.6rem',
        color: hasUpdate ? 'var(--accent-green)' : 'var(--text-muted)',
        letterSpacing: '0.04em',
      }}>
        v{APP_VERSION}
        {hasUpdate && ' · AGGIORNATO'}
      </span>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </button>
  )
}

// ─── App principale ───────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,    setActiveTab]    = useState('trave')
  const [traveData,    setTraveData]    = useState(null)
  const [showChangelog, setShowChangelog] = useState(false)
  const [hasUpdate,    setHasUpdate]    = useState(false)

  // Al mount: controlla se questa versione è già stata vista
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_VERSION_KEY)
      if (seen !== APP_VERSION) {
        // Nuova versione → mostra popup automaticamente e segna come vista
        setHasUpdate(true)
        setShowChangelog(true)
        localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION)
      }
    } catch {
      // localStorage non disponibile (es. Safari privato) → ignora silenziosamente
    }
  }, [])

  const openChangelog  = () => { setShowChangelog(true);  setHasUpdate(false) }
  const closeChangelog = () => { setShowChangelog(false) }

  return (
    <>
      <Layout tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'preventivi' && <Preventivi />}
        {activeTab === 'pdfcrop'    && <PDFCrop />}
        {activeTab === 'trave'      && <Trave onDataChange={setTraveData} />}
        {activeTab === 'dettagli'   && <Dettagli traveData={traveData} />}
      </Layout>

      {/* Badge versione fisso in basso a destra */}
      <VersionBadge hasUpdate={hasUpdate} onClick={openChangelog} />

      {/* Popup changelog */}
      {showChangelog && <ChangelogPopup onClose={closeChangelog} />}
    </>
  )
}
