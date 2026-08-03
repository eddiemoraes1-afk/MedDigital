'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, BarChart2, Activity, Settings2 } from 'lucide-react'
import LancamentosTab    from './LancamentosTab'
import ContasReceberTab  from './ContasReceberTab'
import ContasPagarTab    from './ContasPagarTab'
import DRETab            from './DRETab'
import FluxoCaixaTab     from './FluxoCaixaTab'
import ConfigFinanceiroTab from './ConfigFinanceiroTab'

type Tab = 'lancamentos' | 'receber' | 'pagar' | 'dre' | 'fluxo' | 'config'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'lancamentos', label: 'Todos os Lançamentos', icon: DollarSign   },
  { id: 'receber',     label: 'Contas a Receber',     icon: TrendingUp   },
  { id: 'pagar',       label: 'Contas a Pagar',       icon: TrendingDown },
  { id: 'dre',         label: 'DRE Gerencial',        icon: BarChart2    },
  { id: 'fluxo',       label: 'Fluxo de Caixa',       icon: Activity     },
  { id: 'config',      label: 'Configurações',        icon: Settings2    },
]

export default function FinanceiroClient() {
  const [tab, setTab] = useState<Tab>('lancamentos')

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
          Financeiro
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--txt-muted)' }}>
          Contas a pagar/receber, fluxo de caixa e DRE gerencial
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon
          const ativo = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                ativo
                  ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]'
                  : 'border-transparent hover:border-[#1A3A2C]/20'
              }`}
              style={ativo ? {} : { color: 'var(--txt-muted)', background: 'var(--card)' }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo */}
      {tab === 'lancamentos' && <LancamentosTab />}
      {tab === 'receber'     && <ContasReceberTab />}
      {tab === 'pagar'       && <ContasPagarTab />}
      {tab === 'dre'         && <DRETab />}
      {tab === 'fluxo'       && <FluxoCaixaTab />}
      {tab === 'config'      && <ConfigFinanceiroTab />}
    </div>
  )
}
