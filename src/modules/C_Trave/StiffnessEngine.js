/**
 * StiffnessEngine.js — Metodo delle Rigidezze per travi
 * Risolve travi con n vincoli, carichi distribuiti e puntuali
 * Tipi vincolo: roller, hinge, fixed, spring
 *
 * Convenzioni:
 *   - DOF per nodo: [v (traslazione y), θ (rotazione z)]
 *   - Rigidezza elemento Bernoulli-Euler 2D (4×4)
 *   - Unità: kN, m
 */

// ─── Matrice di rigidezza elemento trave (4×4) ───────────────────────────────
function beamStiffness(EI, L) {
  const k = 12 * EI / (L * L * L)
  const m =  6 * EI / (L * L)
  const n =  4 * EI / L
  const p =  2 * EI / L
  return [
    [ k,  m, -k,  m],
    [ m,  n, -m,  p],
    [-k, -m,  k, -m],
    [ m,  p, -m,  n],
  ]
}

// ─── Forze equivalenti nodali — carico puntuale su elemento ──────────────────
function equivPoint(P, a, L) {
  const b = L - a
  return [
     P * b * b * (3*a + b) / (L*L*L),
     P * a * b * b          / (L*L),
     P * a * a * (a + 3*b)  / (L*L*L),
    -P * a * a * b           / (L*L),
  ]
}

// ─── Assemblaggio matrice globale ─────────────────────────────────────────────
function assemble(elements, nDOF) {
  const K = Array.from({ length: nDOF }, () => new Array(nDOF).fill(0))
  for (const el of elements) {
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        K[el.dofs[i]][el.dofs[j]] += el.ke[i][j]
  }
  return K
}

// ─── Gauss con pivot parziale ─────────────────────────────────────────────────
function gaussSolve(A, b) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col+1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    if (Math.abs(M[col][col]) < 1e-14) continue
    for (let row = col+1; row < n; row++) {
      const f = M[row][col] / M[col][col]
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k]
    }
  }
  const x = new Array(n).fill(0)
  for (let i = n-1; i >= 0; i--) {
    x[i] = M[i][n]
    for (let j = i+1; j < n; j++) x[i] -= M[i][j] * x[j]
    x[i] = Math.abs(M[i][i]) > 1e-14 ? x[i] / M[i][i] : 0
  }
  return x
}

