'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, CheckCircle2, AlertCircle, XCircle,
  Shield, Phone, FileText, ChevronRight, ScrollText,
  Video, Clock, ClipboardList,
} from 'lucide-react'
import { drTitle } from '@/lib/medico-utils'
import PacienteHeader from '../PacienteHeader'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DadosValidacao {
  cpf: string
  telefone: string
  consentimentoEm: string
}

interface UltimaReceita {
  id: string
  medicamentos: string
  instrucoes: string
  data_emissao: string
  medico_nome: string
  medico_sexo?: string | null
}

type TipoReceita = 'simples' | 'especial' | 'antimicrobiano'
type Etapa = 'carregando' | 'validacao' | 'tipo' | 'verificando' | 'bloqueado' | 'confirmacao' | 'sucesso'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarCPF(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14)
}
function formatarTelefone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15)
}
function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Progresso ─────────────────────────────────────────────────────────────────

function Progresso({ atual }: { atual: 1 | 2 | 3 | 4 }) {
  const passos = [
    { num: 1, label: 'Identificação' },
    { num: 2, label: 'Tipo' },
    { num: 3, label: 'Verificação' },
    { num: 4, label: 'Confirmação' },
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

// ── Etapa 1: Identificação / Consentimento ────────────────────────────────────

function EtapaValidacao({
  nomeInicial, cpfInicial, telefoneInicial, onAvancar,
}: {
  nomeInicial: string
  cpfInicial: string
  telefoneInicial: string
  onAvancar: (dados: DadosValidacao) => void
}) {
  const [cpf, setCpf]           = useState(cpfInicial ? formatarCPF(cpfInicial) : '')
  const [telefone, setTelefone] = useState(telefoneInicial ? formatarTelefone(telefoneInicial) : '')
  const [aceito, setAceito]     = useState(false)
  const [recusou, setRecusou]   = useState(false)
  const [erro, setErro]         = useState('')

  function handleAceitar() {
    if (!cpf.trim())     { setErro('Por favor, confirme seu CPF.'); return }
    if (!telefone.trim()) { setErro('Por favor, informe um telefone.'); return }
    setErro('')
    setAceito(true)
  }

  if (recusou) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Solicitação não autorizada</h2>
          <p className="text-sm text-gray-500 mb-6">
            O consentimento é necessário para solicitar a renovação de receita por telemedicina.
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
        <Progresso atual={1} />

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
          Confirme seus dados antes de solicitar a renovação. Isso garante que estamos atendendo a pessoa certa.
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
            <input type="text" value={cpf} readOnly
              placeholder="000.000.000-00"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 cursor-default" />
          </div>
        </div>

        {/* Telefone */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(11) 99999-9999" disabled={aceito}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] text-sm disabled:bg-gray-50 disabled:cursor-default" />
          </div>
        </div>

        {!aceito && (
          <>
            <div className="bg-[#F3FAF7] border border-green-100 rounded-2xl p-4 mb-5">
              <p className="text-sm font-semibold text-[#1A3A2C] mb-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#5BBD9B]" /> Consentimento LGPD
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Você autoriza a solicitação de <strong>renovação de receita</strong> por telemedicina
                e o registro das suas informações de saúde no prontuário eletrônico,
                conforme a LGPD (Lei nº 13.709/2018)?
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
          </>
        )}

        {aceito && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-medium">Consentimento registrado.</p>
            </div>
            <button
              onClick={() => onAvancar({ cpf: cpf.replace(/\D/g, ''), telefone: telefone.replace(/\D/g, ''), consentimentoEm: new Date().toISOString() })}
              className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Etapa 2: Tipo de Receita ──────────────────────────────────────────────────

const TIPOS_RECEITA: { value: TipoReceita; label: string; desc: string; cor: string }[] = [
  {
    value: 'simples',
    label: 'Receita Simples',
    desc: 'Para medicamentos comuns, sem restrição de controle especial.',
    cor: 'border-green-200 bg-green-50',
  },
  {
    value: 'especial',
    label: 'Receita Especial (Branca)',
    desc: 'Para medicamentos psicoativos ou de tarja preta com controle especial.',
    cor: 'border-purple-200 bg-purple-50',
  },
  {
    value: 'antimicrobiano',
    label: 'Antimicrobiano (2 vias)',
    desc: 'Para antibióticos e antimicrobianos (aviamento em 2 vias).',
    cor: 'border-blue-200 bg-blue-50',
  },
]

function EtapaTipo({
  onAvancar,
}: {
  onAvancar: (tipo: TipoReceita) => void
}) {
  const [selecionado, setSelecionado] = useState<TipoReceita | null>(null)
  const [erro, setErro] = useState('')

  function handleAvancar() {
    if (!selecionado) { setErro('Selecione o tipo de receita.'); return }
    onAvancar(selecionado)
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <Progresso atual={2} />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <ScrollText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-[#1A3A2C] text-lg leading-tight">Qual o tipo de receita?</h2>
            <p className="text-sm text-gray-500 mt-0.5">Selecione o tipo que você precisa renovar</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {TIPOS_RECEITA.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setSelecionado(t.value); setErro('') }}
              className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all ${
                selecionado === t.value
                  ? `${t.cor} border-2 ring-2 ring-offset-1 ring-[#5BBD9B]`
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  selecionado === t.value ? 'border-[#5BBD9B] bg-[#5BBD9B]' : 'border-gray-300'
                }`}>
                  {selecionado === t.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-semibold text-[#1A3A2C] text-sm">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {erro && (
          <p className="text-xs text-red-500 mb-4 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {erro}
          </p>
        )}

        <button onClick={handleAvancar}
          className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          Verificar elegibilidade <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Etapa 3: Verificando (loading) ────────────────────────────────────────────

function EtapaVerificando() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <Progresso atual={3} />
        <div className="w-16 h-16 bg-[#EAF7F2] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        </div>
        <p className="text-lg font-bold text-[#1A3A2C] mb-2">Verificando elegibilidade…</p>
        <p className="text-sm text-gray-400">Estamos consultando seu histórico de consultas e receitas.</p>
      </div>
    </div>
  )
}

// ── Etapa Bloqueado ───────────────────────────────────────────────────────────

function EtapaBloqueado({
  motivo, tipoLabel, onIrParaTriagem,
}: {
  motivo: 'sem_historico' | 'sem_receita_tipo'
  tipoLabel: string
  onIrParaTriagem: () => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <Progresso atual={3} />

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-9 h-9 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-[#1A3A2C] mb-2">
            {motivo === 'sem_historico'
              ? 'Nenhum histórico encontrado'
              : `Nenhuma receita de ${tipoLabel} encontrada`}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {motivo === 'sem_historico'
              ? 'Para solicitar a renovação de uma receita, é necessário ter pelo menos uma consulta ou receita prévia registrada na plataforma.'
              : `Não encontramos registros de receita do tipo "${tipoLabel}" no seu histórico. A renovação só é possível para receitas já emitidas anteriormente na plataforma.`}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
            <Video className="w-4 h-4" /> Quer fazer uma consulta agora?
          </p>
          <p className="text-xs text-blue-600">
            Um médico online pode avaliar seu caso e emitir a receita necessária durante a consulta.
          </p>
        </div>

        <button
          onClick={onIrParaTriagem}
          className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Video className="w-4 h-4" /> Fazer consulta online agora
        </button>
      </div>
    </div>
  )
}

// ── Etapa 4: Confirmação da receita ───────────────────────────────────────────

function EtapaConfirmacao({
  ultimaReceita, tipoLabel, onConfirmar,
}: {
  ultimaReceita: UltimaReceita
  tipoLabel: string
  onConfirmar: (medicamentos: string, instrucoes: string) => void
}) {
  const [medicamentos, setMedicamentos] = useState(ultimaReceita.medicamentos)
  const [instrucoes,   setInstrucoes]   = useState(ultimaReceita.instrucoes)
  const [confirmado,   setConfirmado]   = useState(false)
  const [erro, setErro] = useState('')

  function handleEnviar() {
    if (!confirmado) { setErro('Confirme que os dados da receita estão corretos.'); return }
    onConfirmar(medicamentos, instrucoes)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Progresso atual={4} />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="font-bold text-[#1A3A2C] text-lg leading-tight">Confirme a receita</h2>
            <p className="text-sm text-gray-500 mt-0.5">{tipoLabel} · emitida por {drTitle(ultimaReceita.medico_sexo)} {ultimaReceita.medico_nome}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-semibold">
            Receita original — {fmtData(ultimaReceita.data_emissao)}
          </p>

          {/* Medicamentos */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#1A3A2C] mb-2">
              Medicamento(s) de uso contínuo
            </label>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-2">
              {ultimaReceita.medicamentos.split('\n').filter(Boolean).map((m, i) => (
                <p key={i} className="text-sm text-gray-700 font-mono leading-relaxed">
                  <span className="text-[#5BBD9B] font-bold mr-1.5">℞</span>{m}
                </p>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Se precisar ajustar o medicamento, entre em contato com o médico durante a consulta.
            </p>
          </div>

          {/* Instruções */}
          {ultimaReceita.instrucoes && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Modo de uso</p>
              <p className="text-sm text-blue-800">{ultimaReceita.instrucoes}</p>
            </div>
          )}

          {/* Observação adicional */}
          <div>
            <label className="block text-sm font-semibold text-[#1A3A2C] mb-1">
              Observação para o médico <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={instrucoes}
              onChange={e => setInstrucoes(e.target.value)}
              placeholder="Ex: preciso da dosagem atualizada, tenho tomado há 3 anos…"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] resize-none"
            />
          </div>
        </div>

        {/* Checkbox de confirmação */}
        <label className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3.5 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmado}
            onChange={e => { setConfirmado(e.target.checked); setErro('') }}
            className="accent-[#5BBD9B] w-4 h-4 mt-0.5 shrink-0"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            Confirmo que o(s) medicamento(s) acima são os de uso contínuo que desejo renovar
            e que estou solicitando a renovação em meu próprio nome.
          </span>
        </label>

        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
          </div>
        )}

        <button onClick={handleEnviar}
          className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          Enviar pedido <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Etapa 5: Sucesso ──────────────────────────────────────────────────────────

function EtapaSucesso({ tipoLabel }: { tipoLabel: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-[#5BBD9B]" />
        </div>
        <h2 className="text-xl font-bold text-[#1A3A2C] mb-2">Pedido enviado!</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Sua solicitação de <strong>{tipoLabel}</strong> foi encaminhada para os médicos online.
          Um médico irá revisar seu pedido e emitir a nova receita em breve.
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 mb-6 text-left">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-amber-800">O que acontece agora?</p>
          </div>
          <ul className="text-xs text-amber-700 space-y-1 pl-6 list-disc">
            <li>Um médico online verá o seu pedido na fila de renovações</li>
            <li>Ele revisará a receita e emitirá a nova versão</li>
            <li>A receita ficará disponível na sua área de receitas</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link href="/paciente/receitas"
            className="w-full flex items-center justify-center gap-2 bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white py-3.5 rounded-xl text-sm font-semibold transition-colors">
            <ScrollText className="w-4 h-4" /> Ver minhas receitas
          </Link>
          <Link href="/paciente/dashboard"
            className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 py-3 rounded-xl text-sm font-semibold transition-colors">
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Enviando spinner ──────────────────────────────────────────────────────────

function EtapaEnviando() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#EAF7F2] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Loader2 className="w-8 h-8 animate-spin text-[#5BBD9B]" />
        </div>
        <p className="text-lg font-bold text-[#1A3A2C] mb-2">Enviando pedido…</p>
        <p className="text-sm text-gray-400">Aguarde um instante.</p>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function RenovacaoReceitaPage() {
  const router = useRouter()
  const [etapa, setEtapa]                   = useState<Etapa>('carregando')
  const [nomeInicial, setNomeInicial]       = useState('')
  const [cpfInicial, setCpfInicial]         = useState('')
  const [telefoneInicial, setTelefoneInicial] = useState('')
  const [validacao, setValidacao]           = useState<DadosValidacao | null>(null)
  const [tipo, setTipo]                     = useState<TipoReceita | null>(null)
  const [motivoBloqueio, setMotivoBloqueio] = useState<'sem_historico' | 'sem_receita_tipo'>('sem_historico')
  const [ultimaReceita, setUltimaReceita]   = useState<UltimaReceita | null>(null)
  const [erro, setErro]                     = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch('/api/paciente/me')
        if (res.status === 401) { router.push('/login'); return }
        if (res.ok) {
          const p = await res.json()
          setNomeInicial(p.nome || '')
          setCpfInicial(p.cpf || '')
          setTelefoneInicial(p.telefone || '')
        }
      } catch {}
      setEtapa('validacao')
    }
    carregar()
  }, [])

  async function handleValidacao(dados: DadosValidacao) {
    setValidacao(dados)
    setEtapa('tipo')
  }

  async function handleTipo(t: TipoReceita) {
    setTipo(t)
    setEtapa('verificando')

    try {
      const res = await fetch(`/api/renovacao/verificar?tipo=${t}`)
      const data = await res.json()

      if (!data.elegivel) {
        setMotivoBloqueio(data.motivo)
        setEtapa('bloqueado')
        return
      }

      setUltimaReceita(data.ultimaReceita)
      setEtapa('confirmacao')
    } catch {
      setErro('Erro ao verificar elegibilidade. Tente novamente.')
      setEtapa('tipo')
    }
  }

  async function handleConfirmacao(medicamentos: string, instrucoes: string) {
    if (!validacao || !tipo || !ultimaReceita) return
    setEtapa('carregando') // usando como "enviando"

    try {
      const res = await fetch('/api/renovacao/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_receita:  tipo,
          receita_id:    ultimaReceita.id,
          medicamentos,
          instrucoes,
          cpf:           validacao.cpf,
          telefone:      validacao.telefone,
          consentimento_em: validacao.consentimentoEm,
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setErro(data.error || 'Erro ao enviar pedido.')
        setEtapa('confirmacao')
        return
      }

      setEtapa('sucesso')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setEtapa('confirmacao')
    }
  }

  function handleIrParaTriagem() {
    router.push('/paciente/triagem')
  }

  function handleBack() {
    if (etapa === 'validacao') router.push('/paciente/dashboard')
    else if (etapa === 'tipo') setEtapa('validacao')
    else if (etapa === 'verificando') setEtapa('tipo')
    else if (etapa === 'bloqueado') setEtapa('tipo')
    else if (etapa === 'confirmacao') setEtapa('tipo')
    // sucesso e carregando: sem voltar
  }

  const tipoLabel = TIPOS_RECEITA.find(t => t.value === tipo)?.label ?? 'Receita'

  const showBack = !['carregando', 'sucesso'].includes(etapa)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--cor-empresa-bg)' }}>
      <PacienteHeader
        titulo="Renovação de Receita"
        onBack={showBack ? handleBack : undefined}
      />

      {etapa === 'carregando' && (
        <EtapaEnviando />
      )}

      {etapa === 'validacao' && (
        <EtapaValidacao
          nomeInicial={nomeInicial}
          cpfInicial={cpfInicial}
          telefoneInicial={telefoneInicial}
          onAvancar={handleValidacao}
        />
      )}

      {etapa === 'tipo' && (
        <EtapaTipo
          onAvancar={handleTipo}
        />
      )}

      {etapa === 'verificando' && <EtapaVerificando />}

      {etapa === 'bloqueado' && (
        <EtapaBloqueado
          motivo={motivoBloqueio}
          tipoLabel={tipoLabel}
          onIrParaTriagem={handleIrParaTriagem}
        />
      )}

      {etapa === 'confirmacao' && ultimaReceita && (
        <>
          {erro && (
            <div className="max-w-lg mx-auto w-full px-4 pt-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {erro}
              </div>
            </div>
          )}
          <EtapaConfirmacao
            ultimaReceita={ultimaReceita}
            tipoLabel={tipoLabel}
            onConfirmar={handleConfirmacao}
          />
        </>
      )}

      {etapa === 'sucesso' && <EtapaSucesso tipoLabel={tipoLabel} />}
    </div>
  )
}
