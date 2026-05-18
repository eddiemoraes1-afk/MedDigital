import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  User, Phone, FileText, Building2, Calendar,
  Clock, CheckCircle2, Mail, Briefcase, MapPin, XCircle,
  Brain, AlertTriangle, AlertCircle,
  Pill, Stethoscope, Activity, Heart,
  FlaskConical, ClipboardList, Thermometer, ShieldCheck,
} from 'lucide-react'
import MedicoHeader from '../../MedicoHeader'
import AtestadosMedicoClient from './AtestadosMedicoClient'
import ReceitasMedicoClient from './ReceitasMedicoClient'
import AntecedentesForm from './AntecedentesForm'

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ back?: string; aba?: string }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcularIdade(dataNasc: string | null): number | null {
  if (!dataNasc) return null
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

function fmtDH(iso: string | null | undefined) {
  if (!iso) return { data: '—', hora: '—' }
  const s = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const d = new Date(s)
  if (isNaN(d.getTime())) return { data: '—', hora: '—' }
  return {
    data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
  }
}

const LABEL_SEXO: Record<string, string> = {
  masculino: 'Masculino', feminino: 'Feminino', outro: 'Outro', nao_informado: 'Não informado',
}

function prefixoMedico(sexo: string | null | undefined): string {
  return sexo === 'feminino' ? 'Dra.' : 'Dr.'
}
const COR_RISCO: Record<string, string> = {
  verde:    'border-green-300 bg-green-50',
  amarelo:  'border-yellow-300 bg-yellow-50',
  laranja:  'border-orange-300 bg-orange-50',
  vermelho: 'border-red-300 bg-red-50',
}
const BADGE_RISCO: Record<string, string> = {
  verde:    'bg-green-100 text-green-700',
  amarelo:  'bg-yellow-100 text-yellow-700',
  laranja:  'bg-orange-100 text-orange-700',
  vermelho: 'bg-red-100 text-red-700',
}
const LABEL_RISCO: Record<string, string> = {
  verde:    '🟢 Risco Baixo',
  amarelo:  '🟡 Risco Moderado',
  laranja:  '🟠 Risco Alto',
  vermelho: '🔴 Urgência',
}
const SINAIS_URGENCIA: Record<string, string> = {
  dorNoPeito:   'Dor no peito',
  faltaDeAr:    'Falta de ar intensa',
  sintomaNeuro: 'Sintoma neurológico',
  desmaio:      'Desmaio / perda de consciência',
  convulsao:    'Convulsão',
  sangramento:  'Sangramento intenso',
  trauma:       'Trauma / acidente',
  dorExtrema:   'Dor extrema',
  gravidez:     'Gravidez com complicação',
}

const ABAS = [
  { id: 'identificacao', label: 'Identificação'  },
  { id: 'consultas',     label: 'Consultas'      },
  { id: 'triagens',      label: 'Triagens'       },
  { id: 'documentos',    label: 'Documentos'     },
  { id: 'exclusao',      label: 'Prot. Exclusão' },
]

const STATUS_EXCLUSAO_LABEL: Record<string, string> = {
  apto:           'Apto para atendimento online',
  apto_ressalvas: 'Apto com ressalvas',
  nao_apto:       'Não apto — presencial indicado',
  emergencia:     'Emergência — encaminhamento imediato',
}
const STATUS_EXCLUSAO_COR: Record<string, string> = {
  apto:           'bg-green-100  text-green-800  border-green-300',
  apto_ressalvas: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  nao_apto:       'bg-orange-100 text-orange-800 border-orange-300',
  emergencia:     'bg-red-100    text-red-800    border-red-400',
}

// ── Componente de aba nav (server) ─────────────────────────────────────────────

function TabNav({ abaAtiva, pacienteId, back }: { abaAtiva: string; pacienteId: string; back: string }) {
  return (
    <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-2xl overflow-hidden shadow-sm">
      {ABAS.map(a => (
        <Link
          key={a.id}
          href={`/medico/pacientes/${pacienteId}?aba=${a.id}${back ? `&back=${encodeURIComponent(back)}` : ''}`}
          className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors ${
            abaAtiva === a.id
              ? 'bg-[#1A3A2C] text-white'
              : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A3A2C]'
          }`}
        >
          {a.label}
        </Link>
      ))}
    </div>
  )
}

// ── Bloco de campo da consulta ─────────────────────────────────────────────────

function CampoConsulta({ icone, titulo, valor, className = '' }: { icone: React.ReactNode; titulo: string; valor: string | null | undefined; className?: string }) {
  if (!valor?.trim()) return null
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        {icone} {titulo}
      </p>
      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{valor}</p>
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default async function MedicoPacientePage({ params, searchParams }: Props) {
  const { id }         = await params
  const { back, aba }  = await searchParams
  const abaAtiva       = ABAS.find(a => a.id === aba)?.id ?? 'identificacao'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: medico } = await admin
    .from('medicos')
    .select('id, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') redirect('/medico/dashboard')

  const backHref = back ? decodeURIComponent(back) : '/medico/pacientes'

  // ── Paciente ──
  const { data: paciente } = await admin
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!paciente) redirect('/medico/dashboard')

  const idade = calcularIdade(paciente.data_nascimento ?? null)

  // ── Vínculo empresa ──
  const { data: vinculo } = paciente.cpf
    ? await admin.from('vinculos_empresa').select('*, empresas(id, nome, cnpj)').eq('cpf', paciente.cpf).maybeSingle()
    : { data: null }
  const empresa = (vinculo as any)?.empresas

  // ── Triagens ──
  const TCOLS = 'id, criado_em, classificacao_risco, direcionamento, resumo_ia, recomendacao_ia, status, dados_sintomas, dados_urgencia, consentimento_lgpd, consentimento_em'
  const { data: triagensDirectas } = await admin.from('triagens').select(TCOLS).eq('paciente_id', id).order('criado_em', { ascending: false })
  const { data: atendPaciente }    = await admin.from('atendimentos').select('triagem_id').eq('paciente_id', id).not('triagem_id', 'is', null)
  const idsJaBuscados = new Set((triagensDirectas ?? []).map((t: any) => t.id))
  const idsViaAtend   = (atendPaciente ?? []).map((a: any) => a.triagem_id).filter((tid: string) => tid && !idsJaBuscados.has(tid))
  let triagemViaAtend: any[] = []
  if (idsViaAtend.length > 0) {
    const { data } = await admin.from('triagens').select(TCOLS).in('id', idsViaAtend)
    triagemViaAtend = data ?? []
  }
  const triagens = [...(triagensDirectas ?? []), ...triagemViaAtend].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

  // ── Atendimentos com anamnese estruturada ──
  const { data: atendimentos } = await admin
    .from('atendimentos')
    .select(`
      id, criado_em, finalizado_em, status, tipo, agendamento_id,
      notas_medico, queixa_principal, hda, exame_fisico, sinais_vitais,
      hipotese_diag, cid, plano_terapeutico, evolucao,
      medico_id, medicos(nome, crm, crm_uf, especialidade, sexo)
    `)
    .eq('paciente_id', id)
    .in('status', ['concluido', 'em_andamento'])
    .order('finalizado_em', { ascending: false, nullsFirst: true })

  // ── Documentos vinculados por atendimento ──
  const atendimentoIds = (atendimentos ?? []).map((a: any) => a.id)

  const { data: atestados } = await admin
    .from('atestados')
    .select('id, data_emissao, data_inicio, data_fim, dias, cid, texto_complementar, atendimento_id, medico_id, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', id)
    .order('data_emissao', { ascending: false })

  const { data: receitas } = await admin
    .from('receitas')
    .select('id, criado_em, tipo, medicamentos, instrucoes, observacoes, validade, data_emissao, atendimento_id, medico_id, medicos(id, nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  const { data: exames } = await admin
    .from('solicitacoes_exames')
    .select('id, criado_em, exames, urgencia, observacoes, atendimento_id, medico_id')
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  // ── Protocolos de exclusão de telemedicina ──
  const { data: exclusoes } = await admin
    .from('exclusoes_telemedicina')
    .select('*, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  // Mapas por atendimento para a aba consultas
  const atestadosPorAtend: Record<string, any[]> = {}
  ;(atestados ?? []).forEach((a: any) => { if (a.atendimento_id) { if (!atestadosPorAtend[a.atendimento_id]) atestadosPorAtend[a.atendimento_id] = []; atestadosPorAtend[a.atendimento_id].push(a) } })
  const receitasPorAtend: Record<string, any[]> = {}
  ;(receitas ?? []).forEach((r: any) => { if (r.atendimento_id) { if (!receitasPorAtend[r.atendimento_id]) receitasPorAtend[r.atendimento_id] = []; receitasPorAtend[r.atendimento_id].push(r) } })
  const examesPorAtend: Record<string, any[]> = {}
  ;(exames ?? []).forEach((e: any) => { if (e.atendimento_id) { if (!examesPorAtend[e.atendimento_id]) examesPorAtend[e.atendimento_id] = []; examesPorAtend[e.atendimento_id].push(e) } })

  const totalConsultas = (atendimentos ?? []).filter((a: any) => a.status === 'concluido').length

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader titulo="Prontuário" backHref={backHref} />

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Cabeçalho do paciente ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#1A3A2C]">{paciente.nome}</h1>
              <div className="flex flex-wrap gap-3 mt-2">
                {idade !== null && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">{idade} anos</span>}
                {paciente.sexo && paciente.sexo !== 'nao_informado' && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{LABEL_SEXO[paciente.sexo] ?? paciente.sexo}</span>
                )}
                {paciente.cpf && <span className="flex items-center gap-1.5 text-sm text-gray-500"><FileText className="w-3.5 h-3.5 text-gray-400" /> {paciente.cpf}</span>}
                {paciente.telefone && <span className="flex items-center gap-1.5 text-sm text-gray-500"><Phone className="w-3.5 h-3.5 text-gray-400" /> {paciente.telefone}</span>}
                {paciente.email && <span className="flex items-center gap-1.5 text-sm text-gray-500"><Mail className="w-3.5 h-3.5 text-gray-400" /> {paciente.email}</span>}
              </div>
              {vinculo
                ? <p className="text-xs text-purple-600 mt-2 flex items-center gap-1"><Building2 className="w-3 h-3" />{empresa?.nome}{vinculo.cargo ? ` — ${vinculo.cargo}` : ''}</p>
                : <p className="text-xs text-gray-400 mt-2">Paciente particular</p>}
            </div>

            {/* KPIs */}
            <div className="flex gap-2 shrink-0 flex-wrap">
              {[
                { n: triagens.length,                label: 'triagens',    cor: 'bg-[#F3FAF7] text-[#1A3A2C]' },
                { n: totalConsultas,                 label: 'consultas',   cor: 'bg-green-50 text-green-700' },
                { n: atestados?.length ?? 0,         label: 'atestados',   cor: 'bg-blue-50 text-blue-700' },
                { n: receitas?.length ?? 0,          label: 'receitas',    cor: 'bg-purple-50 text-purple-700' },
                { n: exames?.length ?? 0,            label: 'exames',      cor: 'bg-orange-50 text-orange-700' },
                { n: exclusoes?.length ?? 0,         label: 'exclusões',   cor: 'bg-red-50 text-red-700' },
              ].map(k => (
                <div key={k.label} className={`text-center rounded-xl px-3 py-2.5 ${k.cor}`}>
                  <p className="text-xl font-bold">{k.n}</p>
                  <p className="text-xs opacity-70">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alergias em destaque — visível em qualquer aba */}
          {paciente.alergias && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700"><strong>Alergias:</strong> {paciente.alergias}</p>
            </div>
          )}
        </div>

        {/* ── Abas ── */}
        <TabNav abaAtiva={abaAtiva} pacienteId={id} back={back || ''} />

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA: IDENTIFICAÇÃO                                                  */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {abaAtiva === 'identificacao' && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* Dados cadastrais */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#1A3A2C] text-sm mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Dados cadastrais
              </h3>
              <div className="space-y-3 text-sm">
                {paciente.data_nascimento && (
                  <div>
                    <p className="text-xs text-gray-400">Data de nascimento</p>
                    <p className="text-gray-700">{new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}{idade !== null && <span className="text-gray-400 ml-1">({idade} anos)</span>}</p>
                  </div>
                )}
                {paciente.sexo && <div><p className="text-xs text-gray-400">Sexo</p><p className="text-gray-700">{LABEL_SEXO[paciente.sexo] ?? paciente.sexo}</p></div>}
                {paciente.cpf && <div><p className="text-xs text-gray-400">CPF</p><p className="text-gray-700">{paciente.cpf}</p></div>}
                {paciente.telefone && <div><p className="text-xs text-gray-400">Telefone</p><p className="text-gray-700">{paciente.telefone}</p></div>}
                {paciente.email && <div><p className="text-xs text-gray-400">E-mail</p><p className="text-gray-700">{paciente.email}</p></div>}
                {paciente.convenio && <div><p className="text-xs text-gray-400">Convênio</p><p className="text-gray-700">{paciente.convenio}</p></div>}
              </div>
            </div>

            {/* Empresa */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#1A3A2C] text-sm mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Empresa / Vínculo
              </h3>
              {vinculo ? (
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-purple-700">{empresa?.nome}</p>
                  {empresa?.cnpj && <p className="text-xs text-gray-400">{empresa.cnpj}</p>}
                  {vinculo.cargo && <p className="text-gray-600 flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-gray-400" />{vinculo.cargo}</p>}
                  {vinculo.departamento && <p className="text-gray-600 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400" />{vinculo.departamento}</p>}
                  {vinculo.data_admissao && <p className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-gray-400" />Admissão: {new Date(vinculo.data_admissao).toLocaleDateString('pt-BR')}</p>}
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${vinculo.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {vinculo.ativo ? <><CheckCircle2 className="w-3 h-3" />Ativo</> : <><XCircle className="w-3 h-3" />Inativo</>}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Paciente particular · sem vínculo</p>
              )}
            </div>

            {/* Antecedentes — ocupa coluna inteira */}
            <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#1A3A2C] text-sm mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Antecedentes Pessoais
              </h3>
              <AntecedentesForm
                pacienteId={id}
                inicial={{
                  alergias:            paciente.alergias            ?? null,
                  hpp:                 paciente.hpp                 ?? null,
                  medicamentos_em_uso: paciente.medicamentos_em_uso ?? null,
                  historia_familiar:   paciente.historia_familiar   ?? null,
                  historia_social:     paciente.historia_social     ?? null,
                }}
              />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA: CONSULTAS                                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {abaAtiva === 'consultas' && (
          <div>
            {(!atendimentos || atendimentos.length === 0) ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <Stethoscope className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Nenhuma consulta registrada</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(atendimentos as any[]).map((a) => {
                  const medA = a.medicos as any
                  const { data, hora } = fmtDH(a.finalizado_em ?? a.criado_em)
                  const sv = a.sinais_vitais && typeof a.sinais_vitais === 'object' ? a.sinais_vitais : null
                  const temAnamnese = a.queixa_principal || a.hda || a.exame_fisico || a.hipotese_diag || a.plano_terapeutico || a.evolucao
                  const temSv = sv && Object.values(sv).some((v: any) => v)
                  const docs = {
                    atestados: atestadosPorAtend[a.id] ?? [],
                    receitas:  receitasPorAtend[a.id]  ?? [],
                    exames:    examesPorAtend[a.id]     ?? [],
                  }
                  const temDocs = docs.atestados.length + docs.receitas.length + docs.exames.length > 0

                  return (
                    <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-50">
                      {/* Cabeçalho da consulta */}
                      <div className="bg-[#1A3A2C] px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold">{data} às {hora}</p>
                          {medA && (
                            <p className="text-green-300 text-xs mt-0.5">
                              {prefixoMedico(medA.sexo)} {medA.nome} — {medA.especialidade} · CRM {medA.crm}/{medA.crm_uf}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {a.cid && (
                            <span className="bg-white/15 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                              CID {a.cid}
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            a.status === 'concluido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {a.status === 'concluido' ? 'Concluída' : 'Em andamento'}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        {!temAnamnese && !temSv && !a.notas_medico && (
                          <p className="text-sm text-gray-400 italic text-center py-4">Anamnese não registrada nesta consulta</p>
                        )}

                        {/* QP */}
                        <CampoConsulta
                          icone={<FileText className="w-3.5 h-3.5 text-[#5BBD9B]" />}
                          titulo="Queixa Principal"
                          valor={a.queixa_principal}
                          className="bg-[#F3FAF7] border-green-100"
                        />

                        {/* HDA */}
                        <CampoConsulta
                          icone={<ClipboardList className="w-3.5 h-3.5 text-blue-500" />}
                          titulo="História da Doença Atual (HDA)"
                          valor={a.hda}
                          className="bg-blue-50 border-blue-100"
                        />

                        {/* Sinais vitais */}
                        {temSv && (
                          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-purple-500" /> Sinais Vitais
                            </p>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              {[
                                { label: 'PA', value: sv.pa_sist && sv.pa_diast ? `${sv.pa_sist}/${sv.pa_diast}` : (sv.pa_sist || sv.pa_diast || null), unit: 'mmHg' },
                                { label: 'FC', value: sv.fc, unit: 'bpm' },
                                { label: 'Temp', value: sv.temp, unit: '°C' },
                                { label: 'SpO₂', value: sv.spo2, unit: '%' },
                                { label: 'Peso', value: sv.peso, unit: 'kg' },
                                { label: 'Altura', value: sv.altura, unit: 'cm' },
                              ].filter(f => f.value).map(f => (
                                <div key={f.label} className="bg-white rounded-lg px-2 py-2">
                                  <p className="text-[10px] text-gray-400 font-medium">{f.label}</p>
                                  <p className="text-sm font-bold text-[#1A3A2C]">{f.value}</p>
                                  <p className="text-[10px] text-gray-400">{f.unit}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exame físico */}
                        <CampoConsulta
                          icone={<Heart className="w-3.5 h-3.5 text-red-400" />}
                          titulo="Exame Físico"
                          valor={a.exame_fisico}
                          className="bg-red-50 border-red-100"
                        />

                        {/* Hipótese diagnóstica */}
                        <CampoConsulta
                          icone={<Thermometer className="w-3.5 h-3.5 text-amber-500" />}
                          titulo={`Hipótese Diagnóstica${a.cid ? ` — CID ${a.cid}` : ''}`}
                          valor={a.hipotese_diag}
                          className="bg-amber-50 border-amber-100"
                        />

                        {/* Plano terapêutico */}
                        <CampoConsulta
                          icone={<Pill className="w-3.5 h-3.5 text-[#5BBD9B]" />}
                          titulo="Plano Terapêutico"
                          valor={a.plano_terapeutico}
                          className="bg-[#F3FAF7] border-green-100"
                        />

                        {/* Evolução */}
                        <CampoConsulta
                          icone={<Activity className="w-3.5 h-3.5 text-gray-400" />}
                          titulo="Evolução / Notas"
                          valor={a.evolucao || a.notas_medico}
                          className="bg-gray-50 border-gray-100"
                        />

                        {/* Documentos emitidos nesta consulta */}
                        {temDocs && (
                          <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Documentos emitidos</p>
                            <div className="flex flex-wrap gap-2">
                              {docs.receitas.map((r: any) => (
                                <span key={r.id} className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full">
                                  <Pill className="w-3 h-3" /> {r.tipo}
                                </span>
                              ))}
                              {docs.atestados.map((a: any) => (
                                <span key={a.id} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
                                  <FileText className="w-3 h-3" /> Atestado {a.dias}d
                                </span>
                              ))}
                              {docs.exames.map((e: any) => (
                                <span key={e.id} className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">
                                  <FlaskConical className="w-3 h-3" /> Exames
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA: TRIAGENS                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {abaAtiva === 'triagens' && (
          <div>
            {triagens.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <Brain className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Nenhuma triagem registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {triagens.map((t: any) => {
                  const { data, hora } = fmtDH(t.criado_em)
                  const sintomas = t.dados_sintomas as any
                  const urgencia = t.dados_urgencia as Record<string, boolean | null> | null
                  const temUrgencia = urgencia && Object.values(urgencia).some(v => v === true)

                  return (
                    <div key={t.id} className={`rounded-2xl border-2 shadow-sm overflow-hidden ${COR_RISCO[t.classificacao_risco] || 'border-gray-200 bg-white'}`}>
                      <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${BADGE_RISCO[t.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                            {LABEL_RISCO[t.classificacao_risco] || t.classificacao_risco || 'Sem classificação'}
                          </span>
                          {temUrgencia && (
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-600 text-white flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> URGÊNCIA
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700">{data}</p>
                          <p className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {hora}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pb-6 space-y-4">
                        {/* Direcionamento */}
                        {t.direcionamento && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Direcionamento:</span>
                            <span className="text-xs bg-white/70 text-gray-700 border border-white px-2.5 py-1 rounded-full font-medium">{t.direcionamento}</span>
                          </div>
                        )}

                        {(t.resumo_ia || t.recomendacao_ia) && (
                          <div className="bg-white/80 rounded-xl p-4 border border-white">
                            <p className="text-xs font-bold text-[#1A3A2C] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Brain className="w-3.5 h-3.5 text-[#5BBD9B]" /> Análise da IA
                            </p>
                            {t.resumo_ia && <p className="text-sm text-gray-700 leading-relaxed">{t.resumo_ia}</p>}
                            {t.recomendacao_ia && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Recomendação:</p>
                                <p className="text-sm text-gray-700 italic">{t.recomendacao_ia}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {sintomas?.motivosPrincipais?.length > 0 && (
                          <div className="bg-white/80 rounded-xl p-4 border border-white space-y-3">
                            {/* Motivos principais */}
                            <div>
                              <p className="text-xs font-bold text-[#1A3A2C] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Stethoscope className="w-3.5 h-3.5 text-[#5BBD9B]" /> Sintomas Relatados
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {sintomas.motivosPrincipais.map((m: string) => (
                                  <span key={m} className="text-xs bg-[#EAF7F2] text-[#1A3A2C] border border-green-200 px-2.5 py-1 rounded-full font-medium">{m}</span>
                                ))}
                                {sintomas.outroMotivo && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{sintomas.outroMotivo}</span>}
                              </div>
                            </div>

                            {/* Localização da dor */}
                            {sintomas.locaisDor?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1.5">Localização da dor:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {sintomas.locaisDor.map((l: string) => (
                                    <span key={l} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">{l}</span>
                                  ))}
                                  {sintomas.outraLocalizacaoDor && <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{sintomas.outraLocalizacaoDor}</span>}
                                </div>
                              </div>
                            )}

                            {/* Intensidade da dor */}
                            {sintomas.intensidadeDor != null && (
                              <p className="text-xs text-gray-500">
                                Intensidade da dor: <strong className={
                                  sintomas.intensidadeDor <= 3 ? 'text-green-600' :
                                  sintomas.intensidadeDor <= 6 ? 'text-yellow-600' : 'text-red-600'
                                }>{sintomas.intensidadeDor}/10</strong>
                              </p>
                            )}

                            {/* Remédio para aliviar */}
                            {sintomas.tomouRemedio != null && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Tomou remédio / fez algo para melhorar:</p>
                                {sintomas.tomouRemedio ? (
                                  <div className="space-y-1">
                                    {sintomas.oQueTomou && <p className="text-xs text-gray-700">O que tomou: <span className="font-medium">{sintomas.oQueTomou}</span></p>}
                                    {sintomas.remedioMelhorou && (
                                      <p className="text-xs text-gray-700">Resultado: <span className="font-medium">
                                        {sintomas.remedioMelhorou === 'sim' ? '✓ Melhorou' : sintomas.remedioMelhorou === 'parcial' ? '◑ Melhorou parcialmente' : '✗ Não melhorou'}
                                      </span></p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">Não tomou remédio</p>
                                )}
                              </div>
                            )}

                            {/* Remédio de uso contínuo */}
                            {sintomas.remedioContinuo != null && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Remédio de uso contínuo:</p>
                                {sintomas.remedioContinuo && sintomas.remedioContinuoQuais
                                  ? <p className="text-xs text-gray-700 font-medium">{sintomas.remedioContinuoQuais}</p>
                                  : <p className="text-xs text-gray-500 italic">{sintomas.remedioContinuo ? 'Sim (não especificado)' : 'Não usa'}</p>
                                }
                              </div>
                            )}
                          </div>
                        )}

                        {urgencia && temUrgencia && (
                          <div className="bg-white/80 rounded-xl p-4 border border-white">
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" /> Sinais de Urgência presentes
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(SINAIS_URGENCIA).map(([key, label]) =>
                                urgencia[key] ? (
                                  <span key={key} className="text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium">⚠ {label}</span>
                                ) : null
                              )}
                            </div>
                          </div>
                        )}

                        {/* Fallback — triagem sem detalhes salvos */}
                        {!t.resumo_ia && !t.recomendacao_ia && !t.direcionamento && !(sintomas?.motivosPrincipais?.length > 0) && !temUrgencia && (
                          <p className="text-xs text-gray-400 italic py-1">
                            Triagem sem detalhes registrados — pode ser um registro anterior ao armazenamento de sintomas ou uma triagem não concluída pelo paciente.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA: DOCUMENTOS                                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ABA: PROTOCOLO DE EXCLUSÃO DE TELEMEDICINA                         */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {abaAtiva === 'exclusao' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
                Protocolo de Exclusão Médica
                <span className="text-sm text-gray-400 font-normal">({exclusoes?.length ?? 0})</span>
              </h2>
              <span className="text-xs text-gray-400 italic">CFM Res. 2.314/2022</span>
            </div>

            {!exclusoes || exclusoes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <ShieldCheck className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Nenhum protocolo de exclusão registrado</p>
                <p className="text-xs text-gray-300 mt-1">Registros são criados pelo médico durante a consulta virtual</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(exclusoes as any[]).map(ex => {
                  const { data, hora } = fmtDH(ex.criado_em)
                  const med = ex.medicos as any
                  const statusCor = STATUS_EXCLUSAO_COR[ex.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                  const statusLabel = STATUS_EXCLUSAO_LABEL[ex.status] ?? ex.status
                  return (
                    <div key={ex.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-50">

                      {/* Cabeçalho */}
                      <div className="bg-[#1A3A2C] px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold">{data} às {hora}</p>
                          {med && (
                            <p className="text-green-300 text-xs mt-0.5">
                              {prefixoMedico(med.sexo)} {med.nome} — {med.especialidade} · CRM {med.crm}/{med.crm_uf}
                            </p>
                          )}
                        </div>
                        <span className={`border text-xs font-bold px-3 py-1.5 rounded-full ${statusCor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="p-6 space-y-4">

                        {/* Motivos */}
                        {ex.motivos?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                              Motivos de exclusão
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(ex.motivos as string[]).map((m: string) => (
                                <span key={m} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">
                                  {m}
                                </span>
                              ))}
                              {ex.motivo_outro && (
                                <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full italic">
                                  Outro: {ex.motivo_outro}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Conduta */}
                        {ex.conduta && (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                              Conduta médica
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{ex.conduta}</p>
                          </div>
                        )}

                        {/* Observações */}
                        {ex.observacoes && (
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Observações</p>
                            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{ex.observacoes}</p>
                          </div>
                        )}

                        {/* Termos */}
                        <div className="flex items-center gap-2">
                          {ex.ciente_paciente ? (
                            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Paciente ciente da decisão médica
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5" />
                              Ciência do paciente não registrada
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'documentos' && (
          <div className="space-y-8">

            {/* Receitas */}
            <div>
              <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-[#5BBD9B]" /> Receitas Médicas
                <span className="text-sm text-gray-400 font-normal">({receitas?.length ?? 0})</span>
              </h2>
              {receitas && receitas.length > 0 ? (
                <ReceitasMedicoClient
                  receitas={receitas as any}
                  paciente={{ nome: paciente.nome, cpf: paciente.cpf ?? null, data_nascimento: paciente.data_nascimento ?? null, sexo: paciente.sexo ?? null }}
                  medicoId={medico.id}
                />
              ) : (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <Pill className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma receita emitida</p>
                </div>
              )}
            </div>

            {/* Atestados */}
            <div>
              <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#5BBD9B]" /> Atestados Médicos
                <span className="text-sm text-gray-400 font-normal">({atestados?.length ?? 0})</span>
              </h2>
              {atestados && atestados.length > 0 ? (
                <AtestadosMedicoClient
                  atestados={atestados as any}
                  paciente={{ nome: paciente.nome, cpf: paciente.cpf ?? null, data_nascimento: paciente.data_nascimento ?? null, sexo: paciente.sexo ?? null }}
                  medicoId={medico.id}
                />
              ) : (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhum atestado emitido</p>
                </div>
              )}
            </div>

            {/* Exames */}
            <div>
              <h2 className="font-bold text-[#1A3A2C] text-lg flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-[#5BBD9B]" /> Solicitações de Exames
                <span className="text-sm text-gray-400 font-normal">({exames?.length ?? 0})</span>
              </h2>
              {exames && exames.length > 0 ? (
                <div className="space-y-3">
                  {(exames as any[]).map(e => {
                    const { data, hora } = fmtDH(e.criado_em)
                    const lista = Array.isArray(e.exames) ? e.exames as string[] : []
                    return (
                      <div key={e.id} className="bg-white rounded-2xl shadow-sm p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-500">{data} às {hora}</span>
                          </div>
                          {e.urgencia && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              e.urgencia === 'urgente' ? 'bg-red-100 text-red-700' :
                              e.urgencia === 'normal'  ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {e.urgencia}
                            </span>
                          )}
                        </div>
                        {lista.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {lista.map((ex: string) => (
                              <span key={ex} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full">{ex}</span>
                            ))}
                          </div>
                        )}
                        {e.observacoes && <p className="text-xs text-gray-400 mt-2 italic">"{e.observacoes}"</p>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <FlaskConical className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhum exame solicitado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
