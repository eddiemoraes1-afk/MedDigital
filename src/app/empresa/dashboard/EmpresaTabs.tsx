'use client'

import { useState } from 'react'
import { Receipt, BarChart2, FileText, Users, List, Stethoscope } from 'lucide-react'
import RelatorioEmpresa from '@/components/RelatorioEmpresa'
import EmpresaDashboardClient from './EmpresaDashboardClient'
import AtestadosDashboard from './AtestadosDashboard'
import FuncionariosDashboard from './FuncionariosDashboard'
import ListaFuncionariosDashboard from './ListaFuncionariosDashboard'
import ConsultasDashboard from './ConsultasDashboard'

type Aba = 'relatorio' | 'dashboard' | 'funcionarios' | 'lista' | 'consultas' | 'atestados'

export default function EmpresaTabs() {
  const [aba, setAba] = useState<Aba>('relatorio')

  const btnClass = (a: Aba) =>
    `flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
      aba === a
        ? 'bg-[#1A3A2C] text-white border-[#1A3A2C] shadow-sm'
        : 'bg-white text-gray-500 border-gray-200 hover:border-[#5BBD9B] hover:text-[#1A3A2C]'
    }`

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setAba('relatorio')} className={btnClass('relatorio')}>
          <Receipt className="w-4 h-4" />
          Relatório de Cobrança
        </button>

        <button onClick={() => setAba('dashboard')} className={btnClass('dashboard')}>
          <BarChart2 className="w-4 h-4" />
          Dashboard de Gastos
        </button>

        <button onClick={() => setAba('funcionarios')} className={btnClass('funcionarios')}>
          <Users className="w-4 h-4" />
          Funcionários
        </button>

        <button onClick={() => setAba('lista')} className={btnClass('lista')}>
          <List className="w-4 h-4" />
          Lista de Funcionários
        </button>

        <button onClick={() => setAba('consultas')} className={btnClass('consultas')}>
          <Stethoscope className="w-4 h-4" />
          Consultas
        </button>

        <button onClick={() => setAba('atestados')} className={btnClass('atestados')}>
          <FileText className="w-4 h-4" />
          Atestados
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

      {aba === 'funcionarios' && (
        <FuncionariosDashboard />
      )}

      {aba === 'lista' && (
        <ListaFuncionariosDashboard />
      )}

      {aba === 'consultas' && (
        <ConsultasDashboard />
      )}

      {aba === 'atestados' && (
        <AtestadosDashboard />
      )}
    </div>
  )
}
