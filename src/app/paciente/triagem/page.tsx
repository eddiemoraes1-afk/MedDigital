'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Send, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Info, Video, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

export default function TriagemPage() {
  const router = useRouter()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [iniciando, setIniciando] = useState(true)
  const [resultado, setResultado] = useState<ResultadoTriagem | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [solicitando, setSolicitando] = useState(false)
  const [triagemId, setTriagemId] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const trocasRef = useRef(0)

  useEffect(() => {
    iniciarTriagem()
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [mensagens, carregando])

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

    // Após 4 trocas, pedir finalização
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: paciente } = await supabase
        .from('pacientes').select('id').eq('usuario_id', user.id).single()
      if (!paciente) return

      const { data: triagem } = await supabase.from('triagens').insert({
        paciente_id: paciente.id,
        classificacao_risco: res.classificacao,
        direcionamento: res.direcionamento,
        resumo_ia: res.resumo,
        historico_chat: historico,
        status: 'concluida',
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

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col">
      {/* Header */}
      <header className="bg-[#1A3A5C] text-white px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/paciente/dashboard" className="text-blue-200 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#2E75B6]" fill="currentColor" />
              <span className="font-bold">Triagem por IA</span>
            </div>
          </div>
          <span className="text-xs text-blue-200 bg-blue-900/30 px-3 py-1 rounded-full">
            IA não substitui diagnóstico médico
          </span>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4 overflow-hidden">
        <div ref={chatRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {iniciando ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#2E75B6] mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Iniciando triagem...</p>
              </div>
            </div>
          ) : (
            <>
              {mensagens.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-[#2E75B6] rounded-full flex items-center justify-center shrink-0 mr-2 mt-1">
                      <Heart className="w-4 h-4 text-white" fill="currentColor" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1A3A5C] text-white rounded-tr-sm'
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
                  <div className="w-8 h-8 bg-[#2E75B6] rounded-full flex items-center justify-center shrink-0 mr-2">
                    <Heart className="w-4 h-4 text-white" fill="currentColor" />
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

              {/* Resultado da triagem */}
              {resultado && config && (
                <div className={`border-2 rounded-2xl p-6 mt-4 ${config.cor}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <config.icon className="w-6 h-6" />
                    <div>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2"><strong>Resumo:</strong> {resultado.resumo}</p>
                  <p className="text-sm text-gray-600 mb-5">{config.mensagem}</p>
                  <div className="flex flex-wrap gap-3">
                    {resultado.direcionamento === 'virtual' ? (
                      <button
                        onClick={solicitarConsulta}
                        disabled={solicitando}
                        className="flex items-center gap-2 bg-[#1A3A5C] hover:bg-[#2E75B6] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
                      >
                        {solicitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                        {solicitando ? 'Criando sala...' : 'Iniciar consulta virtual'}
                      </button>
                    ) : resultado.direcionamento === 'presencial' ? (
                      <a href="tel:192" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                        Ligar para o SAMU (192)
                      </a>
                    ) : null}

                    {/* Agendar consulta — disponível para todos os níveis de risco exceto urgência */}
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
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={carregando || iniciando || !input.trim()}
              className="bg-[#1A3A5C] hover:bg-[#2E75B6] text-white w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0"
            >
              {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
