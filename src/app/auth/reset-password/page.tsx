'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [confirmarVisivel, setConfirmarVisivel] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setErro('Erro ao atualizar senha. O link pode ter expirado. Solicite um novo reset.')
      setCarregando(false)
      return
    }

    setSucesso(true)
    setTimeout(() => {
      router.push('/api/auth/redirect')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🔐</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nova senha</h1>
          <p className="text-gray-500 mt-1">Digite sua nova senha abaixo</p>
        </div>

        {sucesso ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700 font-medium">Senha atualizada com sucesso! Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{erro}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <div className="relative">
                <input
                  type={senhaVisivel ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                  required
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
              <div className="relative">
                <input
                  type={confirmarVisivel ? 'text' : 'password'}
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repita a senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setConfirmarVisivel(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={confirmarVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {confirmarVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {carregando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
