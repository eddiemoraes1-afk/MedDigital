import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ArrowLeft, User, Calendar, Clock, Phone,
  Brain, FileText, Video, CheckCircle2, AlertTriangle,
  AlertCircle, Info, XCircle
} from 'lucide-react'
import BotaoEntrarConsultaMedico from '../../agendamentos/BotaoEntrarConsultaMedico'

export default async function AgendamentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  // Verificar que é médico
  const { data: medico } = await adminSupabase
    .from('medicos')
    .select('id, nome')
    .eq('usuario_id', user.id)
    .single()
  if (!medico) redirect('/login')

  // Buscar agendamento
  const { data: agendamento } = await adminSupabase
    .from('agendamentos')
    .select('*')
    .eq('id', id)
    .eq('medico_id', medico.id)
    .single()
  if (!agendamento) redirect('/medico/agendamentos')

  // Buscar paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('*')
    .eq('id', agendamento.paciente_id)
    .single()

  // Buscar triagens do paciente (últimas 5)
  const { data: triagens } = await adminSupabase
    .from('triagens')
    .select('*')
    .eq('paciente_id', agendamento.paciente_id)
    .order('criado_em', { ascending: false })
    .limit(5)

  // Buscar atendimentos anteriores do paciente com este médico
  const { data: atendimentos } = await adminSupabase
    .from('atendimentos')
    .select('*')
    .eq('paciente_id', agendamento.paciente_id)
    .eq('medico_id', medico.id)
    .order('criado_em', { ascending: false })
    .limit(5)

  const dataHora = new Date(agendamento.data_hora)

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-yellow-100 text-yellow-700',
    laranja: 'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }
  const labelRisco: Record<string, string> = {
    verde: '🟢 Risco Baixo',
    amarelo: '🟡 Risco Moderado',
    laranja: '🟠 Risco Alto',
    vermelho: '🔴 Urgência',
  }
  const iconRisco: Record<string, any> = {
    verde: CheckCircle2,
    amarelo: Info,
    laranja: AlertTriangle,
    vermelho: AlertCircle,
  }

  const corStatus: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700',
    pendente: 'bg-yellow-100 text-yellow-700',
    cancelado: 'bg-red-100 text-red-700',
    reagendado: 'bg-orange-100 text-orange-700',
    concluido: 'bg-gray-100 text-gray-600',
  }

  const idadeAnos = paciente?.data_nascimento
    ? Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <header className="bg-[#1A3A2C] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
            <span className="text-xs text-green-300 ml-1">Painel do Médico</span>
          </div>
          <Link href="/medico/agendamentos" className="text-sm text-green-200 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Agenda
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Cabeçalho do agendamento */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-[#5BBD9B]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1A3A2C]">{paciente?.nome || 'Paciente'}</h1>
                <div className="flex flex-wrap gap-3 mt-1">
                  {idadeAnos !== null && (
                    <span className="text-sm text-gray-500">{idadeAnos} anos</span>
                  )}
                  {paciente?.data_nascimento && (
                    <span className="text-sm text-gray-400">
                      Nasc. {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {paciente?.telefone && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5" /> {paciente.telefone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[#1A3A2C]">
                    <Calendar className="w-4 h-4 text-[#5BBD9B]" />
                    {dataHora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[#1A3A2C]">
                    <Clock className="w-4 h-4 text-[#5BBD9B]" />
                    {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                  </span>
                </div>
                {agendamento.observacoes && (
                  <div className="mt-3 bg-green-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Queixa do paciente</p>
                    <p className="text-sm text-gray-700 italic">"{agendamento.observacoes}"</p>
                  </div>
                )}
                {agendamento.motivo_cancelamento && (
                  <div className="mt-3 bg-red-50 rounded-xl px-4 py-3 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-500 font-medium">Motivo do cancelamento</p>
                      <p className="text-sm text-red-700 italic">"{agendamento.motivo_cancelamento}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${corStatus[agendamento.status] || 'bg-gray-100 text-gray-600'}`}>
                {agendamento.status === 'confirmado' ? 'Confirmado' :
                 agendamento.status === 'cancelado' ? 'Cancelado' :
                 agendamento.status === 'reagendado' ? 'Reagendado' :
                 agendamento.status === 'concluido' ? 'Concluído' : agendamento.status}
              </span>
              {!['cancelado', 'reagendado', 'concluido'].includes(agendamento.status) && (
                <BotaoEntrarConsultaMedico
                  agendamentoId={agendamento.id}
                  dataHora={agendamento.data_hora}
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Triagens */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-[#5BBD9B]" /> Histórico de triagens
            </h2>
            {triagens && triagens.length > 0 ? (
              <div className="space-y-3">
                {triagens.map((t: any) => {
                  const IconeRisco = iconRisco[t.classificacao_risco] || Info
                  return (
                    <div key={t.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${corRisco[t.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                          {labelRisco[t.classificacao_risco] || t.classificacao_risco}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(t.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {t.resumo_ia && (
                        <p className="text-sm text-gray-600 leading-relaxed">{t.resumo_ia}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma triagem registrada</p>
              </div>
            )}
          </div>

          {/* Atendimentos anteriores */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A2C] flex items-center gap-2 mb-4">
              <Video className="w-4 h-4 text-[#5BBD9B]" /> Consultas anteriores
            </h2>
            {atendimentos && atendimentos.length > 0 ? (
              <div className="space-y-3">
                {atendimentos.map((a: any) => (
                  <div key={a.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {a.tipo === 'virtual' ? '📹 Virtual' : '🏥 Presencial'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.status === 'concluido' ? 'bg-green-100 text-green-700' :
                        a.status === 'em_andamento' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {a.status === 'concluido' ? 'Concluído' :
                         a.status === 'em_andamento' ? 'Em andamento' : a.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(a.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma consulta anterior com este médico</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
