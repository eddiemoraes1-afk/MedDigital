'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Clock, Phone, Video, CheckCircle2, ArrowRight, Users } from 'lucide-react'

// ── Helpers de áudio ──────────────────────────────────────────────────────────

function tocarBeep(frequencias: number[], duracaoMs = 220) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    frequencias.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t0 = ctx.currentTime + i * (duracaoMs / 1000 + 0.06)
      const t1 = t0 + duracaoMs / 1000
      gain.gain.setValueAtTime(0.45, t0)
      gain.gain.exponentialRampToValueAtTime(0.01, t1)
      osc.start(t0)
      osc.stop(t1)
    })
  } catch (_) {}
}

function falarPT(texto: string) {
  try {
    window.speechSynthesis.cancel()
    const utter  = new SpeechSynthesisUtterance(texto)
    utter.lang   = 'pt-BR'
    utter.rate   = 0.88
    utter.pitch  = 1
    window.speechSynthesis.speak(utter)
  } catch (_) {}
}

function alertaPosicao2() {
  tocarBeep([880, 1100], 250)
  setTimeout(() => falarPT('Atenção! Você é o segundo da fila. Prepare-se, você será atendido em breve!'), 750)
}

function alertaMedicoAssumiu() {
  tocarBeep([523, 659, 784], 200)
  setTimeout(() => falarPT('Um médico já está revisando o seu prontuário e entrará na sala em instantes!'), 900)
}

// ── Ordinal em português ──────────────────────────────────────────────────────

