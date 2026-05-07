'use client'

import { useState } from 'react'
import { BarChart2, FileText } from 'lucide-react'
import DashboardClient from './DashboardClient'
import AdminAtestadosDashboard from './AtestadosDashboard'

type Aba = 'financeiro' | 'atestados'

export default function AdminDashboardTabs() {
  const [aba, setAba] = useState<Aba>('financeiro')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setAba('financeiro')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
            aba === 'financeiro'
              ? 'bg-[#1A3A2C] text-white border-[#1A3A2C] shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Analytics Financeiro
        </button>

        <button
          onClick={() => setAba('atestados')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
            aba === 'atestados'
              ? 'bg-[#1A3A2C] text-white border-[#1A3A2C] shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Atestados Médicos
        </button>
      </div>

      {aba === 'financeiro' && <DashboardClient />}
      {aba === 'atestados' && <AdminAtestadosDashboard />}
    </div>
  )
}
