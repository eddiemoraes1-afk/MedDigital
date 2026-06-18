'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <div className="no-print fixed bottom-6 right-6 z-50 flex gap-3">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-xl hover:opacity-90 active:scale-95 transition-all"
        style={{ background: '#1A3A2C' }}
      >
        <Printer className="w-4 h-4" />
        Imprimir / Baixar PDF
      </button>
    </div>
  )
}