// ─── ENGINE PRINCIPALE ────────────────────────────────────────────────────────
export function solveBeam({ L, EI, vincoli = [], carichi = [], N = 200 }) {

  // 1. Nodi: posizioni vincoli + estremi carico + 0 + L
  const posSet = new Set([0, L])
  vincoli.forEach(v => posSet.add(Math.max(0, Math.min(L, +v.x))))
  carichi.forEach(c => {
    const xs = Math.max(0, Math.min(L, +(c.posizione||0)))
    posSet.add(xs)
    if (c.tipo === 'distribuito' && c.lunghezza)
      posSet.add(Math.max(0, Math.min(L, xs + +c.lunghezza)))
  })
  const nodePos = Array.from(posSet).sort((a,b) => a-b)
  const nN = nodePos.length
  const nDOF = nN * 2

  const nearestNode = x => {
    let best = 0, bd = Infinity
    nodePos.forEach((p,i) => { const d = Math.abs(p-x); if (d < bd) { bd=d; best=i } })
    return best
  }

  // 2. Elementi
  const elements = []
  for (let i = 0; i < nN-1; i++) {
    const xa = nodePos[i], xb = nodePos[i+1], Le = xb - xa
    elements.push({
      i, j: i+1, xa, xb, Le,
      ke: beamStiffness(EI, Le),
      dofs: [i*2, i*2+1, (i+1)*2, (i+1)*2+1],
    })
  }

  // 3. Vettore forze F
  const F = new Array(nDOF).fill(0)
  for (const c of carichi) {
    const sign = c.direzioneUp ? 1 : -1
    if (c.tipo === 'puntuale') {
      const xp = Math.max(0, Math.min(L, +(c.posizione||0)))
      const P  = sign * +c.valore
      for (const el of elements) {
        if (xp >= el.xa - 1e-9 && xp <= el.xb + 1e-9) {
          const a = Math.min(el.Le, Math.max(0, xp - el.xa))
          equivPoint(P, a, el.Le).forEach((v,k) => { F[el.dofs[k]] += v })
          break
        }
      }
    }
    if (c.tipo === 'distribuito') {
      const xS = Math.max(0, Math.min(L, +(c.posizione||0)))
      const xE = c.lunghezza ? Math.max(0, Math.min(L, xS + +c.lunghezza)) : L
      const q  = sign * +c.valore
      for (const el of elements) {
        const oS = Math.max(el.xa, xS), oE = Math.min(el.xb, xE)
        if (oE <= oS + 1e-9) continue
        // Subdividi l'overlap in nsub micro-carichi puntuali
        const nsub = 30
        for (let s = 0; s < nsub; s++) {
          const x0 = oS + s * (oE-oS)/nsub
          const x1 = oS + (s+1) * (oE-oS)/nsub
          const xm = (x0+x1)/2
          const dP = q * (x1-x0)
          const a  = xm - el.xa
          equivPoint(dP, a, el.Le).forEach((v,k) => { F[el.dofs[k]] += v })
        }
      }
    }
  }

  // 4. Matrice globale
  const K_orig = assemble(elements, nDOF)
  // Deep copy per molle
  const K = K_orig.map(r => [...r])

  // 5. Appoggi elastici
  vincoli.forEach(v => {
    if (v.tipo === 'spring' && +v.k > 0) {
      const ni = nearestNode(v.x)
      K[ni*2][ni*2] += +v.k
    }
  })

  // 6. Condizioni al contorno (penalty)
  const constrained = {}
  vincoli.forEach(v => {
    const ni = nearestNode(v.x)
    if (v.tipo === 'roller')  constrained[ni*2] = 0
    if (v.tipo === 'hinge')   constrained[ni*2] = 0  // rotazione libera
    if (v.tipo === 'fixed') { constrained[ni*2] = 0; constrained[ni*2+1] = 0 }
  })

  const BIG = 1e14
  const Kmod = K.map(r => [...r])
  const Fmod = [...F]
  Object.entries(constrained).forEach(([dof, val]) => {
    const d = +dof
    Kmod[d][d] += BIG
    Fmod[d] += BIG * val
  })

  // 7. Risolvi K·u = F
  const u = gaussSolve(Kmod, Fmod)

  // 8. Reazioni: R = K_orig·u − F
  const reactionsList = []
  vincoli.forEach(v => {
    const ni   = nearestNode(v.x)
    const dofV = ni*2, dofR = ni*2+1
    const reac = dof => {
      let r = -F[dof]
      for (let j = 0; j < nDOF; j++) r += K_orig[dof][j] * u[j]
      return r
    }
    const Ry = (v.tipo === 'spring')
      ? +v.k * u[dofV]
      : reac(dofV)
    const Mz = v.tipo === 'fixed' ? reac(dofR) : 0
    reactionsList.push({
      x: v.x, tipo: v.tipo,
      Ry: +Ry.toFixed(4),
      Mz: +Mz.toFixed(4),
      label: v.label || `R(${v.x}m)`,
    })
  })
  reactionsList.sort((a,b) => a.x - b.x)

  // 9. Diagrammi V(x), M(x), δ(x)
  const xs = Array.from({ length: N+1 }, (_,i) => +(i/N*L).toFixed(5))
  const V  = new Array(N+1).fill(0)
  const M  = new Array(N+1).fill(0)
  const d  = new Array(N+1).fill(0)

  // Deflessione via shape functions Hermite
  for (let i = 0; i <= N; i++) {
    const xp = xs[i]
    for (const el of elements) {
      if (xp >= el.xa - 1e-9 && xp <= el.xb + 1e-9) {
        const t  = Math.min(1, Math.max(0, (xp-el.xa)/el.Le))
        const vi = u[el.i*2], ti = u[el.i*2+1]
        const vj = u[el.j*2], tj = u[el.j*2+1]
        const h1 =  2*t*t*t - 3*t*t + 1
        const h2 =  (t*t*t - 2*t*t + t) * el.Le
        const h3 = -2*t*t*t + 3*t*t
        const h4 =  (t*t*t - t*t) * el.Le
        d[i] = vi*h1 + ti*h2 + vj*h3 + tj*h4  // m
        break
      }
    }
  }

  // Taglio: equilibrio da sinistra
  for (let i = 0; i <= N; i++) {
    const xp = xs[i]
    let shear = 0
    reactionsList.forEach(r => { if (r.x <= xp + 1e-9) shear += r.Ry })
    carichi.forEach(c => {
      const sign = c.direzioneUp ? 1 : -1
      if (c.tipo === 'puntuale') {
        if ((c.posizione||0) < xp - 1e-9) shear -= sign * c.valore
      }
      if (c.tipo === 'distribuito') {
        const xS = c.posizione||0
        const xE = c.lunghezza ? xS + c.lunghezza : L
        if (xS < xp + 1e-9) {
          const dx = Math.min(xp, xE) - xS
          if (dx > 0) shear -= sign * c.valore * dx
        }
      }
    })
    V[i] = +shear.toFixed(4)
  }

  // Momento: integrazione di V + momenti di reazione incastri
  const dx_step = L / N
  for (let i = 1; i <= N; i++) {
    M[i] = +(M[i-1] + (V[i-1]+V[i])/2 * (xs[i]-xs[i-1])).toFixed(4)
    reactionsList.forEach(r => {
      if (r.tipo === 'fixed' && Math.abs(r.x - xs[i]) < dx_step/2)
        M[i] = +(M[i] + r.Mz).toFixed(4)
    })
  }

  const d_mm = d.map(v => +(v*1000).toFixed(4))
  const Vmax = +Math.max(...V.map(Math.abs)).toFixed(3)
  const Mmax = +Math.max(...M.map(Math.abs)).toFixed(3)
  const dmax = +Math.max(...d_mm.map(Math.abs)).toFixed(4)
  const MmaxIdx = M.reduce((mi,v,i,a) => Math.abs(v)>Math.abs(a[mi]) ? i : mi, 0)

  return {
    nodi: nodePos,
    reazioni: reactionsList,
    RA: reactionsList[0]?.Ry || 0,
    RB: reactionsList[reactionsList.length-1]?.Ry || 0,
    xs, V, M, d: d_mm,
    Vmax, Mmax, dmax,
    xMmax: +xs[MmaxIdx].toFixed(3),
    EI, L,
  }
}

