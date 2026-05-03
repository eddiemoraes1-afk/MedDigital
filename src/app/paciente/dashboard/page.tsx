import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, Brain, Clock, FileText, Calendar, Video, LogOut, ChevronRight, User } from 'lucide-react'

export default async function PacienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  // Buscar dados do paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

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

  // Buscar próximas consultas agendadas
  const agora = new Date().toISOString()
  const { data: proximasConsultas } = await adminSupabase
    .from('agendamentos')
    .select('id, data_hora, medico_id, status')
    .eq('paciente_id', paciente?.id)
    .gte('data_hora', agora)
    .not('status', 'in', '("cancelado","reagendado")')
    .order('data_hora', { ascending: true })
    .limit(3)

  // Buscar nomes dos médicos das próximas consultas
  const medicoIds = [...new Set((proximasConsultas || []).map((a: any) => a.medico_id))]
  const { data: medicos } = medicoIds.length > 0
    ? await adminSupabase.from('medicos').select('id, nome, especialidade').in('id', medicoIds)
    : { data: [] }
  const medicoMap: Record<string, any> = {}
  ;(medicos || []).forEach((m: any) => { medicoMap[m.id] = m })

  const nome = paciente?.nome || user.user_metadata?.nome || 'Paciente'
  const primeiroNome = nome.split(' ')[0]

  const horaAtual = new Date().getHours()
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite'

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-yellow-100 text-yellow-700',
    laranja: 'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }

  const labelRisco: Record<string, string> = {
    verde: 'Risco Baixo',
    amarelo: 'Risco Moderado',
    laranja: 'Risco Alto',
    vermelho: 'Urgência',
  }

  const totalConsultas = proximasConsultas?.length || 0

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      {/* Header */}
      <header className="bg-[#1A3A2C] text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#5BBD9B]" fill="currentColor" />
            <span className="font-bold">RovarisMed</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-green-200">Olá, {primeiroNome}</span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="flex items-center gap-1 text-sm text-green-200 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Saudação */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A2C]">{saudacao}, {primeiroNome}! 👋</h1>
          <p className="text-gray-500 mt-1">Como você está se sentindo hoje?</p>
        </div>

        {/* Próximas consultas — destaque quando houver agendamentos */}
        {totalConsultas > 0 && (
          <div className="bg-white border border-green-100 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5BBD9B]" />
                Próximas consultas
                <span className="text-xs font-medium bg-[#5BBD9B] text-white px-2 py-0.5 rounded-full">
                  {totalConsultas}
                </span>
              </h2>
              <Link href="/paciente/agendamentos" className="text-xs text-[#5BBD9B] hover:underline font-medium">
                Ver todas →
              </Link>
            </div>
            <div className="space-y-3">
              {(proximasConsultas || []).map((a: any) => {
                const medico = medicoMap[a.medico_id]
                const dataHora = new Date(a.data_hora)
                return (
                  <div key={a.id} className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3">
                    <div className="w-9 h-9 bg-[#5BBD9B]/10 rounded-xl flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#5BBD9B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A3A2C] truncate">
                        Dr(a). {medico?.nome || 'Médico'}
                      </p>
                      <p className="text-xs text-gray-400">{medico?.especialidade}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-[#5BBD9B]">
                        {dataHora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ação Principal — Iniciar Triagem */}
        <div className="bg-gradient-to-br from-[#1A3A2C] to-[#5BBD9B] rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Precisa de atendimento?</h2>
              <p className="text-green-200 text-sm">Nossa IA faz a triagem em poucos minutos</p>
            </div>
          </div>
          <Link
            href="/paciente/triagem"
            className="inline-flex items-center gap-2 bg-white text-[#1A3A2C] hover:bg-green-50 px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Iniciar triagem agora
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cards de acesso rápido */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Brain, label: 'Nova triagem', href: '/paciente/triagem', cor: '#5BBD9B' },
            { icon: Video, label: 'Consulta virtual', href: '/paciente/consulta', cor: '#1A7340' },
            {
              icon: Calendar,
              label: 'Meus agendamentos',
              href: '/paciente/agendamentos',
              cor: '#7B3FA0',
              badge: totalConsultas > 0 ? totalConsultas : undefined,
            },
            { icon: FileText, label: 'Prontuário', href: '/paciente/prontuario', cor: '#C0392B' },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md text-center group relative">
              {(item as any).badge && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-[#7B3FA0] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {(item as any).badge}
                </span>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: item.cor + '15' }}>
                <item.icon className="w-5 h-5" style={{ color: item.cor }} />
              </div>
              <span className="text-sm font-medium text-[#1A3A2C]">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Últimas triagens */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1A3A2C]">Últimas triagens</h3>
              <Link href="/paciente/triagens" className="text-xs text-[#5BBD9B] hover:underline">Ver todas</Link>
            </div>
            {triagens && triagens.length > 0 ? (
              <div className="space-y-3">
                {triagens.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700 line-clamp-1">{t.resumo_ia || 'Triagem realizada'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${corRisco[t.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                      {labelRisco[t.classificacao_risco] || t.classificacao_risco}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhuma triagem realizada ainda</p>
                <Link href="/paciente/triagem" className="text-sm text-[#5BBD9B] font-medium mt-2 inline-block">
                  Fazer primeira triagem →
                </Link>
              </div>
            )}
          </div>

          {/* Últimos atendimentos */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1A3A2C]">Histórico de atendimentos</h3>
              <Link href="/paciente/atendimentos" className="text-xs text-[#5BBD9B] hover:underline">Ver todos</Link>
            </div>
            {atendimentos && atendimentos.length > 0 ? (
              <div className="space-y-3">
                {atendimentos.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {a.tipo === 'virtual' ? '📹 Consulta virtual' : '🏥 Presencial'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                      </p>
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
                <Video className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhum atendimento realizado ainda</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
