import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { calcolaFiscale, formatCurrency, formatDate } from './fiscale'

export function generatePreventivoPDF({ preventivo, cliente, profilo, prestazioni }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 20

  // ── Colors ──
  const DARK   = [15, 23, 42]
  const BLUE   = [59, 130, 246]
  const CYAN   = [6, 182, 212]
  const GRAY   = [100, 116, 139]
  const LIGHT  = [241, 245, 249]
  const GREEN  = [16, 185, 129]
  const RED    = [239, 68, 68]

  // ── Background header ──
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 40, 'F')

  // ── Logo area ──
  doc.setFillColor(...BLUE)
  doc.roundedRect(M, 8, 14, 14, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ET', M+3, 17.5)

  // ── Studio info ──
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(profilo?.nome || 'Studio Tecnico', M+18, 16)
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text([
    profilo?.albo ? `${profilo.albo} - N. ${profilo.iscrizioneAlbo||''}` : '',
    profilo?.piva ? `P.IVA ${profilo.piva}` : '',
    [profilo?.indirizzo, profilo?.citta, profilo?.cap].filter(Boolean).join(' · '),
    [profilo?.tel, profilo?.email].filter(Boolean).join(' · ')
  ].filter(Boolean), M+18, 22, { lineHeightFactor: 1.4 })

  // ── Preventivo badge ──
  doc.setFillColor(...CYAN)
  doc.roundedRect(W-M-40, 10, 40, 20, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('PREVENTIVO', W-M-20, 17, { align: 'center' })
  doc.setFontSize(11)
  doc.text(`N° ${preventivo.numero}`, W-M-20, 24, { align: 'center' })

  let y = 50

  // ── Cliente + Dettagli ──
  doc.setFillColor(...LIGHT)
  doc.rect(M, y, (W-2*M)/2-4, 30, 'F')
  doc.rect(W/2+2, y, (W-2*M)/2-2, 30, 'F')

  doc.setTextColor(...DARK)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('DESTINATARIO', M+3, y+6)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(cliente?.ragioneSociale || 'Cliente', M+3, y+12)
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  if (cliente?.indirizzo) doc.text(cliente.indirizzo, M+3, y+18)
  if (cliente?.piva) doc.text(`P.IVA ${cliente.piva}`, M+3, y+23)
  if (cliente?.email) doc.text(cliente.email, M+3, y+28)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('DETTAGLI', W/2+5, y+6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.setFontSize(8)
  const dets = [
    ['Data:', formatDate(preventivo.data)],
    ['Validità:', '30 giorni'],
    ['Oggetto:', preventivo.oggetto?.substring(0,30)||''],
  ]
  dets.forEach(([k,v],i) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(k, W/2+5, y+12+i*6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(v, W/2+22, y+12+i*6)
  })

  y += 38

  // ── Prestazioni Table ──
  const rows = prestazioni.map(p => [
    p.descrizione,
    p.quantita.toString(),
    formatCurrency(p.prezzoUnitario),
    formatCurrency(p.quantita * p.prezzoUnitario)
  ])

  doc.autoTable({
    startY: y,
    head: [['DESCRIZIONE PRESTAZIONE', 'Q.TÀ', 'PREZZO UNITARIO', 'SUBTOTALE']],
    body: rows,
    margin: { left: M, right: M },
    styles: { fontSize: 8.5, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: DARK, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: { fillColor: [248,250,252] },
    tableLineColor: [226,232,240],
    tableLineWidth: 0.2,
  })

  y = doc.lastAutoTable.finalY + 8

  // ── Riepilogo Fiscale ──
  const fis = calcolaFiscale(preventivo.imponibile, {
    applicaRitenuta: preventivo.applicaRitenuta,
    applicaIva: preventivo.applicaIva
  })

  const riepilogo = [
    ['Imponibile', fis.imponibile, DARK],
    [`Contributo Integrativo (${(4)}%)`, fis.contributoIntegrativo, GRAY],
    [`IVA (22%)`, fis.iva, GRAY],
    ['TOTALE FATTURA', fis.totale, BLUE],
    [`Ritenuta d'Acconto (-20%)`, -fis.ritenuta, RED],
    ['NETTO A PAGARE', fis.daIncassare, GREEN],
  ]

  const colX = W - M - 80

  doc.setFillColor(...DARK)
  doc.rect(colX-5, y-2, 85, 8, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(7)
  doc.setFont('helvetica','bold')
  doc.text('RIEPILOGO FISCALE', colX+37, y+4, {align:'center'})
  y += 10

  riepilogo.forEach(([label, val, color], i) => {
    const isMain = label.startsWith('TOTALE') || label.startsWith('NETTO')
    if (isMain) {
      doc.setFillColor(...color.map(c => Math.min(c+180, 255)))
      doc.rect(colX-5, y-2, 85, 9, 'F')
    }
    doc.setFontSize(isMain ? 9 : 8)
    doc.setFont('helvetica', isMain ? 'bold' : 'normal')
    doc.setTextColor(...color)
    doc.text(label, colX, y+4.5)
    doc.text(formatCurrency(val), W-M, y+4.5, { align: 'right' })
    if (!isMain) {
      doc.setDrawColor(220,220,220)
      doc.setLineWidth(0.2)
      doc.line(colX-5, y+7, W-M+2, y+7)
    }
    y += isMain ? 11 : 9
  })

  // ── Note ──
  if (preventivo.note) {
    y += 6
    doc.setFillColor(...LIGHT)
    doc.rect(M, y, W-2*M, 20, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica','bold')
    doc.setTextColor(...BLUE)
    doc.text('NOTE', M+3, y+6)
    doc.setFont('helvetica','normal')
    doc.setTextColor(...DARK)
    doc.text(preventivo.note.substring(0,200), M+3, y+12, {maxWidth: W-2*M-6})
    y += 24
  }

  // ── IBAN ──
  if (profilo?.iban) {
    y += 4
    doc.setFontSize(7.5)
    doc.setFont('helvetica','bold')
    doc.setTextColor(...GRAY)
    doc.text(`IBAN: ${profilo.iban}`, M, y+4)
  }

  // ── Footer ──
  const pageH = doc.internal.pageSize.height
  doc.setFillColor(...DARK)
  doc.rect(0, pageH-12, W, 12, 'F')
  doc.setTextColor(...GRAY)
  doc.setFontSize(6.5)
  doc.setFont('helvetica','normal')
  doc.text('Documento generato con EngToolbox PWA · Elaborazione locale · Nessun dato trasmesso', W/2, pageH-5.5, {align:'center'})

  doc.save(`preventivo-${preventivo.numero?.replace('/','_')}.pdf`)
}
