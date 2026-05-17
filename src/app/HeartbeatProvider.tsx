'use client'

import { useEffect, useRef } from 'react'

// Envia heartbeat a cada INTERVALO_MS enquanto o usuário está na aba.
// Também reenvia ao retornar para a aba após inatividade.
// Se parar de receber heartbeat por >30min (server) → sessão é encerrada.

const INTERVALO_MS = 2 * 60 * 1000  // 2 minutos

async function pingHeartbeat() {
  try {
    await fetch('/api/auth/heartbeat', { method: 'POST' })
  } catch { /* silencioso */ }
}

export default function HeartbeatProvider() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Ping imediato ao montar
    pingHeartbeat()

    // Ping periódico
    timerRef.current = setInterval(pingHeartbeat, INTERVALO_MS)

    // Ping ao retornar para a aba
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') pingHeartbeat()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  // Componente invisível — só lógica
  return null
}
