/**
 * Analisi pixel via Canvas per rilevare bounding box contenuto
 * Restituisce i margini (top, left, bottom, right) in punti PDF
 */

/**
 * Analizza un'immagine (ImageData) e restituisce il bounding box del contenuto
 * @param {ImageData} imageData
 * @param {number} tolerance - tolleranza bianco 0-255 (255=solo bianco puro)
 * @returns {{ top, left, bottom, right }} in pixel
 */
export function findContentBounds(imageData, tolerance = 240) {
  const { data, width, height } = imageData
  let top = height, left = width, bottom = 0, right = 0

  const isWhite = (r, g, b) => r >= tolerance && g >= tolerance && b >= tolerance

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i], g = data[i+1], b = data[i+2]
      if (!isWhite(r, g, b)) {
        if (y < top)    top    = y
        if (y > bottom) bottom = y
        if (x < left)   left   = x
        if (x > right)  right  = x
      }
    }
  }

  // Nessun contenuto trovato
  if (top > bottom || left > right) return null

  return { top, left, bottom, right, width, height }
}

/**
 * Renderizza una pagina PDF su canvas e analizza i margini
 * @param {PDFPageProxy} page - pagina da pdfjsLib
 * @param {number} scale - fattore scala per analisi (1.5 = buona qualità/velocità)
 * @param {number} tolerance
 */
export async function analyzePDFPage(page, scale = 1.5, tolerance = 240) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width  = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')

  await page.render({ canvasContext: ctx, viewport }).promise

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const bounds = findContentBounds(imageData, tolerance)
  if (!bounds) return null

  // Converti pixel in punti PDF (coordinate viewport → unità PDF)
  const pdfW = page.getViewport({ scale: 1 }).width
  const pdfH = page.getViewport({ scale: 1 }).height

  return {
    pxBounds:  bounds,
    // Normalizzati 0-1
    relTop:    bounds.top    / canvas.height,
    relLeft:   bounds.left   / canvas.width,
    relBottom: bounds.bottom / canvas.height,
    relRight:  bounds.right  / canvas.width,
    // In punti PDF
    ptLeft:   (bounds.left   / canvas.width)  * pdfW,
    ptBottom: ((canvas.height - bounds.bottom) / canvas.height) * pdfH,
    ptRight:  (bounds.right  / canvas.width)  * pdfW,
    ptTop:    ((canvas.height - bounds.top)    / canvas.height) * pdfH,
    pdfW, pdfH,
  }
}

/**
 * Converte mm in punti PDF
 */
export const mmToPt = (mm) => mm * 2.8346
