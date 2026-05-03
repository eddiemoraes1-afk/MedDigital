'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Send, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle,
  Info, Video, Calendar, Shield, Phone, FileText, XCircle, Brain, ChevronRight
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

interface DadosSintomas {
  motivosPrincipais: string[]
  outroMotivo: string
  locaisDor: string[]
  outraLocalizacaoDor: string
  intensidadeDor: number | null
  tomouRemedio: boolean | null
  oQueTomou: string
  remedioMelhorou: 'sim' | 'nao' | 'parcial' | null
  remedioContinuo: boolean | null
  remedioContinuoQuais: string
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
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
}
function formatarTelefone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
}

// ─── Indicador de progresso (3 etapas) ───────────────────────────────────────

function ProgressoTriagem({ etapaAtual }: { etapaAtual: 1 | 2 | 3 }) {
  const passos = [
    { num: 1, label: 'Identificação' },
    { num: 2, label: 'Sintomas' },
    { num: 3, label: 'Triagem IA' },
  ]
  return (
    <div className="flex items-center gap-1 mb-6 shrink-0">
      {passos.map((p, i) => {
        const feito = p.num < etapaAtual
        const atual = p.num === etapaAtual
        return (
          <div key={p.num} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className={`flex items-center gap-1.5 ${!atual && !feito ? 'opacity-40' : ''}`}>
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                ${feito ? 'bg-[#5BBD9B] text-white' : atual ? 'bg-[#1A3A2C] text-white' : 'border-2 border-gray-300 text-gray-400'}`}>
                {feito ? <CheckCircle2 className="w-4 h-4" /> : p.num}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${atual ? 'text-[#1A3A2C]' : 'text-gray-400'}`}>
                {p.label}
              </span>
            </div>
            {i < passos.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${feito ? 'bg-[#5BBD9B]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Etapa 1: Validação ───────────────────────────────────────────────────────

function EtapaValidacao({
  nomeInicial, cpfInicial, telefoneInicial, onAceitar,
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
    onAceitar({ cpf: cpf.replace(/\D/g, ''), telefone: telefone.replace(/\D/g, ''), consentimentoEm: new Date().toISOString() })
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
          <Link href="/paciente/dashboard"
            className="inline-block bg-[#1A3A2C] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#5BBD9B] transition-colors">
            Voltar ao painel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <ProgressoTriagem etapaAtual={1} />

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
          Confirme seus dados de contato antes de iniciar. Eles garantem que estamos
          atendendo a pessoa certa e que podemos entrar em contato se necessário.
        </p>

        {/* Nome */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={nomeInicial} readOnly
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 cursor-default" />
          </div>
        </div>

        {/* CPF */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={cpf} onChange={e => setCpf(formatarCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm" />
          </div>
        </div>

        {/* Telefone */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp para contato</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Utilizado apenas se a conexão cair durante o atendimento.</p>
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
          <button onClick={handleAceitar}
            className="flex-1 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Sim, autorizo
          </button>
          <button onClick={() => setRecusou(true)}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-500 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
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

// ─── Etapa 2: Sintomas ────────────────────────────────────────────────────────

const MOTIVOS = [
  'Dor (em qualquer parte do corpo)',
  'Febre',
  'Tosse',
  'Diarreia',
  'Náusea / Vômito',
  'Alergia',
  'Tontura',
  'Ansiedade',
  'Trauma',
  'Dor ao Urinar',
  'Outro',
]

const LOCAIS_DOR = [
  'Dor de Cabeça',
  'Dor de Estômago',
  'Dor de Garganta',
  'Dor no Peito',
  'Dor nas Costas',
  'Dor nos Braços / Mãos',
  'Dor nas Pernas / Pés',
  'Outro Lugar',
]

function EtapaSintomas({ onProximo }: { onProximo: (dados: DadosSintomas) => void }) {
  const [motivosPrincipais, setMotivosPrincipais] = useState<string[]>([])
  const [outroMotivo, setOutroMotivo] = useState('')
  const [locaisDor, setLocaisDor] = useState<string[]>([])
  const [outraLocalizacaoDor, setOutraLocalizacaoDor] = useState('')
  const [intensidadeDor, setIntensidadeDor] = useState<number | null>(null)
  const [tomouRemedio, setTomouRemedio] = useState<boolean | null>(null)
  const [oQueTomou, setOQueTomou] = useState('')
  const [remedioMelhorou, setRemedioMelhorou] = useState<'sim' | 'nao' | 'parcial' | null>(null)
  const [remedioContinuo, setRemedioContinuo] = useState<boolean | null>(null)
  const [remedioContinuoQuais, setRemedioContinuoQuais] = useState('')
  const [erro, setErro] = useState('')

  const temDor = motivosPrincipais.includes('Dor (em qualquer parte do corpo)')
  const temOutro = motivosPrincipais.includes('Outro')
  const temOutroLugar = locaisDor.includes('Outro Lugar')

  function toggleMotivo(motivo: string) {
    setMotivosPrincipais(prev => {
      if (prev.includes(motivo)) {
        const novo = prev.filter(m => m !== motivo)
        if (motivo === 'Dor (em qualquer parte do corpo)') setLocaisDor([])
        return novo
      }
      if (prev.length >= 3) return prev
      return [...prev, motivo]
    })
  }

  function toggleLocalDor(local: string) {
    setLocaisDor(prev =>
      prev.includes(local) ? prev.filter(l => l !== local) : [...prev, local]
    )
  }

  function handleProximo() {
    if (motivosPrincipais.length === 0) { setErro('Selecione pelo menos um motivo de atendimento.'); return }
    if (temOutro && !outroMotivo.trim()) { setErro('Descreva o outro motivo do atendimento.'); return }
    if (temDor && locaisDor.length === 0) { setErro('Indique onde está sentindo dor.'); return }
    if (temDor && temOutroLugar && !outraLocalizacaoDor.trim()) { setErro('Descreva onde está sentindo dor.'); return }
    if (temDor && intensidadeDor === null) { setErro('Indique a intensidade da dor (0 a 10).'); return }
    if (tomouRemedio === null) { setErro('Responda se tomou algum remédio ou fez algo para melhorar.'); return }
    if (tomouRemedio && remedioMelhorou === null) { setErro('Indique se melhorou após o remédio.'); return }
    if (remedioContinuo === null) { setErro('Responda se toma algum remédio de uso contínuo.'); return }
    if (remedioContinuo && !remedioContinuoQuais.trim()) { setErro('Informe quais remédios você usa continuamente.'); return }
    setErro('')
    onProximo({
      motivosPrincipais, outroMotivo, locaisDor, outraLocalizacaoDor,
      intensidadeDor, tomouRemedio, oQueTomou, remedioMelhorou, remedioContinuo, remedioContinuoQuais,
    })
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <ProgressoTriagem etapaAtual={2} />

        {/* Banner explicativo */}
        <div className="bg-[#F3FAF7] border border-green-100 rounded-2xl px-5 py-4 mb-6">
          <p className="text-sm text-[#1A3A2C] leading-relaxed">
            <strong>É importante o preenchimento completo da triagem</strong> para que o/a médico(a)
            possa fazer o diagnóstico mais rápido.
          </p>
        </div>

        {/* Motivos principais */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-sm font-bold text-[#1A3A2C] mb-1">
            Qual o principal motivo do atendimento hoje?
          </p>
          <p className="text-xs text-gray-400 mb-4">Selecione até 3 opções.</p>

          <div className="space-y-2">
            {MOTIVOS.map(motivo => {
              const selecionado = motivosPrincipais.includes(motivo)
              const bloqueado = !selecionado && motivosPrincipais.length >= 3
              return (
                <label key={motivo}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                    ${selecionado ? 'bg-[#EAF7F2] border-[#5BBD9B]' : bloqueado ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selecionado} disabled={bloqueado}
                    onChange={() => toggleMotivo(motivo)} className="accent-[#5BBD9B] w-4 h-4 shrink-0" />
                  <span className="text-sm text-gray-700">{motivo}</span>
                </label>
              )
            })}
          </div>

          {/* Campo Outro motivo */}
          {temOutro && (
            <div className="mt-3">
              <input type="text" value={outroMotivo} onChange={e => setOutroMotivo(e.target.value)}
                placeholder="Descreva o motivo..."
                className="w-full px-4 py-2.5 border border-[#5BBD9B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />
            </div>
          )}
        </div>

        {/* Localização da dor */}
        {temDor && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <p className="text-sm font-bold text-[#1A3A2C] mb-4">Onde está sentindo dor?</p>
            <div className="space-y-2">
              {LOCAIS_DOR.map(local => {
                const selecionado = locaisDor.includes(local)
                return (
                  <label key={local}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                      ${selecionado ? 'bg-[#EAF7F2] border-[#5BBD9B]' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selecionado} onChange={() => toggleLocalDor(local)}
                      className="accent-[#5BBD9B] w-4 h-4 shrink-0" />
                    <span className="text-sm text-gray-700">{local}</span>
                  </label>
                )
              })}
            </div>

            {/* Campo Outro Lugar */}
            {temOutroLugar && (
              <div className="mt-3">
                <input type="text" value={outraLocalizacaoDor} onChange={e => setOutraLocalizacaoDor(e.target.value)}
                  placeholder="Em qual parte do corpo?"
                  className="w-full px-4 py-2.5 border border-[#5BBD9B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />
              </div>
            )}

            {/* Intensidade da dor */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-sm font-semibold text-[#1A3A2C] mb-3">De 0 a 10, qual a intensidade da dor?</p>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 11 }, (_, i) => (
                  <button key={i} type="button" onClick={() => setIntensidadeDor(i)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors
                      ${intensidadeDor === i
                        ? i <= 3 ? 'bg-green-500 text-white' : i <= 6 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {i}
                  </button>
                ))}
              </div>
              {intensidadeDor !== null && (
                <p className="text-xs text-gray-400 mt-2">
                  {intensidadeDor <= 3 ? 'Leve' : intensidadeDor <= 6 ? 'Moderada' : 'Intensa'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Remédio para melhorar */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-sm font-bold text-[#1A3A2C] mb-3">
            Já tomou algum remédio ou fez algo para melhorar?
          </p>
          <div className="flex gap-3">
            {(['Sim', 'Não'] as const).map(op => {
              const val = op === 'Sim'
              const ativo = tomouRemedio === val
              return (
                <button key={op} type="button" onClick={() => { setTomouRemedio(val); if (!val) { setRemedioMelhorou(null); setOQueTomou('') } }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                    ${ativo ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {op}
                </button>
              )
            })}
          </div>

          {tomouRemedio && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A3A2C] mb-1">O que tomou ou fez?</label>
                <textarea
                  value={oQueTomou}
                  onChange={e => setOQueTomou(e.target.value)}
                  placeholder="Ex: Dipirona 500mg, compressa fria, chá de camomila..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A3A2C] mb-3">Melhorou?</p>
                <div className="flex gap-3">
                  {([{ label: 'Sim', val: 'sim' }, { label: 'Parcialmente', val: 'parcial' }, { label: 'Não', val: 'nao' }] as const).map(op => (
                    <button key={op.val} type="button" onClick={() => setRemedioMelhorou(op.val)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                        ${remedioMelhorou === op.val ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Remédio contínuo */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <p className="text-sm font-bold text-[#1A3A2C] mb-3">
            Você toma algum remédio de uso contínuo?
          </p>
          <div className="flex gap-3">
            {(['Sim', 'Não'] as const).map(op => {
              const val = op === 'Sim'
              const ativo = remedioContinuo === val
              return (
                <button key={op} type="button" onClick={() => { setRemedioContinuo(val); if (!val) setRemedioContinuoQuais('') }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                    ${ativo ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {op}
                </button>
              )
            })}
          </div>

          {remedioContinuo && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qual ou quais?</label>
              <textarea value={remedioContinuoQuais} onChange={e => setRemedioContinuoQuais(e.target.value)}
                placeholder="Ex: Losartana 50mg, Metformina 500mg..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none" />
            </div>
          )}
        </div>

        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}

        <button onClick={handleProximo}
          className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          Próximo — Iniciar Triagem com IA <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function TriagemPage() {
  const router = useRouter()

  type Etapa = 'carregando' | 'validacao' | 'sintomas' | 'triagem'
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [pacienteId, setPacienteId] = useState<string | null>(null)
  const [nomeInicial, setNomeInicial] = useState('')
  const [cpfInicial, setCpfInicial] = useState('')
  const [telefoneInicial, setTelefoneInicial] = useState('')
  const [validacao, setValidacao] = useState<DadosValidacao | null>(null)
  const [sintomas, setSintomas] = useState<DadosSintomas | null>(null)

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

  useEffect(() => {
    async function carregarPaciente() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: paciente } = await supabase
        .from('pacientes').select('id, nome, cpf, telefone').eq('usuario_id', user.id).single()
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
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [mensagens, carregando])

  function voltar() {
    if (etapa === 'sintomas') { setEtapa('validacao') }
    else if (etapa === 'triagem') { setEtapa('sintomas'); setMensagens([]); setResultado(null); trocasRef.current = 0 }
    else { router.push('/paciente/dashboard') }
  }

  async function handleValidacao(dados: DadosValidacao) {
    setValidacao(dados)
    setEtapa('sintomas')
  }

  async function handleSintomas(dados: DadosSintomas) {
    setSintomas(dados)
    setEtapa('triagem')
    iniciarTriagem(dados)
  }

  async function iniciarTriagem(dadosSintomas?: DadosSintomas) {
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
      setMensagens([{ role: 'assistant', content: data.resposta, timestamp: new Date().toISOString() }])
    }
    setIniciando(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || carregando) return

    const novaMensagem: Mensagem = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() }
    const historico = [...mensagens, novaMensagem]
    setMensagens(historico)
    setInput('')
    setCarregando(true)
    trocasRef.current += 1

    const res = await fetch('/api/triagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagens: historico.map(m => ({ role: m.role, content: m.content })),
        finalizar: trocasRef.current >= 4
      })
    })

    const data = await res.json()
    setCarregando(false)

    if (data.resposta) {
      setMensagens(prev => [...prev, { role: 'assistant', content: data.resposta, timestamp: new Date().toISOString() }])
    }
    if (data.resultado) {
      setResultado(data.resultado)
      await salvarTriagem([...historico, { role: 'assistant' as const, content: data.resposta, timestamp: new Date().toISOString() }], data.resultado)
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
        dados_sintomas: sintomas ?? null,
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
    <div className="min-h-screen bg-[#F3FAF7] flex flex-col">

      {/* Header */}
      <header className="bg-[#1A3A2C] text-white px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={voltar} className="text-green-200 hover:text-white" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </button>
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

      {/* Carregando */}
      {etapa === 'carregando' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B] mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Carregando seus dados...</p>
          </div>
        </div>
      )}

      {/* Etapa 1 */}
      {etapa === 'validacao' && (
        <EtapaValidacao
          nomeInicial={nomeInicial}
          cpfInicial={cpfInicial}
          telefoneInicial={telefoneInicial}
          onAceitar={handleValidacao}
        />
      )}

      {/* Etapa 2 */}
      {etapa === 'sintomas' && (
        <EtapaSintomas onProximo={handleSintomas} />
      )}

      {/* Etapa 3: chat */}
      {etapa === 'triagem' && (
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4 overflow-hidden">
          <ProgressoTriagem etapaAtual={3} />

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

                {resultado && config && (
                  <div className={`border-2 rounded-2xl p-6 mt-4 ${config.cor}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <config.icon className="w-6 h-6" />
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${config.badge}`}>{config.label}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2"><strong>Resumo:</strong> {resultado.resumo}</p>
                    <p className="text-sm text-gray-600 mb-5">{config.mensagem}</p>
                    <div className="flex flex-wrap gap-3">
                      {resultado.direcionamento === 'virtual' ? (
                        <button onClick={solicitarConsulta} disabled={solicitando}
                          className="flex items-center gap-2 bg-[#1A3A2C] hover:bg-[#5BBD9B] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                          {solicitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                          {solicitando ? 'Criando sala...' : 'Iniciar consulta virtual'}
                        </button>
                      ) : resultado.direcionamento === 'presencial' ? (
                        <a href="tel:192" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                          Ligar para o SAMU (192)
                        </a>
                      ) : null}
                      {resultado.direcionamento !== 'presencial' && (
                        <Link href="/paciente/agendar"
                          className="flex items-center gap-2 bg-[#7B3FA0] hover:bg-[#6a2f8f] text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                          <Calendar className="w-4 h-4" /> Agendar consulta
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

          {!resultado && (
            <form onSubmit={enviarMensagem} className="flex gap-3 shrink-0">
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder="Descreva como você está se sentindo..."
                disabled={carregando || iniciando}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] disabled:opacity-50" />
              <button type="submit" disabled={carregando || iniciando || !input.trim()}
                className="bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0">
                {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
