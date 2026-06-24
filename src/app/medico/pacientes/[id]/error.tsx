'use client'

/**
 * Error boundary para /medico/pacientes/[id]
 * Exibe a mensagem de erro real em vez da tela genérica do Vercel.
 * TEMPORÁRIO — apenas para diagnóstico do bug da aba Documentos.
 */

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorProntuario({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Loga no console do browser para diagnóstico
    console.error('[PRONTUÁRIO ERROR]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 text-xl">⚠</div>
          <h1 className="text-lg font-bold text-[#1A3A2C]">Erro ao carregar prontuário</h1>
        </div>

        {/* Mensagem de erro (visível para diagnóstico) */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 font-mono text-xs text-red-800 break-all whitespace-pre-wrap max-h-48 overflow-auto">
          <p className="font-bold mb-1">Mensagem:</p>
          <p>{error?.message || 'Erro desconhecido'}</p>
          {error?.digest && (
            <>
              <p className="font-bold mt-3 mb-1">Digest (para logs Vercel):</p>
              <p>{error.digest}</p>
            </>
          )}
          {error?.stack && (
            <>
              <p className="font-bold mt-3 mb-1">Stack:</p>
              <p className="text-gray-600">{error.stack}</p>
            </>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Tire um print desta tela e envie para o suporte técnico.
        </p>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-[#1A3A2C] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors"
          >
            Tentar novamente
          </button>
          <Link
            href="/medico/pacientes"
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold text-center hover:bg-gray-50 transition-colors"
          >
            Voltar à lista
          </Link>
        </div>
      </div>
    </div>
  )
}
