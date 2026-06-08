'use client'

import { useState } from 'react'
import { Receipt, BarChart2, FileText, Users, List, Stethoscope, FlaskConical, ShieldCheck } from 'lucide-react'
import RelatorioEmpresa from '@/components/RelatorioEmpresa'
import EmpresaDashboardClient from './EmpresaDashboardClient'
import AtestadosDashboard from './AtestadosDashboard'
import FuncionariosDashboard from './FuncionariosDashboard'
import ListaFuncionariosDashboard from './ListaFuncionariosDashboard'
import ConsultasDashboard from './ConsultasDashboard'
import ExamesDashboard from './ExamesDashboard'
import ExclusoesDashboard from './ExclusoesDashboard'

type Aba = 'relatorio' | 'dashboard' | 'funcionarios' | 'consultas' | 'atestados' | 'exames' | 'exclusoes' | 'lista'

export default function EmpresaTabs() {
  const [aba, setAba] = useState<Aba>('relatorio')

  return (
    <div className="mt-8">
      {/* Tab bar */}
      <div
        className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
      >
        {([
          { id: 'relatorio',    icon: Receipt,     label: 'Cobrança' },
          { id: 'dashboard',   icon: BarChart2,    label: 'Dashboard' },
          { id: 'funcionarios', icon: Users,        label: 'Funcionários' },
          { id: 'consultas',   icon: Stethoscope,  label: 'Consultas' },
          { id: 'atestados',   icon: FileText,     label: 'Atestados' },
          { id: 'exames',      icon: FlaskConical, label: 'Exames' },
          { id: 'exclusoes',   icon: ShieldCheck,  label: 'Exclusões' },
          { id: 'lista',       icon: List,         label: 'Lista' },
        ] as const).map(({ id, icon: Icon, label }) => {
          const active = aba === id
          return (
            <button
              key={id}
              onClick={() => setAba(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={active
                ? { background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-sm)' }
                : { background: 'transparent', color: 'var(--txt-2)' }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {aba === 'relatorio' && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <RelatorioEmpresa
            apiUrl="/api/empresa/relatorio"
            titulo="Relatório de Utilização e Cobrança"
          />
        </div>
      )}

      {aba === 'dashboard'    && <EmpresaDashboardClient />}
      {aba === 'funcionarios' && <FuncionariosDashboard />}
      {aba === 'consultas'    && <ConsultasDashboard />}
      {aba === 'atestados'    && <AtestadosDashboard />}
      {aba === 'exames'       && <ExamesDashboard />}
      {aba === 'exclusoes'    && <ExclusoesDashboard />}
      {aba === 'lista'        && <ListaFuncionariosDashboard />}
    </div>
  )
}
