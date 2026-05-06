'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Users, Search, FileText, Loader2, TrendingUp, Receipt } from 'lucide-react'

interface Consulta {
  id: string
  data: string
  tipo: 'virtual' | 'agendada'
  paciente_id: string
  paciente_nome: string
  medico_id: string
  medico_nome: string
  valor_cobrado: number
}

interface RelatorioData {
  empresa: {
    id: string
    nome: string
    preco_mensalidade: number
    preco_consulta: number
  }
  consultas: Consulta[]
  funcionariosAtivos: number
  pacientesAtivos: number
  medicos: Array<{ id: string; nome: string }>
}

interface Props {
  /** URL da API a ser chamada, ex: '/api/admin/empresas/abc/relatorio' ou '/api/empresa/relatorio' */
  apiUrl: string
  titulo?: string
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDataHora(iso: string) {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RelatorioEmpresa({ apiUrl, titulo = 'Relatório Financeiro' }: Props) {
  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [de, setDe] = useState(primeiroDiaMes.toISOString().split('T')[0])
  const [ate, setAte] = useState(hoje.toISOString().split('T')[0])
  const [buscaFuncionario, setBuscaFuncionario] = useState('')
  const [medicoFiltro, setMedicoFiltro] = useState('')
  const [dados, setDados] = useState<RelatorioData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch(`${apiUrl}?de=${de}&ate=${ate}`)
      if (!res.ok) throw new Error('Erro ao carregar dados do relatório')
      setDados(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [apiUrl, de, ate])

  useEffect(() => { carregar() }, [carregar])

  // Filtros client-side
  const consultasFiltradas = (dados?.consultas ?? []).filter(c => {
    if (buscaFuncionario && !c.paciente_nome.toLowerCase().includes(buscaFuncionario.toLowerCase())) return false
    if (medicoFiltro && c.medico_id !== medicoFiltro) return false
    return true
  })

  // Meses no período para mensalidade
  const diffDays = Math.ceil((new Date(ate).getTime() - new Date(de).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const meses = Math.max(1, Math.ceil(diffDays / 30))

  const totalConsultas = consultasFiltradas.reduce((s, c) => s + (c.valor_cobrado || 0), 0)
  const totalMensalidade = (dados?.empresa?.preco_mensalidade ?? 0) * (dados?.funcionariosAtivos ?? 0) * meses
  const totalGeral = totalConsultas + totalMensalidade

  // Agrupamento por paciente
  const porPaciente: Record<string, { nome: string; qtd: number; total: number }> = {}
  for (const c of consultasFiltradas) {
    if (!porPaciente[c.paciente_id]) porPaciente[c.paciente_id] = { nome: c.paciente_nome, qtd: 0, total: 0 }
    porPaciente[c.paciente_id].qtd++
    porPaciente[c.paciente_id].total += c.valor_cobrado || 0
  }
  const listaPacientes = Object.values(porPaciente).sort((a, b) => b.total - a.total)

  return (
    <div>
      <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2 mb-5">
        <Receipt className="w-5 h-5 text-[#5BBD9B]" />
        {titulo}
      </h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">De:</label>
          <input
            type="date" value={de} onChange={e => setDe(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Até:</label>
          <input
            type="date" value={ate} onChange={e => setAte(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          />
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar funcionário..."
            value={buscaFuncionario}
            onChange={e => setBuscaFuncionario(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-52 focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          />
        </div>
        {(dados?.medicos ?? []).length > 0 && (
          <select
            value={medicoFiltro}
            onChange={e => setMedicoFiltro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#5BBD9B] focus:outline-none"
          >
            <option value="">Todos os médicos</option>
            {dados!.medicos.map(m => (
              <option key={m.id} value={m.id}>Dr(a). {m.nome}</option>
            ))}
          </select>
        )}
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        </div>
      ) : erro ? (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{erro}</div>
      ) : (
        <div className="space-y-6">

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs text-blue-500 font-medium mb-1">Consultas</p>
              <p className="text-2xl font-bold text-blue-700">{consultasFiltradas.length}</p>
              <p className="text-xs text-blue-400 mt-1">
                {dados?.empresa?.preco_consulta ? formatBRL(dados.empresa.preco_consulta) : '—'}/consulta
              </p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4">
              <p className="text-xs text-green-500 font-medium mb-1">Total consultas</p>
              <p className="text-2xl font-bold text-green-700">{formatBRL(totalConsultas)}</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4">
              <p className="text-xs text-purple-500 font-medium mb-1">Total mensalidade</p>
              <p className="text-2xl font-bold text-purple-700">{formatBRL(totalMensalidade)}</p>
              <p className="text-xs text-purple-400 mt-1">
                {dados?.funcionariosAtivos ?? 0} func. × {meses} {meses === 1 ? 'mês' : 'meses'}
              </p>
            </div>
            <div className="bg-[#1A3A2C] rounded-2xl p-4">
              <p className="text-xs text-green-300 font-medium mb-1">Total a cobrar</p>
              <p className="text-xl font-bold text-white leading-tight">{formatBRL(totalGeral)}</p>
            </div>
          </div>

          {/* Tabela de consultas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5BBD9B]" />
                Consultas realizadas
              </p>
              <p className="text-xs text-gray-400">{consultasFiltradas.length} registro{consultasFiltradas.length !== 1 ? 's' : ''}</p>
            </div>

            {consultasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Nenhuma consulta no período selecionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Funcionário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Médico</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {consultasFiltradas.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{c.paciente_nome}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">Dr(a). {c.medico_nome}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDataHora(c.data)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.tipo === 'virtual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {c.tipo === 'virtual' ? '📹 Virtual' : '📅 Agendada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1A3A2C]">
                          {formatBRL(c.valor_cobrado || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-50 border-t border-green-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-bold text-[#1A3A2C]">
                        Total ({consultasFiltradas.length} consulta{consultasFiltradas.length !== 1 ? 's' : ''})
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1A3A2C] text-base">
                        {formatBRL(totalConsultas)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Gastos por funcionário */}
          {listaPacientes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#5BBD9B]" />
                  Gastos por funcionário
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Funcionário</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total gasto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {listaPacientes.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{p.qtd}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1A3A2C]">{formatBRL(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensalidade */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Mensalidade do sistema
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Funcionários ativos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor/mês/funcionário</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Meses no período</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total mensalidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-4 font-medium text-gray-800">{dados?.funcionariosAtivos ?? 0} funcionários</td>
                  <td className="px-4 py-4 text-center text-gray-600">{formatBRL(dados?.empresa?.preco_mensalidade ?? 0)}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{meses} {meses === 1 ? 'mês' : 'meses'}</td>
                  <td className="px-4 py-4 text-right font-semibold text-purple-700">{formatBRL(totalMensalidade)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-purple-50 border-t border-purple-100">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-bold text-[#1A3A2C]">Total mensalidade</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700 text-base">{formatBRL(totalMensalidade)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Total geral */}
          <div className="bg-[#1A3A2C] rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-semibold">Total a cobrar no período</p>
                <p className="text-xs text-green-400 mt-1">
                  {formatBRL(totalConsultas)} em consultas + {formatBRL(totalMensalidade)} em mensalidade
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{formatBRL(totalGeral)}</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
