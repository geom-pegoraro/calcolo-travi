/**
 * Logica fiscale italiana per professionisti
 * Regime ordinario con contributo integrativo cassa
 */

export const ALIQUOTE = {
  contributoIntegrativo: 0.04,  // 4% - Cassa previdenziale
  ritenutaAcconto: 0.20,         // 20% - IRPEF ritenuta d'acconto
  iva: 0.22,                     // 22% - IVA standard
}

/**
 * Calcola il riepilogo fiscale di un preventivo
 * @param {number} imponibile - Totale prestazioni al netto
 * @param {Object} opts - Opzioni (es. applicaRitenuta)
 * @returns {Object} riepilogo fiscale completo
 */
export function calcolaFiscale(imponibile, opts = {}) {
  const { applicaRitenuta = true, applicaIva = true } = opts

  const contributoIntegrativo = imponibile * ALIQUOTE.contributoIntegrativo
  const imponibileConContributo = imponibile + contributoIntegrativo
  const ritenuta = applicaRitenuta ? imponibile * ALIQUOTE.ritenutaAcconto : 0
  const baseIva = imponibileConContributo
  const iva = applicaIva ? baseIva * ALIQUOTE.iva : 0
  const totale = imponibileConContributo + iva
  const daIncassare = totale - ritenuta

  return {
    imponibile: round2(imponibile),
    contributoIntegrativo: round2(contributoIntegrativo),
    imponibileConContributo: round2(imponibileConContributo),
    ritenuta: round2(ritenuta),
    baseIva: round2(baseIva),
    iva: round2(iva),
    totale: round2(totale),
    daIncassare: round2(daIncassare),
  }
}

export function round2(n) {
  return Math.round(n * 100) / 100
}

export function formatCurrency(n) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(n)
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function generateNumeroPreventivo(existing = []) {
  const year = new Date().getFullYear()
  const nums = existing
    .map(p => p.numero)
    .filter(n => n && n.startsWith(`${year}/`))
    .map(n => parseInt(n.split('/')[1]) || 0)
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `${year}/${String(max + 1).padStart(3, '0')}`
}
