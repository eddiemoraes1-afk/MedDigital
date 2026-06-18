'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Heart, ChevronRight, ChevronLeft, CheckCircle2,
  Loader2, AlertTriangle, Calendar, ArrowLeft,
} from 'lucide-react'

// ── Perguntas ────────────────────────────────────────────────────────────────
const PERGUNTAS = [
  // Organização do trabalho
  {
    id: 'org1', dominio: 'Organização do Trabalho',
    texto: 'Você costuma ter tarefas com prazos impossíveis de cumprir?',
    invertida: false,
  },
  {
    id: 'org2', dominio: 'Organização do Trabalho',
    texto: 'Você tem autonomia para decidir como organizar seu próprio trabalho?',
    invertida: true, // positiva: mais autonomia = menos risco
  },
  {
    id: 'org3', dominio: 'Organização do Trabalho',
    texto: 'Seu ritmo de trabalho é imprevisível — às vezes muito intenso, às vezes sem nada para fazer?',
    invertida: false,
  },
  // Relações e liderança
  {
    id: 'rel1', dominio: 'Relações e Liderança',
    texto: 'Você se sente reconhecido(a) e valorizado(a) pelo seu trabalho?',
    invertida: true,
  },
  {
    id: 'rel2', dominio: 'Relações e Liderança',
    texto: 'Você já presenciou ou vivenciou situações de desrespeito, assédio ou falta de apoio no trabalho?',
    invertida: false,
  },
  {
    id: 'rel3', dominio: 'Relações e Liderança',
    texto: 'Você sente que pode contar com seu gestor ou equipe quando precisa de ajuda?',
    invertida: true,
  },
  // Recursos e ambiente
  {
    id: 'rec1', dominio: 'Recursos e Ambiente',
    texto: 'Os sistemas, equipamentos e ferramentas que você usa funcionam bem?',
    invertida: true,
  },
  {
    id: 'rec2', dominio: 'Recursos e Ambiente',
    texto: 'Você tem espaço físico e condições adequadas para trabalhar com conforto?',
    invertida: true,
  },
  {
    id: 'rec3', dominio: 'Recursos e Ambiente',
    texto: 'Interrupções frequentes dificultam sua concentração no trabalho?',
    invertida: false,
  },
  // Contexto externo
  {
    id: 'con1', dominio: 'Contexto e Equilíbrio',
    texto: 'Você recebe mensagens ou ligações de trabalho fora do horário e sente pressão para responder?',
    invertida: false,
  },
  {
    id: 'con2', dominio: 'Contexto e Equilíbrio',
    texto: 'Você sente que o trabalho compromete seu tempo com família, amigos ou descanso?',
    invertida: false,
  },
  {
    id: 'con3', dominio: 'Contexto e Equilíbrio',
    texto: 'Você sente que tem clareza sobre o que é esperado de você no seu trabalho?',
    invertida: true,
  },
]

const OPCOES = [
  { valor: 1, label: 'Nunca' },
  { valor: 2, label: 'Raramente' },
  { valor: 3, label: 'Às vezes' },
  { valor: 4, label: 'Frequentemente' },
  { valor: 5, label: 'Sempre' },
]

