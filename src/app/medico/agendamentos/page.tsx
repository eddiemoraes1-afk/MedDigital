import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, LogOut, ArrowLeft, Calendar, Clock, User, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import BotaoEntrarConsultaMedico from './BotaoEntrarConsultaMedico'

export default async function MedicoAgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  let { data: medico } = await adminSupabase
    .from('medicos')
    .select('id, nome, especialidade')
    .eq('usuario_id', user.id)
    .single()

  // Admin pode visualizar a agenda do primeiro médico cadastrado
  if (!medico) {
    const { data: perfilAdmin } = await adminSupabase
      .from('perfis_sistema')
      .select('role')
      .eq('usuario_id', user.id)
      .single()

    if (perfilAdmin?.role === 'admin') {
      const { data: primMedico } = await adminSupabase
        .from('medicos')
        .select('id, nome, especialidade')
        .order('criado_em', { ascending: true })
        .limit(1)
        .single()
      medico = primMedico
    }
  }

  if (!medico) redirect('/login')

  // Calcular semana atual ou a semana do parâmetro
  const params = await searchParams
  const offset = parseInt(params.semana || '0')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Segunda-feira da semana atual
  const diaSemana = hoje.getDay()
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - diasAteSegunda + offset * 7)

  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  domingo.setHours(23, 59, 59, 999)

  // Buscar TODOS os agendamentos da semana (incluindo cancelados e reagendados)
  const { data: agendamentos } = await adminSupabase
    .from('agendamentos')
    .select('*')
    .eq('medico_id', medico.id)
    .gte('data_hora', segunda.toISOString())
    .lte('data_hora', domingo.toISOString())
    .order('data_hora', { ascending: true })

  // Buscar dados dos pacientes
  const pacienteIds = [...new Set((agendamentos || []).map((a: any) => a.paciente_id))]
  const { data: pacientes } = pacienteIds.length > 0
    ? await adminSupabase.from('pacientes').select('id, nome, telefone').in('id', pacienteIds)
    : { data: [] }

  const pacienteMap: Record<string, any> = {}
  ;(pacientes || []).forEach((p: any) => { pacienteMap[p.id] = p })

  // Organizar agendamentos por dia
  const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    return d
  })

  const agendamentosPorDia: Record<string, any[]> = {}
  diasSemana.forEach(d => {
    agendamentosPorDia[d.toDateString()] = []
  })
  ;(agendamentos || []).forEach((a: any) => {
    const d = new Date(a.data_hora)
    // Usar data no fuso de SP para chave do dia
    const spDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    spDate.setHours(0, 0, 0, 0)
    const key = spDate.toDateString()
    if (agendamentosPorDia[key]) {
      agendamentosPorDia[key].push(a)
    }
  })

  const labelMes = segunda.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const totalAtivos = (agendamentos || []).filter((a: any) => !['cancelado', 'reagendado'].includes(a.status)).length
  const totalCancelados = (agendamentos || []).filter((a: any) => a.status === 'cancelado').length
  const primeiroNome = medico.nome.split(' ')[0]

  const corStatus: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700 border-green-200',
    pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    concluido: 'bg-gray-100 text-gray-500 border-gray-200',
    cancelado: 'bg-red-50 text-red-400 border-red-100',
    reagendado: 'bg-orange-50 text-orange-400 border-orange-100',
  }

  const labelStatus: Record<string, string> = {
    confirmado: 'Confirmado',
    pendente: 'Pendente',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    reagendado: 'Reagendado',
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold">MedDigital</span>
            <span className="text-xs text-blue-300 ml-2">Painel do Médico</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">Dr(a). {primeiroNome}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit">
                <LogOut className="w-4 h-4 text-blue-200 hover:text-white" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/medico/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A3A5C] mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao painel
        </Link>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1A3A5C] flex items-center gap-2">
              <Calendar className="w-6 h-6" /> Minha Agenda
            </h1>
            <p className="text-gray-500 mt-1 capitalize">
              {labelMes} — {totalAtivos} consulta{totalAtivos !== 1 ? 's' : ''} ativa{totalAtivos !== 1 ? 's' : ''}
              {totalCancelados > 0 && (
                <span className="text-red-400 ml-2">· {totalCancelados} cancelada{totalCancelados !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>

          {/* Navegação de semana */}
          <div className="flex items-center gap-3">
            <Link
              href={`/medico/agendamentos?semana=${offset - 1}`}
              className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </Link>
            <span className="text-sm font-medium text-[#1A3A5C] min-w-[80px] text-center">
              {offset === 0 ? 'Esta semana' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana passada' : `${offset > 0 ? '+' : ''}${offset} sem.`}
            </span>
            <Link
              href={`/medico/agendamentos?semana=${offset + 1}`}
              className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 border border-gray-100"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </Link>
          </div>
        </div>

        {/* Grade da semana */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {diasSemana.map((dia, i) => {
            const isHoje = dia.toDateString() === new Date().toDateString()
            const agsDia = agendamentosPorDia[dia.toDateString()] || []
            const isPast = dia < hoje && !isHoje
            const ativos = agsDia.filter((a: any) => !['cancelado', 'reagendado'].includes(a.status))
            const cancelados = agsDia.filter((a: any) => a.status === 'cancelado')

            return (
              <div
                key={dia.toISOString()}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isPast ? 'opacity-60' : ''} ${isHoje ? 'ring-2 ring-[#2E75B6]' : ''}`}
              >
                {/* Cabeçalho do dia */}
                <div className={`px-3 py-3 text-center ${isHoje ? 'bg-[#1A3A5C]' : 'bg-gray-50 border-b border-gray-100'}`}>
                  <p className={`text-xs font-medium ${isHoje ? 'text-blue-200' : 'text-gray-400'}`}>{DIAS[i]}</p>
                  <p className={`text-xl font-bold mt-0.5 ${isHoje ? 'text-white' : 'text-[#1A3A5C]'}`}>
                    {dia.getDate()}
                  </p>
                  {agsDia.length > 0 && (
                    <div className="flex justify-center gap-1 mt-1">
                      {ativos.length > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          isHoje ? 'bg-white/20 text-white' : 'bg-[#2E75B6]/10 text-[#2E75B6]'
                        }`}>
                          {ativos.length}
                        </span>
                      )}
                      {cancelados.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-400">
                          -{cancelados.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Agendamentos do dia */}
                <div className="p-2 space-y-1.5 min-h-[80px]">
                  {agsDia.length === 0 ? (
                    <p className="text-center text-xs text-gray-300 py-4">—</p>
                  ) : (
                    agsDia.map((a: any) => {
                      const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                      const paciente = pacienteMap[a.paciente_id]
                      const primeiroNomePac = (paciente?.nome || 'Paciente').split(' ')[0]
                      const isCancelado = a.status === 'cancelado'
                      return (
                        <div
                          key={a.id}
                          className={`rounded-lg p-2 border text-xs ${corStatus[a.status] || 'bg-blue-50 text-blue-700 border-blue-100'}`}
                        >
                          <div className={`flex items-center gap-1 font-semibold ${isCancelado ? 'line-through opacity-60' : ''}`}>
                            {isCancelado ? <XCircle className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
                            {hora}
                          </div>
                          <Link href={`/medico/agendamento/${a.id}`} className={`flex items-center gap-1 mt-0.5 truncate hover:underline ${isCancelado ? 'opacity-60 text-gray-400' : 'text-gray-600'}`}>
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{primeiroNomePac}</span>
                          </Link>
                          {!isCancelado && (
                            <BotaoEntrarConsultaMedico
                              agendamentoId={a.id}
                              dataHora={a.data_hora}
                            />
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Lista detalhada */}
        {(agendamentos || []).length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-[#1A3A5C]">Detalhes da semana</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(agendamentos || []).map((a: any) => {
                const paciente = pacienteMap[a.paciente_id]
                const dataHora = new Date(a.data_hora)
                const isCancelado = a.status === 'cancelado'
                return (
                  <div key={a.id} className={`px-6 py-4 flex items-start justify-between ${isCancelado ? 'opacity-70' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCancelado ? 'bg-red-50' : 'bg-blue-50'}`}>
                        {isCancelado
                          ? <XCircle className="w-5 h-5 text-red-300" />
                          : <User className="w-5 h-5 text-[#2E75B6]" />
                        }
                      </div>
                      <div>
                        <Link href={`/medico/agendamento/${a.id}`} className={`font-medium hover:text-[#2E75B6] hover:underline ${isCancelado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {paciente?.nome || 'Paciente'}
                        </Link>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {dataHora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                          </span>
                        </div>
                        {a.observacoes && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">"{a.observacoes}"</p>
                        )}
                        {isCancelado && a.motivo_cancelamento && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Motivo: <span className="italic">"{a.motivo_cancelamento}"</span>
                          </p>
                        )}
                        {isCancelado && !a.motivo_cancelamento && (
                          <p className="text-xs text-red-300 mt-1 italic">Cancelado sem motivo informado</p>
                        )}
                        {!isCancelado && (() => {
                          const dataConsulta = new Date(a.data_hora.endsWith('Z') ? a.data_hora : a.data_hora + 'Z')
                          const isFutura = dataConsulta > new Date()
                          if (!isFutura) return null
                          const abreDate = new Date(dataConsulta.getTime() - 10 * 60 * 1000)
                          const abreStr = abreDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                          return (
                            <p className="text-xs text-[#2E75B6] mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Sala abre às {abreStr}
                            </p>
                          )
                        })()}
                        {!isCancelado && (
                          <BotaoEntrarConsultaMedico
                            agendamentoId={a.id}
                            dataHora={a.data_hora}
                          />
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${corStatus[a.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {labelStatus[a.status] || a.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {(agendamentos || []).length === 0 && (
          <div className="mt-8 bg-white rounded-2xl p-12 shadow-sm text-center">
            <Calendar className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Nenhuma consulta esta semana</p>
            <p className="text-sm text-gray-300 mt-1">Quando pacientes agendarem, aparecerão aqui</p>
          </div>
        )}
      </main>
    </div>
  )
}
