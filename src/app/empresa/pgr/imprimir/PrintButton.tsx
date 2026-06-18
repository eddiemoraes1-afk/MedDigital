'use client'

import { useState } from 'react'
import { Printer, X } from 'lucide-react'

export default function PrintButton() {
  const [showTip, setShowTip] = useState(false)

  return (
    <>
      {/* Botão principal */}
      <div className="no-print fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <button
          onClick={() => {
            setShowTip(false)
            window.print()
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white shadow-xl hover:opacity-90 active:scale-95 transition-all"
          style={{ background: '#1A3A2C' }}
        >
          <Printer className="w-4 h-4" />
          Imprimir / Baixar PDF
        </button>

        <button
          onClick={() => setShowTip(v => !v)}
          className="text-xs underline text-gray-500 hover:text-gray-700"
        >
          {showTip ? 'fechar dica' : 'problema ao salvar? clique aqui'}
        </button>
      </div>

      {/* Dica para Safari */}
      {showTip && (
        <div
          className="no-print fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl shadow-2xl border border-gray-200 bg-white p-4 text-sm"
          style={{ fontSize: 13 }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="font-bold text-gray-800">Como salvar como PDF</span>
            <button onClick={() => setShowTip(false)} className="text-gray-400 hover:text-gray-600 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-600 mb-3 leading-relaxed">
            No <strong>Google Chrome</strong>, o PDF sai perfeito: clique no botão acima e escolha <em>"Salvar como PDF"</em>.
          </p>
          <p className="text-gray-600 leading-relaxed">
            No <strong>Safari</strong>, use o menu do navegador:<br />
            <span className="font-medium text-gray-800">Arquivo → Exportar como PDF…</span>
            <br />(não a opção de imprimir)
          </p>
        </div>
      )}
    </>
  )
}
