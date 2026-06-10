'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

const STORAGE_KEY = 'med_sess_inicio'

function formatarTempo(segundos: number): string {
  const h   = Math.floor(segundos / 3600)
  const m   = Math.floor((segundos % 3600) / 60)
  const s   = segundos % 60
  const mm  = String(m).padStart(2, '0')
  const ss  = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * Mostra o tempo de sessão atual do médico (desde o login nesta aba).
 * Na primeira montagem, se não houver sessão ativa em sessionStorage,
 * registra um evento de login e inicia a contagem do zero.
 * Se a aba for fechada e reaberta, o sessionStorage é limpo pelo browser
 * e uma nova sessão é registrada automaticamente.
 */
export default function SessaoTimer() {
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    const agora = Date.now()
    const salvo  = sessionStorage.getItem(STORAGE_KEY)

    if (!salvo) {
      // Nova sessão — salvar timestamp e logar login
      sessionStorage.setItem(STORAGE_KEY, String(agora))

      fetch('/api/medico/log-sessao', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo: 'login', descricao: 'Médico entrou no sistema' }),
      }).catch(() => {})

    } else {
      // Sessão já em curso — sincronizar timer com o tempo decorrido
      const decorrido = Math.max(0, Math.floor((agora - Number(salvo)) / 1000))
      setSegundos(decorrido)
    }

    const interval = setInterval(() => setSegundos(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs tabular-nums font-mono"
      style={{ color: 'rgba(167,243,208,0.75)' }}
      title="Tempo de sessão atual"
    >
      <Timer className="w-3.5 h-3.5 shrink-0" />
      {formatarTempo(segundos)}
    </div>
  )
}
