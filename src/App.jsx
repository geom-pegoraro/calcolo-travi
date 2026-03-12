import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Preventivi from './modules/A_Preventivi/Preventivi'
import PDFCrop from './modules/B_PDFCrop/PDFCrop'
import Trave from './modules/C_Trave/Trave'
import Dettagli from './modules/D_Dettagli/Dettagli'

const TABS = [
  { id: 'preventivi', label: 'Preventivi', short: 'PRV', icon: '📄' },
  { id: 'pdfcrop',    label: 'PDF Crop',   short: 'PDF', icon: '✂️'  },
  { id: 'trave',      label: 'Analisi Trave', short: 'TRV', icon: '⚙️' },
  { id: 'dettagli',   label: 'Dettagli & Report', short: 'DET', icon: '🔩' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('trave')
  const [traveData, setTraveData] = useState(null) // shared state C→D

  return (
    <Layout tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'preventivi' && <Preventivi />}
      {activeTab === 'pdfcrop'    && <PDFCrop />}
      {activeTab === 'trave'      && <Trave onDataChange={setTraveData} />}
      {activeTab === 'dettagli'   && <Dettagli traveData={traveData} />}
    </Layout>
  )
}
