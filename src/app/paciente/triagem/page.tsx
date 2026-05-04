'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle,
  Video, Calendar, Shield, Phone, FileText, XCircle, ChevronRight,
  SkipForward, Stethoscope, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultadoTriagem {
  classificacao: 'verde' | 'amarelo' | 'vermelho'
  resumo: string
  recomendacao: string
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

interface DadosUrgencia {
  dorNoPeito: boolean | null
  faltaDeAr: boolean | null
  sintomaNeuro: boolean | null
  desmaio: boolean | null
  convulsao: boolean | null
  sangramento: boolean | null
  trauma: boolean | null
  dorExtrema: boolean | null
  gravidez: boolean | null
}

// ─── Config de risco ──────────────────────────────────────────────────────────

const configRisco = {
  verde: {
    cor: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    badgeBorder: 'border-green-300',
    label: 'Risco Baixo',
    emoji: '🟢',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
    titulo: 'Tudo sob controle',
    mensagem: 'Seus sintomas indicam baixa urgência. Você pode agendar uma consulta ou falar com um médico agora mesmo.',
  },
  amarelo: {
    cor: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    badgeBorder: 'border-yellow-300',
    label: 'Risco Moderado',
    emoji: '🟡',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    titulo: 'Atenção necessária',
    mensagem: 'Recomendamos uma avaliação médica. Você pode consultar um médico agora ou agendar uma consulta.',
  },
  vermelho: {
    cor: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    badgeBorder: 'border-red-300',
    label: 'Risco Alto',
    emoji: '🔴',
    icon: AlertCircle,
    iconColor: 'text-red-600',
    titulo: 'Atendimento imediato necessário',
    mensagem: 'Seus sintomas indicam urgência. Um médico disponível será acionado agora para te atender imediatamente.',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
}
function formatarTelefone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
}

// ─── Progresso (4 etapas) ─────────────────────────────────────────────────────

function ProgressoTriagem({ atual }: { atual: 1 | 2 | 3 | 4 }) {
  const passos = [
    { num: 1, label: 'Identificação' },
    { num: 2, label: 'Sintomas' },
    { num: 3, label: 'Urgência' },
    { num: 4, label: 'Resultado' },
  ]
  return (
    <div className="flex items-center gap-1 mb-6">
      {passos.map((p, i) => {
        const feito = p.num < atual
        const ativo = p.num === atual
        return (
          <div key={p.num} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className={`flex items-center gap-1.5 ${!ativo && !feito ? 'opacity-35' : ''}`}>
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                ${feito ? 'bg-[#5BBD9B] text-white' : ativo ? 'bg-[#1A3A2C] text-white' : 'border-2 border-gray-300 text-gray-400'}`}>
                {feito ? <CheckCircle2 className="w-4 h-4" /> : p.num}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap hidden sm:block ${ativo ? 'text-[#1A3A2C]' : 'text-gray-400'}`}>
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

// ─── Componente SimNao ────────────────────────────────────────────────────────

function SimNao({ valor, onChange }: { valor: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3 mt-2">
      {[{ label: 'Sim', val: true }, { label: 'Não', val: false }].map(op => (
        <button key={String(op.val)} type="button" onClick={() => onChange(op.val)}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors
            ${valor === op.val ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {op.label}
        </button>
      ))}
    </div>
  )
}

// ─── Etapa 1: Validação ───────────────────────────────────────────────────────

function EtapaValidacao({
  nomeInicial, cpfInicial, telefoneInicial,
  onFazerTriagem, onPularTriagem,
}: {
  nomeInicial: string
  cpfInicial: string
  telefoneInicial: string
  onFazerTriagem: (dados: DadosValidacao) => void
  onPularTriagem: (dados: DadosValidacao) => void
}) {
  const [cpf, setCpf] = useState(cpfInicial ? formatarCPF(cpfInicial) : '')
  const [telefone, setTelefone] = useState(telefoneInicial ? formatarTelefone(telefoneInicial) : '')
  const [recusou, setRecusou] = useState(false)
  const [aceito, setAceito] = useState(false)
  const [confirmandoPular, setConfirmandoPular] = useState(false)
  const [erro, setErro] = useState('')

  function dadosValidacao(): DadosValidacao {
    return { cpf: cpf.replace(/\D/g, ''), telefone: telefone.replace(/\D/g, ''), consentimentoEm: new Date().toISOString() }
  }

  function handleAceitar() {
    if (!cpf.trim()) { setErro('Por favor, confirme seu CPF.'); return }
    if (!telefone.trim()) { setErro('Por favor, informe um telefone para contato.'); return }
    setErro('')
    setAceito(true)
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
        <ProgressoTriagem atual={1} />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-[#5BBD9B]" />
          </div>
          <div>
            <h2 className="font-bold text-[#1A3A2C] text-lg leading-tight">Confirmação de identidade</h2>
            {nomeInicial && <p className="text-sm text-gray-500 mt-0.5">Olá, {nomeInicial.split(' ')[0]}!</p>}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Confirme seus dados antes de iniciar. Isso garante que estamos atendendo a pessoa certa
          e que podemos entrar em contato se necessário.
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
              placeholder="000.000.000-00" disabled={aceito}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm disabled:bg-gray-50 disabled:cursor-default" />
          </div>
        </div>

        {/* Telefone */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp para contato</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(11) 99999-9999" disabled={aceito}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm disabled:bg-gray-50 disabled:cursor-default" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Utilizado apenas se a conexão cair durante o atendimento.</p>
        </div>

        {/* Consentimento LGPD */}
        {!aceito && (
          <>
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
            <p className="text-xs text-gray-400 text-center mt-3">
              Ao clicar em "Sim, autorizo", você declara que leu e concorda com os termos acima.
              Registro em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
            </p>
          </>
        )}

        {/* Após consentimento: Fazer Triagem / Pular */}
        {aceito && !confirmandoPular && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-medium">Consentimento registrado com sucesso.</p>
            </div>
            <button onClick={() => onFazerTriagem(dadosValidacao())}
              className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Stethoscope className="w-4 h-4" /> Fazer Triagem
            </button>
            <button onClick={() => setConfirmandoPular(true)}
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-500 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <SkipForward className="w-4 h-4" /> Pular Triagem
            </button>
          </div>
        )}

        {/* Confirmação de pular */}
        {aceito && confirmandoPular && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-amber-800 mb-1">Confirma que vai pular a triagem?</p>
            <p className="text-xs text-amber-600 mb-4">
              Você poderá iniciar uma consulta virtual ou agendar uma consulta diretamente pelo painel.
            </p>
            <div className="flex gap-3">
              <button onClick={() => onPularTriagem(dadosValidacao())}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                Sim, pular
              </button>
              <button onClick={() => setConfirmandoPular(false)}
                className="flex-1 border border-gray-200 hover:bg-white text-gray-600 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Listas de sintomas ───────────────────────────────────────────────────────

const MOTIVOS = [
  'Dor (em qualquer parte do corpo)', 'Febre', 'Tosse', 'Diarreia',
  'Náusea / Vômito', 'Alergia', 'Tontura', 'Ansiedade',
  'Trauma', 'Dor ao Urinar', 'Outro',
]

const LOCAIS_DOR = [
  'Dor de Cabeça', 'Dor de Estômago', 'Dor de Garganta', 'Dor no Peito',
  'Dor nas Costas', 'Dor nos Braços / Mãos', 'Dor nas Pernas / Pés', 'Outro Lugar',
]

// ─── Etapa 2: Sintomas ────────────────────────────────────────────────────────

function EtapaSintomas({ onEnviar }: { onEnviar: (dados: DadosSintomas) => void }) {
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
        if (motivo === 'Dor (em qualquer parte do corpo)') setLocaisDor([])
        return prev.filter(m => m !== motivo)
      }
      if (prev.length >= 3) return prev
      return [...prev, motivo]
    })
  }

  function toggleLocalDor(local: string) {
    setLocaisDor(prev => prev.includes(local) ? prev.filter(l => l !== local) : [...prev, local])
  }

  function handleEnviar() {
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
    onEnviar({ motivosPrincipais, outroMotivo, locaisDor, outraLocalizacaoDor, intensidadeDor, tomouRemedio, oQueTomou, remedioMelhorou, remedioContinuo, remedioContinuoQuais })
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <ProgressoTriagem atual={2} />

        {/* Banner destacado */}
        <div className="bg-[#1A3A2C] rounded-2xl px-5 py-4 mb-6">
          <p className="text-base font-semibold text-white leading-relaxed">
            É importante o preenchimento completo da triagem para que o/a médico(a) possa fazer o diagnóstico mais rápido.
          </p>
        </div>

        {/* Motivos */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-sm font-bold text-[#1A3A2C] mb-1">Qual o principal motivo do atendimento hoje?</p>
          <p className="text-xs text-gray-400 mb-4">Selecione até 3 opções.</p>
          <div className="space-y-2">
            {MOTIVOS.map(motivo => {
              const sel = motivosPrincipais.includes(motivo)
              const bloq = !sel && motivosPrincipais.length >= 3
              return (
                <label key={motivo}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                    ${sel ? 'bg-[#EAF7F2] border-[#5BBD9B]' : bloq ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={sel} disabled={bloq} onChange={() => toggleMotivo(motivo)}
                    className="accent-[#5BBD9B] w-4 h-4 shrink-0" />
                  <span className="text-sm text-gray-700">{motivo}</span>
                </label>
              )
            })}
          </div>
          {temOutro && (
            <input type="text" value={outroMotivo} onChange={e => setOutroMotivo(e.target.value)}
              placeholder="Descreva o motivo..." className="mt-3 w-full px-4 py-2.5 border border-[#5BBD9B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />
          )}
        </div>

        {/* Localização da dor */}
        {temDor && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <p className="text-sm font-bold text-[#1A3A2C] mb-4">Onde está sentindo dor?</p>
            <div className="space-y-2">
              {LOCAIS_DOR.map(local => {
                const sel = locaisDor.includes(local)
                return (
                  <label key={local}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                      ${sel ? 'bg-[#EAF7F2] border-[#5BBD9B]' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={sel} onChange={() => toggleLocalDor(local)}
                      className="accent-[#5BBD9B] w-4 h-4 shrink-0" />
                    <span className="text-sm text-gray-700">{local}</span>
                  </label>
                )
              })}
            </div>
            {temOutroLugar && (
              <input type="text" value={outraLocalizacaoDor} onChange={e => setOutraLocalizacaoDor(e.target.value)}
                placeholder="Em qual parte do corpo?" className="mt-3 w-full px-4 py-2.5 border border-[#5BBD9B] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]" />
            )}

            {/* Intensidade */}
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
                  {intensidadeDor <= 3 ? '😌 Leve' : intensidadeDor <= 6 ? '😣 Moderada' : '😰 Intensa'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Remédio */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-sm font-bold text-[#1A3A2C] mb-3">Já tomou algum remédio ou fez algo para melhorar?</p>
          <div className="flex gap-3">
            {[{ label: 'Sim', val: true }, { label: 'Não', val: false }].map(op => (
              <button key={String(op.val)} type="button"
                onClick={() => { setTomouRemedio(op.val); if (!op.val) { setRemedioMelhorou(null); setOQueTomou('') } }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                  ${tomouRemedio === op.val ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {op.label}
              </button>
            ))}
          </div>
          {tomouRemedio && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A3A2C] mb-1">O que tomou ou fez?</label>
                <textarea value={oQueTomou} onChange={e => setOQueTomou(e.target.value)}
                  placeholder="Ex: Dipirona 500mg, compressa fria, chá..." rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A3A2C] mb-2">Melhorou?</p>
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
          <p className="text-sm font-bold text-[#1A3A2C] mb-3">Você toma algum remédio de uso contínuo?</p>
          <div className="flex gap-3">
            {[{ label: 'Sim', val: true }, { label: 'Não', val: false }].map(op => (
              <button key={String(op.val)} type="button"
                onClick={() => { setRemedioContinuo(op.val); if (!op.val) setRemedioContinuoQuais('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                  ${remedioContinuo === op.val ? 'bg-[#1A3A2C] text-white border-[#1A3A2C]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {op.label}
              </button>
            ))}
          </div>
          {remedioContinuo && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qual ou quais?</label>
              <textarea value={remedioContinuoQuais} onChange={e => setRemedioContinuoQuais(e.target.value)}
                placeholder="Ex: Losartana 50mg, Metformina 500mg..." rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none" />
            </div>
          )}
        </div>

        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}

        <button onClick={handleEnviar}
          className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          Enviar <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Etapa 3: Urgência ────────────────────────────────────────────────────────

function EtapaUrgencia({
  sintomas,
  onEnviar,
}: {
  sintomas: DadosSintomas | null
  onEnviar: (dados: DadosUrgencia) => void
}) {
  const [dorNoPeito, setDorNoPeito] = useState<boolean | null>(null)
  const [faltaDeAr, setFaltaDeAr] = useState<boolean | null>(null)
  const [sintomaNeuro, setSintomaNeuro] = useState<boolean | null>(null)
  const [desmaio, setDesmaio] = useState<boolean | null>(null)
  const [convulsao, setConvulsao] = useState<boolean | null>(null)
  const [sangramento, setSangramento] = useState<boolean | null>(null)
  const [trauma, setTrauma] = useState<boolean | null>(null)
  const [dorExtrema, setDorExtrema] = useState<boolean | null>(null)
  const [gravidez, setGravidez] = useState<boolean | null>(null)
  const [erro, setErro] = useState('')

  const temDorNoPeito = sintomas?.locaisDor.includes('Dor no Peito') ?? false

  const perguntas = [
    ...(temDorNoPeito ? [{
      id: 'dorNoPeito',
      destaque: 'Dor no Peito',
      texto: 'Você está com dor, aperto, pressão ou queimação no peito?',
      valor: dorNoPeito,
      onChange: setDorNoPeito,
    }] : []),
    { id: 'faltaDeAr',    destaque: 'Falta de Ar',          texto: 'Você está com falta de ar intensa ou dificuldade para falar frases completas?',                                       valor: faltaDeAr,     onChange: setFaltaDeAr },
    { id: 'sintomaNeuro', destaque: 'Sintoma neurológico',   texto: 'Teve fraqueza em um lado do corpo, boca torta, fala enrolada, confusão mental ou perda de visão?',                    valor: sintomaNeuro,  onChange: setSintomaNeuro },
    { id: 'desmaio',      destaque: 'Desmaio',               texto: 'Teve desmaio, perda de consciência ou quase desmaiou?',                                                                valor: desmaio,       onChange: setDesmaio },
    { id: 'convulsao',    destaque: 'Convulsão',              texto: 'Teve convulsão ou crise semelhante?',                                                                                   valor: convulsao,     onChange: setConvulsao },
    { id: 'sangramento',  destaque: 'Sangramento',            texto: 'Está com sangramento intenso ou que não para?',                                                                         valor: sangramento,   onChange: setSangramento },
    { id: 'trauma',       destaque: 'Trauma',                 texto: 'Sofreu queda, acidente, pancada forte ou suspeita de fratura?',                                                         valor: trauma,        onChange: setTrauma },
    { id: 'dorExtrema',   destaque: 'Dor extrema',            texto: 'Está com dor muito forte, diferente do habitual ou que piorou rapidamente?',                                           valor: dorExtrema,    onChange: setDorExtrema },
    { id: 'gravidez',     destaque: 'Gravidez',               texto: 'Está grávida e com dor abdominal, sangramento, pressão alta, falta de ar ou redução dos movimentos do bebê?',          valor: gravidez,      onChange: setGravidez },
  ]

  function handleEnviar() {
    const incompletas = perguntas.filter(p => p.valor === null)
    if (incompletas.length > 0) { setErro('Responda todas as perguntas antes de continuar.'); return }
    setErro('')
    onEnviar({ dorNoPeito, faltaDeAr, sintomaNeuro, desmaio, convulsao, sangramento, trauma, dorExtrema, gravidez })
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <ProgressoTriagem atual={3} />

        {/* Banner destacado */}
        <div className="bg-[#1A3A2C] rounded-2xl px-5 py-4 mb-6">
          <p className="text-base font-semibold text-white leading-relaxed">
            Já estamos quase no fim, mas as informações são muito importantes.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {perguntas.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm p-5 ${p.valor ? 'ring-2 ring-red-300' : ''}`}>
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-bold text-[#1A3A2C]">{p.destaque}: </span>
                {p.texto}
              </p>
              <SimNao valor={p.valor} onChange={p.onChange} />
            </div>
          ))}
        </div>

        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}

        <button onClick={handleEnviar}
          className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          Enviar <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Etapa 4: Resultado ───────────────────────────────────────────────────────

function EtapaResultado({
  resultado,
  analisando,
  erroAnalise,
  solicitando,
  salvando,
  onSolicitarImediato,
  onConsultarAgora,
}: {
  resultado: ResultadoTriagem | null
  analisando: boolean
  erroAnalise: string
  solicitando: boolean
  salvando: boolean
  onSolicitarImediato: () => void
  onConsultarAgora: () => void
}) {
  if (analisando) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg mx-auto w-full">
          <ProgressoTriagem atual={4} />
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-[#EAF7F2] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
            </div>
            <p className="text-lg font-bold text-[#1A3A2C] mb-2">Analisando seus dados...</p>
            <p className="text-sm text-gray-400">Nossa IA está avaliando suas informações para determinar o melhor atendimento.</p>
          </div>
        </div>
      </div>
    )
  }

  if (erroAnalise) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg mx-auto w-full">
          <ProgressoTriagem atual={4} />
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="font-bold text-gray-800 mb-2">Erro na análise</p>
            <p className="text-sm text-gray-500 mb-6">{erroAnalise}</p>
            <Link href="/paciente/dashboard"
              className="inline-block bg-[#1A3A2C] text-white px-6 py-2.5 rounded-xl text-sm font-medium">
              Voltar ao painel
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!resultado) return null

  const config = configRisco[resultado.classificacao]
  const Icon = config.icon
  const isAlto = resultado.classificacao === 'vermelho'

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <ProgressoTriagem atual={4} />

        {/* Card de resultado */}
        <div className={`border-2 rounded-2xl p-6 mb-4 ${config.cor}`}>

          {/* Badge de risco */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${config.badge}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${config.badge} ${config.badgeBorder}`}>
                {config.emoji} {config.label}
              </span>
              <p className="text-base font-bold text-[#1A3A2C] mt-1">{config.titulo}</p>
            </div>
          </div>

          {/* Resumo da IA */}
          <div className="bg-white/70 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Resumo da triagem</p>
            <p className="text-sm text-gray-700 leading-relaxed">{resultado.resumo}</p>
          </div>

          {/* Recomendação */}
          <p className="text-sm text-gray-600 leading-relaxed mb-5">{resultado.recomendacao}</p>

          {/* CTAs baseadas no risco */}
          {isAlto ? (
            /* Risco Alto: apenas atendimento imediato */
            <div className="space-y-3">
              <button onClick={onSolicitarImediato} disabled={solicitando}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-4 rounded-xl text-sm font-bold transition-colors">
                {solicitando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Conectando com médico...</>
                  : <><Clock className="w-4 h-4" /> Atendimento imediato</>
                }
              </button>
              <p className="text-xs text-center text-gray-500">
                Você entrará na fila de atendimento e será atendido pelo próximo médico disponível.
              </p>
              <div className="pt-2 border-t border-gray-200">
                <a href="tel:192"
                  className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  📞 Ligar para o SAMU (192)
                </a>
              </div>
            </div>
          ) : (
            /* Risco Baixo / Moderado: agendar ou consultar agora */
            <div className="space-y-3">
              <button onClick={onConsultarAgora} disabled={solicitando}
                className="w-full flex items-center justify-center gap-2 bg-[#1A3A2C] hover:bg-[#5BBD9B] disabled:opacity-60 text-white py-3.5 rounded-xl text-sm font-semibold transition-colors">
                {solicitando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando sala...</>
                  : <><Video className="w-4 h-4" /> Consultar na hora</>
                }
              </button>
              <Link href="/paciente/agendar"
                className="w-full flex items-center justify-center gap-2 border border-[#1A3A2C] text-[#1A3A2C] hover:bg-[#EAF7F2] py-3.5 rounded-xl text-sm font-semibold transition-colors">
                <Calendar className="w-4 h-4" /> Agendar uma consulta
              </Link>
            </div>
          )}

          {salvando && (
            <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando no prontuário...
            </p>
          )}
        </div>

        <Link href="/paciente/dashboard"
          className="block text-center text-sm text-gray-400 hover:text-gray-600 py-2">
          Voltar ao painel
        </Link>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function TriagemPage() {
  const router = useRouter()

  type Etapa = 'carregando' | 'validacao' | 'sintomas' | 'urgencia' | 'triagem'
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [pacienteId, setPacienteId] = useState<string | null>(null)
  const [nomeInicial, setNomeInicial] = useState('')
  const [cpfInicial, setCpfInicial] = useState('')
  const [telefoneInicial, setTelefoneInicial] = useState('')
  const [validacao, setValidacao] = useState<DadosValidacao | null>(null)
  const [sintomas, setSintomas] = useState<DadosSintomas | null>(null)
  const [triagemId, setTriagemId] = useState<string | null>(null)

  // Resultado
  const [analisando, setAnalisando] = useState(false)
  const [erroAnalise, setErroAnalise] = useState('')
  const [resultado, setResultado] = useState<ResultadoTriagem | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [solicitando, setSolicitando] = useState(false)

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

  function voltar() {
    if (etapa === 'sintomas') setEtapa('validacao')
    else if (etapa === 'urgencia') setEtapa('sintomas')
    else if (etapa === 'triagem') { setEtapa('urgencia'); setResultado(null); setErroAnalise('') }
    else router.push('/paciente/dashboard')
  }

  async function criarTriagemInicial(dados: DadosValidacao): Promise<string | null> {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('triagens').insert({
        paciente_id: pacienteId,
        status: 'em_andamento',
        consentimento_lgpd: true,
        consentimento_em: dados.consentimentoEm,
        cpf_confirmado: dados.cpf,
        telefone_contato: dados.telefone,
      }).select('id').single()
      return data?.id ?? null
    } catch { return null }
  }

  async function handleFazerTriagem(dados: DadosValidacao) {
    setValidacao(dados)
    const id = await criarTriagemInicial(dados)
    setTriagemId(id)
    setEtapa('sintomas')
  }

  async function handlePularTriagem(dados: DadosValidacao) {
    try {
      const supabase = createClient()
      await supabase.from('triagens').insert({
        paciente_id: pacienteId,
        status: 'pulou_triagem',
        consentimento_lgpd: true,
        consentimento_em: dados.consentimentoEm,
        cpf_confirmado: dados.cpf,
        telefone_contato: dados.telefone,
      })
    } catch { /* salva mesmo assim */ }
    router.push('/paciente/dashboard')
  }

  async function handleSintomas(dados: DadosSintomas) {
    setSintomas(dados)
    if (triagemId) {
      try {
        const supabase = createClient()
        await supabase.from('triagens').update({ dados_sintomas: dados }).eq('id', triagemId)
      } catch { /* continua */ }
    }
    setEtapa('urgencia')
  }

  async function handleUrgencia(dados: DadosUrgencia) {
    // Salvar etapa 3 no DB
    if (triagemId) {
      try {
        const supabase = createClient()
        await supabase.from('triagens').update({ dados_urgencia: dados }).eq('id', triagemId)
      } catch { /* continua */ }
    }

    setEtapa('triagem')
    setAnalisando(true)
    setErroAnalise('')

    // Chamar IA para análise direta
    try {
      const res = await fetch('/api/triagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sintomas, urgencia: dados }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErroAnalise(data.error || 'Erro na análise. Tente novamente.')
        setAnalisando(false)
        return
      }

      const res_resultado: ResultadoTriagem = data
      setResultado(res_resultado)
      setAnalisando(false)

      // Salvar resultado no prontuário
      await salvarResultado(res_resultado, dados)
    } catch {
      setErroAnalise('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
      setAnalisando(false)
    }
  }

  async function salvarResultado(res: ResultadoTriagem, urgencia: DadosUrgencia) {
    setSalvando(true)
    try {
      const supabase = createClient()
      if (triagemId) {
        await supabase.from('triagens').update({
          classificacao_risco: res.classificacao,
          resumo_ia: res.resumo,
          status: 'concluida',
          dados_urgencia: urgencia,
        }).eq('id', triagemId)
      } else {
        await supabase.from('triagens').insert({
          paciente_id: pacienteId,
          classificacao_risco: res.classificacao,
          resumo_ia: res.resumo,
          status: 'concluida',
          consentimento_lgpd: true,
          consentimento_em: validacao?.consentimentoEm ?? new Date().toISOString(),
          cpf_confirmado: validacao?.cpf ?? null,
          telefone_contato: validacao?.telefone ?? null,
          dados_sintomas: sintomas ?? null,
          dados_urgencia: urgencia,
        })
      }
    } catch (err) { console.error('Erro ao salvar triagem:', err) }
    setSalvando(false)
  }

  async function solicitarConsulta() {
    setSolicitando(true)
    try {
      const res = await fetch('/api/consulta/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triagem_id: triagemId }),
      })
      const data = await res.json()
      if (data.atendimentoId) {
        router.push(`/paciente/consulta/${data.atendimentoId}`)
      } else {
        alert('Erro ao criar sala: ' + (data.error || 'tente novamente'))
        setSolicitando(false)
      }
    } catch {
      alert('Erro de conexão. Tente novamente.')
      setSolicitando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7] flex flex-col">

      <header className="bg-[#1A3A2C] text-white px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={voltar} className="text-green-200 hover:text-white" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
              <span className="text-xs text-green-300 ml-1">Triagem</span>
            </div>
          </div>
          <span className="text-xs text-green-200 bg-blue-900/30 px-3 py-1 rounded-full hidden sm:block">
            IA não substitui diagnóstico médico
          </span>
        </div>
      </header>

      {etapa === 'carregando' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B] mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Carregando seus dados...</p>
          </div>
        </div>
      )}

      {etapa === 'validacao' && (
        <EtapaValidacao
          nomeInicial={nomeInicial} cpfInicial={cpfInicial} telefoneInicial={telefoneInicial}
          onFazerTriagem={handleFazerTriagem} onPularTriagem={handlePularTriagem}
        />
      )}

      {etapa === 'sintomas' && <EtapaSintomas onEnviar={handleSintomas} />}

      {etapa === 'urgencia' && <EtapaUrgencia sintomas={sintomas} onEnviar={handleUrgencia} />}

      {etapa === 'triagem' && (
        <EtapaResultado
          resultado={resultado}
          analisando={analisando}
          erroAnalise={erroAnalise}
          solicitando={solicitando}
          salvando={salvando}
          onSolicitarImediato={solicitarConsulta}
          onConsultarAgora={solicitarConsulta}
        />
      )}
    </div>
  )
}
