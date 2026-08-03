'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Check, Loader2, Pencil, Trash2, RefreshCw, Building2, Tag } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────
type Categoria = {
  id: string; nome: string; tipo: string; grupo_dre: string; ordem: number; ativo: boolean
}
type ContaBancaria = {
  id: string; nome: string; banco: string | null; agencia: string | null
  conta: string | null; saldo_inicial: number; saldo_atual: number | null
  data_reconciliacao: string | null; observacao_reconciliacao: string | null; ativo: boolean
}

// ─── Constantes ────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : null

const GRUPOS_LABEL: Record<string, { label: string; cor: string }> = {
  receita_bruta:          { label: 'Receita Bruta',           cor: 'bg-green-100 text-green-700'  },
  deducao:                { label: 'Deduções',                cor: 'bg-red-100 text-red-600'      },
  custo_operacional:      { label: 'Custos Operacionais',     cor: 'bg-orange-100 text-orange-700'},
  despesa_administrativa: { label: 'Despesas Administrativas',cor: 'bg-blue-100 text-blue-700'   },
  despesa_financeira:     { label: 'Despesas Financeiras',    cor: 'bg-purple-100 text-purple-700'},
  investimentos:          { label: 'Investimentos',           cor: 'bg-teal-100 text-teal-700'   },
}

const HOJE = new Date().toISOString().split('T')[0]

