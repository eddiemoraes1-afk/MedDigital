'use client'

import { useState } from 'react'
import { BarChart2, FileText, Stethoscope, Pill, FlaskConical, Timer, ScrollText, ShieldCheck } from 'lucide-react'
import DashboardClient from './DashboardClient'
import AdminAtestadosDashboard from './AtestadosDashboard'
import ProducaoMedicaDashboard from './ProducaoMedicaDashboard'
import AdminReceitasDashboard from './ReceitasDashboard'
import ExamesDashboard from './ExamesDashboard'
import TempoDashboard from './TempoDashboard'
import LogsDashboard from './LogsDashboard'
import AdminExclusoesDashboard from './ExclusoesDashboard'

type Aba = 'financeiro' | 'atestados' | 'producao' | 'receitas' | 'exames' | 'exclusoes' | 'tempo' | 'log'

export default function AdminDashboardTabs() {
  const [aba, setAba] = useState<Aba>('financeiro')

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
      >
        {([
          { id: 'financeiro', icon: BarChart2,    label: 'Analytics Financeiro' },
          { id: 'atestados',  icon: FileText,      label: 'Atestados' },
          { id: 'receitas',   icon: Pill,          label: 'Receitas' },
          { id: 'producao',   icon: Stethoscope,   label: 'Produção Médica' },
          { id: 'exames',     icon: FlaskConical,  label: 'Exames' },
          { id: 'exclusoes',  icon: ShieldCheck,   label: 'Prot. Exclusão' },
          { id: 'tempo',      icon: Timer,         label: 'Tempo' },
          { id: 'log',        icon: ScrollText,    label: 'Log' },
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

      {aba === 'financeiro' && <DashboardClient />}
      {aba === 'atestados'  && <AdminAtestadosDashboard />}
      {aba === 'receitas'   && <AdminReceitasDashboard />}
      {aba === 'producao'   && <ProducaoMedicaDashboard />}
      {aba === 'exames'     && <ExamesDashboard />}
      {aba === 'exclusoes'  && <AdminExclusoesDashboard />}
      {aba === 'tempo'      && <TempoDashboard />}
      {aba === 'log'        && <LogsDashboard />}
    </div>
  )
}
