import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  User, Phone, FileText, Building2, Calendar, Activity,
  Clock, CheckCircle2, Mail, Briefcase, MapPin, XCircle,
  Stethoscope, ClipboardList, DollarSign, FlaskConical,
} from 'lucide-react'
import AdminHeader from '../../components/AdminHeader'
import AcoesAtendimento from './AcoesAtendimento'
import FichaPacienteExports, {
  type AtendimentoExport,
  type AtestadoExport,
  type ReceitaExport,
  type ExameExport,
  type TotaisExport,
} from './FichaPacienteExports'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filtro?: string; back?: string; medico_id?: string }>
}

export default async function FichaPacientePage({ params, searchParams }: Props) {
  const { id } = await params
  const { filtro, back, medico_id: medicoFiltroId } = await searchParams
  await requireAdmin()

  const admin = createAdminClient()

  // ── Paciente ──────────────────────────────────────────────────────────────
  const { data: paciente } = await admin
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!paciente) redirect('/admin/pacientes')

  // ── Vínculo com empresa ───────────────────────────────────────────────────
  const { data: vinculo } = paciente.cpf
    ? await admin
        .from('vinculos_empresa')
        .select('*, empresas(id, nome, cnpj, preco_consulta, preco_receita)')
        .eq('cpf', paciente.cpf)
        .maybeSingle()
    : { data: null }

  // ── Atendimentos concluídos ───────────────────────────────────────────────
  let atendimentosQuery = admin
    .from('atendimentos')
    .select('id, criado_em, finalizado_em, medico_id, valor_cobrado, agendamento_id, notas_medico')
    .eq('paciente_id', id)
    .eq('status', 'concluido')
    .order('criado_em', { ascending: false })

  if (medicoFiltroId) {
    atendimentosQuery = atendimentosQuery.eq('medico_id', medicoFiltroId)
  }

  const { data: atendimentosData } = await atendimentosQuery
  const atendimentos = atendimentosData ?? []

  // ── Atestados ─────────────────────────────────────────────────────────────
  const { data: atestadosData } = await admin
    .from('atestados')
    .select('id, medico_id, criado_em, dias, cid')
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  const atestados = atestadosData ?? []

  // ── Receitas ──────────────────────────────────────────────────────────────
  const { data: receitasData } = await admin
    .from('receitas')
    .select('id, medico_id, criado_em, status, valor_cobrado, atendimento_id')
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  const receitas = receitasData ?? []

  // ── Exames solicitados ────────────────────────────────────────────────────
  const { data: examesData } = await admin
    .from('solicitacoes_exames')
    .select('id, medico_id, criado_em, data_solicitacao, exames, urgencia')
    .eq('paciente_id', id)
    .order('criado_em', { ascending: false })

  const exames = examesData ?? []

  // ── Médicos (para nomes) ──────────────────────────────────────────────────
  const medicoIds = [...new Set([
    ...atendimentos.map(a => a.medico_id),
    ...atestados.map(a => a.medico_id),
    ...receitas.map(r => r.medico_id),
    ...exames.map(e => e.medico_id),
  ].filter(Boolean))]

  const { data: medicos } = medicoIds.length > 0
    ? await admin.from('medicos').select('id, nome, sexo').in('id', medicoIds)
    : { data: [] }

  const medicoMap: Record<string, { nome: string; sexo?: string | null }> = {}
  ;(medicos ?? []).forEach(m => { medicoMap[m.id] = { nome: m.nome, sexo: m.sexo } })

  function drTitleP(sexo?: string | null) { return sexo === 'F' ? 'Dra.' : 'Dr.' }

  // ── Se há filtro de médico e ele não está no medicoMap, busca o nome ──────
  if (medicoFiltroId && !medicoMap[medicoFiltroId]) {
    const { data: mExtra } = await admin.from('medicos').select('id, nome, sexo').eq('id', medicoFiltroId).single()
    if (mExtra) medicoMap[mExtra.id] = { nome: mExtra.nome, sexo: mExtra.sexo }
  }

  // ── Médicos aprovados (para atribuição) ───────────────────────────────────
  const { data: medicosAprovados } = await admin
    .from('medicos')
    .select('id, nome, especialidade')
    .eq('status', 'aprovado')
    .eq('ativo', true)
    .order('nome')

  const listaMedicos = (medicosAprovados ?? []).map(m => ({
    id: m.id,
    nome: m.nome,
    especialidade: m.especialidade ?? null,
  }))

  // ── Agendamentos futuros (próxima consulta) ───────────────────────────────
  const { data: agendamentos } = await admin
    .from('agendamentos')
    .select('id, data_hora, status, medico_id, observacoes')
    .eq('paciente_id', id)
    .order('data_hora', { ascending: false })

  const proximaConsulta = (agendamentos ?? []).find(a =>
    a.status !== 'cancelado' && new Date(a.data_hora) > new Date()
  )

  // ── Agendamentos p/ historico (fallback) ──────────────────────────────────
  const allAgendamentos = agendamentos ?? []
  const consultasAgendadas = filtro === 'concluido'
    ? allAgendamentos.filter(a => a.status === 'concluido')
    : allAgendamentos

  // ── Mapa de observações de agendamentos (para detectar encaminhamentos) ───
  const agendamentoObs: Record<string, string | null> = {}
  allAgendamentos.forEach((ag: any) => { agendamentoObs[ag.id] = ag.observacoes ?? null })

  function detectarTipoAtendimento(a: any): string {
    const notas = a.notas_medico ?? ''
    const matchNotas = notas.match(/\[Encaminhado por (.+?)\]/)
    if (matchNotas) return `Encaminhamento Virtual · Por ${matchNotas[1]}`
    const obs = a.agendamento_id ? (agendamentoObs[a.agendamento_id] ?? '') : ''
    const matchObs = obs.match(/\[Encaminhado por (.+?)\]/)
    if (matchObs) return `Encaminhamento Agendado · Por ${matchObs[1]}`
    if (a.agendamento_id) return 'Agendada'
    return 'Virtual'
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalAtendimentos = atendimentos.length
  const totalAtestados = atestados.length
  const totalReceitas = receitas.length
  const totalExames = exames.length

  // ── Helpers ───────────────────────────────────────────────────────────────
  const empresa = vinculo?.empresas as any
  const precoConsultaEmpresa: number = empresa?.preco_consulta ?? 0
  const precoReceitaEmpresa: number  = empresa?.preco_receita  ?? 0

  // Renovações = receitas sem atendimento_id (cobrança avulsa)
  const renovacoes       = receitas.filter(r => (r as any).atendimento_id == null)
  const receitasEmConsulta = receitas.filter(r => (r as any).atendimento_id != null)
  const totalRenovacoes    = renovacoes.length
  const totalRecConsulta   = receitasEmConsulta.length

  function resolveValorConsulta(valorCobrado: number | null): number {
    return precoConsultaEmpresa > 0 ? precoConsultaEmpresa : (valorCobrado ?? 0)
  }
  function resolveValorRenovacao(valorCobrado: number | null): number {
    return (valorCobrado != null && valorCobrado > 0) ? valorCobrado : precoReceitaEmpresa
  }

  const totalGastoConsultas  = atendimentos.reduce((s, a) => s + resolveValorConsulta(a.valor_cobrado), 0)
  const totalGastoRenovacoes = renovacoes.reduce((s, r) => s + resolveValorRenovacao((r as any).valor_cobrado), 0)
  const totalGasto           = totalGastoConsultas + totalGastoRenovacoes

  const temDadosCadastrais = paciente.data_nascimento || paciente.sexo ||
    paciente.convenio || paciente.numero_convenio || paciente.email

  const backHref = back ? decodeURIComponent(back) : '/admin/pacientes'

  function formatDataHora(iso: string | null | undefined) {
    if (!iso) return { data: '—', hora: '—' }
    try {
      const d = new Date(iso) // Supabase retorna ISO 8601 com offset, ex: "2026-05-09T21:23:45.123+00:00"
      if (isNaN(d.getTime())) return { data: '—', hora: '—' }
      return {
        data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
        hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
      }
    } catch {
      return { data: '—', hora: '—' }
    }
  }

  function formatBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // ── Export data (serialisable arrays for client component) ───────────────
  const atendimentosExport: AtendimentoExport[] = atendimentos.map(a => {
    const { data, hora } = formatDataHora(a.finalizado_em ?? a.criado_em)
    return {
      data,
      hora,
      medicoNome: a.medico_id ? (medicoMap[a.medico_id]?.nome ?? "—") : '—',
      tipo: detectarTipoAtendimento(a),
      valor: resolveValorConsulta(a.valor_cobrado),
    }
  })

  const atestadosExport: AtestadoExport[] = atestados.map(a => {
    const { data } = formatDataHora(a.criado_em)
    return {
      data,
      medicoNome: a.medico_id ? (medicoMap[a.medico_id]?.nome ?? "—") : '—',
      dias: a.dias ?? null,
      cid: a.cid ?? null,
    }
  })

  const receitasExport: ReceitaExport[] = receitas.map(r => {
    const { data } = formatDataHora(r.criado_em)
    const isRenovacao = (r as any).atendimento_id == null
    return {
      data,
      medicoNome: r.medico_id ? (medicoMap[r.medico_id]?.nome ?? "—") : '—',
      isRenovacao,
      status: r.status ?? null,
      valor: isRenovacao ? resolveValorRenovacao((r as any).valor_cobrado) : 0,
    }
  })

  const examesExport: ExameExport[] = exames.map(e => {
    const { data } = formatDataHora(e.criado_em)
    return {
      data,
      medicoNome: e.medico_id ? (medicoMap[e.medico_id]?.nome ?? "—") : '—',
      exames: e.exames ?? '',
      urgencia: e.urgencia === 'emergencia' ? 'Emergência'
              : e.urgencia === 'urgente' ? 'Urgente'
              : 'Normal',
    }
  })

  const totaisExport: TotaisExport = {
    totalAtendimentos,
    totalAtestados,
    totalReceitas,
    totalExames,
    totalRenovacoes,
    totalRecConsulta,
    totalGastoConsultas,
    totalGastoRenovacoes,
    totalGasto,
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader titulo="Ficha do Paciente" backHref={backHref} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Cabeçalho do paciente ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#1A3A2C]">{paciente.nome}</h1>
              <div className="flex flex-wrap gap-4 mt-2">
                {paciente.cpf && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />{paciente.cpf}
                  </span>
                )}
                {paciente.telefone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />{paciente.telefone}
                  </span>
                )}
                {paciente.email && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />{paciente.email}
                  </span>
                )}
                {paciente.convenio && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />{paciente.convenio}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Cadastrado em {new Date(paciente.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* KPIs + export buttons */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="flex gap-3">
                <div className="text-center bg-[#F3FAF7] rounded-xl px-4 py-3">
                  <p className="text-2xl font-bold text-[#1A3A2C]">{totalAtendimentos}</p>
                  <p className="text-xs text-gray-400">consultas</p>
                </div>
                <div className="text-center bg-amber-50 rounded-xl px-4 py-3">
                  <p className="text-2xl font-bold text-amber-600">{totalAtestados}</p>
                  <p className="text-xs text-gray-400">atestados</p>
                </div>
                <div className="text-center bg-purple-50 rounded-xl px-4 py-3">
                  <p className="text-2xl font-bold text-purple-600">{totalReceitas}</p>
                  <p className="text-xs text-gray-400">receitas</p>
                </div>
                <div className="text-center bg-blue-50 rounded-xl px-4 py-3">
                  <p className="text-2xl font-bold text-blue-600">{totalExames}</p>
                  <p className="text-xs text-gray-400">exames</p>
                </div>
              </div>
              <FichaPacienteExports
                pacienteNome={paciente.nome}
                empresaNome={empresa?.nome ?? ''}
                atendimentos={atendimentosExport}
                atestados={atestadosExport}
                receitas={receitasExport}
                exames={examesExport}
                totais={totaisExport}
              />
            </div>
          </div>
        </div>

        {/* ── Grid: conteúdo + sidebar ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Coluna principal ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Histórico de Atendimentos Concluídos */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" id="historico">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-[#5BBD9B]" />
                  Consultas Realizadas
                  <span className="text-xs text-gray-400 font-normal">({totalAtendimentos})</span>
                </h2>
                {medicoFiltroId && (
                  <span className="flex items-center gap-1.5 text-xs bg-[#5BBD9B]/10 text-[#1A3A2C] px-3 py-1 rounded-full font-medium shrink-0">
                    <Stethoscope className="w-3 h-3 text-[#5BBD9B]" />
                    Apenas consultas com {medicoMap[medicoFiltroId]?.nome ?? 'este médico'}
                  </span>
                )}
              </div>

              {atendimentos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Médico</th>
                        <th className="px-5 py-3 text-left">Tipo</th>
                        <th className="px-5 py-3 text-right">Valor</th>
                        <th className="px-5 py-3 text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {atendimentos.map(a => {
                        const { data, hora } = formatDataHora(a.finalizado_em ?? a.criado_em)
                        const medicoNome = a.medico_id ? medicoMap[a.medico_id]?.nome : null
                        return (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-800 text-xs">{data}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> {hora}
                              </p>
                            </td>
                            <td className="px-5 py-3">
                              {medicoNome ? (
                                <Link
                                  href={`/admin/medicos/${a.medico_id}?back=${encodeURIComponent(`/admin/pacientes/${id}?back=${encodeURIComponent(backHref)}`)}`}
                                  className="text-sm text-[#5BBD9B] hover:underline font-medium"
                                >
                                  {medicoNome}
                                </Link>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {(() => {
                                const tipoStr = detectarTipoAtendimento(a)
                                const isEnc = tipoStr.startsWith('Encaminhamento')
                                const [label, referrer] = tipoStr.includes(' · Por ')
                                  ? tipoStr.split(' · Por ')
                                  : [tipoStr, null]
                                return (
                                  <div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isEnc ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                      {label}
                                    </span>
                                    {referrer && (
                                      <p className="text-[10px] text-orange-500 mt-0.5">Por {referrer}</p>
                                    )}
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-[#1A3A2C]">
                              {resolveValorConsulta(a.valor_cobrado) > 0 ? formatBRL(resolveValorConsulta(a.valor_cobrado)) : '—'}
                            </td>
                            <td className="px-5 py-3">
                              {!a.medico_id && (
                                <AcoesAtendimento
                                  atendimentoId={a.id}
                                  pacienteId={id}
                                  medicos={listaMedicos}
                                />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                      <tr>
                        <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Total ({totalAtendimentos} {totalAtendimentos === 1 ? 'consulta' : 'consultas'})
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-[#1A3A2C]">
                          {formatBRL(totalGastoConsultas)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="py-14 text-center">
                  <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma consulta realizada</p>
                </div>
              )}
            </div>

            {/* Atestados */}
            {atestados.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-amber-500" />
                    Atestados Emitidos
                    <span className="text-xs text-gray-400 font-normal">({atestados.length})</span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Médico</th>
                        <th className="px-5 py-3 text-center">Dias</th>
                        <th className="px-5 py-3 text-left">CID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {atestados.map(a => {
                        const { data } = formatDataHora(a.criado_em)
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs text-gray-600">{data}</td>
                            <td className="px-5 py-3">
                              {a.medico_id && medicoMap[a.medico_id] ? (
                                <Link
                                  href={`/admin/medicos/${a.medico_id}?back=${encodeURIComponent(`/admin/pacientes/${id}?back=${encodeURIComponent(backHref)}`)}`}
                                  className="text-sm text-[#5BBD9B] hover:underline"
                                >
                                  {medicoMap[a.medico_id]?.nome}
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

            {/* Receitas */}
            {receitas.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                  <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                    <ClipboardList className="w-4 h-4 text-purple-500" />
                    Receitas Emitidas
                    <span className="text-xs text-gray-400 font-normal">({receitas.length})</span>
                  </h2>
                  {totalRenovacoes > 0 && (
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{totalRenovacoes} renovação</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{totalRecConsulta} em consulta</span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Médico</th>
                        <th className="px-5 py-3 text-center">Tipo</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {receitas.map(r => {
                        const { data } = formatDataHora(r.criado_em)
                        const isRenovacao = (r as any).atendimento_id == null
                        const valorRenovacao = isRenovacao ? resolveValorRenovacao((r as any).valor_cobrado) : 0
                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs text-gray-600">{data}</td>
                            <td className="px-5 py-3">
                              {r.medico_id && medicoMap[r.medico_id] ? (
                                <Link
                                  href={`/admin/medicos/${r.medico_id}?back=${encodeURIComponent(`/admin/pacientes/${id}?back=${encodeURIComponent(backHref)}`)}`}
                                  className="text-sm text-[#5BBD9B] hover:underline"
                                >
                                  {medicoMap[r.medico_id]?.nome}
                                </Link>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {isRenovacao ? (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Renovação</span>
                              ) : (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Em consulta</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                r.status === 'emitida' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {r.status === 'emitida' ? 'Emitida' : r.status ?? '—'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-[#1A3A2C]">
                              {isRenovacao && valorRenovacao > 0 ? formatBRL(valorRenovacao) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {totalRenovacoes > 0 && (
                      <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                        <tr>
                          <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Total renovações
                          </td>
                          <td className="px-5 py-3" />
                          <td className="px-5 py-3 text-right text-sm font-bold text-[#1A3A2C]">
                            {formatBRL(totalGastoRenovacoes)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Exames */}
            {exames.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 text-sm">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                    Exames Solicitados
                    <span className="text-xs text-gray-400 font-normal">({exames.length})</span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                      <tr>
                        <th className="px-5 py-3 text-left">Data</th>
                        <th className="px-5 py-3 text-left">Médico</th>
                        <th className="px-5 py-3 text-left">Exames</th>
                        <th className="px-5 py-3 text-center">Urgência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {exames.map(e => {
                        const { data } = formatDataHora(e.criado_em)
                        const urgCor = e.urgencia === 'emergencia'
                          ? 'bg-red-100 text-red-700'
                          : e.urgencia === 'urgente'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                        const urgLabel = e.urgencia === 'emergencia' ? 'Emergência'
                          : e.urgencia === 'urgente' ? 'Urgente' : 'Normal'
                        return (
                          <tr key={e.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs text-gray-600">{data}</td>
                            <td className="px-5 py-3">
                              {e.medico_id && medicoMap[e.medico_id] ? (
                                <Link
                                  href={`/admin/medicos/${e.medico_id}?back=${encodeURIComponent(`/admin/pacientes/${id}?back=${encodeURIComponent(backHref)}`)}`}
                                  className="text-sm text-[#5BBD9B] hover:underline"
                                >
                                  {medicoMap[e.medico_id]?.nome}
                                </Link>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-700 whitespace-pre-line max-w-xs">
                              {e.exames}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgCor}`}>
                                {urgLabel}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Se não há nenhuma atividade */}
            {atendimentos.length === 0 && atestados.length === 0 && receitas.length === 0 && exames.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm py-14 text-center">
                <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhuma atividade registrada para este paciente</p>
              </div>
            )}

          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Próxima consulta */}
            {proximaConsulta && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <h3 className="font-semibold text-green-800 text-sm flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" /> Próxima consulta
                </h3>
                <p className="text-green-900 font-medium">
                  {formatDataHora(proximaConsulta.data_hora).data}
                </p>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {formatDataHora(proximaConsulta.data_hora).hora}
                </p>
                {proximaConsulta.medico_id && medicoMap[proximaConsulta.medico_id] && (
                  <p className="text-xs text-green-600 mt-1">
                    {medicoMap[proximaConsulta.medico_id]?.sexo === 'F' ? 'Dra.' : 'Dr.'} {medicoMap[proximaConsulta.medico_id]?.nome}
                  </p>
                )}
              </div>
            )}

            {/* Vínculo empresarial */}
            {vinculo ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-purple-500" /> Empresa
                </h3>
                <Link
                  href={`/admin/empresas/${empresa?.id}`}
                  className="font-medium text-purple-700 hover:underline text-sm"
                >
                  {empresa?.nome}
                </Link>
                {empresa?.cnpj && (
                  <p className="text-xs text-gray-400 mt-0.5">{empresa.cnpj}</p>
                )}
                <div className="mt-3 space-y-1.5">
                  {vinculo.cargo && (
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-gray-400" /> {vinculo.cargo}
                    </p>
                  )}
                  {vinculo.departamento && (
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400" /> {vinculo.departamento}
                    </p>
                  )}
                  {vinculo.data_admissao && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      Admissão: {new Date(vinculo.data_admissao).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${vinculo.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {vinculo.ativo
                      ? <><CheckCircle2 className="w-3 h-3" /> Ativo</>
                      : <><XCircle className="w-3 h-3" /> Inativo</>
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-gray-400" /> Empresa
                </h3>
                <p className="text-xs text-gray-400">Paciente particular · sem vínculo empresarial</p>
              </div>
            )}

            {/* Dados cadastrais */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-400" /> Dados cadastrais
              </h3>
              {temDadosCadastrais ? (
                <div className="space-y-2">
                  {paciente.email && (
                    <div>
                      <p className="text-xs text-gray-400">E-mail</p>
                      <p className="text-sm text-gray-700">{paciente.email}</p>
                    </div>
                  )}
                  {paciente.data_nascimento && (
                    <div>
                      <p className="text-xs text-gray-400">Data de nascimento</p>
                      <p className="text-sm text-gray-700">
                        {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {paciente.sexo && (
                    <div>
                      <p className="text-xs text-gray-400">Sexo</p>
                      <p className="text-sm text-gray-700 capitalize">{paciente.sexo}</p>
                    </div>
                  )}
                  {paciente.convenio && (
                    <div>
                      <p className="text-xs text-gray-400">Convênio</p>
                      <p className="text-sm text-gray-700">{paciente.convenio}</p>
                    </div>
                  )}
                  {paciente.numero_convenio && (
                    <div>
                      <p className="text-xs text-gray-400">Nº convênio</p>
                      <p className="text-sm font-mono text-gray-700">{paciente.numero_convenio}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhum dado adicional cadastrado</p>
              )}
            </div>

            {/* Resumo de atividade */}
            {(totalAtendimentos > 0 || totalAtestados > 0 || totalReceitas > 0 || totalExames > 0) && (
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-semibold text-[#1A3A2C] text-xs uppercase tracking-wide mb-3">Resumo de Atividade</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Stethoscope className="w-3.5 h-3.5 text-[#5BBD9B]" /> Consultas
                    </span>
                    <span className="font-bold text-[#1A3A2C]">{totalAtendimentos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <FileText className="w-3.5 h-3.5 text-amber-500" /> Atestados
                    </span>
                    <span className="font-bold text-amber-600">{totalAtestados}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <ClipboardList className="w-3.5 h-3.5 text-purple-500" /> Receitas
                    </span>
                    <span className="font-bold text-purple-600">{totalReceitas}</span>
                  </div>
                  {totalExames > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <FlaskConical className="w-3.5 h-3.5 text-blue-500" /> Exames
                      </span>
                      <span className="font-bold text-blue-600">{totalExames}</span>
                    </div>
                  )}

                  {/* Detalhamento financeiro */}
                  {(totalAtendimentos > 0 || totalRenovacoes > 0) && (
                    <>
                      <div className="pt-2 border-t border-gray-200 space-y-1.5">
                        {totalAtendimentos > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Consultas ({totalAtendimentos})</span>
                            <span className="font-semibold text-[#1A3A2C]">{formatBRL(totalGastoConsultas)}</span>
                          </div>
                        )}
                        {totalRenovacoes > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Renovações ({totalRenovacoes})</span>
                            <span className="font-semibold text-orange-600">{formatBRL(totalGastoRenovacoes)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                          <span className="flex items-center gap-1.5 text-gray-500 font-semibold">
                            <DollarSign className="w-3.5 h-3.5 text-[#5BBD9B]" /> Total gasto
                          </span>
                          <span className="font-bold text-[#1A3A2C]">{formatBRL(totalGasto)}</span>
                        </div>
                      </div>
                    </>
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
