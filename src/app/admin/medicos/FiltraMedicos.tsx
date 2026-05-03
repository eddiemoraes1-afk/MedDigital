'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Stethoscope, CheckCircle2, XCircle, Clock } from 'lucide-react'
import BotoesAprovacao from '../components/BotoesAprovacao'
import ToggleMedicoAtivo from './ToggleMedicoAtivo'

interface Medico {
  id: string
  nome: string
  especialidade: string | null
  crm: string | null
  crm_uf: string | null
  status: string
  criado_em: string
  ativo: boolean | null
}

interface Props {
  medicos: Medico[]
}

function statusConfig(s: string) {
  if (s === 'aprovado') return { label: 'Aprovado', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
  if (s === 'reprovado') return { label: 'Reprovado', cls: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> }
  return { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> }
}

export default function FiltraMedicos({ medicos }: Props) {
  const [busca, setBusca] = useState('')
  const [buscaEsp, setBuscaEsp] = useState('')
  const [buscaCrm, setBuscaCrm] = useState('')

  const filtrados = medicos.filter(m => {
    if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (buscaEsp && !(m.especialidade ?? '').toLowerCase().includes(buscaEsp.toLowerCase())) return false
    if (buscaCrm && !(m.crm ?? '').includes(buscaCrm)) return false
    return true
  })

  return (
    <div>
      {/* Filtros de texto */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm flex-1 min-w-[160px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm flex-1 min-w-[160px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Especialidade..."
            value={buscaEsp}
            onChange={e => setBuscaEsp(e.target.value)}
            className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm min-w-[130px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="CRM..."
            value={buscaCrm}
            onChange={e => setBuscaCrm(e.target.value)}
            className="text-sm outline-none w-24 text-gray-700 placeholder-gray-400 bg-transparent"
          />
        </div>
        {(busca || buscaEsp || buscaCrm) && (
          <button
            onClick={() => { setBusca(''); setBuscaEsp(''); setBuscaCrm('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <Stethoscope className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum médico encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Médico</th>
                  <th className="px-6 py-3 text-left">Especialidade</th>
                  <th className="px-6 py-3 text-left">CRM</th>
                  <th className="px-6 py-3 text-left">Cadastro</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Ativo</th>
                  <th className="px-6 py-3 text-center">Aprovação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(m => {
                  const sc = statusConfig(m.status)
                  const ativo = m.ativo !== false
                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${!ativo ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ativo ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Stethoscope className={`w-4 h-4 ${ativo ? 'text-[#5BBD9B]' : 'text-gray-400'}`} />
                          </div>
                          <Link
                            href={`/admin/medicos/${m.id}`}
                            className="font-medium text-[#5BBD9B] hover:underline"
                          >
                            {m.nome}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{m.especialidade || '—'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        {m.crm ? `${m.crm} / ${m.crm_uf}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(m.criado_em).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${sc.cls}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ToggleMedicoAtivo medicoId={m.id} ativo={ativo} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        {m.status === 'em_analise' ? (
                          <BotoesAprovacao medicoId={m.id} />
                        ) : m.status === 'aprovado' ? (
                          <BotoesAprovacao medicoId={m.id} modoReprovacao />
                        ) : (
                          <BotoesAprovacao medicoId={m.id} modoAprovacao />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
