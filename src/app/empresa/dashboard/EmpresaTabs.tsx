'use client'

import { useState } from 'react'
import { Receipt, BarChart2 } from 'lucide-react'
import RelatorioEmpresa from '@/components/RelatorioEmpresa'
import EmpresaDashboardClient from './EmpresaDashboardClient'

type Aba = 'relatorio' | 'dashboard'

export default function EmpresaTabs() {
  const [aba, setAba] = useState<Aba>('relatorio')

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setAba('relatorio')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
            aba === 'relatorio'
              ? 'bg-[#1A3A2C] text-white border-[#1A3A2C] shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Relatório de Cobrança
        </button>

        <button
          onClick={() => setAba('dashboard')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
            aba === 'dashboard'
              ? 'bg-[#1A3A2C] text-white border-[#1A3A2C] shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Dashboard de Gastos
        </button>
      </div>

      {/* Tab content */}
      {aba === 'relatorio' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <RelatorioEmpresa
            apiUrl="/api/empresa/relatorio"
            titulo="Relatório de Utilização e Cobrança"
          />
        </div>
      )}

      {aba === 'dashboard' && (
        <EmpresaDashboardClient />
      )}
    </div>
  )
}
