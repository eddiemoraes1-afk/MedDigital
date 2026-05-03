'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

interface Funcionario {
  id: string
  nome_completo: string
  cpf: string | null
  email: string | null
  cargo: string | null
  departamento: string | null
  data_admissao: string | null
  ativo: boolean
  paciente_id: string | null
}

interface Props {
  vinculos: Funcionario[]
}

export default function BuscaFuncionarios({ vinculos }: Props) {
  const [busca, setBusca] = useState('')
  const [buscaCpf, setBuscaCpf] = useState('')
  const [filtroCadastro, setFiltroCadastro] = useState<'todos' | 'cadastrado' | 'nao_cadastrado'>('todos')

  const filtrados = vinculos.filter(v => {
    const nome = v.nome_completo?.toLowerCase() ?? ''
    const cpf = v.cpf ?? ''
    const termoBusca = busca.toLowerCase()
    const termoCpf = buscaCpf.replace(/\D/g, '')

    if (termoBusca && !nome.includes(termoBusca)) return false
    if (termoCpf && !cpf.replace(/\D/g, '').includes(termoCpf)) return false
    if (filtroCadastro === 'cadastrado' && !v.paciente_id) return false
    if (filtroCadastro === 'nao_cadastrado' && v.paciente_id) return false
    return true
  })

  return (
    <div>
      {/* Barra de busca */}
      <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
          />
        </div>
        <div className="relative w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={buscaCpf}
            onChange={e => setBuscaCpf(e.target.value)}
            placeholder="Buscar por CPF..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
          />
        </div>
        <select
          value={filtroCadastro}
          onChange={e => setFiltroCadastro(e.target.value as typeof filtroCadastro)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white text-gray-700"
        >
          <option value="todos">Todos</option>
          <option value="cadastrado">✓ Na plataforma</option>
          <option value="nao_cadastrado">✗ Sem cadastro</option>
        </select>

        {(busca || buscaCpf || filtroCadastro !== 'todos') && (
          <button
            onClick={() => { setBusca(''); setBuscaCpf(''); setFiltroCadastro('todos') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            Limpar
          </button>
        )}
        <span className="text-xs text-gray-400 self-center ml-auto">
          {filtrados.length} de {vinculos.length}
        </span>
      </div>

      {/* Tabela */}
      {filtrados.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          Nenhum funcionário encontrado para essa busca.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">CPF</th>
                <th className="px-4 py-3 text-left">Cargo</th>
                <th className="px-4 py-3 text-left">Admissão</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Plataforma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={v.paciente_id
                        ? `/admin/pacientes/${v.paciente_id}`
                        : `/admin/funcionarios/${v.id}`}
                      className="font-medium text-[#5BBD9B] hover:underline flex items-center gap-1 group"
                    >
                      {v.nome_completo}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    {v.email && <p className="text-xs text-gray-400">{v.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{v.cpf || '—'}</td>
                  <td className="px-4 py-3">
                    {v.cargo && <p className="text-gray-700">{v.cargo}</p>}
                    {v.departamento && <p className="text-xs text-gray-400">{v.departamento}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {v.data_admissao
                      ? new Date(v.data_admissao).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.paciente_id
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
