'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Brain, ChevronRight, User, FileText, Phone, ArrowUpDown, Calendar } from 'lucide-react'

interface Paciente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  data_nascimento: string | null
  ultima_triagem: {
    classificacao_risco: string | null
    resumo_ia: string | null
    criado_em: string
  } | null
  total_triagens: number
  total_atendimentos: number
  total_atestados: number
  total_exames: number
  total_receitas: number
}

const corRisco: Record<string, string> = {
  verde:    'bg-green-100 text-green-700',
  amarelo:  'bg-yellow-100 text-yellow-700',
  laranja:  'bg-orange-100 text-orange-700',
  vermelho: 'bg-red-100 text-red-700',
}

const labelRisco: Record<string, string> = {
  verde:    '🟢 Baixo',
  amarelo:  '🟡 Moderado',
  laranja:  '🟠 Alto',
  vermelho: '🔴 Urgência',
}

const ordemRisco: Record<string, number> = { vermelho: 0, laranja: 1, amarelo: 2, verde: 3 }

function calcularIdade(dataNasc: string | null): number | null {
  if (!dataNasc) return null
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default function FiltrosPacientesMedico({ pacientes }: { pacientes: Paciente[] }) {
  const [busca, setBusca] = useState('')
  const [filtroRisco, setFiltroRisco] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<'risco' | 'az' | 'za' | 'recentes'>('risco')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const resultado = useMemo(() => {
    let lista = pacientes.filter(p => {
      const textoOk =
        !busca ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.cpf && p.cpf.includes(busca.replace(/\D/g, ''))) ||
        (p.telefone && p.telefone.includes(busca))

      const riscoOk =
        filtroRisco === 'todos' ||
        p.ultima_triagem?.classificacao_risco === filtroRisco ||
        (filtroRisco === 'sem_triagem' && !p.ultima_triagem)

      // Filtro por data da última triagem
      let dataOk = true
      if (p.ultima_triagem?.criado_em) {
        const d = new Date(p.ultima_triagem.criado_em)
        if (dataInicio) dataOk = dataOk && d >= new Date(dataInicio + 'T00:00:00')
        if (dataFim)    dataOk = dataOk && d <= new Date(dataFim + 'T23:59:59')
      } else if (dataInicio || dataFim) {
        dataOk = false // sem triagem não entra no filtro de data
      }

      return textoOk && riscoOk && dataOk
    })

    // Ordenação
    lista = [...lista]
    switch (ordenacao) {
      case 'az':
        lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        break
      case 'za':
        lista.sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR'))
        break
      case 'recentes':
        lista.sort((a, b) => {
          const da = a.ultima_triagem?.criado_em ? new Date(a.ultima_triagem.criado_em).getTime() : 0
          const db = b.ultima_triagem?.criado_em ? new Date(b.ultima_triagem.criado_em).getTime() : 0
          return db - da
        })
        break
      case 'risco':
      default:
        lista.sort((a, b) => {
          const ra = ordemRisco[a.ultima_triagem?.classificacao_risco ?? ''] ?? 4
          const rb = ordemRisco[b.ultima_triagem?.classificacao_risco ?? ''] ?? 4
          if (ra !== rb) return ra - rb
          return a.nome.localeCompare(b.nome, 'pt-BR')
        })
    }

    return lista
  }, [pacientes, busca, filtroRisco, ordenacao, dataInicio, dataFim])

  const temFiltroData = dataInicio || dataFim

  return (
    <>
      {/* Linha 1: busca + risco */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou telefone..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
          />
        </div>
        <select
          value={filtroRisco}
          onChange={e => setFiltroRisco(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white"
        >
          <option value="todos">Todos os riscos</option>
          <option value="verde">🟢 Risco Baixo</option>
          <option value="amarelo">🟡 Risco Moderado</option>
          <option value="laranja">🟠 Risco Alto</option>
          <option value="vermelho">🔴 Urgência</option>
          <option value="sem_triagem">Sem triagem</option>
        </select>
      </div>

      {/* Linha 2: data + ordenação */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 shrink-0">Triagem de:</span>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
          />
          <span className="text-xs text-gray-400 shrink-0">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
          />
          {temFiltroData && (
            <button
              onClick={() => { setDataInicio(''); setDataFim('') }}
              className="text-xs text-red-400 hover:text-red-600 shrink-0"
            >
              limpar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={ordenacao}
            onChange={e => setOrdenacao(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white"
          >
            <option value="risco">Por prioridade (risco)</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="recentes">Triagem mais recente</option>
          </select>
        </div>
      </div>

      {/* Contagem */}
      <p className="text-xs text-gray-400 mb-3">
        {resultado.length} {resultado.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}
      </p>

      {/* Lista */}
      {resultado.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <User className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum paciente encontrado</p>
          <p className="text-sm text-gray-300 mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {resultado.map(p => {
              const idade = calcularIdade(p.data_nascimento)
              const risco = p.ultima_triagem?.classificacao_risco
              return (
                <Link
                  key={p.id}
                  href={`/medico/pacientes/${p.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-green-600" />
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1A3A2C] group-hover:text-[#5BBD9B] transition-colors truncate">
                        {p.nome}
                      </span>
                      {idade !== null && (
                        <span className="text-xs text-gray-400 shrink-0">{idade} anos</span>
                      )}
                      {risco && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${corRisco[risco] || 'bg-gray-100 text-gray-500'}`}>
                          {labelRisco[risco] || risco}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {p.cpf && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <FileText className="w-3 h-3" /> {p.cpf}
                        </span>
                      )}
                      {p.telefone && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone className="w-3 h-3" /> {p.telefone}
                        </span>
                      )}
                    </div>

                    {p.ultima_triagem?.resumo_ia && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">
                        {p.ultima_triagem.resumo_ia}
                      </p>
                    )}
                  </div>

                  {/* Stats + seta */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-[#1A3A2C]">{p.total_triagens}</p>
                      <p className="text-xs text-gray-400">triagens</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-[#1A3A2C]">{p.total_atendimentos}</p>
                      <p className="text-xs text-gray-400">consultas</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className={`text-sm font-bold ${p.total_atestados > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                        {p.total_atestados}
                      </p>
                      <p className="text-xs text-gray-400">atestados</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className={`text-sm font-bold ${p.total_exames > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                        {p.total_exames}
                      </p>
                      <p className="text-xs text-gray-400">exames</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className={`text-sm font-bold ${p.total_receitas > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                        {p.total_receitas}
                      </p>
                      <p className="text-xs text-gray-400">receitas</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#5BBD9B] transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
