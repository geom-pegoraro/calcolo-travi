import { X } from 'lucide-react'

export default function Modal({ title, children, onClose, width = 560 }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="eng-card animate-fade-in overflow-auto"
        style={{width:'100%', maxWidth:width, maxHeight:'90vh', padding:24}}>
        <div className="flex items-center justify-between mb-5">
          <div className="eng-section-title">{title}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20}/>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
