'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Stethoscope, CheckCircle2, XCircle, Clock, User2 } from 'lucide-react'
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
  foto_url: string | null
}

type PresencaStatus = 'online' | 'em_atendimento_virtual' | 'em_consulta_agendada' | 'offline'

interface PresencaInfo {
  status: PresencaStatus
  ultimo_ping: string | null
}

interface Props {
  medicos: Medico[]
}

function statusCadastroConfig(s: string) {
  if (s === 'aprovado') return { label: 'Aprovado', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
  if (s === 'reprovado') return { label: 'Reprovado', cls: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> }
  return { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> }
}

function PresencaBadge({ info }: { info: PresencaInfo | undefined }) {
  if (!info || info.status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
        Offline
      </span>
    )
  }
  if (info.status === 'em_atendimento_virtual') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-purple-100 text-purple-700 font-medium">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
        Em atendimento virtual
      </span>
    )
  }
  if (info.status === 'em_consulta_agendada') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-blue-100 text-blue-700 font-medium">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
        Em consulta agendada
      </span>
    )
  }
  // online + disponível
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      Online · Disponível
    </span>
  )
}

export default function FiltraMedicos({ medicos }: Props) {
  const [busca, setBusca] = useState('')
  const [buscaEsp, setBuscaEsp] = useState('')
  const [buscaCrm, setBuscaCrm] = useState('')
  const [presenca, setPresenca] = useState<Record<string, PresencaInfo>>({})
  const [ultimaAtt, setUltimaAtt] = useState<Date | null>(null)

  async function fetchPresenca() {
    try {
      const res = await fetch('/api/admin/presenca')
      if (res.ok) {
        const data = await res.json()
        setPresenca(data)
        setUltimaAtt(new Date())
      }
    } catch {
      // falha silenciosa
    }
  }

  useEffect(() => {
    fetchPresenca()
    const interval = setInterval(fetchPresenca, 30_000)
    return () => clearInterval(interval)
  }, [])

  const filtrados = medicos.filter(m => {
    if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (buscaEsp && !(m.especialidade ?? '').toLowerCase().includes(buscaEsp.toLowerCase())) return false
    if (buscaCrm && !(m.crm ?? '').includes(buscaCrm)) return false
    return true
  })

  // Ordenar: médicos online/em atendimento primeiro
  const ordemPresenca: Record<PresencaStatus, number> = {
    em_atendimento_virtual: 0,
    em_consulta_agendada: 1,
    online: 2,
    offline: 3,
  }
  const filtradosOrdenados = [...filtrados].sort((a, b) => {
    const pa = presenca[a.id]?.status ?? 'offline'
    const pb = presenca[b.id]?.status ?? 'offline'
    return (ordemPresenca[pa] ?? 3) - (ordemPresenca[pb] ?? 3)
  })

  const onlineCount = Object.values(presenca).filter(p => p.status !== 'offline').length

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
          <button onClick={() => { setBusca(''); setBuscaEsp(''); setBuscaCrm('') }} className="text-xs text-gray-400 hover:text-gray-600 px-2">
            Limpar
          </button>
        )}
      </div>

      {/* Indicador de atualização */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {onlineCount > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {onlineCount} {onlineCount === 1 ? 'médico online' : 'médicos online'}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              Nenhum médico online
            </span>
          )}
        </div>
        {ultimaAtt && (
          <p className="text-xs text-gray-300">
            Atualizado às {ultimaAtt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            <span className="ml-1 text-gray-200">· atualiza a cada 30s</span>
          </p>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtradosOrdenados.length === 0 ? (
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
                  <th className="px-6 py-3 text-center">Presença</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Ativo</th>
                  <th className="px-6 py-3 text-center">Aprovação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradosOrdenados.map(m => {
                  const sc = statusCadastroConfig(m.status)
                  const ativo = m.ativo !== false
                  const p = presenca[m.id]
                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${!ativo ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 relative ${ativo ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {m.foto_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover" />
                            ) : (
                              <User2 className={`w-4 h-4 ${ativo ? 'text-[#5BBD9B]' : 'text-gray-400'}`} />
                            )}
                            {/* Indicador de presença no avatar */}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              !p || p.status === 'offline' ? 'bg-gray-300' :
                              p.status === 'online' ? 'bg-green-500' :
                              'bg-purple-500 animate-pulse'
                            }`} />
                          </div>
                          <Link href={`/admin/medicos/${m.id}`} className="font-medium text-[#5BBD9B] hover:underline">
                            {m.nome}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{m.especialidade || '—'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        {m.crm ? `${m.crm} / ${m.crm_uf}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <PresencaBadge info={p} />
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
