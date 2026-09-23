'use client'

import { useState } from 'react'
import { Settings, Save, CheckCircle2, Loader2, CreditCard, ShieldAlert } from 'lucide-react'

interface Props {
  precoReceitaParticularAtual: number
  valorConsultaAvulsaAtual?: number
  pagamentoValorMaximoAtual?: number
  pagamentosAtivoAtual?: boolean
}

export default function ConfiguracoesSistema({
  precoReceitaParticularAtual,
  valorConsultaAvulsaAtual = 89.9,
  pagamentoValorMaximoAtual = 500,
  pagamentosAtivoAtual = true,
}: Props) {
  const [precoReceita, setPrecoReceita]   = useState(precoReceitaParticularAtual.toFixed(2))
  const [consulta, setConsulta]           = useState(valorConsultaAvulsaAtual.toFixed(2))
  const [valorMaximo, setValorMaximo]     = useState(pagamentoValorMaximoAtual.toFixed(2))
  const [ativo, setAtivo]                 = useState(pagamentosAtivoAtual)

  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo]       = useState(false)
  const [erro, setErro]         = useState<string | null>(null)

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      const consultaNum = parseFloat(consulta) || 0
      const maximoNum   = parseFloat(valorMaximo) || 0

      if (consultaNum <= 0) throw new Error('O valor da consulta precisa ser maior que zero.')
      if (maximoNum <= 0)   throw new Error('O teto de segurança precisa ser maior que zero.')
      if (consultaNum > maximoNum) {
        throw new Error('O valor da consulta não pode ser maior que o teto de segurança.')
      }

      const res = await fetch('/api/admin/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preco_receita_particular: String(parseFloat(precoReceita) || 0),
          valor_consulta_avulsa:    String(consultaNum),
          pagamento_valor_maximo:   String(maximoNum),
          pagamentos_ativo:         ativo ? 'true' : 'false',
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao salvar')
      }
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const campo = 'w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#6E8570] focus:outline-none'

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-[#19382E] flex items-center gap-2 mb-1">
        <Settings className="w-4 h-4 text-[#6E8570]" /> Configurações Globais
      </h2>
      <p className="text-xs text-gray-400 mb-5">
        Valores aplicados a pacientes particulares, sem empresa vinculada
      </p>

      <div className="space-y-5">

        {/* ── Preços ── */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">
              Consulta avulsa (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input type="number" min="0" step="0.01" value={consulta}
                onChange={e => setConsulta(e.target.value)} className={campo} placeholder="0,00" />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Cobrado do paciente particular antes de entrar na fila de atendimento
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">
              Renovação de receita (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input type="number" min="0" step="0.01" value={precoReceita}
                onChange={e => setPrecoReceita(e.target.value)} className={campo} placeholder="0,00" />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Cobrado por cada receita emitida a pacientes sem empresa
            </p>
          </div>
        </div>

        {/* ── Segurança ── */}
        <div className="pt-5 border-t border-gray-100">
          <p className="text-xs font-semibold text-[#6E8570] flex items-center gap-1.5 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" /> PROTEÇÕES
          </p>

          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1">
              Teto de segurança por cobrança (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input type="number" min="0" step="0.01" value={valorMaximo}
                onChange={e => setValorMaximo(e.target.value)} className={campo} placeholder="0,00" />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Nenhuma cobrança acima deste valor é criada, mesmo que algo no sistema peça
            </p>
          </div>

          <label className="flex items-start gap-3 mt-4 p-3 rounded-xl bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#19382E]" />
            <span>
              <span className="block text-sm font-medium text-[#19382E] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Cobranças ativas
              </span>
              <span className="block text-xs text-gray-400 mt-0.5">
                Desmarque para bloquear imediatamente toda cobrança nova. Use se algo der errado.
              </span>
            </span>
          </label>
        </div>

        {erro && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

        <button onClick={salvar} disabled={salvando}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            salvo ? 'bg-green-100 text-green-700'
                  : 'bg-[#19382E] hover:bg-[#6E8570] text-white disabled:opacity-50'
          }`}>
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" />
                    : salvo ? <CheckCircle2 className="w-4 h-4" />
                            : <Save className="w-4 h-4" />}
          {salvo ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}
