'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'med_sess_inicio'

function formatarDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 0) return `${h}h ${m}min ${s}s`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

/**
 * Substitui o <form action="/api/auth/signout">.
 * Antes de fazer logout, registra o evento com a duração da sessão
 * e limpa o sessionStorage.
 */
export default function BotaoSair() {
  const router = useRouter()

  async function handleSair() {
    try {
      const inicio   = sessionStorage.getItem(STORAGE_KEY)
      const duracao  = inicio
        ? Math.max(0, Math.floor((Date.now() - Number(inicio)) / 1000))
        : null

      await fetch('/api/medico/log-sessao', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tipo:      'logout',
          descricao: duracao !== null
            ? `Médico saiu do sistema — sessão de ${formatarDuracao(duracao)}`
            : 'Médico saiu do sistema',
          dados: duracao !== null ? { duracao_segundos: duracao } : undefined,
        }),
      })
    } catch {
      // falha silenciosa — logout não pode ser bloqueado por erro de log
    }

    sessionStorage.removeItem(STORAGE_KEY)

    // Chama a rota de signout do Supabase
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button
      type="button"
      onClick={handleSair}
      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline text-xs">Sair</span>
    </button>
  )
}
