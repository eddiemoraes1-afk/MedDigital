'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import InputSenha from '@/components/InputSenha'

export default function CriarEmpresaForm() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    email_contato: '',
    telefone_contato: '',
    email_portal: '',
    senha_portal: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.nome.trim()) { setErro('Nome da empresa é obrigatório.'); return }
    if (!form.email_portal.trim()) { setErro('E-mail de acesso ao portal é obrigatório.'); return }
    if (form.senha_portal.length < 6) { setErro('Senha mínima: 6 caracteres.'); return }

    setSalvando(true)
    try {
      const res = await fetch('/api/admin/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar empresa')
      router.push(`/admin/empresas/${data.id}`)
      router.refresh()
    } catch (err: any) {
      setErro(err.message)
      setSalvando(false)
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] focus:border-transparent"
  const labelClass = "block text-xs font-medium text-gray-600 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Nome da empresa *</label>
        <input className={inputClass} placeholder="Ex: Acme Ltda" value={form.nome} onChange={e => set('nome', e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>CNPJ</label>
        <input className={inputClass} placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>E-mail de contato</label>
        <input type="email" className={inputClass} placeholder="rh@empresa.com" value={form.email_contato} onChange={e => set('email_contato', e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Telefone de contato</label>
        <input className={inputClass} placeholder="(11) 99999-9999" value={form.telefone_contato} onChange={e => set('telefone_contato', e.target.value)} />
      </div>

      <hr className="border-gray-100" />
      <p className="text-xs text-gray-500 font-medium">Acesso ao portal RH</p>

      <div>
        <label className={labelClass}>E-mail de acesso *</label>
        <input type="email" className={inputClass} placeholder="rh-login@empresa.com" value={form.email_portal} onChange={e => set('email_portal', e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Senha inicial *</label>
        <InputSenha placeholder="Mínimo 6 caracteres" value={form.senha_portal} onChange={v => set('senha_portal', v)} />
      </div>

      {erro && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

      <button
        type="submit"
        disabled={salvando}
        className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
      >
        {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
        {salvando ? 'Criando...' : 'Criar empresa'}
      </button>
    </form>
  )
}
