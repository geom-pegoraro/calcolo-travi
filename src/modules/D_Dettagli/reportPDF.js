import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency } from '../A_Preventivi/fiscale'

const DARK  = [15, 23, 42]
const BLUE  = [59, 130, 246]
const CYAN  = [6, 182, 212]
const GRAY  = [100, 116, 139]
const GREEN = [16, 185, 129]
const RED   = [239, 68, 68]
const AMBER = [245, 158, 11]
const WHITE = [255, 255, 255]
const LIGHT = [241, 245, 249]

function header(doc, title, subtitle) {
  const W = 210
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 30, 'F')
  doc.setFillColor(...BLUE)
  doc.roundedRect(15, 7, 12, 12, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica','bold')
  doc.setFontSize(7)
  doc.text('ET', 17.5, 14.5)
  doc.setFontSize(14)
  doc.text('ENGTOOLBOX', 31, 15)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Technical Report · Local-First PWA', 31, 21)

  doc.setFillColor(...BLUE)
  doc.rect(0, 30, W, 1.5, 'F')

  // Title box
  doc.setFillColor(...LIGHT)
  doc.rect(15, 36, W-30, 16, 'F')
  doc.setTextColor(...DARK)
  doc.setFont('helvetica','bold')
  doc.setFontSize(12)
  doc.text(title.toUpperCase(), 20, 46)
  if (subtitle) {
    doc.setFont('helvetica','normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(subtitle, 20, 51)
  }
  return 58
}

function footer(doc) {
  const W = 210, H = doc.internal.pageSize.height
  doc.setFillColor(...DARK)
  doc.rect(0, H-10, W, 10, 'F')
  doc.setTextColor(...GRAY)
  doc.setFontSize(6)
  doc.setFont('helvetica','normal')
  const now = new Date().toLocaleString('it-IT')
  doc.text(`Report generato il ${now} · EngToolbox PWA · Elaborazione locale`, 15, H-4)
  doc.text(`Pag. ${doc.getCurrentPageInfo().pageNumber}`, W-15, H-4, {align:'right'})
}

function sectionTitle(doc, title, y) {
  doc.setFillColor(...DARK)
  doc.rect(15, y, 180, 7, 'F')
  doc.setTextColor(...CYAN)
  doc.setFont('helvetica','bold')
  doc.setFontSize(8)
  doc.text(title, 18, y+5)
  return y + 12
}

export async function generateReportPDF({
  progetto, cliente, profilo,
  traveData, anchorConfig,
  chartCanvases = [],   // array di HTMLCanvasElement
  model3DCanvas = null,
}) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W = 210, M = 15

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 1 — DATI PROGETTO
  // ══════════════════════════════════════════════════════════════════════
  let y = header(doc, 'RELAZIONE TECNICA', `Progetto: ${progetto?.nome || 'N/D'}`)

  // Dati progetto + cliente
  y = sectionTitle(doc, '1. DATI GENERALI', y)
  const cols = [[
    ['Progetto',  progetto?.nome || '—'],
    ['Indirizzo', progetto?.indirizzo || '—'],
    ['Data',      new Date().toLocaleDateString('it-IT')],
    ['Rev.',      progetto?.rev || '00'],
  ],[
    ['Cliente',   cliente?.ragioneSociale || '—'],
    ['P.IVA',     cliente?.piva || '—'],
    ['Email',     cliente?.email || '—'],
    ['Progettista', profilo?.nome || '—'],
  ]]
  cols.forEach((col, ci) => {
    const cx = M + ci * 90
    col.forEach(([k,v], ri) => {
      doc.setFont('helvetica','bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      doc.text(k+':', cx, y + ri*7)
      doc.setFont('helvetica','normal')
      doc.setTextColor(...DARK)
      doc.text(String(v), cx+28, y + ri*7)
    })
  })
  y += 30

  // ── Sezione 2: Dati Trave ──
  if (traveData) {
    y = sectionTitle(doc, '2. DATI DI INPUT — TRAVE', y)
    const { L, profilo: nomeProfilo, profiloData, carichi, result, verifica } = traveData
    doc.autoTable({
      startY: y,
      head: [['PARAMETRO','VALORE','UNITÀ']],
      body: [
        ['Luce trave', L, 'm'],
        ['Profilo', nomeProfilo, '—'],
        ['Altezza h', profiloData?.h || '—', 'mm'],
        ['Larghezza b', profiloData?.b || '—', 'mm'],
        ['Inerzia Iy', profiloData?.Iy || '—', 'cm⁴'],
        ['Modulo Wy', profiloData?.Wy || '—', 'cm³'],
        ['Modulo elastico E', profiloData?.E || 210000, 'MPa'],
      ],
      margin: { left: M, right: M },
      styles: { fontSize:8, cellPadding:3 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize:7 },
      columnStyles: { 0:{cellWidth:80}, 1:{cellWidth:60,halign:'right'}, 2:{cellWidth:40} },
      alternateRowStyles: { fillColor: [248,250,252] }
    })
    y = doc.lastAutoTable.finalY + 6

    // Carichi
    if (carichi?.length) {
      y = sectionTitle(doc, '3. CARICHI APPLICATI', y)
      doc.autoTable({
        startY: y,
        head: [['N°','TIPO','VALORE','POSIZIONE','NOTE']],
        body: carichi.map((c,i) => [
          i+1,
          c.tipo==='distribuito' ? 'Distribuito' : 'Puntuale',
          c.tipo==='distribuito' ? `${c.valore} kN/m` : `${c.valore} kN`,
          `x = ${c.posizione} m`,
          c.lunghezza ? `lungh. ${c.lunghezza} m` : c.tipo==='distribuito' ? 'Su tutta la luce' : '—'
        ]),
        margin: { left: M, right: M },
        styles: { fontSize:8, cellPadding:3 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontSize:7 },
        alternateRowStyles: { fillColor: [248,250,252] }
      })
      y = doc.lastAutoTable.finalY + 6
    }

    // Risultati
    if (result) {
      y = sectionTitle(doc, '4. RISULTATI ANALISI STATICA', y)
      const etaOk = verifica?.ok
      doc.autoTable({
        startY: y,
        head: [['GRANDEZZA','SIMBOLO','VALORE','UNITÀ','VERIFICA']],
        body: [
          ['Reazione ad A',      'RA',    result.RA.toFixed(3),   'kN',   '—'],
          ['Reazione in B',      'RB',    result.RB.toFixed(3),   'kN',   '—'],
          ['Taglio massimo',     'Vmax',  result.Vmax.toFixed(3), 'kN',   '—'],
          ['Momento massimo',    'Mmax',  result.Mmax.toFixed(3), 'kN·m', '—'],
          ['Freccia massima',    'δmax',  result.dmax.toFixed(4), 'mm',   `L/${Math.round(result.L*1000/result.dmax)||'∞'}`],
          verifica ? ['Momento resistente',  'MRd',   verifica.Mrd.toFixed(3),  'kN·m', etaOk?'OK':'N.V.'] : null,
          verifica ? ['Rapporto η = MEd/MRd','η',     verifica.eta.toFixed(3),  '—',    etaOk?'≤1.0 OK':'>1.0 N.V.'] : null,
        ].filter(Boolean),
        margin: { left: M, right: M },
        styles: { fontSize:8, cellPadding:3 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontSize:7 },
        columnStyles: { 4:{ fontStyle:'bold' } },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.cell.raw === 'OK') {
            data.cell.styles.textColor = GREEN
          }
          if (data.column.index === 4 && data.cell.raw?.includes('N.V.')) {
            data.cell.styles.textColor = RED
          }
        },
        alternateRowStyles: { fillColor: [248,250,252] }
      })
      y = doc.lastAutoTable.finalY + 6
    }
  }

  footer(doc)

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 2 — DIAGRAMMI
  // ══════════════════════════════════════════════════════════════════════
  if (chartCanvases.length > 0 || model3DCanvas) {
    doc.addPage()
    y = header(doc, 'DIAGRAMMI & MODELLO 3D', 'Risultati grafici analisi statica')
    footer(doc)

    y = sectionTitle(doc, '5. DIAGRAMMI SOLLECITAZIONI', y)

    const chartH = 50
    const chartW = W - 2*M
    const labels = ['Taglio V(x) [kN]', 'Momento M(x) [kN·m]', 'Freccia δ(x) [mm]']

    for (let i = 0; i < Math.min(3, chartCanvases.length); i++) {
      const canvas = chartCanvases[i]
      if (!canvas) continue
      try {
        const imgData = canvas.toDataURL('image/png')
        doc.setFontSize(7.5)
        doc.setFont('helvetica','bold')
        doc.setTextColor(...GRAY)
        doc.text(labels[i] || `Grafico ${i+1}`, M, y)
        y += 3
        doc.addImage(imgData, 'PNG', M, y, chartW, chartH)
        y += chartH + 6
      } catch(e) { console.warn('Chart capture failed:', e) }
    }

    if (model3DCanvas) {
      y = sectionTitle(doc, '6. MODELLO 3D', y)
      try {
        const img = model3DCanvas.toDataURL('image/png')
        doc.addImage(img, 'PNG', M, y, chartW, 70)
        y += 76
      } catch(e) { console.warn('3D capture failed:', e) }
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 3 — PARTICOLARI COSTRUTTIVI
  // ══════════════════════════════════════════════════════════════════════
  if (anchorConfig) {
    doc.addPage()
    y = header(doc, 'PARTICOLARI COSTRUTTIVI', 'Dettagli giunto trave-pilastro')
    footer(doc)

    y = sectionTitle(doc, '7. DETTAGLIO ANCORAGGIO — PIASTRA DI TESTA', y)
    doc.setFontSize(8)
    doc.setTextColor(...DARK)

    // Parametri ancoraggio come tabella
    doc.autoTable({
      startY: y,
      head: [['ELEMENTO','DESCRIZIONE','DIMENSIONI']],
      body: [
        ['Piastra di testa', 'Acciaio S355', `${anchorConfig.bPlate||140}×${anchorConfig.hPlate||280}×${anchorConfig.tPlate||12} mm`],
        ['Bulloni', `M${anchorConfig.boltDiam||20} - ${anchorConfig.nBoltsV||4}×${anchorConfig.nBoltsH||2}`, `Classe 8.8`],
        ['Saldature', 'Cordone a V', `a = ${anchorConfig.weld||6} mm`],
        ['Trattamento', 'Zincatura a caldo', 'EN ISO 1461'],
      ],
      margin: { left: M, right: M },
      styles: { fontSize:8, cellPadding:3 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize:7 },
      alternateRowStyles: { fillColor: [248,250,252] }
    })
    y = doc.lastAutoTable.finalY + 8

    // SVG come placeholder (in produzione si userebbe svg2pdf.js)
    doc.setFillColor(...LIGHT)
    doc.rect(M, y, W-2*M, 80, 'F')
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text('[ SVG Particolare Costruttivo — Piastra di Testa ]', W/2, y+40, {align:'center'})
    doc.setFontSize(7)
    doc.text('Vedere file SVG allegato generato dal modulo Dettagli', W/2, y+50, {align:'center'})
  }

  // ── Save ──
  const nome = progetto?.nome?.replace(/\s+/g,'_') || 'progetto'
  doc.save(`relazione_tecnica_${nome}_${new Date().toISOString().slice(0,10)}.pdf`)
}