function ordinalPT(n: number): string {
  const map: Record<number, string> = {
    1: 'primeiro', 2: 'segundo',  3: 'terceiro', 4: 'quarto',
    5: 'quinto',   6: 'sexto',    7: 'sétimo',   8: 'oitavo',
    9: 'nono',    10: 'décimo',
  }
  return map[n] ?? `${n}º`
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PosicaoInfo {
  posicao:       number | null
  total:         number
  medicoAssumiu: boolean
  medicosAtivos: number
  tempoEstimado: number | null
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ConsultaPaciente() {
  const { id } = useParams()
  const router  = useRouter()

  const [atendimento,  setAtendimento]  = useState<any>(null)
  const [pacienteNome, setPacienteNome] = useState('')
  const [carregando,   setCarregando]   = useState(true)
  const [entrou,       setEntrou]       = useState(false)
  const [encerrado,    setEncerrado]    = useState(false)
  const [encaminhado,  setEncaminhado]  = useState(false)
  const [posicaoInfo,  setPosicaoInfo]  = useState<PosicaoInfo | null>(null)

  // Refs: acessados dentro do polling sem stale closure
  const atendimentoIdRef = useRef<string>(id as string)
  const pacienteIdRef    = useRef<string>('')
  const encerradoRef     = useRef(false)
  const prevPosicaoRef   = useRef<number | null>(null)
  const prevAssumiuRef   = useRef(false)

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function poll() {
    if (encerradoRef.current) return

    const supabase = createClient()

    // Autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Busca paciente (uma vez)
    if (!pacienteIdRef.current) {
      const { data: pac } = await supabase
        .from('pacientes')
        .select('id, nome')
        .eq('usuario_id', user.id)
        .single()
      if (pac?.nome) setPacienteNome(pac.nome)
      if (pac?.id)   pacienteIdRef.current = pac.id
    }

    // Busca atendimento atual
    const { data } = await supabase
      .from('atendimentos')
      .select('*, medicos(nome, especialidade)')
      .eq('id', atendimentoIdRef.current)
      .single()

    if (!data) return

    // ── Médico encerrou a consulta ──────────────────────────────────────────
    if (data.status === 'concluido') {
      const pid = pacienteIdRef.current || data.paciente_id

      const { data: novoAtend } = await supabase
        .from('atendimentos')
        .select('id, status, sala_video, medicos(nome, especialidade)')
        .eq('paciente_id', pid)
        .in('status', ['aguardando', 'em_andamento'])
        .neq('id', atendimentoIdRef.current)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (novoAtend?.id) {
        atendimentoIdRef.current = novoAtend.id
        setEncaminhado(true)
        setEntrou(false)
        setAtendimento(novoAtend)
        setPosicaoInfo(null)
        prevPosicaoRef.current = null
        prevAssumiuRef.current = false
        setCarregando(false)
        return
      }

      encerradoRef.current = true
      setEncerrado(true)
      setTimeout(() => router.push('/paciente/dashboard'), 3500)
      return
    }

    // Se novo médico entrou na sala, limpa banner de encaminhamento
    if (data.status === 'em_andamento') {
      setEncaminhado(false)
      setPosicaoInfo(null)
    }

    // ── Posição na fila (só quando aguardando) ────────────────────────────────
    if (data.status === 'aguardando') {
      try {
        const res = await fetch(
          `/api/paciente/posicao-fila?atendimento_id=${atendimentoIdRef.current}`
        )
        if (res.ok) {
          const info: PosicaoInfo = await res.json()
          setPosicaoInfo(info)

          // ── Detectar transições e disparar alertas ─────────────────────────
          const prevPos    = prevPosicaoRef.current
          const prevAssumi = prevAssumiuRef.current

          // Entrou na posição 2
          if (info.posicao === 2 && prevPos !== 2 && prevPos !== null) {
            alertaPosicao2()
          }

          // Médico assumiu (transição de false → true)
          if (info.medicoAssumiu && !prevAssumi) {
            alertaMedicoAssumiu()
          }

          prevPosicaoRef.current  = info.posicao
          prevAssumiuRef.current  = info.medicoAssumiu
        }
      } catch (_) {}
    }

    setAtendimento(data)
    setCarregando(false)
  }

  async function encerrarConsulta() {
    const supabase = createClient()
    await supabase
      .from('atendimentos')
      .update({ status: 'concluido', finalizado_em: new Date().toISOString() })
      .eq('id', atendimentoIdRef.current)
    encerradoRef.current = true
    router.push('/paciente/dashboard')
  }

  // ── Tela de carregamento ──────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="min-h-screen bg-[#1A3A2C] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
          <p>Carregando sala de consulta...</p>
        </div>
      </div>
    )
  }

  // ── Tela de consulta encerrada ────────────────────────────────────────────
  if (encerrado) {
    return (
      <div className="min-h-screen bg-[#1A3A2C] flex items-center justify-center">
        <div className="text-center text-white px-6 max-w-sm">
          <div className="w-20 h-20 bg-green-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-300" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Consulta Encerrada</h2>
          <p className="text-green-300 text-sm leading-relaxed">
            O médico encerrou a consulta. Obrigado pelo seu atendimento! Você será redirecionado em instantes.
          </p>
          <div className="mt-6">
            <Loader2 className="w-5 h-5 animate-spin text-green-400 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  // ── Sala não encontrada ───────────────────────────────────────────────────
  if (!atendimento?.sala_video) {
    return (
      <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Sala não encontrada.</p>
          <button
            onClick={() => router.push('/paciente/dashboard')}
            className="mt-4 text-[#5BBD9B]"
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    )
  }

  // URL do vídeo
  const videoUrl = (() => {
    try {
      const url = new URL(atendimento.sala_video)
      if (pacienteNome) url.searchParams.set('name', pacienteNome)
      url.searchParams.set('prejoin', 'false')
      return url.toString()
    } catch {
      return atendimento.sala_video
    }
  })()

  const pos       = posicaoInfo?.posicao   ?? null
  const assumiu   = posicaoInfo?.medicoAssumiu ?? false
  const ehSegundo = pos === 2

  // ── Tela principal da consulta ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">

      {/* CSS inline para animações */}
      <style>{`
        @keyframes fila-pisca {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        .fila-pisca { animation: fila-pisca 0.9s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="bg-[#1A3A2C] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
          <span className="text-green-300 text-xs">— Consulta Virtual</span>
        </div>

        <div className="flex items-center gap-4">
          {atendimento.status === 'aguardando' && (
            <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-full text-xs">
              <Clock className="w-3.5 h-3.5" />
              {assumiu
                ? 'Médico revisando prontuário...'
                : encaminhado
                  ? 'Aguardando próximo médico...'
                  : pos !== null
                    ? `${pos}º da fila`
                    : 'Aguardando médico...'}
            </div>
          )}
          {atendimento.status === 'em_andamento' && atendimento.medicos && (
            <div className="text-green-200 text-xs">
              Dr(a). {atendimento.medicos.nome} — {atendimento.medicos.especialidade}
            </div>
          )}
          <button
            onClick={encerrarConsulta}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
          >
            <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
            Encerrar
          </button>
        </div>
      </div>

      {/* Área do vídeo */}
      <div className="flex-1 relative">

        {/* Banner de encaminhamento */}
        {encaminhado && (
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-4 px-4 pointer-events-none">
            <div className="bg-amber-600/95 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
              <ArrowRight className="w-4 h-4 shrink-0" />
              Você foi encaminhado — aguardando próximo médico na fila
            </div>
          </div>
        )}

        {/* Tela de espera */}
        {atendimento.status === 'aguardando' && (
          <div className="absolute inset-0 bg-[#0F1F33] flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center text-white max-w-sm px-6">

              {/* Ícone */}
              <div className="w-20 h-20 bg-[#1A3A2C] rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-green-300" />
              </div>

              {/* Estado: médico assumiu */}
              {assumiu ? (
                <>
                  <h2 className="text-2xl font-bold mb-3 text-green-300">Médico Chegando!</h2>
                  <p className="text-green-200 text-sm leading-relaxed">
                    Um médico já está revisando o seu prontuário e os dados da triagem.
                    Ele entrará na sala em instantes!
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                  </div>
                </>

              /* Estado: posição na fila conhecida */
              ) : pos !== null ? (
                <>
                  {/* Número da posição */}
                  <div className={`font-extrabold mb-1 tabular-nums transition-all ${
                    ehSegundo
                      ? 'text-yellow-300 fila-pisca text-7xl'
                      : pos === 1
                        ? 'text-green-300 text-6xl'
                        : 'text-white text-5xl'
                  }`}>
                    {pos}º
                  </div>

                  <h2 className={`font-bold mb-3 ${ehSegundo ? 'text-yellow-200 text-xl' : 'text-lg'}`}>
                    Você é o <span className="italic">{ordinalPT(pos)}</span> da fila
                  </h2>

                  {/* Médicos ativos */}
                  {(posicaoInfo?.medicosAtivos ?? 0) > 0 && (
                    <div className="flex items-center justify-center gap-1.5 text-blue-300 text-sm mb-2">
                      <Users className="w-4 h-4" />
                      {posicaoInfo!.medicosAtivos} médico{posicaoInfo!.medicosAtivos > 1 ? 's' : ''} atendendo agora
                    </div>
                  )}

                  {/* Total na fila */}
                  {(posicaoInfo?.total ?? 0) > 1 && (
                    <p className="text-gray-500 text-xs mt-1">
                      {posicaoInfo?.total} pessoas na fila
                    </p>
                  )}
                </>

              /* Estado padrão: sem info de posição ainda */
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-3">
                    {encaminhado ? 'Aguardando Próximo Médico' : 'Aguardando Médico'}
                  </h2>
                  <p className="text-green-300 text-sm leading-relaxed">
                    {encaminhado
                      ? 'Você foi encaminhado para outro especialista. Fique na sala — o médico entrará em breve.'
                      : 'Um Médico está analisando a sua triagem, seu histórico de consultas e seu prontuário, e entrará na sala em instantes.'}
                  </p>
                </>
              )}

              <p className="text-blue-400 text-xs mt-5">A câmera vai abrir assim que o médico entrar.</p>
            </div>
          </div>
        )}

        {/* Tela de pré-entrada (médico já está na sala, aguardando paciente clicar) */}
        {!entrou && atendimento.status !== 'aguardando' && (
          <div className="absolute inset-0 bg-[#0F1F33] flex items-center justify-center z-10">
            <div className="text-center text-white max-w-sm px-6">
              <div className="w-24 h-24 bg-[#1A3A2C] rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-[#5BBD9B]" />
              </div>
              {atendimento.medicos && (
                <p className="text-green-300 text-sm mb-4">
                  Dr(a). {atendimento.medicos.nome} está na sala aguardando você.
                </p>
              )}
              <h2 className="text-3xl font-extrabold mb-2 tracking-tight">Entrar AGORA</h2>
              <p className="text-blue-300 text-xs mb-4">
                Clique no botão abaixo para entrar na consulta.
              </p>
              <div className="flex flex-col items-center mb-4">
                <div className="flex flex-col items-center gap-0.5 animate-bounce">
                  <div className="w-0.5 h-6 bg-[#5BBD9B]" />
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-[#5BBD9B]" />
                </div>
              </div>
              <button
                onClick={() => setEntrou(true)}
                className="w-full bg-[#5BBD9B] hover:bg-green-400 text-white font-extrabold py-4 px-8 rounded-2xl text-lg tracking-wide transition-colors shadow-lg shadow-green-900/40"
              >
                Clique AQUI
              </button>
            </div>
          </div>
        )}

        <iframe
          src={videoUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 56px)' }}
        />
      </div>
    </div>
  )
}
