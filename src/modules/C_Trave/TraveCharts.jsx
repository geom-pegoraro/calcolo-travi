import { useEffect, useRef } from 'react'
import {
  Chart, LineController, LinearScale, PointElement, LineElement,
  Filler, Tooltip, CategoryScale
} from 'chart.js'

Chart.register(LineController, LinearScale, PointElement, LineElement, Filler, Tooltip, CategoryScale)

const CHART_OPTS = (label, color, unit, fillColor) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: { legend: { display: false }, tooltip: {
    backgroundColor: '#1e293b',
    borderColor: color,
    borderWidth: 1,
    titleColor: '#94a3b8',
    bodyColor: '#f1f5f9',
    callbacks: {
      title: (items) => `x = ${items[0].label} m`,
      label: (item)  => `${label}: ${item.formattedValue} ${unit}`
    }
  }},
  scales: {
    x: {
      ticks: { color:'#475569', font:{size:9,family:'JetBrains Mono'}, maxTicksLimit:10 },
      grid:  { color:'rgba(51,65,85,0.5)' },
    },
    y: {
      ticks: { color:'#475569', font:{size:9,family:'JetBrains Mono'} },
      grid:  { color:'rgba(51,65,85,0.5)' },
    }
  }
})

function SingleChart({ xs, ys, label, unit, color, fillColor, title }) {
  const canvasRef = useRef()
  const chartRef  = useRef()

  // Downsample for performance
  const step = Math.max(1, Math.floor(xs.length / 100))
  const xSampled = xs.filter((_,i) => i % step === 0).map(x => x.toFixed(2))
  const ySampled = ys.filter((_,i) => i % step === 0)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: xSampled,
        datasets: [{
          data: ySampled,
          borderColor: color,
          backgroundColor: fillColor,
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        }]
      },
      options: CHART_OPTS(label, color, unit, fillColor)
    })
    return () => chartRef.current?.destroy()
  }, [xs, ys])

  return (
    <div className="eng-card" style={{padding:'12px 16px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontFamily:'Rajdhani',fontWeight:700,fontSize:'0.9rem',
          letterSpacing:'0.08em',textTransform:'uppercase',color}}>
          {title}
        </span>
        <span style={{fontFamily:'JetBrains Mono',fontSize:'0.65rem',color:'var(--text-muted)',
          background:'var(--bg-secondary)',padding:'2px 8px',borderRadius:4}}>
          [{unit}]
        </span>
      </div>
      <div className="chart-container">
        <canvas ref={canvasRef}/>
      </div>
    </div>
  )
}

export default function TraveCharts({ result }) {
  if (!result) return null
  const { xs, V, M, d } = result

  // Convenzione ingegneristica IT: M positivo (fibre tese sotto) → curva verso il BASSO
  // Il grafico Canvas ha y crescente verso il basso, quindi invertiamo M per la display
  const M_display = M.map(v => -v)

  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      <SingleChart xs={xs} ys={V}         label="V" unit="kN"   color="#3b82f6" fillColor="rgba(59,130,246,0.15)" title="TAGLIO V(x)"/>
      <SingleChart xs={xs} ys={M_display} label="M" unit="kN·m" color="#f59e0b" fillColor="rgba(245,158,11,0.15)"  title="MOMENTO M(x)"/>
      <SingleChart xs={xs} ys={d}         label="δ" unit="mm"   color="#10b981" fillColor="rgba(16,185,129,0.15)" title="FRECCIA δ(x)"/>
    </div>
  )
}
