import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Video, Calendar, CheckCircle2, Clock, Stethoscope, FileText } from 'lucide-react'
import PacienteHeader from '../PacienteHeader'

export default async function PacienteAtendimentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) redirect('/paciente/dashboard')

  const { data: atendimentos } = await admin
    .from('atendimentos')
    .select('id, criado_em, iniciado_em, finalizado_em, status, tipo, agendamento_id, medico_id, notas_medico')
    .eq('paciente_id', paciente.id)
    .order('criado_em', { ascending: false })

  const lista = atendimentos ?? []

  // Busca médicos referenciados
  const medicoIds = [...new Set(lista.map((a: any) => a.medico_id).filter(Boolean))]
  const { data: medicos } = medicoIds.length > 0
    ? await admin.from('medicos').select('id, nome, especialidade, sexo, crm, crm_uf').in('id', medicoIds)
    : { data: [] }
  const medicoMap: Record<string, any> = {}
  ;(medicos ?? []).forEach((m: any) => { medicoMap[m.id] = m })

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatarData(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })
  }

  function formatarHora(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  }

  function duracaoMinutos(inicio: string | null, fim: string | null): number | null {
    if (!inicio || !fim) return null
    return Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000)
  }

  const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
    concluido:    { label: 'Concluído',    cor: 'text-green-700',  bg: 'bg-green-100' },
    em_andamento: { label: 'Em andamento', cor: 'text-blue-700',   bg: 'bg-blue-100' },
    aguardando:   { label: 'Aguardando',   cor: 'text-yellow-700', bg: 'bg-yellow-100' },
    cancelado:    { label: 'Cancelado',    cor: 'text-gray-500',   bg: 'bg-gray-100' },
  }

  function drTitle(sexo: string | undefined) {
    return sexo === 'F' ? 'Dra.' : 'Dr.'
  }

  const totalConcluidos = lista.filter((a: any) => a.status === 'concluido').length
  const totalVirtuais   = lista.filter((a: any) => a.tipo === 'virtual').length
  const totalAgendados  = lista.filter((a: any) => a.tipo === 'agendado' || !!a.agendamento_id).length

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <PacienteHeader />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/paciente/dashboard"
            className="p-2 rounded-xl hover:bg-white transition-colors text-gray-400 hover:text-[#1A3A2C]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1A3A2C] rounded-xl">
              <Stethoscope className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A3A2C]">Histórico de Consultas</h1>
              <p className="text-sm text-gray-400">
                {lista.length} consulta{lista.length !== 1 ? 's' : ''}
                {totalConcluidos > 0 && (
                  <span className="ml-2 text-green-600 font-medium">
                    · {totalConcluidos} concluída{totalConcluidos !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        {lista.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-[#1A3A2C]">{lista.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-blue-600">{totalVirtuais}</p>
              <p className="text-xs text-gray-400 mt-0.5">Virtuais</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-purple-600">{totalAgendados}</p>
              <p className="text-xs text-gray-400 mt-0.5">Agendadas</p>
            </div>
          </div>
        )}

        {/* List */}
        {lista.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <Video className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum atendimento realizado ainda</p>
            <Link
              href="/paciente/triagem"
              className="mt-3 inline-block text-sm font-semibold text-[#5BBD9B] hover:underline"
            >
              Iniciar consulta agora →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((a: any) => {
              const medico   = medicoMap[a.medico_id]
              const statusCfg = STATUS_CONFIG[a.status] ?? { label: a.status, cor: 'text-gray-600', bg: 'bg-gray-100' }
              const isVirtual = a.tipo === 'virtual' && !a.agendamento_id
              const duracao   = duracaoMinutos(a.iniciado_em, a.finalizado_em)

              // Strip referral markers from notes before showing to patient
              const notas = a.notas_medico
                ? a.notas_medico.replace(/\[Encaminhado por .+?\]\n?/g, '').trim()
                : null

              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden"
                >
                  {/* Header row */}
                  <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 bg-gray-50/60">
                    <div className="flex items-center gap-2">
                      {isVirtual
                        ? <Video className="w-4 h-4 text-[#5BBD9B]" />
                        : <Calendar className="w-4 h-4 text-purple-500" />
                      }
                      <span className="text-sm font-semibold text-[#1A3A2C]">
                        {isVirtual ? 'Consulta Virtual' : 'Consulta Agendada'}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.cor}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    {/* Date / duration row */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                        <span>{formatarData(a.criado_em)}</span>
                        {formatarHora(a.iniciado_em) && (
                          <span className="text-gray-300">·</span>
                        )}
                        {formatarHora(a.iniciado_em) && (
                          <span>{formatarHora(a.iniciado_em)}</span>
                        )}
                        {formatarHora(a.finalizado_em) && (
                          <>
                            <span className="text-gray-300">→</span>
                            <span>{formatarHora(a.finalizado_em)}</span>
                          </>
                        )}
                      </div>
                      {duracao !== null && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          {duracao} min
                        </span>
                      )}
                    </div>

                    {/* Doctor */}
                    {medico && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1A3A2C]/10 flex items-center justify-center shrink-0 text-xs font-bold text-[#1A3A2C]">
                          {medico.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1A3A2C]">
                            {drTitle(medico.sexo)} {medico.nome}
                          </p>
                          <p className="text-xs text-gray-400">{medico.especialidade} · CRM {medico.crm}/{medico.crm_uf}</p>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {notas && (
                      <div className="border-t border-gray-50 pt-3">
                        <div className="flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-500 leading-relaxed">{notas}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
