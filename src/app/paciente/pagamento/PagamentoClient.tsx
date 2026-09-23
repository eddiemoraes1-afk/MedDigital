'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  QrCode, CreditCard, Loader2, Check, Copy, AlertCircle,
  ExternalLink, ShieldCheck, RefreshCw,
} from 'lucide-react'

interface Pagamento {
  id: string
  descricao: string
  valor: number
  metodo: 'pix' | 'cartao'
  status: 'pendente' | 'pago' | 'expirado' | 'cancelado' | 'estornado' | 'falhou'
  pix_copia_cola: string | null
  pix_qrcode_base64: string | null
  link_pagamento: string | null
}

interface Props {
  valor: number
  descricao: string
  referencia: string
  /** Para onde levar o paciente depois que o pagamento for confirmado. */
  destino?: string
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PagamentoClient({ valor, descricao, referencia, destino = '/paciente/triagem' }: Props) {
  const router = useRouter()

  const [metodo, setMetodo]       = useState<'pix' | 'cartao' | null>(null)
  const [pagamento, setPagamento] = useState<Pagamento | null>(null)
  const [gerando, setGerando]     = useState(false)
  const [erro, setErro]           = useState<string | null>(null)
  const [copiado, setCopiado]     = useState(false)

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Gera a cobrança ────────────────────────────────────────────────────────
  async function gerar(m: 'pix' | 'cartao') {
    setGerando(true); setErro(null); setMetodo(m)
    try {
      const res = await fetch('/api/pagamento/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodo: m, valor, descricao, referencia }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Não foi possível gerar a cobrança')

      setPagamento(json.pagamento)

      // Cartão: o paciente digita os dados na página segura do Asaas.
      if (m === 'cartao' && json.pagamento.link_pagamento) {
        window.open(json.pagamento.link_pagamento, '_blank', 'noopener')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado')
      setMetodo(null)
    } finally {
      setGerando(false)
    }
  }

  // ── Acompanha a confirmação ────────────────────────────────────────────────
  const verificar = useCallback(async () => {
    if (!pagamento) return
    try {
      const res = await fetch(`/api/pagamento/${pagamento.id}`)
      if (!res.ok) return
      const json = await res.json()
      setPagamento(p => (p ? { ...p, status: json.pagamento.status } : p))
    } catch {
      // rede instável: tenta de novo no próximo ciclo
    }
  }, [pagamento])

  useEffect(() => {
    if (!pagamento || pagamento.status !== 'pendente') return
    timer.current = setInterval(verificar, 4000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [pagamento, verificar])

  // ── Redireciona ao confirmar ───────────────────────────────────────────────
  useEffect(() => {
    if (pagamento?.status === 'pago') {
      if (timer.current) clearInterval(timer.current)
      const t = setTimeout(() => router.push(destino), 2200)
      return () => clearTimeout(t)
    }
  }, [pagamento?.status, router, destino])

  async function copiar() {
    if (!pagamento?.pix_copia_cola) return
    try {
      await navigator.clipboard.writeText(pagamento.pix_copia_cola)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setErro('Não consegui copiar. Selecione o código e copie manualmente.')
    }
  }

  // ══ PAGO ══════════════════════════════════════════════════════════════════
  if (pagamento?.status === 'pago') {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'var(--success-bg)' }}>
          <Check className="w-8 h-8" style={{ color: 'var(--success)' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--txt-1)' }}>Pagamento confirmado</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--txt-2)' }}>{brl(pagamento.valor)} · {pagamento.descricao}</p>
        <p className="text-sm flex items-center justify-center gap-2 mt-4" style={{ color: 'var(--txt-3)' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Levando você para o atendimento...
        </p>
      </div>
    )
  }

  // ══ ESCOLHA DO MÉTODO ═════════════════════════════════════════════════════
  if (!pagamento) {
    return (
      <div className="rounded-2xl p-7 md:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="pb-6 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--txt-3)' }}>Você vai pagar</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--txt-1)' }}>{brl(valor)}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--txt-2)' }}>{descricao}</p>
        </div>

