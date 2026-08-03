'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, Loader2, RefreshCw, AlertCircle, Zap } from 'lucide-react'

type Lancamento = {
  id: string
  descricao: string
  valor: number
  data_vencimento: string | null
  data_competencia: string
  status: string
  empresas?: { nome: string } | null
  categorias_financeiras?: { nome: string } | null
  contas_bancarias?: { nome: string } | null
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const HOJE = new Date().toISOString().split('T')[0]

export default function ContasReceberTab() {
  const [pendentes,  setPendentes]  = useState<Lancamento[]>([])
  const [atrasados,  setAtrasados]  = useState<Lancamento[]>([])
  const [loading,    setLoading]    = useState(true)
  const [gerando,    setGerando]    = useState(false)
  const [mes,        setMes]        = useState(HOJE.slice(0, 7))

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [rPend, rAtr] = await Promise.all([
        fetch('/api/admin/financeiro/lancamentos?tipo=receita&status=pendente&limite=200'),
        fetch('/api/admin/financeiro/lancamentos?tipo=receita&status=atrasado&limite=200'),
      ])
      const [dPend, dAtr] = await Promise.all([rPend.json(), rAtr.json()])
      setPendentes(dPend.lancamentos ?? [])
      setAtrasados(dAtr.lancamentos ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const marcarRecebido = async (id: string) => {
    await fetch(`/api/admin/financeiro/lancamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_pagamento: HOJE, status: 'recebido' }),
    })
    await carregar()
  }

  const gerarMensalidades = async () => {
    if (!mes) return
    setGerando(true)
    try {
      const r = await fetch('/api/admin/financeiro/gerar-mensalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes }),
      })
      const d = await r.json()
      alert(d.mensagem ?? `${d.gerados} mensalidade(s) gerada(s) para ${mes}`)
      await carregar()
    } finally {
      setGerando(false)
    }
  }

  const totalPendente = pendentes.reduce((s, l) => s + l.valor, 0)
  const totalAtrasado = atrasados.reduce((s, l) => s + l.valor, 0)

  const Linha = ({ l, cor }: { l: Lancamento; cor: string }) => (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="px-4 py-3">
        <p className="font-medium text-sm" style={{ color: 'var(--txt)' }}>{l.descricao}</p>
        <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>{l.empresas?.nome ?? ''} · {l.categorias_financeiras?.nome ?? 'Sem cat.'}</p>
      </td>
      <td className={`px-4 py-3 font-semibold text-sm ${cor}`}>{fmt(l.valor)}</td>
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--txt-muted)' }}>{fmtData(l.data_vencimento)}</td>
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--txt-muted)' }}>{fmtData(l.data_competencia)}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => marcarRecebido(l.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Recebido
        </button>
      </td>
    </tr>
  )

  return (
    <div>
      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--txt-muted)' }}>Pendente a receber</p>
          <p className="text-2xl font-bold text-yellow-600">{fmt(totalPendente)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>{pendentes.length} fatura{pendentes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--txt-muted)' }}>
            <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Em atraso
          </p>
          <p className="text-2xl font-bold text-red-600">{fmt(totalAtrasado)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>{atrasados.length} fatura{atrasados.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Auto-geração de mensalidades */}
      <div className="rounded-2xl border p-4 mb-6 flex flex-wrap items-center gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <Zap className="w-4 h-4 text-[#5BBD9B]" />
        <span className="text-sm font-medium" style={{ color: 'var(--txt)' }}>Gerar mensalidades automáticas:</span>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          className="px-3 py-1.5 rounded-xl border text-sm"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--txt)' }} />
        <button onClick={gerarMensalidades} disabled={gerando}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          style={{ background: '#1A3A2C' }}>
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Gerar para {mes}
        </button>
        <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>
          Cria faturas para todas as empresas ativas com valor configurado (ignora duplicatas)
        </span>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--txt-muted)' }} /></div>
      ) : (
        <>
          {/* Atrasados */}
          {atrasados.length > 0 && (
            <div className="rounded-2xl border overflow-hidden mb-5" style={{ borderColor: '#fca5a5' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#fef2f2' }}>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Atrasados ({atrasados.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
                    {['Descrição', 'Valor', 'Vencimento', 'Competência', 'Ação'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--txt-muted)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{atrasados.map(l => <Linha key={l.id} l={l} cor="text-red-600" />)}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pendentes */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="px-4 py-3" style={{ background: 'var(--card)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>Pendentes ({pendentes.length})</span>
            </div>
            {pendentes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--txt-muted)' }}>Nenhuma conta pendente a receber</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
                    {['Descrição', 'Valor', 'Vencimento', 'Competência', 'Ação'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--txt-muted)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{pendentes.map(l => <Linha key={l.id} l={l} cor="text-yellow-600" />)}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