// ── Resultado ─────────────────────────────────────────────────────────────────
function Resultado({ nivel, score, onAgendar }: {
  nivel: 'baixo' | 'medio' | 'alto'
  score: number
  onAgendar: () => void
}) {
  const cfg = {
    baixo: {
      cor: '#5BBD9B',
      bgCor: 'bg-emerald-50',
      borderCor: 'border-emerald-200',
      textoCor: 'text-emerald-700',
      emoji: '😊',
      titulo: 'Ambiente de trabalho saudável',
      mensagem: 'Seus resultados indicam que o ambiente de trabalho atual tem baixo impacto no seu bem-estar. Continue assim!',
    },
    medio: {
      cor: '#F59E0B',
      bgCor: 'bg-amber-50',
      borderCor: 'border-amber-200',
      textoCor: 'text-amber-700',
      emoji: '🤔',
      titulo: 'Alguns pontos de atenção',
      mensagem: 'Identificamos alguns fatores no seu ambiente de trabalho que podem estar gerando estresse. Uma conversa com um profissional pode ajudar.',
    },
    alto: {
      cor: '#EF4444',
      bgCor: 'bg-red-50',
      borderCor: 'border-red-200',
      textoCor: 'text-red-700',
      emoji: '💙',
      titulo: 'Seu bem-estar merece atenção',
      mensagem: 'Seu resultado indica fatores de estresse relevantes no trabalho. Recomendamos conversar com um médico ou psicólogo — você pode fazer isso agora mesmo pela plataforma.',
    },
  }[nivel]

  return (
    <div className="max-w-lg mx-auto text-center space-y-6">
      <div className="text-5xl">{cfg.emoji}</div>

      <div className={`rounded-2xl p-6 border ${cfg.bgCor} ${cfg.borderCor}`}>
        <h2 className={`text-xl font-bold mb-2 ${cfg.textoCor}`}>{cfg.titulo}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{cfg.mensagem}</p>
      </div>

      <p className="text-xs text-gray-400">
        Suas respostas são confidenciais. A empresa só tem acesso a dados agregados, sem identificação.
      </p>

      <div className="flex flex-col gap-3">
        {nivel !== 'baixo' && (
          <button
            onClick={onAgendar}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white transition-colors"
            style={{ background: cfg.cor }}
          >
            <Calendar className="w-4 h-4" />
            Falar com um profissional agora
          </button>
        )}
        <Link
          href="/paciente/dashboard"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function SaudeTrabalhoPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [status, setStatus] = useState<any>(null)
  const [etapa, setEtapa] = useState<'intro' | 'questionario' | 'enviando' | 'resultado'>('intro')
  const [paginaAtual, setPaginaAtual] = useState(0)
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [resultado, setResultado] = useState<{ nivel: 'baixo' | 'medio' | 'alto'; score: number } | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/paciente/triagem-psicossocial')
      .then(r => r.json())
      .then(d => { setStatus(d); setVerificando(false) })
      .catch(() => setVerificando(false))
  }, [])

  const perguntasPorPagina = 1
  const totalPaginas = PERGUNTAS.length
  const perguntaAtual = PERGUNTAS[paginaAtual]
  const respondidas = Object.keys(respostas).length
  const progresso = Math.round((respondidas / PERGUNTAS.length) * 100)

  function responder(valor: number) {
    setRespostas(prev => ({ ...prev, [perguntaAtual.id]: valor }))
  }

  function avancar() {
    if (paginaAtual < totalPaginas - 1) {
      setPaginaAtual(p => p + 1)
    } else {
      enviar()
    }
  }

  function voltar() {
    if (paginaAtual > 0) setPaginaAtual(p => p - 1)
  }

  async function enviar() {
    setEtapa('enviando')
    setErro('')
    try {
      const res = await fetch('/api/paciente/triagem-psicossocial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respostas }),
      })
      if (!res.ok) throw new Error('Erro ao enviar respostas.')
      const data = await res.json()
      setResultado({ nivel: data.nivel_risco, score: data.score_total })
      setEtapa('resultado')
    } catch (e: any) {
      setErro(e.message)
      setEtapa('questionario')
    }
  }

  // Loading
  if (verificando) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
    </div>
  )

  // Sem empresa
  if (status?.motivo === 'sem_empresa') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <Heart className="w-12 h-12 text-gray-200 mx-auto" />
        <h2 className="font-bold text-gray-700">Questionário não disponível</h2>
        <p className="text-sm text-gray-400">
          Esta avaliação é para funcionários vinculados a uma empresa. Você não tem vínculo ativo no momento.
        </p>
        <Link href="/paciente/dashboard" className="inline-flex items-center gap-1 text-sm text-[#5BBD9B] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </Link>
      </div>
    </div>
  )

  // Já respondeu recentemente
  if (status?.motivo === 'recente') {
    const nivelCfg = {
      baixo: { texto: 'Baixo', cor: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
      medio: { texto: 'Médio', cor: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
      alto:  { texto: 'Alto',  cor: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
    }[status.ultima?.nivel_risco as string] ?? { texto: '—', cor: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' }

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <CheckCircle2 className="w-12 h-12 text-[#5BBD9B] mx-auto" />
          <h2 className="font-bold text-[#1A3A2C] text-lg">Você já respondeu recentemente</h2>
          <div className={`rounded-2xl p-5 border ${nivelCfg.bg}`}>
            <p className="text-xs text-gray-400 mb-1">Sua última avaliação</p>
            <p className="text-sm text-gray-600">
              {new Date(status.ultima.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className={`text-lg font-bold mt-2 ${nivelCfg.cor}`}>
              Nível de risco: {nivelCfg.texto}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            O questionário fica disponível novamente após 6 meses.
          </p>
          <Link href="/paciente/dashboard" className="inline-flex items-center gap-1 text-sm text-[#5BBD9B] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Resultado final
  if (etapa === 'resultado' && resultado) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Resultado
        nivel={resultado.nivel}
        score={resultado.score}
        onAgendar={() => router.push('/paciente/triagem')}
      />
    </div>
  )

  // Enviando
  if (etapa === 'enviando') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
      <p className="text-sm">Processando suas respostas...</p>
    </div>
  )

  // Intro
  if (etapa === 'intro') return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#5BBD9B]/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-[#5BBD9B]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3A2C]">Saúde no Trabalho</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Um breve questionário para entendermos como o ambiente de trabalho está impactando seu bem-estar.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
          {[
            { icon: '🔒', texto: 'Suas respostas são anônimas e confidenciais.' },
            { icon: '⏱️', texto: 'Leva menos de 3 minutos para responder.' },
            { icon: '📊', texto: 'A empresa só vê dados agregados, nunca individuais.' },
            { icon: '💙', texto: 'Se precisar de apoio, sugerimos um profissional ao final.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{item.icon}</span>
              <p className="text-sm text-gray-600">{item.texto}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setEtapa('questionario')}
          className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors"
          style={{ background: '#1A3A2C' }}
        >
          Começar
          <ChevronRight className="w-4 h-4" />
        </button>

        <Link href="/paciente/dashboard"
          className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Agora não
        </Link>
      </div>
    </div>
  )

  // Questionário
  const respostaAtual = respostas[perguntaAtual.id]
  const podeAvancar = respostaAtual !== undefined

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">

        {/* Progresso */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">
              {paginaAtual + 1} de {totalPaginas}
            </span>
            <span className="text-xs text-gray-400 font-medium">{perguntaAtual.dominio}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((paginaAtual + 1) / totalPaginas) * 100}%`, background: '#5BBD9B' }}
            />
          </div>
        </div>

        {/* Pergunta */}
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-[#1A3A2C] leading-snug">{perguntaAtual.texto}</p>
        </div>

        {/* Opções */}
        <div className="space-y-3">
          {OPCOES.map((opcao) => {
            const selecionada = respostaAtual === opcao.valor
            return (
              <button
                key={opcao.valor}
                onClick={() => responder(opcao.valor)}
                className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold text-left transition-all border"
                style={selecionada ? {
                  background: '#1A3A2C',
                  borderColor: '#1A3A2C',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(26,58,44,0.2)',
                } : {
                  background: '#fff',
                  borderColor: '#E5E7EB',
                  color: '#374151',
                }}
                onMouseEnter={e => {
                  if (!selecionada) (e.currentTarget as HTMLElement).style.borderColor = '#5BBD9B'
                }}
                onMouseLeave={e => {
                  if (!selecionada) (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'
                }}
              >
                {opcao.label}
              </button>
            )
          })}
        </div>

        {erro && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {erro}
          </div>
        )}

        {/* Navegação */}
        <div className="flex gap-3">
          {paginaAtual > 0 && (
            <button
              onClick={voltar}
              className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          )}
          <button
            onClick={avancar}
            disabled={!podeAvancar}
            className="flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: podeAvancar ? '#1A3A2C' : '#9CA3AF' }}
          >
            {paginaAtual === totalPaginas - 1 ? 'Ver resultado' : 'Próxima'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
