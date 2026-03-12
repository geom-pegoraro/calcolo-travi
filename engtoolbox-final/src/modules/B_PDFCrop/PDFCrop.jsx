import { useState, useRef, useCallback } from 'react'
import { Scissors, Upload, Download, Eye, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import { analyzePDFPage, mmToPt } from './cropLogic'

export default function PDFCrop() {
  const [file, setFile]         = useState(null)
  const [pdfBytes, setPdfBytes] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [tolerance, setTolerance] = useState(240)
  const [margin, setMargin]     = useState(5)
  const [status, setStatus]     = useState(null) // null | 'analyzing' | 'done' | 'error'
  const [results, setResults]   = useState([])   // per-page analysis
  const [msg, setMsg]           = useState('')
  const [preview, setPreview]   = useState(null) // canvas dataURL
  const fileRef = useRef()

  const loadFile = useCallback(async (f) => {
    if (!f || f.type !== 'application/pdf') {
      setMsg('Seleziona un file PDF valido.')
      return
    }
    setFile(f)
    setResults([])
    setStatus(null)
    setPreview(null)
    const buf = await f.arrayBuffer()
    setPdfBytes(new Uint8Array(buf))
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    loadFile(e.dataTransfer.files?.[0])
  }, [loadFile])

  async function analyze() {
    if (!pdfBytes) return
    setStatus('analyzing')
    setMsg('')
    try {
      // Carica pdf.js dinamicamente
      const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
      // pdfjsLib non funzionerà con import dinamico da CDN in tutti gli ambienti
      // Usiamo l'approccio nativo con window
      const pdfjs = window.pdfjsLib || (await loadPDFJS())

      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const pdf  = await pdfjs.getDocument(url).promise

      const pageResults = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page   = await pdf.getPage(i)
        const bounds = await analyzePDFPage(page, 1.5, tolerance)
        pageResults.push({ page: i, bounds })

        // Preview prima pagina
        if (i === 1 && bounds) {
          const vp = page.getViewport({ scale: 1.5 })
          const c  = document.createElement('canvas')
          c.width  = vp.width; c.height = vp.height
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise

          // Disegna bounding box
          const ctx = c.getContext('2d')
          ctx.strokeStyle = '#06b6d4'
          ctx.lineWidth   = 3
          ctx.strokeRect(bounds.pxBounds.left, bounds.pxBounds.top,
            bounds.pxBounds.right - bounds.pxBounds.left,
            bounds.pxBounds.bottom - bounds.pxBounds.top)
          setPreview(c.toDataURL())
        }
      }
      URL.revokeObjectURL(url)
      setResults(pageResults)
      setStatus('done')
    } catch(e) {
      console.error(e)
      setStatus('error')
      setMsg('Errore analisi: ' + e.message)
    }
  }

  async function downloadCropped() {
    if (!pdfBytes || !results.length) return
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages  = pdfDoc.getPages()
      const marginPt = mmToPt(margin)

      pages.forEach((page, idx) => {
        const r = results[idx]?.bounds
        if (!r) return
        const { ptLeft, ptBottom, ptRight, ptTop, pdfW, pdfH } = r

        // CropBox: [left, bottom, right, top] in punti PDF
        const cropBox = [
          Math.max(0,  ptLeft   - marginPt),
          Math.max(0,  ptBottom - marginPt),
          Math.min(pdfW, ptRight  + marginPt),
          Math.min(pdfH, ptTop    + marginPt),
        ]
        page.setCropBox(...cropBox)
      })

      const out  = await pdfDoc.save()
      const blob = new Blob([out], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `cropped_${file.name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e) {
      setMsg('Errore crop: ' + e.message)
    }
  }

  return (
    <div style={{padding:'20px 24px', maxWidth:900}}>
      <div className="eng-section-title" style={{marginBottom:20}}>
        <Scissors size={18}/>PDF TECHNICAL CROP — AUTO MARGIN
      </div>

      {/* Drop zone */}
      <div className={`drop-zone ${dragging?'drag-over':''}`}
        style={{padding:'40px 20px', textAlign:'center', marginBottom:20}}
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        onClick={()=>fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={e=>loadFile(e.target.files?.[0])}/>
        <Upload size={36} style={{color:'var(--text-muted)',marginBottom:12}}/>
        <div style={{fontFamily:'Rajdhani',fontWeight:600,fontSize:'1.1rem',color:'var(--text-secondary)'}}>
          {file ? file.name : 'Trascina un PDF qui o clicca per selezionare'}
        </div>
        {file && <div style={{fontFamily:'JetBrains Mono',fontSize:'0.7rem',color:'var(--text-muted)',marginTop:6}}>
          {(file.size/1024/1024).toFixed(2)} MB
        </div>}
      </div>

      {/* Controls */}
      <div className="eng-card" style={{padding:20, marginBottom:20}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
          <div>
            <label className="eng-label">Tolleranza Bianco: {tolerance}</label>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontFamily:'JetBrains Mono',fontSize:'0.7rem',color:'var(--text-muted)'}}>Grigio</span>
              <input type="range" className="eng-slider" min={180} max={255} value={tolerance}
                onChange={e=>setTolerance(+e.target.value)}/>
              <span style={{fontFamily:'JetBrains Mono',fontSize:'0.7rem',color:'var(--text-muted)'}}>Bianco</span>
            </div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',color:'var(--text-muted)',marginTop:4}}>
              Valori alti = solo pixel molto vicini al bianco puro vengono rimossi
            </div>
          </div>
          <div>
            <label className="eng-label">Margine di Sicurezza (mm)</label>
            <input className="eng-input" type="number" min={0} max={30} step={0.5} value={margin}
              onChange={e=>setMargin(+e.target.value)} style={{width:120}}/>
            <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',color:'var(--text-muted)',marginTop:8}}>
              Spazio extra attorno al contenuto rilevato
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <button className="eng-btn eng-btn-primary" onClick={analyze} disabled={!file||status==='analyzing'}>
          {status==='analyzing' ? <Loader size={15} className="animate-spin"/> : <Eye size={15}/>}
          {status==='analyzing' ? 'ANALISI...' : 'ANALIZZA'}
        </button>
        <button className="eng-btn eng-btn-success" onClick={downloadCropped}
          disabled={status!=='done'}>
          <Download size={15}/>SCARICA PDF RITAGLIATO
        </button>
      </div>

      {/* Status */}
      {msg && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:6,marginBottom:16,
          background:'rgba(239,68,68,0.1)',border:'1px solid var(--accent-red)',color:'var(--accent-red)',fontSize:'0.85rem'}}>
          <AlertCircle size={16}/>{msg}
        </div>
      )}
      {status==='done' && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:6,marginBottom:16,
          background:'rgba(16,185,129,0.1)',border:'1px solid var(--accent-green)',color:'var(--accent-green)',fontSize:'0.85rem'}}>
          <CheckCircle size={16}/>
          Analisi completata: {results.length} pagina/e analizzate · Margine: {margin}mm
        </div>
      )}

      {/* Results + Preview */}
      {results.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* Per-page results */}
          <div className="eng-card" style={{padding:16}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:'0.7rem',textTransform:'uppercase',
              letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:12}}>
              RISULTATI PER PAGINA
            </div>
            <table className="eng-table" style={{fontSize:'0.78rem'}}>
              <thead><tr><th>PAG.</th><th>SX (mm)</th><th>DX (mm)</th><th>SUP (mm)</th><th>INF (mm)</th></tr></thead>
              <tbody>
                {results.map((r,i) => {
                  const b = r.bounds
                  const ptm = (pt) => (pt/2.8346).toFixed(1)
                  return (
                    <tr key={i}>
                      <td style={{fontFamily:'JetBrains Mono',color:'var(--accent-cyan)'}}>{r.page}</td>
                      {b ? <>
                        <td>{ptm(b.ptLeft)}</td>
                        <td>{ptm(b.pdfW - b.ptRight)}</td>
                        <td>{ptm(b.pdfH - b.ptTop)}</td>
                        <td>{ptm(b.ptBottom)}</td>
                      </> : <td colSpan={4} style={{color:'var(--text-muted)'}}>Pagina vuota</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          {preview && (
            <div className="eng-card" style={{padding:16}}>
              <div style={{fontFamily:'JetBrains Mono',fontSize:'0.7rem',textTransform:'uppercase',
                letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:12}}>
                PREVIEW PAG. 1 — BOUNDING BOX (CIANO)
              </div>
              <img src={preview} alt="preview" style={{width:'100%',borderRadius:4,border:'1px solid var(--border)'}}/>
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="eng-card" style={{padding:16,marginTop:20,fontSize:'0.8rem'}}>
        <div style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',textTransform:'uppercase',
          letterSpacing:'0.1em',color:'var(--accent-amber)',marginBottom:8}}>ℹ COME FUNZIONA</div>
        <div style={{color:'var(--text-secondary)',lineHeight:1.6}}>
          Il modulo renderizza ogni pagina su Canvas, analizza i pixel per rilevare il contenuto non-bianco,
          calcola il Bounding Box e utilizza <code style={{color:'var(--accent-cyan)'}}>pdf-lib</code> per
          impostare la <code style={{color:'var(--accent-cyan)'}}>CropBox</code> — preservando la qualità
          vettoriale originale del PDF. Nessun re-rendering, solo ritaglio logico.
        </div>
      </div>
    </div>
  )
}

async function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    s.onerror = reject
    document.head.appendChild(s)
  })
}
