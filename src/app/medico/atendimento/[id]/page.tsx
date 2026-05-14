'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, Phone, FileText, CheckCircle2, ClipboardList,
  ChevronDown, ChevronUp, Video, Pill, FlaskConical, UserPlus,
  Stethoscope, Activity, Heart, Thermometer, AlertTriangle,
  Edit3, ExternalLink, X,
} from 'lucide-react'
import AtestadoForm from '@/components/AtestadoForm'
import ReceitaForm from '@/components/ReceitaForm'
import SolicitacaoExamesForm from '@/components/SolicitacaoExamesForm'
import EncaminhamentoForm from '@/components/EncaminhamentoForm'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface SinaisVitais {
  pa_sist:  string
  pa_diast: string
  fc:       string
  temp:     string
  spo2:     string
  peso:     string
  altura:   string
}

// ── Pequeno componente de seção do accordion ───────────────────────────────────

function SecaoAnamnese({
  titulo, icone, aberta, onToggle, children,
}: {
  titulo: string
  icone: React.ReactNode
  aberta: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-[#2A4A3C] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-green-200">
          {icone}
          {titulo}
        </span>
        {aberta
          ? <ChevronUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-green-400 shrink-0" />}
      </button>
      {aberta && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// ── Textarea padrão para o painel dark ─────────────────────────────────────────

function DarkTextarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-[#0F1F33] text-blue-100 text-xs rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#5BBD9B] placeholder-blue-800"
    />
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function AtendimentoMedico() {
  const { id } = useParams()
  const router  = useRouter()

  // ── Estado básico ──
  const [dados, setDados]     = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando]     = useState(false)
  const [entrou, setEntrou]         = useState(false)

  // ── Ferramentas ──
  const [showAtestado,      setShowAtestado]      = useState(false)
  const [atestadoEmitido,   setAtestadoEmitido]   = useState(false)
  const [showReceita,       setShowReceita]       = useState(false)
  const [receitaEmitida,    setReceitaEmitida]    = useState(false)
  const [showExames,        setShowExames]        = useState(false)
  const [examesEmitidos,    setExamesEmitidos]    = useState(false)
  const [showEncaminhamento, setShowEncaminhamento] = useState(false)
  const [encaminhado,       setEncaminhado]       = useState(false)

  // ── Antecedentes do paciente (editáveis durante a consulta) ──
  const [antEditando,     setAntEditando]     = useState(false)
  const [antSalvando,     setAntSalvando]     = useState(false)
  const [antSalvo,        setAntSalvo]        = useState(false)
  const [antAlergias,     setAntAlergias]     = useState('')
  const [antHpp,          setAntHpp]          = useState('')
  const [antMedicamentos, setAntMedicamentos] = useState('')
  const [antFamiliar,     setAntFamiliar]     = useState('')
  const [antSocial,       setAntSocial]       = useState('')

  // ── Anamnese estruturada ──
  const [showAnamnese,  setShowAnamnese]  = useState(true)
  const [secaoAberta,   setSecaoAberta]  = useState<string>('qp')

  const [qp,      setQp]      = useState('')
  const [hda,     setHda]     = useState('')
  const [sv, setSv] = useState<SinaisVitais>({
    pa_sist: '', pa_diast: '', fc: '', temp: '', spo2: '', peso: '', altura: '',
  })
  const [exameFisico,  setExameFisico]  = useState('')
  const [hipotese,     setHipotese]     = useState('')
  const [cid,          setCid]          = useState('')
  const [plano,        setPlano]        = useState('')
  const [evolucao,     setEvolucao]     = useState('')
  const [notasLegado,  setNotasLegado]  = useState('')

  useEffect(() => {
    fetch(`/api/medico/atendimento/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/medico/dashboard'); return }
        setDados(d)
        const a = d.atendimento
        setNotasLegado(a.notas_medico   || '')
        setQp(a.queixa_principal        || '')
        setHda(a.hda                    || '')
        setExameFisico(a.exame_fisico   || '')
        setHipotese(a.hipotese_diag     || '')
        setCid(a.cid                    || '')
        setPlano(a.plano_terapeutico    || '')
        setEvolucao(a.evolucao          || '')
        if (a.sinais_vitais && typeof a.sinais_vitais === 'object') {
          setSv({
            pa_sist:  a.sinais_vitais.pa_sist  || '',
            pa_diast: a.sinais_vitais.pa_diast || '',
            fc:       a.sinais_vitais.fc       || '',
            temp:     a.sinais_vitais.temp     || '',
            spo2:     a.sinais_vitais.spo2     || '',
            peso:     a.sinais_vitais.peso     || '',
            altura:   a.sinais_vitais.altura   || '',
          })
        }
        setAntAlergias(d.paciente?.alergias            || '')
        setAntHpp(d.paciente?.hpp                      || '')
        setAntMedicamentos(d.paciente?.medicamentos_em_uso || '')
        setAntFamiliar(d.paciente?.historia_familiar   || '')
        setAntSocial(d.paciente?.historia_social       || '')
        setCarregando(false)
      })
      .catch(() => router.push('/medico/dashboard'))
  }, [id])

  async function salvarAntecedentes() {
    if (!dados?.paciente?.id) return
    setAntSalvando(true)
    await fetch('/api/medico/antecedentes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id:         dados.paciente.id,
        alergias:            antAlergias.trim()     || null,
        hpp:                 antHpp.trim()          || null,
        medicamentos_em_uso: antMedicamentos.trim() || null,
        historia_familiar:   antFamiliar.trim()     || null,
        historia_social:     antSocial.trim()       || null,
      }),
    })
    setAntSalvando(false)
    setAntEditando(false)
    setAntSalvo(true)
    setTimeout(() => setAntSalvo(false), 3000)
  }

  async function finalizarConsulta() {
    setSalvando(true)
    const sinaisVitaisPayload = Object.values(sv).some(v => v.trim())
      ? { pa_sist: sv.pa_sist, pa_diast: sv.pa_diast, fc: sv.fc, temp: sv.temp, spo2: sv.spo2, peso: sv.peso, altura: sv.altura }
      : null

    await fetch('/api/medico/finalizar-atendimento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atendimento_id:    id,
        notas_medico:      notasLegado,
        queixa_principal:  qp,
        hda,
        exame_fisico:      exameFisico,
        sinais_vitais:     sinaisVitaisPayload,
        hipotese_diag:     hipotese,
        cid,
        plano_terapeutico: plano,
        evolucao,
      }),
    })
    setSalvando(false)
    router.push('/medico/dashboard')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#1A3A2C] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
          <p>Entrando na sala...</p>
        </div>
      </div>
    )
  }

  const { atendimento, triagem, paciente, medico } = dados

  const corRisco: Record<string, string> = {
    verde:    'bg-green-100 text-green-700',
    amarelo:  'bg-yellow-100 text-yellow-700',
    laranja:  'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }

  const videoUrl = (() => {
    try {
      const url = new URL(atendimento.sala_video)
      url.searchParams.set('name', `Dr. ${medico.nome}`)
      url.searchParams.set('prejoin', 'false')
      return url.toString()
    } catch {
      return atendimento.sala_video
    }
  })()

  function fecharTodas() {
    setShowAtestado(false); setShowReceita(false)
    setShowExames(false); setShowEncaminhamento(false)
  }
  function toggleSecao(s: string) {
    setSecaoAberta(prev => prev === s ? '' : s)
  }

  // Contagem de campos preenchidos
  const camposPreenchidos = [qp, hda, exameFisico, hipotese, plano, evolucao]
    .filter(v => v.trim()).length + (Object.values(sv).some(v => v.trim()) ? 1 : 0)

  return (
    <div className="min-h-screen bg-[#0F1F33] flex flex-col">

      {/* ── Header ── */}
      <div className="bg-[#1A3A2C] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
          <span className="text-green-300 text-xs">— Atendimento Virtual</span>
        </div>
        {paciente && (
          <div className="flex items-center gap-2 text-green-200 text-xs">
            <span>Paciente: <strong className="text-white">{paciente.nome}</strong></span>
            {triagem?.classificacao_risco && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${corRisco[triagem.classificacao_risco] || ''}`}>
                {triagem.classificacao_risco}
              </span>
            )}
            <a
              href={`/medico/pacientes/${paciente.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir prontuário completo em nova aba"
              className="flex items-center gap-1 text-green-400 hover:text-white transition-colors ml-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[11px]">Prontuário</span>
            </a>
          </div>
        )}
        <button
          onClick={finalizarConsulta}
          disabled={salvando}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5 rotate-[135deg]" />}
          Finalizar consulta
        </button>
      </div>

      {/* ── Layout: vídeo + painel lateral ── */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* Vídeo */}
        <div className="flex-1 relative">
          {!entrou && (
            <div className="absolute inset-0 bg-[#0F1F33] flex items-center justify-center z-10">
              <div className="text-center text-white max-w-sm px-6">
                <div className="w-24 h-24 bg-[#1A3A2C] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Video className="w-12 h-12 text-[#5BBD9B]" />
                </div>
                {paciente && (
                  <p className="text-green-300 text-sm mb-4">
                    Paciente <strong>{paciente.nome}</strong> está aguardando na sala.
                  </p>
                )}
                <h2 className="text-3xl font-extrabold mb-2 tracking-tight">Entrar AGORA</h2>
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
          />
        </div>

        {/* ── Painel lateral ── */}
        <div className="w-80 bg-[#1A3A2C] flex flex-col shrink-0 overflow-y-auto">

          {/* ── Antecedentes do paciente (editável durante a consulta) ── */}
          <div className="border-b border-amber-800/40">
            {/* Barra de alerta — sempre visível */}
            <div className="px-3 pt-2.5 pb-1 bg-amber-900/30 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {antAlergias ? (
                  <p className="text-xs text-amber-300 flex items-start gap-1.5 mb-0.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span><strong>Alergias:</strong> {antAlergias}</span>
                  </p>
                ) : null}
                {antHpp ? (
                  <p className="text-xs text-amber-200 flex items-start gap-1.5 mb-0.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                    <span><strong>HPP:</strong> {antHpp}</span>
                  </p>
                ) : null}
                {antMedicamentos ? (
                  <p className="text-xs text-amber-200 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                    <span><strong>Uso contínuo:</strong> {antMedicamentos}</span>
                  </p>
                ) : null}
                {!antAlergias && !antHpp && !antMedicamentos && (
                  <p className="text-xs text-amber-600 italic">Nenhum antecedente registrado.</p>
                )}
              </div>
              <button
                onClick={() => setAntEditando(v => !v)}
                title={antEditando ? 'Fechar edição' : 'Editar antecedentes'}
                className="shrink-0 text-amber-400 hover:text-amber-200 transition-colors mt-0.5"
              >
                {antEditando ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Formulário de edição — expande ao clicar no lápis */}
            {antEditando && (
              <div className="bg-amber-950/40 px-3 pb-3 pt-2 space-y-2">
                {[
                  { label: 'Alergias', value: antAlergias, onChange: setAntAlergias, placeholder: 'Penicilina, dipirona, frutos do mar...' },
                  { label: 'HPP — História Patológica Pregressa', value: antHpp, onChange: setAntHpp, placeholder: 'Diabetes, HAS, cirurgias, internações...' },
                  { label: 'Medicamentos de uso contínuo', value: antMedicamentos, onChange: setAntMedicamentos, placeholder: 'Metformina 850mg, Losartana 50mg...' },
                  { label: 'História familiar', value: antFamiliar, onChange: setAntFamiliar, placeholder: 'Doenças hereditárias em pais/irmãos...' },
                  { label: 'História social', value: antSocial, onChange: setAntSocial, placeholder: 'Tabagismo, etilismo, profissão...' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[10px] text-amber-400 mb-0.5 font-semibold">{f.label}</label>
                    <DarkTextarea value={f.value} onChange={f.onChange} placeholder={f.placeholder} rows={2} />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={salvarAntecedentes}
                    disabled={antSalvando}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-60 text-white text-xs py-2 rounded-lg font-semibold transition-colors"
                  >
                    {antSalvando
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <CheckCircle2 className="w-3 h-3" />}
                    Salvar antecedentes
                  </button>
                  <button
                    onClick={() => setAntEditando(false)}
                    className="px-3 py-2 border border-amber-800/60 text-amber-400 text-xs rounded-lg hover:bg-amber-900/40"
                  >
                    Cancelar
                  </button>
                </div>
                {antSalvo && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Antecedentes salvos no prontuário
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resumo da triagem */}
          {triagem?.resumo_ia && (
            <div className="p-4 border-b border-[#2A4A3C]">
              <p className="text-green-300 text-xs font-medium uppercase tracking-wide mb-2">Resumo da triagem</p>
              <p className="text-blue-100 text-sm leading-relaxed">{triagem.resumo_ia}</p>
            </div>
          )}

          {/* ── ANAMNESE ESTRUTURADA ── */}
          <div className="border-b border-[#2A4A3C]">
            <button
              onClick={() => setShowAnamnese(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${
                showAnamnese
                  ? 'bg-[#5BBD9B] text-white'
                  : 'bg-[#0F1F33] text-green-200 hover:bg-[#5BBD9B] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Anamnese / Prontuário
                {camposPreenchidos > 0 && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                    {camposPreenchidos}
                  </span>
                )}
              </span>
              {showAnamnese ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAnamnese && (
              <div className="bg-[#0F1F33]/60">
                {/* QP */}
                <SecaoAnamnese
                  titulo="Queixa Principal (QP)"
                  icone={<FileText className="w-3 h-3" />}
                  aberta={secaoAberta === 'qp'}
                  onToggle={() => toggleSecao('qp')}
                >
                  <DarkTextarea
                    value={qp}
                    onChange={setQp}
                    placeholder="Motivo principal da consulta relatado pelo paciente..."
                    rows={2}
                  />
                </SecaoAnamnese>

                {/* HDA */}
                <SecaoAnamnese
                  titulo="HDA — História da Doença Atual"
                  icone={<ClipboardList className="w-3 h-3" />}
                  aberta={secaoAberta === 'hda'}
                  onToggle={() => toggleSecao('hda')}
                >
                  <DarkTextarea
                    value={hda}
                    onChange={setHda}
                    placeholder="Início, duração, localização, fatores de melhora/piora, sintomas associados..."
                    rows={4}
                  />
                </SecaoAnamnese>

                {/* Sinais vitais */}
                <SecaoAnamnese
                  titulo="Sinais Vitais"
                  icone={<Activity className="w-3 h-3" />}
                  aberta={secaoAberta === 'sv'}
                  onToggle={() => toggleSecao('sv')}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'PA Sistólica',  key: 'pa_sist',  unit: 'mmHg', placeholder: '120' },
                      { label: 'PA Diastólica', key: 'pa_diast', unit: 'mmHg', placeholder: '80'  },
                      { label: 'FC',            key: 'fc',       unit: 'bpm',  placeholder: '72'  },
                      { label: 'Temperatura',   key: 'temp',     unit: '°C',   placeholder: '36.5'},
                      { label: 'SpO₂',          key: 'spo2',     unit: '%',    placeholder: '98'  },
                      { label: 'Peso',          key: 'peso',     unit: 'kg',   placeholder: '70'  },
                      { label: 'Altura',        key: 'altura',   unit: 'cm',   placeholder: '170' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] text-green-400 mb-0.5">{f.label} ({f.unit})</label>
                        <input
                          type="text"
                          value={sv[f.key as keyof SinaisVitais]}
                          onChange={e => setSv(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full bg-[#0F1F33] border border-[#2A4A3C] text-blue-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5BBD9B] placeholder-blue-900"
                        />
                      </div>
                    ))}
                  </div>
                </SecaoAnamnese>

                {/* Exame físico */}
                <SecaoAnamnese
                  titulo="Exame Físico"
                  icone={<Heart className="w-3 h-3" />}
                  aberta={secaoAberta === 'ef'}
                  onToggle={() => toggleSecao('ef')}
                >
                  <DarkTextarea
                    value={exameFisico}
                    onChange={setExameFisico}
                    placeholder="Geral, cardiovascular, pulmonar, abdome, neurológico..."
                    rows={4}
                  />
                </SecaoAnamnese>

                {/* Hipótese + CID */}
                <SecaoAnamnese
                  titulo="Hipótese Diagnóstica"
                  icone={<Thermometer className="w-3 h-3" />}
                  aberta={secaoAberta === 'hd'}
                  onToggle={() => toggleSecao('hd')}
                >
                  <DarkTextarea
                    value={hipotese}
                    onChange={setHipotese}
                    placeholder="Hipótese(s) diagnóstica(s)..."
                    rows={2}
                  />
                  <div className="mt-2">
                    <label className="block text-[10px] text-green-400 mb-0.5">CID-10</label>
                    <input
                      type="text"
                      value={cid}
                      onChange={e => setCid(e.target.value.toUpperCase())}
                      placeholder="Ex: J06.9, M54.5"
                      className="w-full bg-[#0F1F33] border border-[#2A4A3C] text-blue-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5BBD9B] placeholder-blue-900 uppercase"
                    />
                  </div>
                </SecaoAnamnese>

                {/* Plano terapêutico */}
                <SecaoAnamnese
                  titulo="Plano Terapêutico"
                  icone={<Pill className="w-3 h-3" />}
                  aberta={secaoAberta === 'pt'}
                  onToggle={() => toggleSecao('pt')}
                >
                  <DarkTextarea
                    value={plano}
                    onChange={setPlano}
                    placeholder="Tratamento proposto, orientações, retorno..."
                    rows={3}
                  />
                </SecaoAnamnese>

                {/* Evolução */}
                <SecaoAnamnese
                  titulo="Evolução / Notas"
                  icone={<Activity className="w-3 h-3" />}
                  aberta={secaoAberta === 'ev'}
                  onToggle={() => toggleSecao('ev')}
                >
                  <DarkTextarea
                    value={evolucao}
                    onChange={setEvolucao}
                    placeholder="Evolução clínica, notas adicionais..."
                    rows={3}
                  />
                </SecaoAnamnese>
              </div>
            )}
          </div>

          {/* ── Ferramentas ── */}

          {/* Atestado */}
          <div className="p-4 border-b border-[#2A4A3C]">
            <button
              onClick={() => { fecharTodas(); setShowAtestado(v => !v) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                showAtestado
                  ? 'bg-[#5BBD9B] text-white'
                  : 'bg-[#0F1F33] text-green-200 hover:bg-[#5BBD9B] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                {atestadoEmitido ? 'Atestado emitido ✓' : 'Emitir Atestado'}
              </span>
              {showAtestado ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAtestado && paciente && (
              <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
                <AtestadoForm
                  atendimentoId={atendimento.id}
                  pacienteId={paciente.id}
                  paciente={{ nome: paciente.nome, cpf: paciente.cpf, data_nascimento: paciente.data_nascimento, sexo: paciente.sexo }}
                  medico={{ nome: medico.nome, crm: medico.crm, crm_uf: medico.crm_uf, especialidade: medico.especialidade, sexo: medico.sexo }}
                  onFechar={() => setShowAtestado(false)}
                  onSalvo={() => { setAtestadoEmitido(true); setShowAtestado(false) }}
                />
              </div>
            )}
          </div>

          {/* Receita */}
          <div className="p-4 border-b border-[#2A4A3C]">
            <button
              onClick={() => { fecharTodas(); setShowReceita(v => !v) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                showReceita
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#0F1F33] text-purple-300 hover:bg-purple-500 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                {receitaEmitida ? 'Receita emitida ✓' : 'Emitir Receita'}
              </span>
              {showReceita ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showReceita && paciente && (
              <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
                <ReceitaForm
                  atendimentoId={atendimento.id}
                  pacienteId={paciente.id}
                  paciente={{ nome: paciente.nome, cpf: paciente.cpf, data_nascimento: paciente.data_nascimento, sexo: paciente.sexo }}
                  medico={{ nome: medico.nome, crm: medico.crm, crm_uf: medico.crm_uf, especialidade: medico.especialidade, sexo: medico.sexo }}
                  onFechar={() => setShowReceita(false)}
                  onSalvo={() => { setReceitaEmitida(true); setShowReceita(false) }}
                />
              </div>
            )}
          </div>

          {/* Exames */}
          <div className="p-4 border-b border-[#2A4A3C]">
            <button
              onClick={() => { fecharTodas(); setShowExames(v => !v) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                showExames
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#0F1F33] text-blue-300 hover:bg-blue-500 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                {examesEmitidos ? 'Exames solicitados ✓' : 'Solicitar Exames'}
              </span>
              {showExames ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showExames && paciente && (
              <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
                <SolicitacaoExamesForm
                  atendimentoId={atendimento.id}
                  pacienteId={paciente.id}
                  paciente={{ nome: paciente.nome, cpf: paciente.cpf, data_nascimento: paciente.data_nascimento, sexo: paciente.sexo }}
                  medico={{ nome: medico.nome, crm: medico.crm, crm_uf: medico.crm_uf, especialidade: medico.especialidade, sexo: medico.sexo }}
                  onFechar={() => setShowExames(false)}
                  onSalvo={() => { setExamesEmitidos(true); setShowExames(false) }}
                />
              </div>
            )}
          </div>

          {/* Encaminhamento */}
          <div className="p-4 border-b border-[#2A4A3C]">
            <button
              onClick={() => { fecharTodas(); setShowEncaminhamento(v => !v) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                showEncaminhamento
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#0F1F33] text-orange-300 hover:bg-orange-500 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                {encaminhado ? 'Encaminhamento realizado ✓' : 'Encaminhar Paciente'}
              </span>
              {showEncaminhamento ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showEncaminhamento && paciente && (
              <div className="mt-3 bg-white rounded-2xl p-4 shadow-sm">
                <EncaminhamentoForm
                  pacienteId={paciente.id}
                  salaVideo={atendimento.sala_video ?? null}
                  onFechar={() => setShowEncaminhamento(false)}
                  onEncaminhado={() => { setEncaminhado(true); setShowEncaminhamento(false) }}
                />
              </div>
            )}
          </div>

          {/* ── Salvar e encerrar ── */}
          <div className="p-4 mt-auto">
            <button
              onClick={finalizarConsulta}
              disabled={salvando}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Salvar e encerrar consulta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