// ─── Suggerimento giunto automatico ──────────────────────────────────────────
export function suggerisciGiunto(tipoVincolo, materiale = 'acciaio') {
  const map = {
    fixed_calcestruzzo: {
      tipoGiunto: 'baseplateconc',
      nota: 'Incastro su cls → Piastra base + tirafondi chimici profondi (L ≥ 400 mm)',
      boltDiam: 24, anchorLength: 500, groutThickness: 40,
    },
    fixed_acciaio: {
      tipoGiunto: 'endplate',
      nota: 'Incastro su acciaio → Piastra di testa + bulloni pretesi cl. 10.9',
      boltClass: '10.9', boltDiam: 24,
    },
    roller: {
      tipoGiunto: 'cleat',
      nota: 'Carrello → Squadrette con fori asolati per scorrimento longitudinale',
      asolati: true,
    },
    hinge: {
      tipoGiunto: 'cleat',
      nota: 'Cerniera → Giunto a taglio con squadrette d\'anima, bulloni in fori tondi',
    },
    spring: {
      tipoGiunto: 'baseplateconc',
      nota: 'Appoggio elastico → Piastra base su materiale elastomerico o molla meccanica',
    },
  }
  return map[`${tipoVincolo}_${materiale}`] || map[tipoVincolo] || null
}
