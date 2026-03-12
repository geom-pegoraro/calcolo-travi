# EngToolbox PWA

**Toolbox professionale per ingegneria strutturale — Local-First, funziona offline.**

🌐 **Live:** https://geom-pegoraro.github.io/calcolo-travi/

---

## Moduli

| Modulo | Descrizione |
|--------|-------------|
| **A — Preventivi** | CRUD clienti, preventivi con calcolo fiscale italiano (contributo 4%, ritenuta 20%, IVA 22%), export PDF |
| **B — PDF Crop** | Ritaglio automatico margini bianchi via analisi Canvas, output con `pdf-lib` CropBox |
| **C — Analisi Trave** | Trave appoggiata-appoggiata, carichi distribuiti/puntuali, diagrammi V/M/δ, modello 3D Three.js |
| **D — Dettagli & Report** | Particolari costruttivi SVG parametrici, report PDF completo multipagina |

## Stack Tecnico

- **React 18** + **Vite 5**
- **Tailwind CSS** — design system scuro/tecnico
- **Dexie.js** — IndexedDB (nessun limite di storage)
- **Chart.js** — diagrammi sollecitazioni
- **Three.js r128** — modello 3D interattivo
- **jsPDF + autotable** — generazione PDF lato client
- **pdf-lib** — manipolazione PDF vettoriale
- **vite-plugin-pwa** — Service Worker + manifest

## Avvio locale

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Build produzione

```bash
npm run build
npm run preview   # test locale della build
```

## Deploy su GitHub Pages

Il deploy è **automatico** via GitHub Actions ogni volta che fai push su `main`.

### Prima configurazione (una sola volta):
1. Vai su **Settings → Pages** nel tuo repository
2. In **Source** seleziona: `GitHub Actions`
3. Fai un push su `main` → il workflow parte automaticamente

## Privacy & Sicurezza

> 🔒 **Tutti i dati rimangono sul tuo dispositivo.** Nessun dato viene mai trasmesso a server esterni. L'elaborazione avviene interamente nel browser tramite IndexedDB.
