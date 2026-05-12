'use client'

import { useState } from 'react'
import { BarChart2, FileText, Stethoscope, Pill, FlaskConical, Timer } from 'lucide-react'
import DashboardClient from './DashboardClient'
import AdminAtestadosDashboard from './AtestadosDashboard'
import ProducaoMedicaDashboard from './ProducaoMedicaDashboard'
import AdminReceitasDashboard from './ReceitasDashboard'
import ExamesDashboard from './ExamesDashboard'
import TempoDashboard from './TempoDashboard'

type Aba = 'financeiro' | 'atestados' | 'producao' | 'receitas' | 'exames' | 'tempo'

export default function AdminDashboardTabs() {
  const [aba, setAba] = useState<Aba>('financeiro')

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
      active
        ? 'bg-[#1A3A2C] text-white border-[#1A3A2C] shadow-sm'
        : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
    }`

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setAba('financeiro')} className={tabClass(aba === 'financeiro')}>
          <BarChart2 className="w-4 h-4" />
          Analytics Financeiro
        </button>

        <button onClick={() => setAba('atestados')} className={tabClass(aba === 'atestados')}>
          <FileText className="w-4 h-4" />
          Atestados Médicos
        </button>

        <button onClick={() => setAba('receitas')} className={tabClass(aba === 'receitas')}>
          <Pill className="w-4 h-4" />
          Receitas
        </button>

        <button onClick={() => setAba('producao')} className={tabClass(aba === 'producao')}>
          <Stethoscope className="w-4 h-4" />
          Produção Médica
        </button>

        <button onClick={() => setAba('exames')} className={tabClass(aba === 'exames')}>
          <FlaskConical className="w-4 h-4" />
          Exames
        </button>

        <button onClick={() => setAba('tempo')} className={tabClass(aba === 'tempo')}>
          <Timer className="w-4 h-4" />
          Tempo
        </button>
      </div>

      {aba === 'financeiro' && <DashboardClient />}
      {aba === 'atestados' && <AdminAtestadosDashboard />}
      {aba === 'receitas'  && <AdminReceitasDashboard />}
      {aba === 'producao'  && <ProducaoMedicaDashboard />}
      {aba === 'exames'    && <ExamesDashboard />}
      {aba === 'tempo'     && <TempoDashboard />}
    </div>
  )
}