// ─── Seção: Categorias ─────────────────────────────────────────────────────
function CategoriasSection() {
  const [cats,     setCats]     = useState<Categoria[]>([])
  const [loading,  setLoading]  = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', tipo: 'despesa', grupo_dre: 'custo_operacional', ordem: '' })

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/financeiro/categorias')
    const d = await r.json()
    setCats(d.categorias ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const abrirEdicao = (c: Categoria) => {
    setEditId(c.id)
    setForm({ nome: c.nome, tipo: c.tipo, grupo_dre: c.grupo_dre, ordem: String(c.ordem) })
    setShowForm(true)
  }

  const abrirNovo = () => {
    setEditId(null)
    setForm({ nome: '', tipo: 'despesa', grupo_dre: 'custo_operacional', ordem: '' })
    setShowForm(true)
  }

  const salvar = async () => {
    if (!form.nome || !form.tipo || !form.grupo_dre) return
    setSalvando(true)
    try {
      const body = { nome: form.nome, tipo: form.tipo, grupo_dre: form.grupo_dre, ordem: form.ordem ? Number(form.ordem) : undefined }
      const url    = editId ? `/api/admin/financeiro/categorias/${editId}` : '/api/admin/financeiro/categorias'
      const method = editId ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) { setShowForm(false); await carregar() }
    } finally { setSalvando(false) }
  }

  const excluir = async (id: string, nome: string) => {
    if (!confirm(`Desativar categoria "${nome}"?`)) return
    await fetch(`/api/admin/financeiro/categorias/${id}`, { method: 'DELETE' })
    await carregar()
  }

  const catsPorGrupo = Object.entries(GRUPOS_LABEL).map(([gKey, g]) => ({
    gKey, ...g, cats: cats.filter(c => c.grupo_dre === gKey),
  })).filter(g => g.cats.length > 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5" style={{ color: '#5BBD9B' }} />
          <h3 className="font-semibold text-lg" style={{ color: 'var(--txt)' }}>Categorias</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card)', color: 'var(--txt-muted)', border: '1px solid var(--border)' }}>
            {cats.length} ativas
          </span>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white"
          style={{ background: '#1A3A2C' }}>
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="rounded-2xl border p-4 mb-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-sm" style={{ color: 'var(--txt)' }}>
              {editId ? 'Editar categoria' : 'Nova categoria'}
            </h4>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--txt-muted)' }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Nome *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Licença de Software" className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Grupo DRE *</label>
              <select value={form.grupo_dre} onChange={e => setForm(f => ({ ...f, grupo_dre: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }}>
                {Object.entries(GRUPOS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Ordem</label>
              <input value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))}
                placeholder="Auto" type="number" className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-xl border text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-60"
              style={{ background: '#1A3A2C' }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada */}
      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
      ) : (
        <div className="space-y-3">
          {catsPorGrupo.map(g => (
            <div key={g.gKey} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--card)' }}>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.cor}`}>{g.label}</span>
                <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>{g.cats.length} categorias</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {g.cats.map(c => (
                  <div key={c.id} className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: 'var(--bg)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--txt)' }}>{c.nome}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${c.tipo === 'receita' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {c.tipo}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>ordem: {c.ordem}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEdicao(c)}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => excluir(c.id, c.nome)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Seção: Contas Bancárias ────────────────────────────────────────────────
function ContasBancariasSection() {
  const [contas,       setContas]       = useState<ContaBancaria[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [salvando,     setSalvando]     = useState(false)
  const [reconcilId,   setReconcilId]   = useState<string | null>(null)
  const [saldoInput,   setSaldoInput]   = useState('')
  const [obsInput,     setObsInput]     = useState('')
  const [salvRec,      setSalvRec]      = useState(false)

  const [form, setForm] = useState({ nome: '', banco: '', agencia: '', conta: '', saldo_inicial: '0' })

  const carregar = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/financeiro/contas-bancarias')
    const d = await r.json()
    setContas(d.contas ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async () => {
    if (!form.nome) return
    setSalvando(true)
    try {
      const r = await fetch('/api/admin/financeiro/contas-bancarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome, banco: form.banco || null, agencia: form.agencia || null,
          conta: form.conta || null, saldo_inicial: parseFloat(form.saldo_inicial.replace(',', '.')) || 0,
        }),
      })
      if (r.ok) { setShowForm(false); setForm({ nome: '', banco: '', agencia: '', conta: '', saldo_inicial: '0' }); await carregar() }
    } finally { setSalvando(false) }
  }

  const reconciliar = async (id: string) => {
    if (!saldoInput) return
    setSalvRec(true)
    try {
      const r = await fetch(`/api/admin/financeiro/contas-bancarias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saldo_atual: parseFloat(saldoInput.replace(',', '.')),
          data_reconciliacao: HOJE,
          observacao_reconciliacao: obsInput || null,
        }),
      })
      if (r.ok) { setReconcilId(null); setSaldoInput(''); setObsInput(''); await carregar() }
    } finally { setSalvRec(false) }
  }

  const inativar = async (id: string, nome: string) => {
    if (!confirm(`Inativar conta "${nome}"?`)) return
    await fetch(`/api/admin/financeiro/contas-bancarias/${id}`, { method: 'DELETE' })
    await carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5" style={{ color: '#5BBD9B' }} />
          <h3 className="font-semibold text-lg" style={{ color: 'var(--txt)' }}>Contas Bancárias</h3>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white"
          style={{ background: '#1A3A2C' }}>
          <Plus className="w-4 h-4" /> Nova Conta
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border p-4 mb-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-sm" style={{ color: 'var(--txt)' }}>Nova Conta Bancária</h4>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--txt-muted)' }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Nome *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Itaú PJ Principal" className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Banco</label>
              <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                placeholder="Ex: Itaú" className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Agência</label>
              <input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))}
                placeholder="0001" className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Conta</label>
              <input value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                placeholder="12345-6" className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--txt-muted)' }}>Saldo Inicial (R$)</label>
              <input value={form.saldo_inicial} onChange={e => setForm(f => ({ ...f, saldo_inicial: e.target.value }))}
                placeholder="0,00" className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-xl border text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-60"
              style={{ background: '#1A3A2C' }}>
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Cadastrar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
      ) : contas.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
          Nenhuma conta bancária cadastrada
        </div>
      ) : (
        <div className="space-y-3">
          {contas.map(c => (
            <div key={c.id} className="rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--txt)' }}>{c.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>
                      {[c.banco, c.agencia && `Ag: ${c.agencia}`, c.conta && `CC: ${c.conta}`].filter(Boolean).join(' · ') || 'Sem dados bancários'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--txt-muted)' }}>
                      {c.saldo_atual !== null ? 'Saldo conciliado' : 'Saldo inicial'}
                    </p>
                    <p className={`font-bold text-lg ${(c.saldo_atual ?? c.saldo_inicial) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(c.saldo_atual ?? c.saldo_inicial)}
                    </p>
                    {c.data_reconciliacao && (
                      <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>
                        Conciliado em {fmtData(c.data_reconciliacao)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Painel reconciliação */}
                {reconcilId === c.id ? (
                  <div className="mt-3 p-3 rounded-xl border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--txt)' }}>Conciliar saldo (extrato bancário)</p>
                    <div className="flex gap-2 flex-wrap">
                      <input value={saldoInput} onChange={e => setSaldoInput(e.target.value)}
                        placeholder="Saldo do extrato (R$)" type="text" className="px-3 py-1.5 rounded-xl border text-sm flex-1 min-w-32"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
                      <input value={obsInput} onChange={e => setObsInput(e.target.value)}
                        placeholder="Observação (opcional)" className="px-3 py-1.5 rounded-xl border text-sm flex-1 min-w-40"
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
                      <button onClick={() => reconciliar(c.id)} disabled={salvRec || !saldoInput}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-60"
                        style={{ background: '#1A3A2C' }}>
                        {salvRec ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Confirmar
                      </button>
                      <button onClick={() => { setReconcilId(null); setSaldoInput(''); setObsInput('') }}
                        className="px-3 py-1.5 rounded-xl border text-xs"
                        style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
                        Cancelar
                      </button>
                    </div>
                    {c.observacao_reconciliacao && (
                      <p className="text-xs mt-1.5 italic" style={{ color: 'var(--txt-muted)' }}>
                        Última obs.: {c.observacao_reconciliacao}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setReconcilId(c.id); setSaldoInput(String(c.saldo_atual ?? c.saldo_inicial)); setObsInput('') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors hover:bg-green-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
                      <RefreshCw className="w-3.5 h-3.5 text-green-600" /> Conciliar saldo
                    </button>
                    <button onClick={() => inativar(c.id, c.nome)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors hover:bg-red-50"
                      style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" /> Inativar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Export Principal ───────────────────────────────────────────────────────
export default function ConfigFinanceiroTab() {
  return (
    <div className="space-y-10">
      <CategoriasSection />
      <hr style={{ borderColor: 'var(--border)' }} />
      <ContasBancariasSection />
    </div>
  )
}
