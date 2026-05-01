'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setErro('Erro ao enviar email. Verifique o endereço e tente novamente.')
      setCarregando(false)
      return
    }

    setEnviado(true)
    setCarregando(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">📧</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Recuperar senha</h1>
          <p className="text-gray-500 mt-1">Enviaremos um link para redefinir sua senha</p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-medium">Email enviado! Verifique sua caixa de entrada.</p>
              <p className="text-green-600 text-sm mt-1">Clique no link do email para redefinir sua senha.</p>
            </div>
            <Link href="/login" className="block text-center text-blue-600 hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{erro}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu e-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <Link href="/login" className="block text-center text-gray-500 hover:text-gray-700 text-sm">
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
