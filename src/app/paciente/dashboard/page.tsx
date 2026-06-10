import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ScrollText, Clock, FileText, Calendar, Video, ChevronRight, User, Pill, FlaskConical } from 'lucide-react'
import { gerarTema } from '@/lib/tema'
import { getEmpresaPaciente } from '@/lib/getEmpresaPaciente'
import PacienteHeader from '../PacienteHeader'
import { drTitle } from '@/lib/medico-utils'

export default async function PacienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

  // Dados da empresa (deduplica com o layout via cache React)
  const empresaData = paciente?.id
    ? await getEmpresaPaciente(paciente.id)
    : { logoUrl: null, corPrimaria: null, empresaNome: null, empresaId: null }

  const tema = gerarTema(empresaData.corPrimaria)

  // Buscar últimas triagens
  const { data: triagens } = await adminSupabase
    .from('triagens')
    .select('*')
    .eq('paciente_id', paciente?.id)
    .order('criado_em', { ascending: false })
    .limit(3)

  // Buscar últimos atendimentos
  const { data: atendimentos } = await adminSupabase
    .from('atendimentos')
    .select('*')
    .eq('paciente_id', paciente?.id)
    .order('criado_em', { ascending: false })
    .limit(3)

  // Consulta ativa — para mostrar banner de reconexão no dashboard
  const { data: consultaAtiva } = await adminSupabase
    .from('atendimentos')
    .select('id, status')
    .eq('paciente_id', paciente?.id)
    .in('status', ['aguardando', 'em_andamento'])
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Atestados, receitas e exames do paciente
  const hoje = new Date().toISOString().slice(0, 10)
  const [atestadosRes, receitasRes, examesRes] = await Promise.all([
    adminSupabase
      .from('atestados')
      .select('id, data_fim')
      .eq('paciente_id', paciente?.id),
    adminSupabase
      .from('receitas')
      .select('id, validade, valor_coparticipacao')
      .eq('paciente_id', paciente?.id),
    adminSupabase
      .from('solicitacoes_exames')
      .select('id, urgencia, data_solicitacao')
      .eq('paciente_id', paciente?.id),
  ])
  const atestadosPaciente = atestadosRes.data
  const receitasPaciente = receitasRes.data
  const examesPaciente = examesRes.data

  // Badge: só aparece para documentos ainda válidos/ativos
  const atestadosValidos = (atestadosPaciente ?? []).filter((a: any) => a.data_fim && a.data_fim >= hoje).length
  const receitasValidas  = (receitasPaciente  ?? []).filter((r: any) => !r.validade || r.validade >= hoje).length
  const examesValidos    = (examesPaciente    ?? []).filter((e: any) => {
    if (!e.data_solicitacao) return true   // sem data: considera ativo
    const expira = new Date(e.data_solicitacao + 'T12:00:00')
    expira.setDate(expira.getDate() + 90)  // validade de 90 dias
    return new Date() <= expira
  }).length
  // Co-participação acumulada do paciente em receitas (todas, não só válidas)
  const copartReceitas = (receitasPaciente ?? []).reduce((s: number, r: any) => s + (Number(r.valor_coparticipacao) || 0), 0)

  // Próximas consultas
  const agora = new Date().toISOString()
  const { data: proximasConsultas } = await adminSupabase
    .from('agendamentos')
    .select('id, data_hora, medico_id, status')
    .eq('paciente_id', paciente?.id)
    .gte('data_hora', agora)
    .not('status', 'in', '("cancelado","reagendado")')
    .order('data_hora', { ascending: true })
    .limit(3)

  const medicoIds = [...new Set((proximasConsultas || []).map((a: any) => a.medico_id))]
  const { data: medicos } = medicoIds.length > 0
    ? await adminSupabase.from('medicos').select('id, nome, especialidade, sexo').in('id', medicoIds)
    : { data: [] }
  const medicoMap: Record<string, any> = {}
  ;(medicos || []).forEach((m: any) => { medicoMap[m.id] = m })

  const nome = paciente?.nome || user.user_metadata?.nome || 'Paciente'
  const primeiroNome = nome.split(' ')[0]

  function calcularIdade(dataNasc: string | null): number | null {
    if (!dataNasc) return null
    const nasc = new Date(dataNasc)
    const hoje = new Date()
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  const idade = calcularIdade(paciente?.data_nascimento ?? null)
  const labelSexo: Record<string, string> = {
    masculino: 'Masculino', feminino: 'Feminino', outro: 'Outro', nao_informado: 'Não informado',
  }

  const horaAtual = new Date().getHours()
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite'

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-yellow-100 text-yellow-700',
    laranja: 'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }
  const labelRisco: Record<string, string> = {
    verde: 'Risco Baixo', amarelo: 'Risco Moderado', laranja: 'Risco Alto', vermelho: 'Urgência',
  }

  const totalConsultas = proximasConsultas?.length || 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: tema.corBgPagina }}>
      <PacienteHeader />

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Banner: consulta ativa — paciente pode ter saído acidentalmente */}
        {consultaAtiva && (
          <div
            className="rounded-2xl px-5 py-4 mb-6 flex items-center gap-4"
            style={{
              background: 'rgba(91,189,155,0.12)',
              border: '1.5px solid #5BBD9B',
              boxShadow: '0 0 0 4px rgba(91,189,155,0.07)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(91,189,155,0.2)' }}
            >
              <Video className="w-5 h-5" style={{ color: '#5BBD9B' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: 'var(--txt-1)' }}>
                {consultaAtiva.status === 'em_andamento'
                  ? 'Consulta em andamento'
                  : 'Você está na fila de atendimento'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>
                Sua sessão ainda está ativa. Volte à sala para continuar.
              </p>
            </div>
            <Link
              href={`/paciente/consulta/${consultaAtiva.id}`}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: '#5BBD9B' }}
            >
              Voltar à sala
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Saudação */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--txt-1)' }}>{saudacao}, {primeiroNome}! 👋</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p style={{ color: 'var(--txt-3)' }}>Como você está se sentindo hoje?</p>
            {(idade !== null || paciente?.sexo) && (
              <div className="flex items-center gap-2">
                {idade !== null && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: tema.corBgCard, color: tema.corPrimaria }}>
                    {idade} anos
                  </span>
                )}
                {paciente?.sexo && paciente.sexo !== 'nao_informado' && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {labelSexo[paciente.sexo] ?? paciente.sexo}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Próximas consultas */}
        {totalConsultas > 0 && (
          <div className="rounded-2xl p-5 mb-6"
            style={{ background: 'var(--surface)', border: `1px solid rgba(${tema.corRgb},0.20)`, boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--txt-1)' }}>
                <Calendar className="w-4 h-4" style={{ color: tema.corPrimaria }} />
                Próximas consultas
                <span className="text-xs font-medium text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: tema.corPrimaria }}>
                  {totalConsultas}
                </span>
              </h2>
              <Link href="/paciente/agendamentos" className="text-xs font-medium hover:underline"
                style={{ color: tema.corPrimaria }}>
                Ver todas →
              </Link>
            </div>
            <div className="space-y-3">
              {(proximasConsultas || []).map((a: any) => {
                const medico = medicoMap[a.medico_id]
                const dataHora = new Date(a.data_hora)
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ backgroundColor: tema.corBgCard }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `rgba(${tema.corRgb},0.15)` }}>
                      <User className="w-4 h-4" style={{ color: tema.corPrimaria }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--txt-1)' }}>{drTitle(medico?.sexo)} {medico?.nome || 'Médico'}</p>
                      <p className="text-xs" style={{ color: 'var(--txt-3)' }}>{medico?.especialidade}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold" style={{ color: tema.corPrimaria }}>
                        {dataHora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--txt-3)' }}>
                        {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA principal */}
        <div className="rounded-2xl p-8 text-white mb-8"
          style={{ background: `linear-gradient(135deg, ${tema.corPrimaria}, ${tema.corPrimaria}CC)` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ScrollText className="w-6 h-6" style={{ color: tema.corTexto }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: tema.corTexto }}>Precisa de atendimento?</h2>
              <p className="text-sm" style={{ color: tema.corTextoSuave }}>Nossa IA faz a triagem em poucos minutos</p>
            </div>
          </div>
          <Link href="/paciente/triagem"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{ background: 'var(--surface)', color: tema.corPrimaria }}>
            Consulta Agora
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cards de acesso rápido */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Video, label: 'Consulta Agora', href: '/paciente/triagem' },
            { icon: ScrollText, label: 'Renovação de Receita', href: '/paciente/renovacao-receita' },
            { icon: Calendar, label: 'Meus agendamentos', href: '/paciente/agendamentos', badge: totalConsultas > 0 ? totalConsultas : undefined },
            { icon: FileText, label: 'Atestados', href: '/paciente/atestados', badge: atestadosValidos > 0 ? atestadosValidos : undefined, badgeValido: true },
            { icon: Pill, label: 'Receitas', href: '/paciente/receitas', badge: receitasValidas > 0 ? receitasValidas : undefined, badgeValido: true },
            { icon: FlaskConical, label: 'Exames', href: '/paciente/exames', badge: examesValidos > 0 ? examesValidos : undefined, badgeValido: true },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="rounded-2xl p-5 text-center group relative transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              {(item as any).badge && (
                <span className={`absolute top-3 right-3 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center ${(item as any).badgeValido ? 'bg-green-500' : ''}`}
                  style={(item as any).badgeValido ? {} : { backgroundColor: tema.corPrimaria }}>
                  {(item as any).badge}
                </span>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: tema.corBgCard }}>
                <item.icon className="w-5 h-5" style={{ color: tema.corPrimaria }} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--txt-1)' }}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Co-participação em receitas */}
        {copartReceitas > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">Co-participação em renovações de receita</p>
              <p className="text-xs text-orange-600 mt-0.5">
                Valor cobrado de você pela empresa conforme política de co-participação
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-orange-700">
                {copartReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-orange-500">acumulado</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Últimas triagens */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold" style={{ color: 'var(--txt-1)' }}>Últimas triagens</h3>
              <Link href="/paciente/triagens" className="text-xs hover:underline font-medium"
                style={{ color: tema.corPrimaria }}>Ver todas</Link>
            </div>
            {triagens && triagens.length > 0 ? (
              <div className="space-y-3">
                {triagens.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-3 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--txt-2)' }}>{t.resumo_ia || 'Triagem realizada'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>{new Date(t.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${corRisco[t.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                      {labelRisco[t.classificacao_risco] || t.classificacao_risco}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border-2)' }} />
                <p className="text-sm" style={{ color: 'var(--txt-3)' }}>Nenhuma triagem realizada ainda</p>
                <Link href="/paciente/triagem" className="text-sm font-medium mt-2 inline-block hover:underline"
                  style={{ color: tema.corPrimaria }}>
                  Fazer primeira triagem →
                </Link>
              </div>
            )}
          </div>

          {/* Histórico de Consultas */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold" style={{ color: 'var(--txt-1)' }}>Histórico de Consultas</h3>
              <Link href="/paciente/atendimentos" className="text-xs hover:underline"
                style={{ color: tema.corPrimaria }}>Ver todos</Link>
            </div>
            {atendimentos && atendimentos.length > 0 ? (
              <div className="space-y-3">
                {atendimentos.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-3 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--txt-2)' }}>
                        {(() => {
                          const enc = (a.notas_medico ?? '').match(/\[Encaminhado por (.+?)\]/)
                          if (enc) return `↗ Encaminhamento · Por ${enc[1]}`
                          if (a.agendamento_id) return '📅 Consulta agendada'
                          return '📹 Consulta virtual'
                        })()}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--txt-3)' }}>{new Date(a.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      a.status === 'concluido' ? 'bg-green-100 text-green-700' :
                      a.status === 'em_andamento' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {a.status === 'concluido' ? 'Concluído' :
                       a.status === 'em_andamento' ? 'Em andamento' :
                       a.status === 'aguardando' ? 'Aguardando' : a.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border-2)' }} />
                <p className="text-sm" style={{ color: 'var(--txt-3)' }}>Nenhum atendimento realizado ainda</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
