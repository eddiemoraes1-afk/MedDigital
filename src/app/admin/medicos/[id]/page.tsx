import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Stethoscope, CheckCircle2, XCircle, Clock, Calendar,
  CreditCard, MapPin, Activity, User, Mail, Phone,
  DollarSign, TrendingDown, TrendingUp, FileText, ClipboardList,
  Building2, Users,
} from 'lucide-react'
import AdminHeader from '../../components/AdminHeader'
import BotoesAprovacao from '../../components/BotoesAprovacao'
import ToggleMedicoAtivo from '../ToggleMedicoAtivo'
import ConfigMedico from './ConfigMedico'

export default async function FichaMedicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ back?: string }>
}) {
  const { id } = await params
  const { back } = await searchParams
  await requireAdmin()

  const admin = createAdminClient()

  // ── Médico ────────────────────────────────────────────────────────────────
  const { data: medico } = await admin
    .from('medicos')
    .select('*')
    .eq('id', id)
    .single()

  if (!medico) redirect('/admin/medicos')

  // ── Atendimentos concluídos (produção real) ───────────────────────────────
  const { data: atendimentos } = await admin
    .from('atendimentos')
    .select('id, criado_em, finalizado_em, paciente_id, valor_cobrado, agendamento_id')
    .eq('medico_id', id)
    .eq('status', 'concluido')
    .order('criado_em', { ascending: false })
    .limit(100)

  const ats = atendimentos ?? []

  // ── Atestados emitidos pelo médico ────────────────────────────────────────
  const { data: atestados } = await admin
    .from('atestados')
    .select('id, paciente_id, criado_em, dias, cid')
    .eq('medico_id', id)
    .order('criado_em', { ascending: false })

  const atests = atestados ?? []

  // ── Receitas emitidas pelo médico ─────────────────────────────────────────
  const { data: receitas } = await admin
    .from('receitas')
    .select('id, paciente_id, criado_em, status, valor_cobrado')
    .eq('medico_id', id)
    .order('criado_em', { ascending: false })

  const recs = receitas ?? []

  // ── Pacientes (para nomes) ────────────────────────────────────────────────
  const pacienteIds = [...new Set([
    ...ats.map(a => a.paciente_id),
    ...atests.map(a => a.paciente_id),
    ...recs.map(r => r.paciente_id),
  ].filter(Boolean))]

  const { data: pacientes } = pacienteIds.length > 0
    ? await admin.from('pacientes').select('id, nome').in('id', pacienteIds)
    : { data: [] }

  const pacienteMap: Record<string, string> = {}
  ;(pacientes ?? []).forEach(p => { pacienteMap[p.id] = p.nome })

  // ── Vínculos empresa ──────────────────────────────────────────────────────
  const { data: vinculos } = pacienteIds.length > 0
    ? await admin.from('vinculos_empresa')
        .select('paciente_id, empresa_id')
        .in('paciente_id', pacienteIds)
    : { data: [] }

  const pacienteEmpresaId: Record<string, string> = {}
  ;(vinculos ?? []).forEach(v => {
    if (!pacienteEmpresaId[v.paciente_id]) pacienteEmpresaId[v.paciente_id] = v.empresa_id
  })

  const empresaIds = [...new Set(Object.values(pacienteEmpresaId))]
  const { data: empresas } = empresaIds.length > 0
    ? await admin.from('empresas').select('id, nome, preco_consulta').in('id', empresaIds)
    : { data: [] }

  const empresaMap: Record<string, { nome: string; preco_consulta: number }> = {}
  ;(empresas ?? []).forEach(e => { empresaMap[e.id] = { nome: e.nome, preco_consulta: e.preco_consulta ?? 0 } })

  function origemPaciente(pacienteId: string): { label: string; tipo: 'empresa' | 'particular' } {
    const eId = pacienteEmpresaId[pacienteId]
    if (eId && empresaMap[eId]) return { label: empresaMap[eId].nome, tipo: 'empresa' }
    return { label: 'Particular', tipo: 'particular' }
  }

  function valorConsulta(pacienteId: string, valorFallback: number): number {
    const eId = pacienteEmpresaId[pacienteId]
    const emp = eId ? empresaMap[eId] : null
    return emp?.preco_consulta ?? valorFallback ?? 0
  }

  // ── Sets para cruzamento rápido (atestado/receita por paciente) ──────────
  // Usando apenas paciente_id como chave (sem comparar data) para evitar
  // falsos negativos por timezone. Mostra ✓ se o médico já emitiu para o paciente.
  const atestatoPacientes = new Set(atests.map(a => a.paciente_id).filter(Boolean))
  const receitaPacientes = new Set(recs.map(r => r.paciente_id).filter(Boolean))

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalConsultas = ats.length
  const faturamento = ats.reduce((s, a) => s + valorConsulta(a.paciente_id, a.valor_cobrado ?? 0), 0)
  const custoConsulta = Number(medico.custo_consulta ?? 0)
  const custoReceita = Number(medico.custo_receita ?? 0)
  const custoTotal = totalConsultas * custoConsulta + atests.length * 0 // receitas têm custo próprio
  const custoConsultasTotal = totalConsultas * custoConsulta
  const lucro = faturamento - custoConsultasTotal
  const totalAtestados = atests.length
  const totalReceitas = recs.length

  // ── Helpers ───────────────────────────────────────────────────────────────
  const ativo = medico.ativo !== false

  function statusConfig(s: string) {
    if (s === 'aprovado') return { label: 'Aprovado', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> }
    if (s === 'reprovado') return { label: 'Reprovado', cls: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> }
    return { label: 'Aguardando aprovação', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-4 h-4" /> }
  }

  function formatDataHora(iso: string | null | undefined) {
    if (!iso) return { data: '—', hora: '—', dateKey: '' }
    try {
      const d = new Date(iso) // Supabase retorna ISO 8601 com offset, ex: "2026-05-09T21:23:45.123+00:00"
      if (isNaN(d.getTime())) return { data: '—', hora: '—', dateKey: '' }
      return {
        data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
        hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
        dateKey: d.toISOString().slice(0, 10),
      }
    } catch {
      return { data: '—', hora: '—', dateKey: '' }
    }
  }

  function formatBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const sc = statusConfig(medico.status)

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader titulo="Ficha do Médico" backHref={back ? decodeURIComponent(back) : '/admin/medicos'} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Cabeçalho do médico ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${ativo ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Stethoscope className={`w-8 h-8 ${ativo ? 'text-[#5BBD9B]' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#1A3A2C]">{medico.nome}</h1>
              <div className="flex flex-wrap gap-4 mt-2">
                {medico.especialidade && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Stethoscope className="w-3.5 h-3.5 text-gray-400" />{medico.especialidade}
                  </span>
                )}
                {medico.crm && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />CRM {medico.crm}/{medico.crm_uf}
                  </span>
                )}
                {medico.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />{medico.email}
                  </span>
                )}
                {medico.telefone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />{medico.telefone}
                  </span>
                )}
                {medico.cidade && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {medico.cidade}{medico.estado ? ` / ${medico.estado}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Cadastrado em {new Date(medico.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${sc.cls}`}>
                {sc.icon} {sc.label}
              </span>
              {!ativo && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                  Inativo — oculto para pacientes
                </span>
              )}
              <ToggleMedicoAtivo medicoId={medico.id} ativo={ativo} />
            </div>
          </div>
        </div>

        {/* ── KPIs de produção ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Consultas */}
          <div className="bg-[#1A3A2C] rounded-2xl p-4 shadow-sm col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-green-300 font-medium">Consultas</p>
                <p className="text-2xl font-bold text-white mt-1">{totalConsultas}</p>
                <p className="text-xs text-green-300 mt-0.5">realizadas</p>
              </div>
              <div className="p-2 rounded-xl bg-white/10">
                <Activity className="w-4 h-4 text-[#5BBD9B]" />
              </div>
            </div>
          </div>

          {/* Faturamento */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Faturamento</p>
                <p className="text-lg font-bold text-[#1A3A2C] mt-1 leading-tight">{formatBRL(faturamento)}</p>
                <p className="text-xs text-gray-400 mt-0.5">receita gerada</p>
              </div>
              <div className="p-2 rounded-xl bg-green-50">
                <DollarSign className="w-4 h-4 text-[#5BBD9B]" />
              </div>
            </div>
          </div>

          {/* Custo */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Custo</p>
                <p className="text-lg font-bold text-orange-600 mt-1 leading-tight">
                  {custoConsulta > 0 ? formatBRL(custoTotal) : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {custoConsulta > 0 ? `${formatBRL(custoConsulta)}/consulta` : 'não configurado'}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-orange-50">
                <TrendingDown className="w-4 h-4 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Margem */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Margem bruta</p>
                <p className={`text-lg font-bold mt-1 leading-tight ${custoConsulta > 0 ? (lucro >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-300'}`}>
                  {custoConsulta > 0 ? formatBRL(lucro) : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {custoConsulta > 0 && faturamento > 0
                    ? `${Math.round((lucro / faturamento) * 100)}% margem`
                    : 'faturamento - custo'}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-blue-50">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Atestados */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Atestados</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{totalAtestados}</p>
                <p className="text-xs text-gray-400 mt-0.5">emitidos</p>
              </div>
              <div className="p-2 rounded-xl bg-amber-50">
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Receitas */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Receitas</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{totalReceitas}</p>
                <p className="text-xs text-gray-400 mt-0.5">emitidas</p>
              </div>
              <div className="p-2 rounded-xl bg-purple-50">
                <ClipboardList className="w-4 h-4 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid: histórico + sidebar ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Histórico de consultas (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Consultas realizadas */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-[#5BBD9B]" />
                  Histórico de Consultas
                  <span className="text-xs text-gray-400 font-normal">({totalConsultas})</span>
                </h2>
                {totalConsultas > 0 && (
                  <span className="text-xs text-gray-400">
                    {formatBRL(faturamento)} faturado
                    {custoConsulta > 0 && ` · ${formatBRL(custoTotal)} custo`}
                  </span>
                )}
              </div>

              {ats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Paciente</th>
                        <th className="px-5 py-3 text-left">Origem</th>
                        <th className="px-5 py-3 text-right">Faturado</th>
                        {custoConsulta > 0 && <th className="px-5 py-3 text-right">Custo</th>}
                        <th className="px-5 py-3 text-center">Atestado</th>
                        <th className="px-5 py-3 text-center">Receita</th>
                        <th className="px-5 py-3 text-center">Exame</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ats.map(a => {
                        const { data, hora } = formatDataHora(a.finalizado_em ?? a.criado_em)
                        const origem = origemPaciente(a.paciente_id)
                        const val = valorConsulta(a.paciente_id, a.valor_cobrado ?? 0)
                        const hasAtestado = atestatoPacientes.has(a.paciente_id)
                        const hasReceita = receitaPacientes.has(a.paciente_id)
                        const nomePaciente = pacienteMap[a.paciente_id]

                        return (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-800 text-xs">{data}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> {hora}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              {a.paciente_id && nomePaciente ? (
                                <Link
                                  href={`/admin/pacientes/${a.paciente_id}?back=${encodeURIComponent(`/admin/medicos/${id}`)}`}
                                  className="text-sm text-[#5BBD9B] hover:underline font-medium"
                                >
                                  {nomePaciente}
                                </Link>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                origem.tipo === 'empresa'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {origem.tipo === 'empresa'
                                  ? <Building2 className="w-3 h-3" />
                                  : <Users className="w-3 h-3" />}
                                {origem.label.length > 18 ? origem.label.slice(0, 16) + '…' : origem.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-[#1A3A2C]">
                              {val > 0 ? formatBRL(val) : '—'}
                            </td>
                            {custoConsulta > 0 && (
                              <td className="px-5 py-3 text-right text-xs text-orange-500 font-medium">
                                {formatBRL(custoConsulta)}
                              </td>
                            )}
                            <td className="px-5 py-3 text-center">
                              {hasAtestado
                                ? <span title="Atestado emitido" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100"><CheckCircle2 className="w-3 h-3 text-amber-600" /></span>
                                : <span className="text-gray-200 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {hasReceita
                                ? <span title="Receita emitida" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100"><CheckCircle2 className="w-3 h-3 text-purple-600" /></span>
                                : <span className="text-gray-200 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-gray-200 text-xs">—</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-14 text-center">
                  <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
                </div>
              )}
            </div>

            {/* Atestados emitidos */}
            {atests.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-amber-500" />
                    Atestados Emitidos
                    <span className="text-xs text-gray-400 font-normal">({atests.length})</span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Paciente</th>
                        <th className="px-5 py-3 text-center">Dias</th>
                        <th className="px-5 py-3 text-left">CID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {atests.slice(0, 30).map(a => {
                        const { data } = formatDataHora(a.criado_em)
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs text-gray-600">{data}</td>
                            <td className="px-5 py-3">
                              {a.paciente_id && pacienteMap[a.paciente_id] ? (
                                <Link href={`/admin/pacientes/${a.paciente_id}?back=${encodeURIComponent(`/admin/medicos/${id}`)}`} className="text-sm text-[#5BBD9B] hover:underline">
                                  {pacienteMap[a.paciente_id]}
                                </Link>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                {a.dias ?? '—'} dias
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-500 font-mono">{a.cid || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Receitas emitidas */}
            {recs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                    <ClipboardList className="w-4 h-4 text-purple-500" />
                    Receitas Emitidas
                    <span className="text-xs text-gray-400 font-normal">({recs.length})</span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Paciente</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recs.slice(0, 30).map(r => {
                        const { data } = formatDataHora(r.criado_em)
                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs text-gray-600">{data}</td>
                            <td className="px-5 py-3">
                              {r.paciente_id && pacienteMap[r.paciente_id] ? (
                                <Link href={`/admin/pacientes/${r.paciente_id}`} className="text-sm text-[#5BBD9B] hover:underline">
                                  {pacienteMap[r.paciente_id]}
                                </Link>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                r.status === 'emitida' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {r.status === 'emitida' ? 'Emitida' : r.status ?? '—'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-[#1A3A2C]">
                              {r.valor_cobrado ? formatBRL(r.valor_cobrado) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Ações de aprovação */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" /> Aprovação
              </h3>
              <div className="flex justify-center">
                {medico.status === 'em_analise' ? (
                  <BotoesAprovacao medicoId={medico.id} />
                ) : medico.status === 'aprovado' ? (
                  <BotoesAprovacao medicoId={medico.id} modoReprovacao />
                ) : (
                  <BotoesAprovacao medicoId={medico.id} modoAprovacao />
                )}
              </div>
            </div>

            {/* Config — remuneração por consulta */}
            <ConfigMedico
              medicoId={medico.id}
              custoConsultaAtual={custoConsulta}
              custoReceitaAtual={custoReceita}
            />

            {/* Dados do perfil */}
            {(medico.bio || medico.valor_consulta) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A2C] text-sm mb-3">Perfil</h3>
                <div className="space-y-2">
                  {medico.valor_consulta && (
                    <div>
                      <p className="text-xs text-gray-400">Valor da consulta (pacientes)</p>
                      <p className="text-sm text-gray-700">
                        {formatBRL(Number(medico.valor_consulta))}
                      </p>
                    </div>
                  )}
                  {medico.bio && (
                    <div>
                      <p className="text-xs text-gray-400">Bio</p>
                      <p className="text-sm text-gray-700">{medico.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumo financeiro */}
            {(custoConsulta > 0 || custoReceita > 0) && totalConsultas > 0 && (
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-semibold text-[#1A3A2C] text-xs uppercase tracking-wide mb-3">Resumo Financeiro</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Faturamento</span>
                    <span className="font-semibold text-[#1A3A2C]">{formatBRL(faturamento)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Custo consultas ({totalConsultas} × {formatBRL(custoConsulta)})</span>
                    <span className="font-semibold text-orange-600">- {formatBRL(custoConsultasTotal)}</span>
                  </div>
                  {custoReceita > 0 && totalReceitas > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Custo receitas ({totalReceitas} × {formatBRL(custoReceita)})</span>
                      <span className="font-semibold text-orange-600">- {formatBRL(totalReceitas * custoReceita)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-[#1A3A2C]">Margem bruta</span>
                    <span className={`font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatBRL(lucro)}</span>
                  </div>
                  {faturamento > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">% margem</span>
                      <span className={`font-semibold ${lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {Math.round((lucro / faturamento) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  )
}
