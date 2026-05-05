'use client'

import { useEffect } from 'react'

/**
 * Componente invisível que registra presença do médico na plataforma.
 * Envia um ping a cada 30s enquanto o browser está aberto.
 * Adicionar em qualquer layout do painel médico.
 */
export default function PingMedico() {
  useEffect(() => {
    async function ping() {
      try {
        await fetch('/api/medico/ping', { method: 'POST' })
      } catch {
        // falha silenciosa — não interrompe a experiência
      }
    }

    // Ping imediato ao carregar
    ping()

    // Ping a cada 30 segundos
    const interval = setInterval(ping, 30_000)

    // Ping ao voltar para a aba (ex: médico estava em outra aba)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
