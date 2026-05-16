import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Clock, CheckCircle2, AlertTriangle, Calendar,
  FileText, Stethoscope, ClipboardList, FlaskConical,
  ChevronRight, BarChart2, ScrollText, ShieldCheck,
} from 'lucide-react'
import PingMedico from '../PingMedico'
import MedicoHeader from '../MedicoHeader'
import FilaVirtualRealtime from '../FilaVirtualRealtime'
import { drTitle } from '@/lib/medico-utils'

export default async function MedicoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  const { data: medico } = await supabase
    .from('medicos')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

  if (!medico) redirect('/login')

  if (medico.status !== 'aprovado') {
    return (
      <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1A3A2C] mb-2">Cadastro em análise</h2>
          <p className="text-gray-500 text-sm mb-4">
            Seu cadastro está sendo verificado pela nossa equipe. Você receberá um e-mail assim que for aprovado.
          </p>
          <p className="text-xs text-gray-400">Status: <strong>{medico.status}</strong></p>
          <Link href="/login" className="mt-4 inline-block text-[#5BBD9B] text-sm">Sair</Link>
        </div>
      </div>
    )
  }

  // ── Início do dia em São Paulo (UTC-3 fixo desde 2019) ────────────────────
  const hojeStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const hojeInicio = new Date(hojeStr + 'T00:00:00-03:00').toISOString()

  // ── Dados em paralelo ─────────────────────────────────────────────────────
  const [atendidosRes, atestadosRes, receitasRes, renovacoesRes, examesRes, agendamentosFuturosRes, exclusoesRes] = await Promise.all([
    // Atendidos hoje
    adminSupabase
      .from('atendimentos')
      .select('id, finalizado_em, agendamento_id, notas_medico, pacientes(id, nome), triagens(classificacao_risco)')
      .eq('medico_id', medico.id)
      .eq('status', 'concluido')
      .gte('finalizado_em', hojeInicio)
      .order('finalizado_em', { ascending: false }),

    // Atestados hoje
    adminSupabase
      .from('atestados')
      .select('id, criado_em, dias, cid, pacientes(id, nome)')
      .eq('medico_id', medico.id)
      .gte('criado_em', hojeInicio)
      .order('criado_em', { ascending: false }),

    // Receitas hoje
    adminSupabase
      .from('receitas')
      .select('id, criado_em, status, valor_medico, pacientes(id, nome)')
      .eq('medico_id', medico.id)
      .gte('criado_em', hojeInicio)
      .order('criado_em', { ascending: false }),

    // Renovações pendentes
    adminSupabase
      .from('solicitacoes_renovacao')
      .select('id, tipo_receita, medicamentos, criado_em, pacientes(id, nome)')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: true }),

    // Exames pedidos hoje
    adminSupabase
      .from('solicitacoes_exames')
      .select('id, criado_em, exames, urgencia, pacientes(id, nome)')
      .eq('medico_id', medico.id)
      .gte('criado_em', hojeInicio)
      .order('criado_em', { ascending: false }),

    // Consultas agendadas futuras (não canceladas/reagendadas)
    adminSupabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('medico_id', medico.id)
      .gte('data_hora', new Date().toISOString())
      .not('status', 'in', '(cancelado,reagendado)'),

    // Protocolos de exclusão hoje
    adminSupabase
      .from('exclusoes_telemedicina')
      .select('id, criado_em, status, motivos, conduta, pacientes(id, nome)')
      .eq('medico_id', medico.id)
      .gte('criado_em', hojeInicio)
      .order('criado_em', { ascending: false }),
  ])

  const atendidos          = atendidosRes.data      ?? []
  const atestados          = atestadosRes.data      ?? []
  const receitas           = receitasRes.data       ?? []
  const renovacoes         = renovacoesRes.data     ?? []
  const exames             = examesRes.data         ?? []
  const totalAgendamentos  = agendamentosFuturosRes.count ?? 0
  const exclusoes          = exclusoesRes.data      ?? []

  // ── Cálculos do resumo do dia ─────────────────────────────────────────────
  const custoConsulta     = Number(medico.custo_consulta ?? 0)
  const consultasVirtual  = atendidos.filter((a: any) => !a.agendamento_id).length
  const consultasAgendadas = atendidos.filter((a: any) => !!a.agendamento_id).length
  const receitasRenovacao = receitas.filter((r: any) => Number(r.valor_medico) > 0)
  const receitasEmConsulta = receitas.filter((r: any) => !(Number(r.valor_medico) > 0))
  const totalGanhoConsultas  = atendidos.length * custoConsulta
  const totalGanhoRenovacoes = receitasRenovacao.reduce((s: number, r: any) => s + Number(r.valor_medico), 0)
  const totalDia = totalGanhoConsultas + totalGanhoRenovacoes

  const horaAtual = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }))
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite'
  const titulo = drTitle(medico.sexo)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const corRisco: Record<string, string> = {
    verde:    'bg-green-100 text-green-700',
    amarelo:  'bg-yellow-100 text-yellow-700',
    laranja:  'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
    default:  'bg-gray-100 text-gray-600',
  }
  const labelRisco: Record<string, string> = {
    verde: 'Baixo', amarelo: 'Moderado', laranja: 'Alto', vermelho: 'Urgência',
  }

  function formatarHora(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  }

  function formatBRL(v: number | null) {
    if (!v) return '—'
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // ── Status de exclusão ────────────────────────────────────────────────────
  const STATUS_EXCL_LABEL: Record<string, string> = {
    apto: 'Apto', apto_ressalvas: 'Ressalvas', nao_apto: 'Não apto', emergencia: 'Emergência',
  }
  const STATUS_EXCL_COR: Record<string, string> = {
    apto:            'bg-green-100 text-green-700',
    apto_ressalvas:  'bg-yellow-100 text-yellow-700',
    nao_apto:        'bg-orange-100 text-orange-700',
    emergencia:      'bg-red-100 text-red-700',
  }

  // ── KPI card config ───────────────────────────────────────────────────────
  const kpis = [
    {
      href: '#atendidos',
      count: atendidos.length,
      label: 'Atendidos hoje',
      icon: CheckCircle2,
      dark: true,
      iconColor: 'text-[#5BBD9B]',
      bgIcon: 'bg-white/10',
    },
    {
      href: '#atestados',
      count: atestados.length,
      label: 'Atestados emitidos',
      icon: FileText,
      dark: false,
      iconColor: 'text-amber-500',
      bgIcon: 'bg-amber-50',
    },
    {
      href: '#receitas',
      count: receitas.length,
      label: 'Receitas emitidas',
      icon: ClipboardList,
      dark: false,
      iconColor: 'text-purple-500',
      bgIcon: 'bg-purple-50',
    },
    {
      href: '#exames',
      count: exames.length,
      label: 'Exames pedidos',
      icon: FlaskConical,
      dark: false,
      iconColor: 'text-blue-500',
      bgIcon: 'bg-blue-50',
    },
    {
      href: '#exclusoes',
      count: exclusoes.length,
      label: 'Prot. Exclusão',
      icon: ShieldCheck,
      dark: false,
      iconColor: 'text-teal-600',
      bgIcon: 'bg-teal-50',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F3FAF7] scroll-smooth">
      <PingMedico />
      <MedicoHeader titulo="Painel do Médico" medicoNome={medico.nome} medicoSexo={medico.sexo} medicoFotoUrl={medico.foto_url} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Saudação */}
        <div className="flex items-center gap-4">
          {medico.foto_url && (
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={medico.foto_url} alt={medico.nome} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#1A3A2C]">{saudacao}, {titulo} {medico.nome}!</h1>
            <p className="text-gray-500 mt-1">{medico.especialidade} — CRM {medico.crm}/{medico.crm_uf}</p>
          </div>
        </div>

        {/* ── KPI cards clicáveis ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {kpis.map(k => (
            <a
              key={k.href}
              href={k.href}
              className={`group rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                k.dark ? 'bg-[#1A3A2C] hover:bg-[#122a1f]' : 'bg-white border border-gray-50 hover:border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.bgIcon}`}>
                  <k.icon className={`w-5 h-5 ${k.iconColor}`} />
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${k.dark ? 'text-green-300' : 'text-gray-300'}`} />
              </div>
              <div className={`text-3xl font-bold ${k.dark ? 'text-white' : 'text-[#1A3A2C]'}`}>{k.count}</div>
              <div className={`text-sm mt-1 ${k.dark ? 'text-green-300' : 'text-gray-400'}`}>{k.label}</div>
            </a>
          ))}
        </div>

        {/* ── Atalhos ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/medico/producao"
            className="bg-[#1A3A2C] rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center gap-4 transition-shadow">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Minha Produção</p>
              <p className="text-xs text-green-300">Ver ganhos e histórico</p>
            </div>
          </Link>
          <Link href="/medico/pacientes"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center gap-4 transition-shadow">
            <div className="w-10 h-10 bg-[#1A3A2C]/10 rounded-xl flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-[#1A3A2C]" />
            </div>
            <div>
              <p className="font-semibold text-[#1A3A2C] text-sm">Prontuários</p>
              <p className="text-xs text-gray-400">Ver todos os pacientes</p>
            </div>
          </Link>
          <Link href="/medico/disponibilidade"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center gap-4 transition-shadow">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-[#1A3A2C] text-sm">Disponibilidade</p>
              <p className="text-xs text-gray-400">Gerenciar horários</p>
            </div>
          </Link>
          <Link href="/medico/agendamentos"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center gap-4 transition-shadow group">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#1A3A2C] text-sm">Agenda</p>
                {totalAgendamentos > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    {totalAgendamentos}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {totalAgendamentos === 0
                  ? 'Nenhuma consulta agendada'
                  : `${totalAgendamentos} consulta${totalAgendamentos !== 1 ? 's' : ''} futura${totalAgendamentos !== 1 ? 's' : ''}`}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Fila de Atendimento Virtual (atualização em tempo real) ── */}
        <FilaVirtualRealtime />

        {/* ── Renovações de Receita Pendentes ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScrollText className="w-5 h-5 text-purple-500" />
              <h2 className="font-bold text-[#1A3A2C]">Renovações de Receita</h2>
            </div>
            {renovacoes.length > 0 && (
              <span className="bg-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {renovacoes.length} pendente{renovacoes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {renovacoes.length === 0 ? (
            <div className="py-12 text-center">
              <ScrollText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium text-sm">Nenhuma renovação pendente</p>
              <p className="text-gray-300 text-sm mt-1">Pedidos de renovação de receita aparecerão aqui</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {renovacoes.map((r: any) => {
                const LABEL_TIPO: Record<string, string> = {
                  simples: 'Receita Simples', especial: 'Receita Especial', antimicrobiano: 'Antimicrobiano',
                }
                const COR_TIPO: Record<string, string> = {
                  simples: 'bg-green-100 text-green-700', especial: 'bg-purple-100 text-purple-700', antimicrobiano: 'bg-blue-100 text-blue-700',
                }
                return (
                  <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                      <ScrollText className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-[#1A3A2C] text-sm">
                          {(r.pacientes as any)?.nome ?? 'Paciente'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${COR_TIPO[r.tipo_receita] ?? 'bg-gray-100 text-gray-600'}`}>
                          {LABEL_TIPO[r.tipo_receita] ?? r.tipo_receita}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono line-clamp-1">
                        {r.medicamentos?.split('\n')[0] ?? '—'}
                      </p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Solicitado às {formatarHora(r.criado_em)}
                      </p>
                    </div>
                    <Link
                      href={`/medico/renovacao/${r.id}`}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 transition-colors"
                    >
                      <ScrollText className="w-4 h-4" />
                      Emitir
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Atendidos hoje — Consultas ── */}
        <div id="atendidos" className="bg-white rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#5BBD9B]" />
            <h2 className="font-bold text-[#1A3A2C] text-sm">
              Atendidos Hoje — Consultas
              <span className="ml-2 text-xs text-gray-400 font-normal">({atendidos.length})</span>
            </h2>
          </div>
          {atendidos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Horário</th>
                    <th className="px-5 py-3 text-left">Paciente</th>
                    <th className="px-5 py-3 text-center">Tipo</th>
                    <th className="px-5 py-3 text-center">Risco</th>
                    <th className="px-5 py-3 text-right">Ganho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {atendidos.map((a: any) => {
                    const risco = a.triagens?.classificacao_risco
                    const enc = (a.notas_medico ?? '').match(/\[Encaminhado por (.+?)\]/)
                    const isEncaminhamento = !!enc
                    const isAgendada = !!a.agendamento_id && !isEncaminhamento
                    const tipoBadge = isEncaminhamento
                      ? { label: 'Encaminh.', cls: 'bg-orange-50 text-orange-700' }
                      : isAgendada
                        ? { label: 'Agendada',  cls: 'bg-purple-50 text-purple-700' }
                        : { label: 'Virtual',   cls: 'bg-green-50 text-green-700' }
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{formatarHora(a.finalizado_em)}</td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/medico/pacientes/${a.pacientes?.id}?back=${encodeURIComponent('/medico/dashboard')}`}
                            className="font-medium text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                          >
                            {a.pacientes?.nome || '—'}
                          </Link>
                          {isEncaminhamento && enc && (
                            <p className="text-[10px] text-orange-500 mt-0.5">Enc. por {enc[1]}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${tipoBadge.cls}`}>
                            {tipoBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {risco ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corRisco[risco] || corRisco.default}`}>
                              {labelRisco[risco] || risco}
                            </span>
                          ) : <span className="text-gray-200 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold">
                          {custoConsulta > 0
                            ? <span className="text-green-600">{formatBRL(custoConsulta)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {custoConsulta > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                    <tr>
                      <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total ({atendidos.length} {atendidos.length === 1 ? 'consulta' : 'consultas'})
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
                        {formatBRL(totalGanhoConsultas)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum atendimento concluído hoje</p>
            </div>
          )}
        </div>

        {/* ── Atestados emitidos hoje ── */}
        <div id="atestados" className="bg-white rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <FileText className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-[#1A3A2C] text-sm">
              Atestados emitidos hoje
              <span className="ml-2 text-xs text-gray-400 font-normal">({atestados.length})</span>
            </h2>
          </div>
          {atestados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Horário</th>
                    <th className="px-5 py-3 text-left">Paciente</th>
                    <th className="px-5 py-3 text-center">Dias</th>
                    <th className="px-5 py-3 text-left">CID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {atestados.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-500">{formatarHora(a.criado_em)}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/medico/pacientes/${a.pacientes?.id}?back=${encodeURIComponent('/medico/dashboard')}`}
                          className="font-medium text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                        >
                          {a.pacientes?.nome || '—'}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          {a.dias ?? '—'} dias
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">{a.cid || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <FileText className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum atestado emitido hoje</p>
            </div>
          )}
        </div>

        {/* ── Receitas emitidas hoje ── */}
        <div id="receitas" className="bg-white rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <ClipboardList className="w-4 h-4 text-purple-500" />
            <h2 className="font-bold text-[#1A3A2C] text-sm">
              Receitas emitidas hoje
              <span className="ml-2 text-xs text-gray-400 font-normal">({receitas.length})</span>
            </h2>
          </div>
          {receitas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 font-medium uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Horário</th>
                    <th className="px-5 py-3 text-left">Paciente</th>
                    <th className="px-5 py-3 text-center">Tipo</th>
                    <th className="px-5 py-3 text-right">Ganho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {receitas.map((r: any) => {
                    const isRenovacao = Number(r.valor_medico) > 0
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-xs text-gray-500">{formatarHora(r.criado_em)}</td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/medico/pacientes/${r.pacientes?.id}?back=${encodeURIComponent('/medico/dashboard')}`}
                            className="font-medium text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                          >
                            {r.pacientes?.nome || '—'}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {isRenovacao ? (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-semibold">
                              Renovação
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-medium">
                              Em consulta
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold">
                          {isRenovacao
                            ? <span className="text-green-600">{formatBRL(Number(r.valor_medico))}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {totalGanhoRenovacoes > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-100">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total renovações ({receitasRenovacao.length})
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
                        {formatBRL(totalGanhoRenovacoes)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <ClipboardList className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma receita emitida hoje</p>
            </div>
          )}
        </div>

        {/* ── Exames pedidos hoje ── */}
        <div id="exames" className="bg-white rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            <h2 className="font-bold text-[#1A3A2C] text-sm">
              Exames pedidos hoje
              <span className="ml-2 text-xs text-gray-400 font-normal">({exames.length})</span>
            </h2>
          </div>
          {exames.length === 0 ? (
            <div className="py-10 text-center">
              <FlaskConical className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum exame pedido hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(exames as any[]).map((ex: any) => {
                const lista = ex.exames?.split('\n').map((l: string) => l.trim()).filter(Boolean) ?? []
                const isUrgente = ex.urgencia === 'urgente' || ex.urgencia === 'emergencia'
                return (
                  <div key={ex.id} className="px-6 py-3 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A3A2C]">
                        {(ex.pacientes as any)?.nome ?? 'Paciente'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{lista.join(' · ')}</p>
                    </div>
                    {isUrgente && (
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                        ex.urgencia === 'emergencia'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ex.urgencia === 'emergencia' ? 'Emergência' : 'Urgente'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>


        {/* ── Protocolos de Exclusão hoje ── */}
        <div id="exclusoes" className="bg-white rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <h2 className="font-bold text-[#1A3A2C] text-sm">
              Protocolos de Exclusão hoje
              <span className="ml-2 text-xs text-gray-400 font-normal">({exclusoes.length})</span>
            </h2>
          </div>
          {exclusoes.length === 0 ? (
            <div className="py-10 text-center">
              <ShieldCheck className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum protocolo de exclusão registrado hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(exclusoes as any[]).map((ex: any) => {
                const motivos: string[] = Array.isArray(ex.motivos) ? ex.motivos : []
                return (
                  <div key={ex.id} className="px-6 py-3 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <Link
                          href={`/medico/pacientes/${(ex.pacientes as any)?.id}?back=${encodeURIComponent('/medico/dashboard')}`}
                          className="text-sm font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                        >
                          {(ex.pacientes as any)?.nome ?? '—'}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_EXCL_COR[ex.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_EXCL_LABEL[ex.status] ?? ex.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{ex.conduta}</p>
                      {motivos.length > 0 && (
                        <p className="text-[10px] text-gray-300 mt-0.5">
                          {motivos.length} motivo{motivos.length !== 1 ? 's' : ''}: {motivos.slice(0, 2).join(', ')}{motivos.length > 2 ? '…' : ''}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 shrink-0 pt-0.5">{formatarHora(ex.criado_em)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Resumo do Dia ── */}
        {(atendidos.length > 0 || receitas.length > 0 || atestados.length > 0) && (
          <div className="bg-[#1A3A2C] rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#5BBD9B]" />
              Resumo do Dia
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-xs text-green-300 font-medium">Consultas virtuais</p>
                <p className="text-2xl font-bold text-white mt-1">{consultasVirtual}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-xs text-green-300 font-medium">Consultas agendadas</p>
                <p className="text-2xl font-bold text-white mt-1">{consultasAgendadas}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-xs text-green-300 font-medium">Receita em Consulta</p>
                <p className="text-2xl font-bold text-white mt-1">{receitasEmConsulta.length}</p>
                <p className="text-xs text-green-400 mt-0.5">sem custo</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-xs text-green-300 font-medium">Renovações de Receita</p>
                <p className="text-2xl font-bold text-white mt-1">{receitasRenovacao.length}</p>
                {totalGanhoRenovacoes > 0 && <p className="text-xs text-green-400 mt-0.5">{formatBRL(totalGanhoRenovacoes)}</p>}
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-xs text-green-300 font-medium">Atestados</p>
                <p className="text-2xl font-bold text-white mt-1">{atestados.length}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-xs text-green-300 font-medium">Exames pedidos</p>
                <p className="text-2xl font-bold text-white mt-1">{exames.length}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-xs text-green-300 font-medium">Prot. Exclusão</p>
                <p className="text-2xl font-bold text-white mt-1">{exclusoes.length}</p>
              </div>
            </div>
            <div className="border-t border-white/20 pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-300 font-medium uppercase tracking-wide">Total a receber hoje</p>
                <p className="text-xs text-green-400 mt-0.5">
                  {atendidos.length} consulta{atendidos.length !== 1 ? 's' : ''}
                  {receitasRenovacao.length > 0 ? ` + ${receitasRenovacao.length} renovação` : ''}
                  {custoConsulta > 0 ? ` · ${formatBRL(custoConsulta)}/consulta` : ''}
                </p>
              </div>
              <p className="text-3xl font-bold text-[#5BBD9B]">{formatBRL(totalDia)}</p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
