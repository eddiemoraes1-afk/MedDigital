import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, LogOut, ArrowLeft, Calendar, Clock, User, Plus } from 'lucide-react'

export default async function AgendamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('id, nome')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) redirect('/paciente/dashboard')

  const { data: agendamentos } = await adminSupabase
    .from('agendamentos')
    .select('*')
    .eq('paciente_id', paciente.id)
    .order('data_hora', { ascending: true })

  const medicoIds = [...new Set((agendamentos || []).map((a: any) => a.medico_id))]
  const { data: medicos } = medicoIds.length > 0
    ? await adminSupabase.from('medicos').select('id, nome, especialidade').in('id', medicoIds)
    : { data: [] }

  const medicoMap: Record<string, any> = {}
  ;(medicos || []).forEach((m: any) => { medicoMap[m.id] = m })

  const agora = new Date()
  const proximos = (agendamentos || []).filter((a: any) => new Date(a.data_hora) >= agora && a.status !== 'cancelado')
  const passados = (agendamentos || []).filter((a: any) => new Date(a.data_hora) < agora || a.status === 'cancelado')

  const corStatus: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700',
    pendente: 'bg-yellow-100 text-yellow-700',
    cancelado: 'bg-red-100 text-red-700',
    concluido: 'bg-gray-100 text-gray-600',
  }

  const labelStatus: Record<string, string> = {
    confirmado: 'Confirmado',
    pendente: 'Pendente',
    cancelado: 'Cancelado',
    concluido: 'Concluído',
  }

  function CartaoAgendamento({ a }: { a: any }) {
    const medico = medicoMap[a.medico_id]
    const dataHora = new Date(a.data_hora)
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#2E75B6]" />
            </div>
            <div>
              <p className="font-semibold text-[#1A3A5C] text-sm">
                Dr(a). {medico?.nome || 'Médico'}
              </p>
              <p className="text-xs text-gray-400">{medico?.especialidade}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {dataHora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                </span>
              </div>
              {a.observacoes && (
                <p className="text-xs text-gray-400 mt-1 italic">"{a.observacoes}"</p>
              )}
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${corStatus[a.status] || 'bg-gray-100 text-gray-600'}`}>
            {labelStatus[a.status] || a.status}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold">MedDigital</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">{paciente.nome}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit">
                <LogOut className="w-4 h-4 text-blue-200 hover:text-white" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/paciente/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A3A5C] mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao painel
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1A3A5C] flex items-center gap-2">
              <Calendar className="w-6 h-6" /> Meus Agendamentos
            </h1>
            <p className="text-gray-500 mt-1">Consultas agendadas</p>
          </div>
          <Link
            href="/paciente/agendar"
            className="flex items-center gap-2 bg-[#1A3A5C] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2E75B6]"
          >
            <Plus className="w-4 h-4" /> Novo agendamento
          </Link>
        </div>

        {/* Próximas consultas */}
        <div className="mb-8">
          <h2 className="font-semibold text-[#1A3A5C] mb-3">Próximas consultas</h2>
          {proximos.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
              <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma consulta agendada</p>
              <Link href="/paciente/agendar"
                className="mt-3 inline-block text-sm text-[#2E75B6] font-medium hover:underline">
                Agendar agora →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {proximos.map((a: any) => <CartaoAgendamento key={a.id} a={a} />)}
            </div>
          )}
        </div>

        {/* Consultas passadas */}
        {passados.length > 0 && (
          <div>
            <h2 className="font-semibold text-[#1A3A5C] mb-3">Histórico</h2>
            <div className="space-y-3 opacity-70">
              {passados.map((a: any) => <CartaoAgendamento key={a.id} a={a} />)}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
