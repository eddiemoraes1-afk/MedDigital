'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha incorretos. Verifique e tente novamente.')
      setCarregando(false)
      return
    }

    // Redirecionar para rota servidor que lê a sessão e decide o destino
    window.location.href = '/api/auth/redirect'
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Heart className="w-8 h-8 text-[#5BBD9B]" fill="currentColor" />
            <span className="text-2xl font-bold text-[#1A3A2C]">RovarisMed</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Entre na sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-xl font-bold text-[#1A3A2C] mb-6">Acesso à plataforma</h1>

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
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={senhaVisivel ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm"
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {senhaVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {carregando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-[#5BBD9B]">
              Esqueci minha senha
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <Link
              href="/cadastro"
              className="block w-full text-center bg-[#F3FAF7] hover:bg-green-50 border border-[#5BBD9B] text-[#5BBD9B] py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Cadastre-se
            </Link>
            <Link
              href="/cadastro?tipo=medico"
              className="block w-full text-center bg-[#F3FAF7] hover:bg-green-50 border border-[#1A7340] text-[#1A7340] py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Sou médico — quero me cadastrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
