import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Users, Clock, CheckCircle2, AlertTriangle, Calendar,
  FileText, Stethoscope, ClipboardList, Video, FlaskConical,
} from 'lucide-react'
import PingMedico from '../PingMedico'
import MedicoHeader from '../MedicoHeader'

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
  // "2026-05-10" → midnight SP = "2026-05-10T03:00:00.000Z"
  const hojeInicio = new Date(hojeStr + 'T00:00:00-03:00').toISOString()

  // ── Fila virtual (aguardando) ─────────────────────────────────────────────
  const { data: fila } = await adminSupabase
    .from('atendimentos')
    .select(`
      id, criado_em, paciente_id,
      pacientes (id, nome, cpf),
      triagens (id, classificacao_risco, resumo_ia)
    `)
    .eq('status', 'aguardando')
    .eq('tipo', 'virtual')
    .order('criado_em', { ascending: true })

  // ── Atendimentos concluídos hoje por este médico ──────────────────────────
  const { data: atendidosHoje } = await adminSupabase
    .from('atendimentos')
    .select(`
      id, finalizado_em,
      pacientes (id, nome),
      triagens (classificacao_risco)
    `)
    .eq('medico_id', medico.id)
    .eq('status', 'concluido')
    .gte('finalizado_em', hojeInicio)
    .order('finalizado_em', { ascending: false })

  // ── Atestados emitidos hoje ───────────────────────────────────────────────
  const { data: atestadosHoje } = await adminSupabase
    .from('atestados')
    .select('id')
    .eq('medico_id', medico.id)
    .gte('criado_em', hojeInicio)

  // ── Receitas emitidas hoje ────────────────────────────────────────────────
  const { data: receitasHoje } = await adminSupabase
    .from('receitas')
    .select('id')
    .eq('medico_id', medico.id)
    .gte('criado_em', hojeInicio)

  // Exames: tabela ainda não existe — fica em 0
  const examesHoje = 0

  const qtdAtendidos  = atendidosHoje?.length ?? 0
  const qtdAtestados  = atestadosHoje?.length ?? 0
  const qtdReceitas   = receitasHoje?.length ?? 0

  const primeiroNome = medico.nome.split(' ')[0]

  // ── Hora do dia ───────────────────────────────────────────────────────────
  const horaAtual = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false })
  const saudacao = Number(horaAtual) < 12 ? 'Bom dia' : Number(horaAtual) < 18 ? 'Boa tarde' : 'Boa noite'

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
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <PingMedico />
      <MedicoHeader titulo="Painel do Médico" medicoNome={medico.nome} />

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Saudação */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A2C]">{saudacao}, Dr(a). {primeiroNome}!</h1>
          <p className="text-gray-500 mt-1">{medico.especialidade} — CRM {medico.crm}/{medico.crm_uf}</p>
        </div>

        {/* ── KPIs do dia ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {/* Atendidos hoje */}
          <div className="bg-[#1A3A2C] rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#5BBD9B]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{qtdAtendidos}</div>
            <div className="text-sm text-green-300 mt-1">Atendidos hoje</div>
          </div>

          {/* Atestados */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#1A3A2C]">{qtdAtestados}</div>
            <div className="text-sm text-gray-400 mt-1">Atestados emitidos</div>
          </div>

          {/* Receitas */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#1A3A2C]">{qtdReceitas}</div>
            <div className="text-sm text-gray-400 mt-1">Receitas emitidas</div>
          </div>

          {/* Exames */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#1A3A2C]">{examesHoje}</div>
            <div className="text-sm text-gray-400 mt-1">Exames pedidos</div>
          </div>
        </div>

        {/* ── Atendidos hoje — lista ── */}
        {qtdAtendidos > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#5BBD9B]" />
              <h2 className="font-bold text-[#1A3A2C] text-sm">
                Atendidos hoje
                <span className="ml-2 text-xs text-gray-400 font-normal">({qtdAtendidos})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(atendidosHoje ?? []).map((a: any) => {
                const risco = a.triagens?.classificacao_risco
                return (
                  <div key={a.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#5BBD9B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/medico/pacientes/${a.pacientes?.id}`}
                          className="font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors text-sm"
                        >
                          {a.pacientes?.nome || 'Paciente'}
                        </Link>
                        {risco && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corRisco[risco] || corRisco.default}`}>
                            {labelRisco[risco] || risco}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatarHora(a.finalizado_em)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Atalhos ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
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
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center gap-4 transition-shadow">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-[#1A3A2C] text-sm">Agenda</p>
              <p className="text-xs text-gray-400">Ver consultas agendadas</p>
            </div>
          </Link>
        </div>

        {/* ── Fila de Atendimento Virtual ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#5BBD9B]" />
              <h2 className="font-bold text-[#1A3A2C]">Fila de Atendimento Virtual</h2>
            </div>
            {fila && fila.length > 0 && (
              <span className="bg-[#5BBD9B] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {fila.length} aguardando
              </span>
            )}
          </div>

          {!fila || fila.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Fila vazia</p>
              <p className="text-gray-300 text-sm mt-1">Nenhum paciente aguardando no momento</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {fila.map((atendimento: any, index: number) => {
                const risco = atendimento.triagens?.classificacao_risco || null
                const pacienteId = atendimento.pacientes?.id || atendimento.paciente_id
                const resumo = atendimento.triagens?.resumo_ia
                return (
                  <div key={atendimento.id} className="px-6 py-5 flex items-center gap-4 hover:bg-gray-50">
                    <div className="w-10 h-10 bg-[#1A3A2C]/10 rounded-full flex items-center justify-center font-bold text-[#1A3A2C] text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/medico/pacientes/${pacienteId}`}
                          className="font-semibold text-[#1A3A2C] hover:text-[#5BBD9B] hover:underline transition-colors"
                        >
                          {atendimento.pacientes?.nome || 'Paciente'}
                        </Link>
                        {risco && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${corRisco[risco] || corRisco.default}`}>
                            {labelRisco[risco] || risco}
                          </span>
                        )}
                      </div>
                      {resumo ? (
                        <Link href={`/medico/pacientes/${pacienteId}`} className="flex items-start gap-1.5 mt-1 group">
                          <FileText className="w-3.5 h-3.5 text-[#5BBD9B] shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-500 group-hover:text-[#1A3A2C] transition-colors line-clamp-2">
                            {resumo}
                          </p>
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-300 mt-0.5 italic">Sem resumo de triagem</p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">
                        Aguardando desde {formatarHora(atendimento.criado_em)}
                      </p>
                    </div>
                    <Link
                      href={`/medico/atendimento/${atendimento.id}`}
                      className="bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      Atender
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
