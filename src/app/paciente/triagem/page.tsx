'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Send, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle,
  Info, Video, Calendar, Shield, Phone, FileText, XCircle, Brain
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ResultadoTriagem {
  classificacao: 'verde' | 'amarelo' | 'laranja' | 'vermelho'
  direcionamento: 'orientacao' | 'virtual' | 'presencial'
  resumo: string
}

interface DadosValidacao {
  cpf: string
  telefone: string
  consentimentoEm: string
}

// ─── Config de risco ──────────────────────────────────────────────────────────

const configRisco = {
  verde: {
    cor: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    label: '🟢 Risco Baixo',
    mensagem: 'Seus sintomas indicam baixa urgência. Você receberá orientações básicas.',
    icon: CheckCircle2,
  },
  amarelo: {
    cor: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    label: '🟡 Risco Moderado',
    mensagem: 'Recomendamos uma consulta virtual com um médico.',
    icon: Info,
  },
  laranja: {
    cor: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    label: '🟠 Risco Alto',
    mensagem: 'Você precisa de atendimento médico em breve. Conectando com médico disponível.',
    icon: AlertTriangle,
  },
  vermelho: {
    cor: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    label: '🔴 Urgência',
    mensagem: 'Seus sintomas indicam urgência. Procure atendimento presencial imediatamente ou ligue 192 (SAMU).',
    icon: AlertCircle,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarCPF(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    .slice(0, 14)
}

function formatarTelefone(v: string) {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    .slice(0, 15)
}

// ─── Etapa 1: Validação ───────────────────────────────────────────────────────

function EtapaValidacao({
  nomeInicial,
  cpfInicial,
  telefoneInicial,
  onAceitar,
}: {
  nomeInicial: string
  cpfInicial: string
  telefoneInicial: string
  onAceitar: (dados: DadosValidacao) => void
}) {
  const [cpf, setCpf] = useState(cpfInicial ? formatarCPF(cpfInicial) : '')
  const [telefone, setTelefone] = useState(telefoneInicial ? formatarTelefone(telefoneInicial) : '')
  const [recusou, setRecusou] = useState(false)
  const [erro, setErro] = useState('')

  function handleAceitar() {
    if (!cpf.trim()) { setErro('Por favor, confirme seu CPF.'); return }
    if (!telefone.trim()) { setErro('Por favor, informe um telefone para contato.'); return }
    setErro('')
    onAceitar({
      cpf: cpf.replace(/\D/g, ''),
      telefone: telefone.replace(/\D/g, ''),
      consentimentoEm: new Date().toISOString(),
    })
  }

  if (recusou) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Atendimento não autorizado</h2>
          <p className="text-sm text-gray-500 mb-6">
            O consentimento é necessário para realizar o atendimento por telemedicina e
            garantir o registro seguro das suas informações de saúde.
          </p>
          <Link
            href="/paciente/dashboard"
            className="inline-block bg-[#1A3A2C] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#5BBD9B] transition-colors"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">

        {/* Indicador de etapa */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-[#1A3A2C] text-white text-xs font-bold flex items-center justify-center">1</div>
            <span className="text-xs font-semibold text-[#1A3A2C]">Identificação</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-1" />
          <div className="flex items-center gap-1.5 opacity-40">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 text-gray-400 text-xs font-bold flex items-center justify-center">2</div>
            <span className="text-xs font-semibold text-gray-400">Triagem</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-[#5BBD9B]" />
          </div>
          <div>
            <h2 className="font-bold text-[#1A3A2C] text-lg leading-tight">Confirmação de identidade</h2>
            {nomeInicial && <p className="text-sm text-gray-500 mt-0.5">Olá, {nomeInicial.split(' ')[0]}!</p>}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Antes de iniciar a triagem, confirme seus dados de contato. Eles garantem que estamos
          atendendo a pessoa certa e que podemos entrar em contato caso necessário.
        </p>

        {/* Nome completo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={nomeInicial}
              readOnly
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 cursor-default"
            />
          </div>
        </div>

        {/* CPF */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={cpf}
              onChange={e => setCpf(formatarCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm"
            />
          </div>
        </div>

        {/* Telefone */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone / WhatsApp para contato
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={telefone}
              onChange={e => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Utilizado apenas se a conexão cair durante o atendimento.
          </p>
        </div>

        {/* Consentimento LGPD */}
        <div className="bg-[#F3FAF7] border border-green-100 rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-[#1A3A2C] mb-1 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#5BBD9B]" /> Consentimento LGPD
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Você autoriza o atendimento por <strong>telemedicina</strong> e o registro das suas
            informações de saúde no <strong>prontuário eletrônico</strong>, conforme a
            Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)?
          </p>
        </div>

        {erro && (
          <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {erro}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleAceitar}
            className="flex-1 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Sim, autorizo
          </button>
          <button
            onClick={() => setRecusou(true)}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-500 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Não autorizo
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Ao clicar em "Sim, autorizo", você declara que leu e concorda com os termos acima.
          Registro em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
        </p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function TriagemPage() {
  const router = useRouter()

  // Etapas: carregando → validacao → triagem
  const [etapa, setEtapa] = useState<'carregando' | 'validacao' | 'triagem'>('carregando')
  const [pacienteId, setPacienteId] = useState<string | null>(null)
  const [nomeInicial, setNomeInicial] = useState('')
  const [cpfInicial, setCpfInicial] = useState('')
  const [telefoneInicial, setTelefoneInicial] = useState('')
  const [validacao, setValidacao] = useState<DadosValidacao | null>(null)

  // Chat
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoTriagem | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [solicitando, setSolicitando] = useState(false)
  const [triagemId, setTriagemId] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const trocasRef = useRef(0)

  // Buscar dados do paciente ao montar
  useEffect(() => {
    async function carregarPaciente() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: paciente } = await supabase
        .from('pacientes')
        .select('id, nome, cpf, telefone')
        .eq('usuario_id', user.id)
        .single()

      if (paciente) {
        setPacienteId(paciente.id)
        setNomeInicial(paciente.nome || '')
        setCpfInicial(paciente.cpf || '')
        setTelefoneInicial(paciente.telefone || '')
      }
      setEtapa('validacao')
    }
    carregarPaciente()
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [mensagens, carregando])

  async function handleAceitar(dados: DadosValidacao) {
    setValidacao(dados)
    setEtapa('triagem')
    iniciarTriagem()
  }

  async function iniciarTriagem() {
    setIniciando(true)
    const res = await fetch('/api/triagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagens: [{ role: 'user', content: 'Olá, preciso de ajuda com meus sintomas.' }]
      })
    })
    const data = await res.json()
    if (data.resposta) {
      setMensagens([{
        role: 'assistant',
        content: data.resposta,
        timestamp: new Date().toISOString()
      }])
    }
    setIniciando(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || carregando) return

    const novaMensagem: Mensagem = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }

    const historico = [...mensagens, novaMensagem]
    setMensagens(historico)
    setInput('')
    setCarregando(true)
    trocasRef.current += 1

    const deveFinalizr = trocasRef.current >= 4

    const res = await fetch('/api/triagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagens: historico.map(m => ({ role: m.role, content: m.content })),
        finalizar: deveFinalizr
      })
    })

    const data = await res.json()
    setCarregando(false)

    if (data.resposta) {
      const respostaMedico: Mensagem = {
        role: 'assistant',
        content: data.resposta,
        timestamp: new Date().toISOString()
      }
      setMensagens(prev => [...prev, respostaMedico])
    }

    if (data.resultado) {
      setResultado(data.resultado)
      await salvarTriagem([...historico, {
        role: 'assistant' as const,
        content: data.resposta,
        timestamp: new Date().toISOString()
      }], data.resultado)
    }
  }

  async function salvarTriagem(historico: Mensagem[], res: ResultadoTriagem) {
    setSalvando(true)
    try {
      const supabase = createClient()
      const { data: triagem } = await supabase.from('triagens').insert({
        paciente_id: pacienteId,
        classificacao_risco: res.classificacao,
        direcionamento: res.direcionamento,
        resumo_ia: res.resumo,
        historico_chat: historico,
        status: 'concluida',
        consentimento_lgpd: true,
        consentimento_em: validacao?.consentimentoEm ?? new Date().toISOString(),
        cpf_confirmado: validacao?.cpf ?? null,
        telefone_contato: validacao?.telefone ?? null,
      }).select().single()
      if (triagem) setTriagemId(triagem.id)
    } catch (err) {
      console.error('Erro ao salvar triagem:', err)
    }
    setSalvando(false)
  }

  async function solicitarConsulta() {
    setSolicitando(true)
    const res = await fetch('/api/consulta/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triagem_id: triagemId })
    })
    const data = await res.json()
    if (data.atendimentoId) {
      router.push(`/paciente/consulta/${data.atendimentoId}`)
    } else {
      alert('Erro ao criar sala: ' + (data.error || 'tente novamente'))
      setSolicitando(false)
    }
  }

  const config = resultado ? configRisco[resultado.classificacao] : null

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F3FAF7] flex flex-col">

      {/* Header */}
      <header className="bg-[#1A3A2C] text-white px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {etapa === 'triagem' ? (
              <button
                onClick={() => { setEtapa('validacao'); setMensagens([]); setResultado(null); trocasRef.current = 0 }}
                className="text-green-200 hover:text-white"
                aria-label="Voltar para identificação"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <Link href="/paciente/dashboard" className="text-green-200 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
              <span className="text-xs text-green-300 ml-1">Triagem por IA</span>
            </div>
          </div>
          <span className="text-xs text-green-200 bg-blue-900/30 px-3 py-1 rounded-full">
            IA não substitui diagnóstico médico
          </span>
        </div>
      </header>

      {/* Etapa: carregando */}
      {etapa === 'carregando' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B] mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Carregando seus dados...</p>
          </div>
        </div>
      )}

      {/* Etapa 1: Validação */}
      {etapa === 'validacao' && (
        <EtapaValidacao
          nomeInicial={nomeInicial}
          cpfInicial={cpfInicial}
          telefoneInicial={telefoneInicial}
          onAceitar={handleAceitar}
        />
      )}

      {/* Etapa 2: Triagem (chat) */}
      {etapa === 'triagem' && (
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4 overflow-hidden">

          {/* Indicador de etapa */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 opacity-50">
              <div className="w-6 h-6 rounded-full bg-[#5BBD9B] text-white text-xs font-bold flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-gray-500">Identificação</span>
            </div>
            <div className="flex-1 h-px bg-[#5BBD9B] mx-1" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-[#1A3A2C] text-white text-xs font-bold flex items-center justify-center">2</div>
              <span className="text-xs font-semibold text-[#1A3A2C]">Triagem com IA</span>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {iniciando ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B] mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Iniciando triagem...</p>
                </div>
              </div>
            ) : (
              <>
                {mensagens.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 bg-[#5BBD9B] rounded-full flex items-center justify-center shrink-0 mr-2 mt-1">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#1A3A2C] text-white rounded-tr-sm'
                        : 'bg-white text-gray-700 shadow-sm rounded-tl-sm'
                    }`}>
                      {msg.content.split('\n').map((linha, li) => (
                        <span key={li}>{linha}{li < msg.content.split('\n').length - 1 && <br />}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {carregando && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 bg-[#5BBD9B] rounded-full flex items-center justify-center shrink-0 mr-2">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Resultado */}
                {resultado && config && (
                  <div className={`border-2 rounded-2xl p-6 mt-4 ${config.cor}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <config.icon className="w-6 h-6" />
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2"><strong>Resumo:</strong> {resultado.resumo}</p>
                    <p className="text-sm text-gray-600 mb-5">{config.mensagem}</p>
                    <div className="flex flex-wrap gap-3">
                      {resultado.direcionamento === 'virtual' ? (
                        <button
                          onClick={solicitarConsulta}
                          disabled={solicitando}
                          className="flex items-center gap-2 bg-[#1A3A2C] hover:bg-[#5BBD9B] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
                        >
                          {solicitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                          {solicitando ? 'Criando sala...' : 'Iniciar consulta virtual'}
                        </button>
                      ) : resultado.direcionamento === 'presencial' ? (
                        <a href="tel:192" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                          Ligar para o SAMU (192)
                        </a>
                      ) : null}

                      {resultado.direcionamento !== 'presencial' && (
                        <Link
                          href="/paciente/agendar"
                          className="flex items-center gap-2 bg-[#7B3FA0] hover:bg-[#6a2f8f] text-white px-5 py-2.5 rounded-xl text-sm font-medium"
                        >
                          <Calendar className="w-4 h-4" />
                          Agendar consulta
                        </Link>
                      )}

                      <Link href="/paciente/dashboard"
                        className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium">
                        Voltar ao painel
                      </Link>
                    </div>
                    {salvando && <p className="text-xs text-gray-400 mt-3">Salvando triagem no prontuário...</p>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          {!resultado && (
            <form onSubmit={enviarMensagem} className="flex gap-3 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Descreva como você está se sentindo..."
                disabled={carregando || iniciando}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={carregando || iniciando || !input.trim()}
                className="bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0"
              >
                {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
