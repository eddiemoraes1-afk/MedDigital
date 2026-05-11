import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Stethoscope, CheckCircle2, XCircle, Clock, Calendar,
  CreditCard, MapPin, User, Mail, Phone, User2,
} from 'lucide-react'
import AdminHeader from '../../components/AdminHeader'
import BotoesAprovacao from '../../components/BotoesAprovacao'
import ToggleMedicoAtivo from '../ToggleMedicoAtivo'
import ConfigMedico from './ConfigMedico'
import EditarMedico from './EditarMedico'
import FichaMedicoContent, {
  type AtendimentoEnriquecido,
  type AtestadoEnriquecido,
  type ReceitaEnriquecida,
} from './FichaMedicoContent'

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

  // ── Atendimentos concluídos ───────────────────────────────────────────────
  const { data: atendimentos } = await admin
    .from('atendimentos')
    .select('id, criado_em, finalizado_em, paciente_id, valor_cobrado, agendamento_id')
    .eq('medico_id', id)
    .eq('status', 'concluido')
    .order('criado_em', { ascending: false })
    .limit(200)

  const ats = atendimentos ?? []

  // ── Atestados ─────────────────────────────────────────────────────────────
  const { data: atestados } = await admin
    .from('atestados')
    .select('id, paciente_id, criado_em, dias, cid')
    .eq('medico_id', id)
    .order('criado_em', { ascending: false })

  const atests = atestados ?? []

  // ── Receitas ──────────────────────────────────────────────────────────────
  const { data: receitas } = await admin
    .from('receitas')
    .select('id, paciente_id, criado_em, status, valor_cobrado, atendimento_id')
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
    ? await admin.from('empresas').select('id, nome, preco_consulta, preco_receita').in('id', empresaIds)
    : { data: [] }

  const empresaMap: Record<string, { nome: string; preco_consulta: number; preco_receita: number }> = {}
  ;(empresas ?? []).forEach(e => { empresaMap[e.id] = { nome: e.nome, preco_consulta: e.preco_consulta ?? 0, preco_receita: (e as any).preco_receita ?? 0 } })

  // ── Helper fns ────────────────────────────────────────────────────────────
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

  function calcValorRenovacao(pacienteId: string, valorCobrado: number | null): number {
    const eId = pacienteEmpresaId[pacienteId]
    const emp = eId ? empresaMap[eId] : null
    const precoReceita = emp?.preco_receita ?? 0
    return (valorCobrado != null && valorCobrado > 0) ? valorCobrado : precoReceita
  }

  function formatDataHora(iso: string | null | undefined) {
    if (!iso) return { data: '—', hora: '—' }
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return { data: '—', hora: '—' }
      return {
        data: d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' }),
        hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
      }
    } catch {
      return { data: '—', hora: '—' }
    }
  }

  const custoConsulta = Number(medico.custo_consulta ?? 0)
  const custoReceita  = Number(medico.custo_receita  ?? 0)

  // ── Build enriched arrays ─────────────────────────────────────────────────
  const atendimentosEnriquecidos: AtendimentoEnriquecido[] = ats.map(a => {
    const { data, hora } = formatDataHora(a.finalizado_em ?? a.criado_em)
    const orig = origemPaciente(a.paciente_id)
    return {
      id: a.id,
      isoDate: a.finalizado_em ?? a.criado_em ?? '',
      data,
      hora,
      pacienteId: a.paciente_id ?? '',
      pacienteNome: pacienteMap[a.paciente_id] ?? '',
      origemLabel: orig.label,
      origemTipo: orig.tipo,
      empresaId: pacienteEmpresaId[a.paciente_id] ?? null,
      valor: valorConsulta(a.paciente_id, a.valor_cobrado ?? 0),
      custo: custoConsulta,
    }
  })

  const atestadosEnriquecidos: AtestadoEnriquecido[] = atests.map(a => {
    const { data } = formatDataHora(a.criado_em)
    const orig = origemPaciente(a.paciente_id)
    return {
      id: a.id,
      isoDate: a.criado_em ?? '',
      data,
      pacienteId: a.paciente_id ?? '',
      pacienteNome: pacienteMap[a.paciente_id] ?? '',
      origemLabel: orig.label,
      origemTipo: orig.tipo,
      empresaId: pacienteEmpresaId[a.paciente_id] ?? null,
      dias: a.dias ?? null,
      cid: a.cid ?? null,
    }
  })

  const receitasEnriquecidas: ReceitaEnriquecida[] = recs.map(r => {
    const { data } = formatDataHora(r.criado_em)
    const orig = origemPaciente(r.paciente_id)
    const isRenovacao = r.atendimento_id == null
    return {
      id: r.id,
      isoDate: r.criado_em ?? '',
      data,
      pacienteId: r.paciente_id ?? '',
      pacienteNome: pacienteMap[r.paciente_id] ?? '',
      origemLabel: orig.label,
      origemTipo: orig.tipo,
      empresaId: pacienteEmpresaId[r.paciente_id] ?? null,
      status: r.status ?? null,
      valor: isRenovacao ? calcValorRenovacao(r.paciente_id, r.valor_cobrado) : 0,
      isRenovacao,
    }
  })

  const empresasParaFiltro = empresaIds.map(eid => ({
    id: eid,
    nome: empresaMap[eid]?.nome ?? eid,
  }))

  // ── Status helpers ────────────────────────────────────────────────────────
  const ativo = medico.ativo !== false

  function statusConfig(s: string) {
    if (s === 'aprovado')  return { label: 'Aprovado',             cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> }
    if (s === 'reprovado') return { label: 'Reprovado',            cls: 'bg-red-100 text-red-700',     icon: <XCircle className="w-4 h-4" /> }
    return                        { label: 'Aguardando aprovação', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-4 h-4" /> }
  }

  const sc = statusConfig(medico.status)

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <AdminHeader titulo="Ficha do Médico" backHref={back ? decodeURIComponent(back) : '/admin/medicos'} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Doctor header card (static) ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center ${ativo ? 'bg-green-100' : 'bg-gray-100'}`}>
              {medico.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={medico.foto_url} alt={medico.nome} className="w-full h-full object-cover" />
              ) : (
                <User2 className={`w-8 h-8 ${ativo ? 'text-[#5BBD9B]' : 'text-gray-400'}`} />
              )}
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
                    {medico.rqe && <span className="text-gray-400">· RQE {medico.rqe}</span>}
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

        {/* ── Dynamic content (KPIs + filters + tables + exports) ── */}
        <FichaMedicoContent
          atendimentos={atendimentosEnriquecidos}
          atestados={atestadosEnriquecidos}
          receitas={receitasEnriquecidas}
          empresas={empresasParaFiltro}
          custoConsulta={custoConsulta}
          custoReceita={custoReceita}
          medicoId={id}
          medicoNome={medico.nome}
          sidebar={
            <div className="space-y-4">

              {/* Aprovação */}
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

              {/* Editar dados + foto */}
              <EditarMedico
                medicoId={medico.id}
                nomeatual={medico.nome}
                especialidadeAtual={medico.especialidade ?? null}
                crmAtual={medico.crm ?? null}
                crmUfAtual={medico.crm_uf ?? null}
                rqeAtual={medico.rqe ?? null}
                sexoAtual={medico.sexo ?? null}
                telefoneAtual={medico.telefone ?? null}
                cidadeAtual={medico.cidade ?? null}
                estadoAtual={medico.estado ?? null}
                bioAtual={medico.bio ?? null}
                fotoAtual={medico.foto_url ?? null}
              />

              {/* Remuneração */}
              <ConfigMedico
                medicoId={medico.id}
                custoConsultaAtual={custoConsulta}
                custoReceitaAtual={custoReceita}
              />

              {/* Perfil */}
              {(medico.bio || medico.valor_consulta) && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-[#1A3A2C] text-sm mb-3">Perfil</h3>
                  <div className="space-y-2">
                    {medico.valor_consulta && (
                      <div>
                        <p className="text-xs text-gray-400">Valor da consulta (pacientes)</p>
                        <p className="text-sm text-gray-700">
                          {Number(medico.valor_consulta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

            </div>
          }
        />

      </main>
    </div>
  )
}
