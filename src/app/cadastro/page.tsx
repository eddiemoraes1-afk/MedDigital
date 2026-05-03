'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, Mail, Lock, User, Phone, FileText, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function CadastroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tipoInicial = searchParams.get('tipo') === 'medico' ? 'medico' : 'paciente'

  const [tipo, setTipo] = useState<'paciente' | 'medico'>(tipoInicial)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [crm, setCrm] = useState('')
  const [crmUf, setCrmUf] = useState('SP')
  const [especialidade, setEspecialidade] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  function formatarCPF(valor: string) {
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
  }

  function formatarTelefone(valor: string) {
    return valor.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      setCarregando(false)
      return
    }

    // Criar usuário e perfil via rota servidor (usa admin client — sem problema de RLS)
    const res = await fetch('/api/auth/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha, nome, tipo, cpf, telefone, crm, crm_uf: crmUf, especialidade })
    })

    const result = await res.json()

    if (!res.ok) {
      if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
        setErro('Este e-mail já está cadastrado. Tente fazer login.')
      } else {
        setErro(result.error || 'Erro ao criar conta. Tente novamente.')
      }
      setCarregando(false)
      return
    }

    // Fazer login automático após cadastro
    if (tipo === 'paciente') {
      const supabase = createClient()
      await supabase.auth.signInWithPassword({ email, password: senha })
    }

    setSucesso(true)
    setCarregando(false)

    if (tipo === 'paciente') {
      setTimeout(() => router.push('/paciente/dashboard'), 2000)
    }
  }

  if (sucesso) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1A3A5C] mb-2">
          {tipo === 'paciente' ? 'Conta criada!' : 'Cadastro enviado para análise!'}
        </h2>
        <p className="text-gray-500 text-sm">
          {tipo === 'paciente'
            ? 'Redirecionando para o seu painel...'
            : 'Nosso time irá analisar seu cadastro em até 24 horas. Você receberá um e-mail com a confirmação.'}
        </p>
        {tipo === 'medico' && (
          <Link href="/login" className="mt-4 inline-block text-[#2E75B6] text-sm font-medium">
            Voltar para o login
          </Link>
        )}
      </div>
    )
  }

  const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h1 className="text-xl font-bold text-[#1A3A5C] mb-6">Criar conta</h1>

      {/* Seletor de tipo */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {(['paciente', 'medico'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tipo === t ? 'bg-white text-[#1A3A5C] shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'paciente' ? 'Sou Paciente' : 'Sou Médico'}
          </button>
        ))}
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {erro}
        </div>
      )}

      <form onSubmit={handleCadastro} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Seu nome completo" required
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm" />
          </div>
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm" />
          </div>
        </div>

        {/* CPF */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={cpf} onChange={e => setCpf(formatarCPF(e.target.value))}
              placeholder="000.000.000-00" required
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm" />
          </div>
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(11) 99999-9999" required
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm" />
          </div>
        </div>

        {/* Campos extras para médico */}
        {tipo === 'medico' && (
          <>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">CRM</label>
                <input type="text" value={crm} onChange={e => setCrm(e.target.value)}
                  placeholder="123456" required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                <select value={crmUf} onChange={e => setCrmUf(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm bg-white">
                  {ufs.map(uf => <option key={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
              <input type="text" value={especialidade} onChange={e => setEspecialidade(e.target.value)}
                placeholder="Ex: Clínica Geral, Cardiologia..." required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm" />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ Após o cadastro, seu CRM será verificado e você receberá uma confirmação por e-mail em até 24h.
            </div>
          </>
        )}

        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type={senhaVisivel ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres" required minLength={6}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E75B6] text-sm" />
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

        <button type="submit" disabled={carregando}
          className="w-full bg-[#1A3A5C] hover:bg-[#2E75B6] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
          {carregando ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</> : 'Criar conta'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-[#2E75B6] font-medium hover:underline">Fazer login</Link>
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Heart className="w-8 h-8 text-[#2E75B6]" fill="currentColor" />
            <span className="text-2xl font-bold text-[#1A3A5C]">MedDigital</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Crie sua conta gratuitamente</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl p-8 text-center text-gray-400">Carregando...</div>}>
          <CadastroForm />
        </Suspense>
      </div>
    </div>
  )
}
