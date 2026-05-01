'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro(`ERRO TÉCNICO: ${error.message} | Código: ${error.status} | URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30)}`)
      setCarregando(false)
      return
    }

    // Redirecionar para rota servidor que lê a sessão e decide o destino
    window.location.href = '/api/auth/redirect'
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Heart className="w-8 h-8 text-[#2E75B6]" fill="currentColor" />
            <span className="text-2xl font-bold text-[#1A3A5C]">MedDigital</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Entre na sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#1A3A5C] mb-6">Acesso à plataforma</h1>

          {erro && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#1A3A5C] hover:bg-[#2E75B6] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {carregando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-[#2E75B6]">
              Esqueci minha senha
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-[#2E75B6] font-medium hover:underline">
              Cadastre-se grátis
            </Link>
          </div>

          <div className="mt-3 text-center">
            <Link href="/cadastro?tipo=medico" className="text-xs text-gray-400 hover:text-[#2E75B6]">
              Sou médico — quero me cadastrar na plataforma
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
