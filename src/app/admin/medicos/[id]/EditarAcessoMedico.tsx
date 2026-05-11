'use client'

import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react'

interface Props {
  medicoId: string
  emailAtual: string | null
}

export default function EditarAcessoMedico({ medicoId, emailAtual }: Props) {
  const [aberto, setAberto] = useState(false)

  /* ── e-mail ─────────────────────────────────────────────────────── */
  const [email, setEmail] = useState(emailAtual ?? '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [savedEmail, setSavedEmail] = useState(false)
  const [erroEmail, setErroEmail] = useState('')

  async function handleSalvarEmail() {
    if (!email.trim()) { setErroEmail('Informe o e-mail'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErroEmail('E-mail inválido'); return }
    setSavingEmail(true); setErroEmail('')
    try {
      const res = await fetch(`/api/admin/medico/${medicoId}/auth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) { setErroEmail(json.error ?? 'Erro ao salvar'); return }
      setSavedEmail(true)
      setTimeout(() => setSavedEmail(false), 2500)
    } catch { setErroEmail('Erro de conexão') }
    finally { setSavingEmail(false) }
  }

  /* ── senha ──────────────────────────────────────────────────────── */
  const [senha, setSenha] = useState('')
  const [senhaVis, setSenhaVis] = useState(false)
  const [savingSenha, setSavingSenha] = useState(false)
  const [savedSenha, setSavedSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')

  async function handleSalvarSenha() {
    if (senha.length < 6) { setErroSenha('Mínimo 6 caracteres'); return }
    setSavingSenha(true); setErroSenha('')
    try {
      const res = await fetch(`/api/admin/medico/${medicoId}/auth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })
      const json = await res.json()
      if (!res.ok) { setErroSenha(json.error ?? 'Erro ao salvar'); return }
      setSenha('')
      setSavedSenha(true)
      setTimeout(() => setSavedSenha(false), 2500)
    } catch { setErroSenha('Erro de conexão') }
    finally { setSavingSenha(false) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-400" /> Acesso (e-mail e senha)
        </span>
        <span className="text-gray-400 text-xs">{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">

          {/* E-mail */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> E-mail de acesso
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setSavedEmail(false) }}
              placeholder="email@exemplo.com"
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
            />
            {erroEmail && <p className="text-xs text-red-500">{erroEmail}</p>}
            <button
              onClick={handleSalvarEmail}
              disabled={savingEmail}
              className="w-full flex items-center justify-center gap-1.5 bg-[#1A3A2C] hover:bg-[#122a1f] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors"
            >
              {savingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : savedEmail ? <><CheckCircle2 className="w-3.5 h-3.5 text-[#5BBD9B]" /> Salvo!</>
                : 'Atualizar e-mail'}
            </button>
          </div>

          <div className="border-t border-gray-100" />

          {/* Senha */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Nova senha
            </label>
            <div className="relative">
              <input
                type={senhaVis ? 'text' : 'password'}
                value={senha}
                onChange={e => { setSenha(e.target.value); setSavedSenha(false) }}
                placeholder="Mínimo 6 caracteres"
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 pr-9 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
              />
              <button
                type="button"
                onClick={() => setSenhaVis(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {senhaVis ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {erroSenha && <p className="text-xs text-red-500">{erroSenha}</p>}
            <button
              onClick={handleSalvarSenha}
              disabled={savingSenha}
              className="w-full flex items-center justify-center gap-1.5 bg-[#1A3A2C] hover:bg-[#122a1f] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors"
            >
              {savingSenha ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : savedSenha ? <><CheckCircle2 className="w-3.5 h-3.5 text-[#5BBD9B]" /> Senha atualizada!</>
                : 'Atualizar senha'}
            </button>
            <p className="text-xs text-gray-400">A nova senha entrará em vigor no próximo login.</p>
          </div>
        </div>
      )}
    </div>
  )
}