        {erro && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl mb-5"
            style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{erro}</p>
          </div>
        )}

        <p className="text-sm font-medium mb-4" style={{ color: 'var(--txt-1)' }}>Como você prefere pagar?</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => gerar('pix')} disabled={gerando}
            className="flex flex-col items-start gap-3 p-5 rounded-2xl text-left transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-light)' }}>
              {gerando && metodo === 'pix'
                ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--brand-2)' }} />
                : <QrCode className="w-5 h-5" style={{ color: 'var(--brand-2)' }} />}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--txt-1)' }}>PIX</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--txt-2)' }}>
                Confirmação em segundos. Você paga pelo app do seu banco.
              </p>
            </div>
          </button>

          <button onClick={() => gerar('cartao')} disabled={gerando}
            className="flex flex-col items-start gap-3 p-5 rounded-2xl text-left transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-light)' }}>
              {gerando && metodo === 'cartao'
                ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--brand-2)' }} />
                : <CreditCard className="w-5 h-5" style={{ color: 'var(--brand-2)' }} />}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--txt-1)' }}>Cartão de crédito</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--txt-2)' }}>
                Abre uma página segura para você digitar os dados do cartão.
              </p>
            </div>
          </button>
        </div>

        <p className="flex items-center gap-2 text-xs mt-6" style={{ color: 'var(--txt-3)' }}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Seus dados de pagamento não passam nem ficam guardados na Aduno.
        </p>
      </div>
    )
  }

  // ══ PIX GERADO ════════════════════════════════════════════════════════════
  if (pagamento.metodo === 'pix') {
    return (
      <div className="rounded-2xl p-7 md:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-center pb-6 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--txt-1)' }}>{brl(pagamento.valor)}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--txt-2)' }}>{pagamento.descricao}</p>
        </div>

        {pagamento.pix_qrcode_base64 ? (
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-white" style={{ border: '1px solid var(--border)' }}>
              <img src={`data:image/png;base64,${pagamento.pix_qrcode_base64}`}
                alt="QR Code para pagamento por PIX" className="w-52 h-52" />
            </div>
          </div>
        ) : (
          <p className="text-center text-sm mb-6" style={{ color: 'var(--txt-2)' }}>
            Use o código abaixo no app do seu banco.
          </p>
        )}

        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--txt-2)' }}>
          Ou copie o código e cole no app do banco
        </p>
        <div className="flex gap-2 mb-6">
          <input readOnly value={pagamento.pix_copia_cola ?? ''}
            className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--txt-2)' }} />
          <button onClick={copiar}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 transition-opacity hover:opacity-90"
            style={{ background: copiado ? 'var(--success)' : 'var(--brand)' }}>
            {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: 'var(--info-bg)' }}>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--info)' }} />
          <p className="text-sm" style={{ color: 'var(--info)' }}>
            Aguardando o pagamento. Assim que cair, seguimos automaticamente.
          </p>
        </div>

        {erro && <p className="text-xs text-center mt-4" style={{ color: 'var(--danger)' }}>{erro}</p>}

        <button onClick={verificar}
          className="w-full mt-5 text-xs flex items-center justify-center gap-1.5 hover:underline"
          style={{ color: 'var(--txt-3)' }}>
          <RefreshCw className="w-3 h-3" /> Já paguei e a tela não mudou
        </button>
      </div>
    )
  }

  // ══ CARTÃO ════════════════════════════════════════════════════════════════
  return (
    <div className="rounded-2xl p-7 md:p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'var(--brand-light)' }}>
        <CreditCard className="w-6 h-6" style={{ color: 'var(--brand-2)' }} />
      </div>
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--txt-1)' }}>Finalize o pagamento</h2>
      <p className="text-sm mb-1" style={{ color: 'var(--txt-2)' }}>
        Abrimos uma aba com a página segura de pagamento.
      </p>
      <p className="text-xs mb-6" style={{ color: 'var(--txt-3)' }}>
        Se a aba não abriu, use o botão abaixo.
      </p>

      {pagamento.link_pagamento && (
        <a href={pagamento.link_pagamento} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand)' }}>
          Abrir página de pagamento <ExternalLink className="w-4 h-4" />
        </a>
      )}

      <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl mt-6" style={{ background: 'var(--info-bg)' }}>
        <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--info)' }} />
        <p className="text-sm" style={{ color: 'var(--info)' }}>
          Aguardando a confirmação do cartão.
        </p>
      </div>

      <button onClick={verificar}
        className="w-full mt-5 text-xs flex items-center justify-center gap-1.5 hover:underline"
        style={{ color: 'var(--txt-3)' }}>
        <RefreshCw className="w-3 h-3" /> Já paguei e a tela não mudou
      </button>
    </div>
  )
}
