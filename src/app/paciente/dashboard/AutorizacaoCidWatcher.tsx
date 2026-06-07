'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, Check, CheckCircle2, X } from 'lucide-react'

interface AutorizacaoPendente {
  id: string
  cid: string
}

/**
 * Vigia de autorização LGPD do CID.
 * Faz polling a cada 3s e, quando o médico solicita autorização durante a
 * consulta, mostra um overlay de tela cheia para o paciente responder.
 */
export default function AutorizacaoCidWatcher() {
  const [autorizacaoPendente, setAutorizacaoPendente] = useState<AutorizacaoPendente | null>(null)
  const [respondendo, setRespondendo] = useState(false)
  const [confirmacao, setConfirmacao] = useState(false)
  const pendenteRef = useRef<AutorizacaoPendente | null>(null)
  pendenteRef.current = autorizacaoPendente

  useEffect(() => {
    let ativo = true
    const intervalo = setInterval(async () => {
      if (pendenteRef.current) return // modal aberto — espera a resposta
      try {
        const r = await fetch('/api/paciente/autorizacao-cid/pendente')
        const d = await r.json()
        if (ativo && d.autorizacao) {
          setAutorizacaoPendente({ id: d.autorizacao.id, cid: d.autorizacao.cid })
        }
      } catch { /* silencioso — tenta de novo no próximo ciclo */ }
    }, 3000)
    return () => { ativo = false; clearInterval(intervalo) }
  }, [])

  async function responder(resposta: 'autorizado' | 'negado') {
    if (!autorizacaoPendente || respondendo) return
    setRespondendo(true)
    try {
      await fetch(`/api/paciente/autorizacao-cid/${autorizacaoPendente.id}/responder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta }),
      })
      setAutorizacaoPendente(null)
      setConfirmacao(true)
      setTimeout(() => setConfirmacao(false), 3000)
    } catch { /* mantém o modal para tentar de novo */ } finally {
      setRespondendo(false)
    }
  }

  return (
    <>
      {/* Confirmação discreta após responder */}
      {confirmacao && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 bg-[#1A3A2C] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-[#5BBD9B]" /> Resposta enviada ao médico ✓
        </div>
      )}

      {/* Overlay da pergunta */}
      {autorizacaoPendente && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <div className="w-10 h-10 bg-[#1A3A2C] rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-[#1A3A2C] leading-tight">RovarisMed</p>
                <p className="text-[10px] text-[#5BBD9B] font-medium uppercase tracking-wide">Saúde Digital Corporativa</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-2">Seu médico está solicitando sua autorização:</p>
            <h2 className="text-lg font-bold text-[#1A3A2C] mb-3 leading-snug">
              &ldquo;Você autoriza a inclusão do CID (Classificação Internacional de Doenças) neste atestado?&rdquo;
            </h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              O CID é o código que identifica sua doença ou condição médica. Ele pode ser necessário
              para fins trabalhistas, mas é um dado sensível de saúde.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => responder('autorizado')}
                disabled={respondendo}
                className="w-full flex items-center justify-center gap-2 bg-[#5BBD9B] hover:bg-[#1A3A2C] disabled:opacity-60 text-white font-bold py-4 px-6 rounded-2xl text-base transition-colors"
              >
                <Check className="w-5 h-5" /> Autorizo a inclusão do CID
              </button>
              <button
                onClick={() => responder('negado')}
                disabled={respondendo}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-red-50 disabled:opacity-60 text-red-600 font-bold py-4 px-6 rounded-2xl text-base border border-gray-200 hover:border-red-200 transition-colors"
              >
                <X className="w-5 h-5" /> Não autorizo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
