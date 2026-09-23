'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Ponte entre o pagamento e a sala de atendimento.
 *
 * O paciente particular chega aqui logo depois de pagar. A página pede a
 * consulta de novo — agora o servidor encontra o pagamento confirmado e
 * libera. Existe para o paciente não precisar refazer a triagem.
 */
function Conteudo() {
  const router = useRouter()
  const params = useSearchParams()
  const triagemId = params.get('triagem')

  const [erro, setErro] = useState<string | null>(null)
  const [tentando, setTentando] = useState(true)

  useEffect(() => {
    let cancelado = false

    async function entrar(tentativa = 1) {
      try {
        const res = await fetch('/api/consulta/solicitar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triagem_id: triagemId || null }),
        })
        const data = await res.json()
        if (cancelado) return

        if (data.atendimentoId) {
          router.replace(`/paciente/consulta/${data.atendimentoId}`)
          return
        }

        // O aviso do banco pode levar alguns segundos para chegar.
        // Tenta mais algumas vezes antes de desistir.
        if (res.status === 402 && tentativa < 5) {
          setTimeout(() => entrar(tentativa + 1), 2500)
          return
        }

        if (res.status === 402) {
          setErro('Ainda não recebemos a confirmação do seu pagamento. '
                + 'Se você já pagou, aguarde um instante e tente de novo.')
        } else {
          setErro(data.error || 'Não foi possível abrir a sala de atendimento.')
        }
        setTentando(false)

      } catch {
        if (cancelado) return
        setErro('Erro de conexão. Verifique sua internet e tente de novo.')
        setTentando(false)
      }
    }

    entrar()
    return () => { cancelado = true }
  }, [triagemId, router])

  if (tentando) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-9 h-9 animate-spin mx-auto mb-5" style={{ color: 'var(--brand-2)' }} />
        <p className="font-medium mb-1.5" style={{ color: 'var(--txt-1)' }}>
          Entrando na fila de atendimento
        </p>
        <p className="text-sm" style={{ color: 'var(--txt-2)' }}>
          Só um instante.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-8 text-center"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{ background: 'var(--warning-bg)' }}>
        <AlertCircle className="w-7 h-7" style={{ color: 'var(--warning)' }} />
      </div>
      <p className="font-semibold mb-2" style={{ color: 'var(--txt-1)' }}>Quase lá</p>
      <p className="text-sm mb-7 leading-relaxed" style={{ color: 'var(--txt-2)' }}>{erro}</p>

      <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
        <button onClick={() => { setErro(null); setTentando(true); location.reload() }}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand)' }}>
          Tentar de novo
        </button>
        <Link href="/paciente/dashboard"
          className="px-6 py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--txt-1)' }}>
          Ir para o início <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

export default function EntrarNaFilaPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <main className="max-w-md mx-auto px-5 py-16">
        <Suspense fallback={
          <div className="text-center py-16">
            <Loader2 className="w-9 h-9 animate-spin mx-auto" style={{ color: 'var(--brand-2)' }} />
          </div>
        }>
          <Conteudo />
        </Suspense>
      </main>
    </div>
  )
}
