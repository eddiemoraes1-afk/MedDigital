'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, X, Check, Loader2, Search, Trash2, RefreshCw,
  FileSpreadsheet, FileText, ChevronDown,
} from 'lucide-react'
import { exportarExcel, exportarPDF, fmtBRL, fmtDataBR, type LinhaPDF } from './exportUtils'

type Lancamento = {
  id: string
  tipo: 'receita' | 'despesa'
  descricao: string
  valor: number
  data_competencia: string
  data_vencimento: string | null
  data_pagamento: string | null
  status: string
  categorias_financeiras?: { id: string; nome: string; grupo_dre: string } | null
  empresas?: { nome: string } | null
  medicos?: { nome: string } | null
  contas_bancarias?: { nome: string } | null
}
type Categoria = { id: string; nome: string; tipo: string }
type Conta     = { id: string; nome: string }

const STATUS_COR: Record<string, string> = {
  pendente:  'bg-yellow-100 text-yellow-700',
  pago:      'bg-green-100 text-green-700',
  recebido:  'bg-green-100 text-green-700',
  atrasado:  'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

const HOJE     = new Date().toISOString().split('T')[0]
const MES_ATUAL = HOJE.slice(0, 7)

export default function LancamentosTab() {
  const [lancamentos,  setLancamentos]  = useState<Lancamento[]>([])
  const [categorias,   setCategorias]   = useState<Categoria[]>([])
  const [contas,       setContas]       = useState<Conta[]>([])
  const [loading,      setLoading]      = useState(true)
  const [salvando,     setSalvando]     = useState(false)
  const [showForm,     setShowForm]     = useState(false)

  // Filtros
  const [busca,         setBusca]         = useState('')
  const [filtroTipo,    setFiltroTipo]    = useState('')
  const [filtroStatus,  setFiltroStatus]  = useState('')
  const [filtroMes,     setFiltroMes]     = useState(MES_ATUAL)
  const [filtroCateg,   setFiltroCateg]   = useState('')
  const [valorMin,      setValorMin]      = useState('')
  const [valorMax,      setValorMax]      = useState('')
  const [filtrosAbertos,setFiltrosAbertos] = useState(false)

  const [form, setForm] = useState({
    tipo: 'receita', categoria_id: '', descricao: '', valor: '',
    data_competencia: HOJE, data_vencimento: '', data_pagamento: '',
    conta_bancaria_id: '', observacoes: '',
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limite: '500' })
      if (filtroTipo)   params.set('tipo', filtroTipo)
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroMes) { params.set('de', filtroMes + '-01'); params.set('ate', filtroMes + '-31') }
      const r = await fetch(`/api/admin/financeiro/lancamentos?${params}`)
      const d = await r.json()
      setLancamentos(d.lancamentos ?? [])
    } finally { setLoading(false) }
  }, [filtroTipo, filtroStatus, filtroMes])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    fetch('/api/admin/financeiro/categorias').then(r => r.json()).then(d => setCategorias(d.categorias ?? []))
    fetch('/api/admin/financeiro/contas-bancarias').then(r => r.json()).then(d => setContas(d.contas ?? []))
  }, [])

  const catFiltradas = categorias.filter(c => !form.tipo || c.tipo === form.tipo)

  // ── Filtragem cliente ──────────────────────────────────────────────────
  const filtrados = lancamentos.filter(l => {
    if (busca) {
      const q = busca.toLowerCase()
      const match = l.descricao.toLowerCase().includes(q)
        || (l.empresas?.nome ?? '').toLowerCase().includes(q)
        || (l.medicos?.nome ?? '').toLowerCase().includes(q)
        || (l.categorias_financeiras?.nome ?? '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (filtroCateg && l.categorias_financeiras?.id !== filtroCateg) return false
    if (valorMin && l.valor < parseFloat(valorMin.replace(',', '.'))) return false
    if (valorMax && l.valor > parseFloat(valorMax.replace(',', '.'))) return false
    return true
  })

  const totalReceitas = filtrados.filter(l => l.tipo === 'receita' && l.status !== 'cancelado').reduce((s, l) => s + l.valor, 0)
  const totalDespesas = filtrados.filter(l => l.tipo === 'despesa' && l.status !== 'cancelado').reduce((s, l) => s + l.valor, 0)

  // ── Salvar lançamento ──────────────────────────────────────────────────
  const salvar = async () => {
    if (!form.descricao || !form.valor || !form.data_competencia) return
    setSalvando(true)
    try {
      const r = await fetch('/api/admin/financeiro/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: form.tipo, descricao: form.descricao,
          valor: parseFloat(form.valor.replace(',', '.')),
          data_competencia: form.data_competencia,
          data_vencimento:   form.data_vencimento   || null,
          data_pagamento:    form.data_pagamento     || null,
          categoria_id:      form.categoria_id       || null,
          conta_bancaria_id: form.conta_bancaria_id  || null,
          observacoes:       form.observacoes        || null,
        }),
      })
      if (r.ok) {
        setShowForm(false)
        setForm({ tipo: 'receita', categoria_id: '', descricao: '', valor: '',
          data_competencia: HOJE, data_vencimento: '', data_pagamento: '',
          conta_bancaria_id: '', observacoes: '' })
        await carregar()
      }
    } finally { setSalvando(false) }
  }

  const marcarPago = async (id: string, tipo: string) => {
    await fetch(`/api/admin/financeiro/lancamentos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_pagamento: HOJE, status: tipo === 'receita' ? 'recebido' : 'pago' }),
    })
    await carregar()
  }

  const cancelar = async (id: string) => {
    if (!confirm('Cancelar este lançamento?')) return
    await fetch(`/api/admin/financeiro/lancamentos/${id}`, { method: 'DELETE' })
    await carregar()
  }

  // ── Exportação ─────────────────────────────────────────────────────────
  const dadosExcel = () => filtrados.map(l => ({
    'Tipo':        l.tipo === 'receita' ? 'Receita' : 'Despesa',
    'Descrição':   l.descricao,
    'Categoria':   l.categorias_financeiras?.nome ?? '',
    'Empresa/Médico': l.empresas?.nome ?? l.medicos?.nome ?? '',
    'Valor (R$)':  l.valor,
    'Competência': fmtDataBR(l.data_competencia),
    'Vencimento':  fmtDataBR(l.data_vencimento),
    'Pagamento':   fmtDataBR(l.data_pagamento),
    'Status':      l.status,
    'Conta':       l.contas_bancarias?.nome ?? '',
  }))

  const nomePeriodo = filtroMes ? filtroMes.replace('-', '/') : 'Todos'
  const nomeArq = `Lancamentos_${nomePeriodo}`

  const exportExcel = () => exportarExcel(dadosExcel(), nomeArq, 'Lançamentos')

  const exportPDF = () => {
    const colunas = ['Tipo', 'Descrição', 'Categoria', 'Valor', 'Competência', 'Vencimento', 'Status']
    const linhas: LinhaPDF[] = filtrados.map(l => ({
      cells: [
        l.tipo === 'receita' ? '↑ Receita' : '↓ Despesa',
        l.descricao,
        l.categorias_financeiras?.nome ?? '—',
        fmtBRL(l.valor),
        fmtDataBR(l.data_competencia),
        fmtDataBR(l.data_vencimento),
        l.status,
      ],
    }))
    linhas.push({
      cells: ['', `Total: ${filtrados.length} lançamentos`, '', `Receitas: ${fmtBRL(totalReceitas)} | Despesas: ${fmtBRL(totalDespesas)} | Resultado: ${fmtBRL(totalReceitas - totalDespesas)}`, '', '', ''],
      negrito: true, corFundo: '1A3A2C', corTexto: 'FFFFFF',
    })
    exportarPDF(`Lançamentos Financeiros — ${nomePeriodo}`, colunas, linhas,
      `Filtros: período ${nomePeriodo} · tipo: ${filtroTipo || 'todos'} · status: ${filtroStatus || 'todos'}`)
  }

  // Sel helper
  const inputCls = 'px-3 py-2 rounded-xl border text-sm'
  const inputSt  = { background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt)' } as React.CSSProperties

  return (
    <div>
      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Receitas',  val: totalReceitas, cor: 'text-green-600' },
          { label: 'Despesas',  val: totalDespesas, cor: 'text-red-600' },
          { label: 'Resultado', val: totalReceitas - totalDespesas, cor: totalReceitas - totalDespesas >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--txt-muted)' }}>{c.label}</p>
            <p className={`text-xl font-bold ${c.cor}`}>{fmtBRL(c.val)}</p>
          </div>
        ))}
      </div>

      {/* Filtros linha 1 */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--txt-muted)' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
            className={`${inputCls} pl-9 w-48`} style={inputSt} />
        </div>
        <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          className={inputCls} style={inputSt} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={inputCls} style={inputSt}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={inputCls} style={inputSt}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="recebido">Recebido</option>
          <option value="atrasado">Atrasado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button onClick={() => setFiltrosAbertos(v => !v)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl border text-sm"
          style={{ background: filtrosAbertos ? '#1A3A2C' : 'var(--card)', color: filtrosAbertos ? 'white' : 'var(--txt-muted)', borderColor: 'var(--border)' }}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
          Mais filtros
        </button>
        <button onClick={carregar} className="p-2 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Export */}
        <div className="flex gap-1.5 ml-auto">
          <button onClick={exportExcel} title="Exportar Excel"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-green-50 transition-colors"
            style={{ borderColor: '#16a34a', color: '#16a34a' }}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} title="Exportar PDF"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-red-50 transition-colors"
            style={{ borderColor: '#dc2626', color: '#dc2626' }}>
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: '#1A3A2C' }}>
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* Filtros linha 2 — expansível */}
      {filtrosAbertos && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <label className="text-xs shrink-0" style={{ color: 'var(--txt-muted)' }}>Categoria:</label>
            <select value={filtroCateg} onChange={e => setFiltroCateg(e.target.value)} className={inputCls} style={inputSt}>
              <option value="">Todas</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs shrink-0" style={{ color: 'var(--txt-muted)' }}>Valor mín:</label>
            <input value={valorMin} onChange={e => setValorMin(e.target.value)} placeholder="0,00"
              className={`${inputCls} w-28`} style={inputSt} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs shrink-0" style={{ color: 'var(--txt-muted)' }}>Valor máx:</label>
            <input value={valorMax} onChange={e => setValorMax(e.target.value)} placeholder="99999,00"
              className={`${inputCls} w-28`} style={inputSt} />
          </div>
          <button onClick={() => { setBusca(''); setFiltroCateg(''); setValorMin(''); setValorMax('') }}
            className="text-xs px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
            Limpar
          </button>
        </div>
      )}

      {/* Formulário novo lançamento */}
      {showForm && (
        <div className="rounded-2xl border p-5 mb-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--txt)' }}>Novo Lançamento</h3>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--txt-muted)' }}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Tipo *', node: (
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, categoria_id: '' }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }}>
                  <option value="receita">Receita</option><option value="despesa">Despesa</option>
                </select>
              )},
              { label: 'Categoria', node: (
                <select value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }}>
                  <option value="">Sem categoria</option>
                  {catFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )},
              { label: 'Descrição *', col: 'col-span-2 md:col-span-1', node: (
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Mensalidade Empresa ABC" className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
              )},
              { label: 'Valor (R$) *', node: (
                <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="1500,00" className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
              )},
              { label: 'Competência *', node: (
                <input type="date" value={form.data_competencia} onChange={e => setForm(f => ({ ...f, data_competencia: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
              )},
              { label: 'Vencimento', node: (
                <input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
              )},
              { label: 'Data de Pagamento', node: (
                <input type="date" value={form.data_pagamento} onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
              )},
              { label: 'Conta Bancária', node: (
                <select value={form.conta_bancaria_id} onChange={e => setForm(f => ({ ...f, conta_bancaria_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }}>
                  <option value="">Sem conta</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )},
              { label: 'Observações', col: 'col-span-2 md:col-span-1', node: (
                <input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Opcional" className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
              )},
            ].map(({ label, node, col }) => (
              <div key={label} className={col ?? ''}>
                <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>{label}</label>
                {node}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ background: '#1A3A2C' }}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--txt-muted)' }}>Nenhum lançamento encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                  {['Tipo', 'Descrição', 'Categoria', 'Valor', 'Competência', 'Vencimento', 'Pagamento', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--txt-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l, i) => (
                  <tr key={l.id} style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {l.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium truncate" style={{ color: 'var(--txt)' }}>{l.descricao}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--txt-muted)' }}>{l.empresas?.nome ?? l.medicos?.nome ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--txt-muted)' }}>{l.categorias_financeiras?.nome ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold">
                      <span className={l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}>{fmtBRL(l.valor)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--txt-muted)' }}>{fmtDataBR(l.data_competencia)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: l.status === 'atrasado' ? '#dc2626' : 'var(--txt-muted)' }}>{fmtDataBR(l.data_vencimento)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--txt-muted)' }}>{fmtDataBR(l.data_pagamento)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COR[l.status] ?? 'bg-gray-100 text-gray-500'}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {['pendente', 'atrasado'].includes(l.status) && (
                          <button onClick={() => marcarPago(l.id, l.tipo)} title="Marcar pago/recebido"
                            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {l.status !== 'cancelado' && (
                          <button onClick={() => cancelar(l.id)} title="Cancelar"
                            className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs mt-2 text-right" style={{ color: 'var(--txt-muted)' }}>
        {filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''} exibidos
      </p>
    </div>
  )
}
