'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search, CheckCircle2, XCircle, ExternalLink,
  Trash2, UserX, UserCheck, AlertTriangle, X, Loader2,
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

interface Props {
  vinculos: Funcionario[]
  empresaNome?: string
}

type ConfirmAction =
  | { tipo: 'excluir'; ids: string[]; nomes: string[] }
  | { tipo: 'inativar'; ids: string[]; nomes: string[] }
  | { tipo: 'reativar'; ids: string[]; nomes: string[] }

// ─── mini modal de confirmação ───────────────────────────────────────────────
function ModalConfirm({
  action,
  onConfirm,
  onCancel,
  loading,
}: {
  action: ConfirmAction
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const isExcluir = action.tipo === 'excluir'
  const isInativar = action.tipo === 'inativar'
  const plural = action.ids.length > 1

  const titulo = isExcluir
    ? `Excluir ${plural ? `${action.ids.length} funcionários` : 'funcionário'}?`
    : isInativar
    ? `Inativar ${plural ? `${action.ids.length} funcionários` : 'funcionário'}?`
    : `Reativar ${plural ? `${action.ids.length} funcionários` : 'funcionário'}?`

  const descricao = isExcluir
    ? 'Esta ação é permanente e não pode ser desfeita. Os vínculos serão removidos do sistema.'
    : isInativar
    ? 'Os funcionários selecionados serão marcados como inativos e não aparecerão nas métricas de uso.'
    : 'Os funcionários selecionados serão reativados.'

  const btnCor = isExcluir
    ? 'bg-red-600 hover:bg-red-700'
    : isInativar
    ? 'bg-orange-500 hover:bg-orange-600'
    : 'bg-green-600 hover:bg-green-700'

  const btnLabel = isExcluir ? 'Sim, excluir' : isInativar ? 'Sim, inativar' : 'Sim, reativar'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExcluir ? 'bg-red-100' : isInativar ? 'bg-orange-100' : 'bg-green-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${isExcluir ? 'text-red-600' : isInativar ? 'text-orange-500' : 'text-green-600'}`} />
          </div>
          <div>
            <h3 className="font-bold text-[#1A3A2C] text-base">{titulo}</h3>
            <p className="text-sm text-gray-500 mt-1">{descricao}</p>
          </div>
        </div>

        {action.nomes.length <= 5 && (
          <ul className="mb-4 space-y-1 pl-2">
            {action.nomes.map((n, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                {n}
              </li>
            ))}
          </ul>
        )}
        {action.nomes.length > 5 && (
          <p className="mb-4 text-xs text-gray-500 pl-2">
            {action.nomes.slice(0, 3).join(', ')} e mais {action.nomes.length - 3} funcionários.
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-sm text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 ${btnCor}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── componente principal ────────────────────────────────────────────────────
export default function BuscaFuncionarios({ vinculos: vinculosIniciais, empresaNome = '' }: Props) {
  const [vinculos, setVinculos] = useState<Funcionario[]>(vinculosIniciais)
  const [busca, setBusca] = useState('')
  const [buscaCpf, setBuscaCpf] = useState('')
  const [filtroCadastro, setFiltroCadastro] = useState<'todos' | 'cadastrado' | 'nao_cadastrado'>('todos')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ msg: string; ok: boolean } | null>(null)

  const isFunservir = empresaNome.toLowerCase().includes('funservir')

  // ── filtros ──────────────────────────────────────────────────────────────
  const filtrados = vinculos.filter(v => {
    const nome = v.nome_completo?.toLowerCase() ?? ''
    const cpf = v.cpf ?? ''
    if (busca && !nome.includes(busca.toLowerCase())) return false
    if (buscaCpf && !cpf.replace(/\D/g, '').includes(buscaCpf.replace(/\D/g, ''))) return false
    if (filtroCadastro === 'cadastrado' && !v.paciente_id) return false
    if (filtroCadastro === 'nao_cadastrado' && v.paciente_id) return false
    if (filtroAtivo === 'ativo' && !v.ativo) return false
    if (filtroAtivo === 'inativo' && v.ativo) return false
    return true
  })

  // ── seleção ──────────────────────────────────────────────────────────────
  const todosVisivelsSelecionados =
    filtrados.length > 0 && filtrados.every(v => selecionados.has(v.id))

  function toggleTodos() {
    if (todosVisivelsSelecionados) {
      setSelecionados(prev => {
        const next = new Set(prev)
        filtrados.forEach(v => next.delete(v.id))
        return next
      })
    } else {
      setSelecionados(prev => {
        const next = new Set(prev)
        filtrados.forEach(v => next.add(v.id))
        return next
      })
    }
  }

  function toggleUm(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function nomesDosSelecionados(ids: string[]) {
    return vinculos.filter(v => ids.includes(v.id)).map(v => v.nome_completo)
  }

  // ── api calls ────────────────────────────────────────────────────────────
  function mostrarToast(msg: string, ok = true) {
    setToastMsg({ msg, ok })
    setTimeout(() => setToastMsg(null), 3500)
  }

  async function executarAcao() {
    if (!confirm) return
    setLoadingAction(true)
    try {
      if (confirm.tipo === 'excluir') {
        const res = await fetch('/api/admin/funcionarios', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: confirm.ids }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setVinculos(prev => prev.filter(v => !confirm.ids.includes(v.id)))
        setSelecionados(new Set())
        mostrarToast(`${data.excluidos} funcionário(s) excluído(s) com sucesso.`)
      } else {
        const ativo = confirm.tipo === 'reativar'
        const res = await fetch('/api/admin/funcionarios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: confirm.ids, ativo }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setVinculos(prev =>
          prev.map(v => confirm.ids.includes(v.id) ? { ...v, ativo } : v)
        )
        setSelecionados(new Set())
        mostrarToast(
          ativo
            ? `${data.atualizados} funcionário(s) reativado(s).`
            : `${data.atualizados} funcionário(s) inativado(s).`
        )
      }
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao executar ação.', false)
    } finally {
      setLoadingAction(false)
      setConfirm(null)
    }
  }

  // ── ações rápidas individuais ─────────────────────────────────────────────
  function pedirExcluir(v: Funcionario) {
    setConfirm({ tipo: 'excluir', ids: [v.id], nomes: [v.nome_completo] })
  }
  function pedirInativar(v: Funcionario) {
    setConfirm({ tipo: 'inativar', ids: [v.id], nomes: [v.nome_completo] })
  }
  function pedirReativar(v: Funcionario) {
    setConfirm({ tipo: 'reativar', ids: [v.id], nomes: [v.nome_completo] })
  }

  // ── ações em massa ────────────────────────────────────────────────────────
  const idsSelecionados = [...selecionados]
  function pedirExcluirEmMassa() {
    setConfirm({ tipo: 'excluir', ids: idsSelecionados, nomes: nomesDosSelecionados(idsSelecionados) })
  }
  function pedirInativarEmMassa() {
    setConfirm({ tipo: 'inativar', ids: idsSelecionados, nomes: nomesDosSelecionados(idsSelecionados) })
  }
  function pedirReativarEmMassa() {
    setConfirm({ tipo: 'reativar', ids: idsSelecionados, nomes: nomesDosSelecionados(idsSelecionados) })
  }

  const algumSelecionadoAtivo = idsSelecionados.some(id => vinculos.find(v => v.id === id)?.ativo)
  const algumSelecionadoInativo = idsSelecionados.some(id => !vinculos.find(v => v.id === id)?.ativo)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 transition-all
          ${toastMsg.ok ? 'bg-[#1A3A2C]' : 'bg-red-600'}`}>
          {toastMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toastMsg.msg}
        </div>
      )}

      {/* Modal de confirmação */}
      {confirm && (
        <ModalConfirm
          action={confirm}
          onConfirm={executarAcao}
          onCancel={() => setConfirm(null)}
          loading={loadingAction}
        />
      )}

      {/* ── Barra de filtros ── */}
      <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]"
          />
        </div>
        <div className="relative w-40">
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
          value={filtroAtivo}
          onChange={e => setFiltroAtivo(e.target.value as typeof filtroAtivo)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white text-gray-700"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">✓ Ativos</option>
          <option value="inativo">✗ Inativos</option>
        </select>
        <select
          value={filtroCadastro}
          onChange={e => setFiltroCadastro(e.target.value as typeof filtroCadastro)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white text-gray-700"
        >
          <option value="todos">Plataforma: todos</option>
          <option value="cadastrado">✓ Na plataforma</option>
          <option value="nao_cadastrado">✗ Sem cadastro</option>
        </select>
        {(busca || buscaCpf || filtroCadastro !== 'todos' || filtroAtivo !== 'todos') && (
          <button
            onClick={() => { setBusca(''); setBuscaCpf(''); setFiltroCadastro('todos'); setFiltroAtivo('todos') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {filtrados.length} de {vinculos.length}
        </span>
      </div>

      {/* ── Barra de ações em massa (aparece quando há seleção) ── */}
      {selecionados.size > 0 && (
        <div className="px-4 py-2.5 bg-[#1A3A2C] flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-white">
            {selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 ml-auto flex-wrap">
            {algumSelecionadoAtivo && (
              <button
                onClick={pedirInativarEmMassa}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <UserX className="w-3.5 h-3.5" /> Inativar selecionados
              </button>
            )}
            {algumSelecionadoInativo && (
              <button
                onClick={pedirReativarEmMassa}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" /> Reativar selecionados
              </button>
            )}
            <button
              onClick={pedirExcluirEmMassa}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir selecionados
            </button>
            <button
              onClick={() => setSelecionados(new Set())}
              className="flex items-center gap-1 px-2 py-1.5 text-green-300 hover:text-white text-xs transition-colors"
            >
              <X className="w-3 h-3" /> Limpar seleção
            </button>
          </div>
        </div>
      )}

      {/* ── Tabela ── */}
      {filtrados.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          Nenhum funcionário encontrado para essa busca.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {isFunservir ? (
              /* ── LAYOUT FUNSERVIR ── */
              <>
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-3 text-center w-8">
                      <input
                        type="checkbox"
                        checked={todosVisivelsSelecionados}
                        onChange={toggleTodos}
                        className="rounded accent-[#5BBD9B] cursor-pointer"
                        title="Selecionar todos visíveis"
                      />
                    </th>
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
                    <th className="px-3 py-3 text-center w-20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(v => (
                    <tr key={v.id} className={`transition-colors ${selecionados.has(v.id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selecionados.has(v.id)}
                          onChange={() => toggleUm(v.id)}
                          className="rounded accent-[#5BBD9B] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={v.paciente_id ? `/admin/pacientes/${v.paciente_id}` : `/admin/funcionarios/${v.id}`}
                          className="font-medium text-[#5BBD9B] hover:underline flex items-center gap-1 group"
                        >
                          {v.nome_completo}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        {v.nome_social && <p className="text-xs text-indigo-400 italic">Social: {v.nome_social}</p>}
                        {v.email && <p className="text-xs text-gray-400">{v.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{v.cpf || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{v.cargo || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{v.tipo_cargo || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{v.departamento || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {v.relacao
                          ? <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{v.relacao}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{v.nome_mae || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {v.data_admissao ? new Date(v.data_admissao).toLocaleDateString('pt-BR') : '—'}
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
                      <td className="px-3 py-3">
                        <AcoesIndividuais v={v} onInativar={pedirInativar} onReativar={pedirReativar} onExcluir={pedirExcluir} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              /* ── LAYOUT PADRÃO ── */
              <>
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-3 text-center w-8">
                      <input
                        type="checkbox"
                        checked={todosVisivelsSelecionados}
                        onChange={toggleTodos}
                        className="rounded accent-[#5BBD9B] cursor-pointer"
                        title="Selecionar todos visíveis"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">CPF</th>
                    <th className="px-4 py-3 text-left">Cargo</th>
                    <th className="px-4 py-3 text-left">Admissão</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Plataforma</th>
                    <th className="px-3 py-3 text-center w-20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(v => (
                    <tr key={v.id} className={`transition-colors ${selecionados.has(v.id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selecionados.has(v.id)}
                          onChange={() => toggleUm(v.id)}
                          className="rounded accent-[#5BBD9B] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={v.paciente_id ? `/admin/pacientes/${v.paciente_id}` : `/admin/funcionarios/${v.id}`}
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
                        {v.data_admissao ? new Date(v.data_admissao).toLocaleDateString('pt-BR') : '—'}
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
                      <td className="px-3 py-3">
                        <AcoesIndividuais v={v} onInativar={pedirInativar} onReativar={pedirReativar} onExcluir={pedirExcluir} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

// ─── botões de ação por linha ────────────────────────────────────────────────
function AcoesIndividuais({
  v,
  onInativar,
  onReativar,
  onExcluir,
}: {
  v: Funcionario
  onInativar: (v: Funcionario) => void
  onReativar: (v: Funcionario) => void
  onExcluir: (v: Funcionario) => void
}) {
  return (
    <div className="flex items-center gap-1 justify-center">
      {v.ativo ? (
        <button
          onClick={() => onInativar(v)}
          title="Inativar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
        >
          <UserX className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={() => onReativar(v)}
          title="Reativar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
        >
          <UserCheck className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={() => onExcluir(v)}
        title="Excluir"
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
