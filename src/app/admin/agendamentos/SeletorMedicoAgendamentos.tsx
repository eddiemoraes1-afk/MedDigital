'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { LayoutGrid, Search, Users, X, Stethoscope, CreditCard } from 'lucide-react'

interface Cor {
  bg: string; text: string; border: string; dot: string
}

interface Medico {
  id: string
  nome: string
  especialidade: string | null
  crm: string | null
  crm_uf: string | null
  sexo: string | null
  cor: Cor
}

interface Props {
  medicos: Medico[]
  medicoIdAtivo: string   // 'todos' | uuid
  view: 'semana' | 'mes'
  offset: number
  mesOffset: number
}

function drTitle(sexo?: string | null) {
  return sexo === 'feminino' ? 'Dra.' : 'Dr.'
}

function nomeAbrev(nome: string, palavras = 2) {
  return nome.split(' ').slice(0, palavras).join(' ')
}

export default function SeletorMedicoAgendamentos({ medicos, medicoIdAtivo, view, offset, mesOffset }: Props) {
  const [busca, setBusca] = useState('')

  const modoTodos = medicoIdAtivo === 'todos'

  const medicosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return medicos
    return medicos.filter(m =>
      m.nome.toLowerCase().includes(q) ||
      (m.especialidade?.toLowerCase().includes(q) ?? false) ||
      (m.crm?.toLowerCase().includes(q) ?? false) ||
      (m.crm_uf?.toLowerCase().includes(q) ?? false)
    )
  }, [medicos, busca])

  function medicoLink(mId: string) {
    return view === 'mes'
      ? `/admin/agendamentos?medico_id=${mId}&mes=${mesOffset}&view=mes`
      : `/admin/agendamentos?medico_id=${mId}&semana=${offset}&view=semana`
  }

  function todosLink() {
    return view === 'mes'
      ? `/admin/agendamentos?medico_id=todos&mes=${mesOffset}&view=mes`
      : `/admin/agendamentos?medico_id=todos&semana=${offset}&view=semana`
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* Linha superior: label + busca */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-500 flex items-center gap-1.5 shrink-0">
          <Users className="w-4 h-4" /> Médico:
        </span>

        {/* Busca */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, especialidade ou CRM…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-gray-50 text-gray-700 placeholder-gray-400"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {busca && (
          <span className="text-xs text-gray-400 shrink-0">
            {medicosFiltrados.length} de {medicos.length}
          </span>
        )}
      </div>

      {/* Linha dos pills */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2">

        {/* Botão "Todos" */}
        <Link
          href={todosLink()}
          className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            modoTodos
              ? 'bg-[#1A3A2C] text-white'
              : 'bg-[#5BBD9B]/10 text-[#1A3A2C] hover:bg-[#5BBD9B]/20 border border-[#5BBD9B]/30'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Todos
        </Link>

        {/* Divider */}
        <div className="w-px h-7 bg-gray-200 self-center" />

        {/* Nenhum resultado */}
        {medicosFiltrados.length === 0 && busca && (
          <p className="text-sm text-gray-400 italic">Nenhum médico encontrado para "{busca}"</p>
        )}

        {/* Pills dos médicos filtrados */}
        {medicosFiltrados.map(m => {
          const ativo = !modoTodos && m.id === medicoIdAtivo
          return (
            <Link
              key={m.id}
              href={medicoLink(m.id)}
              title={[
                `${drTitle(m.sexo)} ${m.nome}`,
                m.especialidade,
                m.crm ? `CRM ${m.crm}/${m.crm_uf}` : null,
              ].filter(Boolean).join(' · ')}
              className={`group px-4 py-1.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                ativo ? 'bg-[#1A3A2C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {modoTodos && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${m.cor.dot}`} />
              )}
              <span>{drTitle(m.sexo)} {nomeAbrev(m.nome)}</span>
              {/* Tooltip-style: especialidade ao lado (só quando há busca ativa) */}
              {busca && m.especialidade && (
                <span className={`text-xs font-normal ${ativo ? 'text-green-200' : 'text-gray-400'}`}>
                  · {m.especialidade}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Painel expandido do médico selecionado (quando há busca e um está ativo) */}
      {!modoTodos && busca && medicosFiltrados.find(m => m.id === medicoIdAtivo) && (() => {
        const m = medicosFiltrados.find(m => m.id === medicoIdAtivo)!
        return (
          <div className="px-4 pb-3 flex items-center gap-3 border-t border-gray-50 pt-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.cor.bg} border ${m.cor.border}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${m.cor.dot}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A3A2C]">{drTitle(m.sexo)} {m.nome}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {m.especialidade && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> {m.especialidade}
                  </span>
                )}
                {m.crm && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> CRM {m.crm}/{m.crm_uf}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
