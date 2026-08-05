'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, Loader2, AlertCircle, Zap, Search, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { exportarExcel, exportarPDF, fmtBRL, fmtDataBR, type LinhaPDF } from './exportUtils'

type Lancamento = {
  id: string; descricao: string; valor: number
  data_vencimento: string | null; data_competencia: string; status: string
  medicos?: { nome: string } | null
  categorias_financeiras?: { id: string; nome: string } | null
}
type Categoria = { id: string; nome: string }

const HOJE = new Date().toISOString().split('T')[0]

export default function ContasPagarTab() {
  const [pendentes,  setPendentes]  = useState<Lancamento[]>([])
  const [atrasados,  setAtrasados]  = useState<Lancamento[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading,    setLoading]    = useState(true)
  const [gerando,    setGerando]    = useState(false)
  const [mes,        setMes]        = useState(HOJE.slice(0, 7))

  // Filtros
  const [busca,          setBusca]          = useState('')
  const [filtroCateg,    setFiltroCateg]    = useState('')
  const [valorMin,       setValorMin]       = useState('')
  const [valorMax,       setValorMax]       = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [rP, rA] = await Promise.all([
        fetch('/api/admin/financeiro/lancamentos?tipo=despesa&status=pendente&limite=500'),
        fetch('/api/admin/financeiro/lancamentos?tipo=despesa&status=atrasado&limite=500'),
      ])
      const [dP, dA] = await Promise.all([rP.json(), rA.json()])
      setPendentes(dP.lancamentos ?? [])
      setAtrasados(dA.lancamentos ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    fetch('/api/admin/financeiro/categorias').then(r => r.json()).then(d => setCategorias(d.categorias ?? []))
  }, [])

  const aplicarFiltros = (lista: Lancamento[]) => lista.filter(l => {
    if (busca) {
      const q = busca.toLowerCase()
      const ok = l.descricao.toLowerCase().includes(q)
        || (l.medicos?.nome ?? '').toLowerCase().includes(q)
        || (l.categorias_financeiras?.nome ?? '').toLowerCase().includes(q)
      if (!ok) return false
    }
    if (filtroCateg && l.categorias_financeiras?.id !== filtroCateg) return false
    if (valorMin && l.valor < parseFloat(valorMin.replace(',', '.'))) return false
    if (valorMax && l.valor > parseFloat(valorMax.replace(',', '.'))) return false
    return true
  })

  const pendFiltrados = aplicarFiltros(pendentes)
  const atrFiltrados  = aplicarFiltros(atrasados)
  const todos = [...atrFiltrados, ...pendFiltrados]

  const totalPendente = pendFiltrados.reduce((s, l) => s + l.valor, 0)
  const totalAtrasado = atrFiltrados.reduce((s, l) => s + l.valor, 0)

  const marcarPago = async (id: string) => {
    await fetch(`/api/admin/financeiro/lancamentos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_pagamento: HOJE, status: 'pago' }),
    })
    await carregar()
  }

  const gerarFolha = async () => {
    setGerando(true)
    try {
      const r = await fetch('/api/admin/financeiro/gerar-folha-medicos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes }),
      })
      const d = await r.json()
      alert(d.mensagem ?? `${d.gerados} médico(s) — Total: ${d.total_honorarios ? fmtBRL(d.total_honorarios) : 'R$ 0,00'}`)
      await carregar()
    } finally { setGerando(false) }
  }

  // Exportação
  const linhasExcel = () => todos.map(l => ({
    'Status':      l.status === 'atrasado' ? 'ATRASADO' : 'Pendente',
    'Descrição':   l.descricao,
    'Médico':      l.medicos?.nome ?? '',
    'Categoria':   l.categorias_financeiras?.nome ?? '',
    'Valor (R$)':  l.valor,
    'Vencimento':  fmtDataBR(l.data_vencimento),
    'Competência': fmtDataBR(l.data_competencia),
  }))

  const exportExcel = () => exportarExcel(linhasExcel(), 'Contas_a_Pagar', 'Contas a Pagar')

  const exportPDF = () => {
    const colunas = ['Status', 'Descrição', 'Médico', 'Categoria', 'Valor', 'Vencimento']
    const linhas: LinhaPDF[] = todos.map(l => ({
      cells: [
        l.status === 'atrasado' ? 'ATRASADO' : 'Pendente',
        l.descricao,
        l.medicos?.nome ?? '—',
        l.categorias_financeiras?.nome ?? '—',
        fmtBRL(l.valor),
        fmtDataBR(l.data_vencimento),
      ],
      corFundo: l.status === 'atrasado' ? 'FEF2F2' : undefined,
    }))
    linhas.push({
      cells: ['', `Total: ${todos.length} contas`, '', '', `Atrasado: ${fmtBRL(totalAtrasado)} | Pendente: ${fmtBRL(totalPendente)} | TOTAL: ${fmtBRL(totalAtrasado + totalPendente)}`, ''],
      negrito: true, corFundo: '1A3A2C', corTexto: 'FFFFFF',
    })
    exportarPDF('Contas a Pagar', colunas, linhas)
  }

  const inputCls = 'px-3 py-1.5 rounded-xl border text-sm'
  const inputSt  = { background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--txt)' } as React.CSSProperties

  const Linha = ({ l, cor }: { l: Lancamento; cor: string }) => (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="px-4 py-3">
        <p className="font-medium text-sm" style={{ color: 'var(--txt)' }}>{l.descricao}</p>
        <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>{l.medicos?.nome ?? ''}{l.categorias_financeiras ? ` · ${l.categorias_financeiras.nome}` : ''}</p>
      </td>
      <td className={`px-4 py-3 font-semibold text-sm ${cor}`}>{fmtBRL(l.valor)}</td>
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--txt-muted)' }}>{fmtDataBR(l.data_vencimento)}</td>
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--txt-muted)' }}>{fmtDataBR(l.data_competencia)}</td>
      <td className="px-4 py-3">
        <button onClick={() => marcarPago(l.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border hover:bg-green-50 transition-colors"
          style={{ borderColor: '#16a34a', color: '#16a34a' }}>
          <Check className="w-3.5 h-3.5" /> Marcar pago
        </button>
      </td>
    </tr>
  )

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--txt-muted)' }}>Pendente a pagar</p>
          <p className="text-2xl font-bold text-orange-600">{fmtBRL(totalPendente)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>{pendFiltrados.length} conta{pendFiltrados.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--txt-muted)' }}>
            <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Em atraso
          </p>
          <p className="text-2xl font-bold text-red-600">{fmtBRL(totalAtrasado)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>{atrFiltrados.length} conta{atrFiltrados.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filtros + export */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--txt-muted)' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar descrição / médico..."
            className={`${inputCls} pl-9 w-56`} style={inputSt} />
        </div>
        <button onClick={() => setFiltrosAbertos(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border text-sm"
          style={{ background: filtrosAbertos ? '#1A3A2C' : 'var(--card)', color: filtrosAbertos ? 'white' : 'var(--txt-muted)', borderColor: 'var(--border)' }}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
          Mais filtros
        </button>
        <div className="flex gap-1.5 ml-auto">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-green-50"
            style={{ borderColor: '#16a34a', color: '#16a34a' }}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-red-50"
            style={{ borderColor: '#dc2626', color: '#dc2626' }}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

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
            <input value={valorMin} onChange={e => setValorMin(e.target.value)} placeholder="0,00" className={`${inputCls} w-24`} style={inputSt} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs shrink-0" style={{ color: 'var(--txt-muted)' }}>Valor máx:</label>
            <input value={valorMax} onChange={e => setValorMax(e.target.value)} placeholder="99999,00" className={`${inputCls} w-24`} style={inputSt} />
          </div>
          <button onClick={() => { setBusca(''); setFiltroCateg(''); setValorMin(''); setValorMax('') }}
            className="text-xs px-3 py-1.5 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--txt-muted)' }}>Limpar</button>
        </div>
      )}

      {/* Gerar folha médicos */}
      <div className="rounded-2xl border p-3 mb-5 flex flex-wrap items-center gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <Zap className="w-4 h-4 text-[#5BBD9B] shrink-0" />
        <span className="text-sm font-medium" style={{ color: 'var(--txt)' }}>Gerar folha de honorários:</span>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} className={inputCls} style={inputSt} />
        <button onClick={gerarFolha} disabled={gerando}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          style={{ background: '#1A3A2C' }}>
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Calcular {mes}
        </button>
        <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>Baseado nas consultas concluídas</span>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
      ) : (
        <>
          {atrFiltrados.length > 0 && (
            <div className="rounded-2xl border overflow-hidden mb-4" style={{ borderColor: '#fca5a5' }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#fef2f2' }}>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Atrasados ({atrFiltrados.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
                    {['Descrição', 'Valor', 'Vencimento', 'Competência', 'Ação'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--txt-muted)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{atrFiltrados.map(l => <Linha key={l.id} l={l} cor="text-red-600" />)}</tbody>
                </table>
              </div>
            </div>
          )}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="px-4 py-2.5" style={{ background: 'var(--card)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>Pendentes ({pendFiltrados.length})</span>
            </div>
            {pendFiltrados.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--txt-muted)' }}>Nenhuma conta pendente</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
                    {['Descrição', 'Valor', 'Vencimento', 'Competência', 'Ação'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--txt-muted)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{pendFiltrados.map(l => <Linha key={l.id} l={l} cor="text-orange-600" />)}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
