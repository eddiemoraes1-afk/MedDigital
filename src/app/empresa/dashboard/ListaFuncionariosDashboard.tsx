'use client'

import { useState, useEffect } from 'react'
import {
  Search, CheckCircle2, XCircle, Loader2,
  Download, Users, X, RefreshCw,
} from 'lucide-react'

interface Funcionario {
  id: string
  nome_completo: string
  cpf: string | null
  email: string | null
  cargo: string | null
  tipo_cargo: string | null
  departamento: string | null
  relacao: string | null
  nome_mae: string | null
  nome_social: string | null
  data_admissao: string | null
  ativo: boolean
  paciente_id: string | null
}

function formatCPF(cpf: string | null): string {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function formatData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export default function ListaFuncionariosDashboard() {
  const [vinculos, setVinculos] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  // Filtros
  const [busca, setBusca] = useState('')
  const [buscaCpf, setBuscaCpf] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [filtroCadastro, setFiltroCadastro] = useState<'todos' | 'cadastrado' | 'nao_cadastrado'>('todos')

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch('/api/empresa/funcionarios/lista')
      if (!res.ok) throw new Error('Erro ao carregar lista')
      const json = await res.json()
      setVinculos(json.vinculos ?? [])
    } catch (e: any) {
      setErro(e.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // ── Filtros aplicados ────────────────────────────────────────────────────────
  const filtrados = vinculos.filter(v => {
    const nome = v.nome_completo?.toLowerCase() ?? ''
    const cpf = v.cpf ?? ''
    if (busca && !nome.includes(busca.toLowerCase())) return false
    if (buscaCpf && !cpf.replace(/\D/g, '').includes(buscaCpf.replace(/\D/g, ''))) return false
    if (filtroAtivo === 'ativo' && !v.ativo) return false
    if (filtroAtivo === 'inativo' && v.ativo) return false
    if (filtroCadastro === 'cadastrado' && !v.paciente_id) return false
    if (filtroCadastro === 'nao_cadastrado' && v.paciente_id) return false
    return true
  })

  const temFiltro = busca || buscaCpf || filtroAtivo !== 'todos' || filtroCadastro !== 'todos'

  // ── Exportar Excel ───────────────────────────────────────────────────────────
  async function exportarExcel() {
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      const linhas = filtrados.map(v => ({
        'Nome': v.nome_completo,
        'Nome Social': v.nome_social ?? '',
        'CPF': v.cpf ?? '',
        'E-mail': v.email ?? '',
        'Cargo': v.cargo ?? '',
        'Tipo de Cargo': v.tipo_cargo ?? '',
        'Secretaria': v.departamento ?? '',
        'Relação': v.relacao ?? '',
        'Nome da Mãe': v.nome_mae ?? '',
        'Admissão': v.data_admissao ? formatData(v.data_admissao) : '',
        'Status': v.ativo ? 'Ativo' : 'Inativo',
        'Plataforma': v.paciente_id ? 'Cadastrado' : 'Não ativou',
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      ws['!cols'] = [
        { wch: 32 }, { wch: 20 }, { wch: 16 }, { wch: 30 }, { wch: 22 },
        { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 28 }, { wch: 12 },
        { wch: 10 }, { wch: 14 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Funcionários')
      XLSX.writeFile(wb, `funcionarios-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setExportando(false)
    }
  }

  // ── Loading / erro ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        <p className="text-gray-400 text-sm">Carregando lista de funcionários...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Users className="w-10 h-10 opacity-30" />
        <p className="text-sm">{erro}</p>
        <button onClick={carregar} className="text-[#5BBD9B] text-sm flex items-center gap-1.5 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* Cabeçalho */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#5BBD9B]" />
          Funcionários
          <span className="text-xs font-normal text-gray-400">({vinculos.length})</span>
        </h2>
        <button
          onClick={exportarExcel}
          disabled={exportando || filtrados.length === 0}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors"
        >
          {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Exportar Excel
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
          />
        </div>

        <div className="relative w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={buscaCpf}
            onChange={e => setBuscaCpf(e.target.value)}
            placeholder="Buscar por CPF..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
          />
        </div>

        <select
          value={filtroAtivo}
          onChange={e => setFiltroAtivo(e.target.value as typeof filtroAtivo)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white text-gray-700"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">✓ Ativos</option>
          <option value="inativo">✗ Inativos</option>
        </select>

        <select
          value={filtroCadastro}
          onChange={e => setFiltroCadastro(e.target.value as typeof filtroCadastro)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 bg-white text-gray-700"
        >
          <option value="todos">Plataforma: todos</option>
          <option value="cadastrado">✓ Na plataforma</option>
          <option value="nao_cadastrado">✗ Sem cadastro</option>
        </select>

        {temFiltro && (
          <button
            onClick={() => { setBusca(''); setBuscaCpf(''); setFiltroAtivo('todos'); setFiltroCadastro('todos') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {filtrados.length} de {vinculos.length}
        </span>
      </div>

      {/* Tabela */}
      {filtrados.length === 0 ? (
        <div className="py-14 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {temFiltro ? 'Nenhum funcionário encontrado para essa busca.' : 'Nenhum funcionário na lista.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">CPF</th>
                <th className="px-4 py-3 text-left">Cargo</th>
                <th className="px-4 py-3 text-left">Tipo de Cargo</th>
                <th className="px-4 py-3 text-left">Secretaria</th>
                <th className="px-4 py-3 text-left">Relação</th>
                <th className="px-4 py-3 text-left">Nome da Mãe</th>
                <th className="px-4 py-3 text-left">Admissão</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Plataforma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1A3A2C] text-sm">{v.nome_completo}</p>
                    {v.nome_social && (
                      <p className="text-xs text-indigo-400 italic">Social: {v.nome_social}</p>
                    )}
                    {v.email && <p className="text-xs text-gray-400">{v.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                    {formatCPF(v.cpf)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{v.cargo || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.tipo_cargo || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.departamento || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {v.relacao
                      ? <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{v.relacao}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.nome_mae || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatData(v.data_admissao)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      v.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {v.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.paciente_id
                      ? <span title="Cadastrado na plataforma"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></span>
                      : <span title="Não ativou"><XCircle className="w-4 h-4 text-gray-300 mx-auto" /></span>}
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
