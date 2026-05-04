'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Brain, ChevronRight, User, FileText, Phone } from 'lucide-react'

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

  const resultado = useMemo(() => {
    return pacientes.filter(p => {
      const textoOk =
        !busca ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.cpf && p.cpf.includes(busca.replace(/\D/g, ''))) ||
        (p.telefone && p.telefone.includes(busca))

      const riscoOk =
        filtroRisco === 'todos' ||
        p.ultima_triagem?.classificacao_risco === filtroRisco ||
        (filtroRisco === 'sem_triagem' && !p.ultima_triagem)

      return textoOk && riscoOk
    })
  }, [pacientes, busca, filtroRisco])

  return (
    <>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-[#1A3A2C]">{p.total_triagens}</p>
                      <p className="text-xs text-gray-400">triagens</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-[#1A3A2C]">{p.total_atendimentos}</p>
                      <p className="text-xs text-gray-400">consultas</p>
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
