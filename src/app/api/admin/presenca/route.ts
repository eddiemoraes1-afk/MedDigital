import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const adminSupabase = createAdminClient()

    // Buscar todos os pings recentes (últimos 5 minutos)
    const limite = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: presencas } = await adminSupabase
      .from('presenca_medicos')
      .select('medico_id, ultimo_ping')
      .gte('ultimo_ping', limite)

    // Buscar atendimentos virtuais em andamento
    const { data: atendimentosAtivos } = await adminSupabase
      .from('atendimentos')
      .select('medico_id')
      .eq('status', 'em_andamento')
      .not('medico_id', 'is', null)

    // Buscar agendamentos em andamento (médico em consulta agendada)
    const { data: agendamentosAtivos } = await adminSupabase
      .from('agendamentos')
      .select('medico_id')
      .eq('status', 'em_andamento')
      .not('medico_id', 'is', null)

    const agora = Date.now()
    const ONLINE_THRESHOLD = 2 * 60 * 1000 // 2 minutos

    // Montar mapa de presença por medico_id
    const presencaMap: Record<string, { online: boolean; ultimo_ping: string }> = {}
    for (const p of presencas ?? []) {
      const diff = agora - new Date(p.ultimo_ping).getTime()
      presencaMap[p.medico_id] = {
        online: diff < ONLINE_THRESHOLD,
        ultimo_ping: p.ultimo_ping,
      }
    }

    const emAtendimentoVirtual = new Set((atendimentosAtivos ?? []).map(a => a.medico_id))
    const emConsultaAgendada = new Set((agendamentosAtivos ?? []).map(a => a.medico_id))

    // Determinar status de cada médico
    const resultado: Record<string, {
      status: 'online' | 'em_atendimento_virtual' | 'em_consulta_agendada' | 'offline'
      ultimo_ping: string | null
    }> = {}

    const todosMedicosIds = new Set([
      ...Object.keys(presencaMap),
      ...[...emAtendimentoVirtual],
      ...[...emConsultaAgendada],
    ])

    for (const medicoId of todosMedicosIds) {
      const p = presencaMap[medicoId]
      const estaOnline = p?.online ?? false

      if (emAtendimentoVirtual.has(medicoId)) {
        resultado[medicoId] = { status: 'em_atendimento_virtual', ultimo_ping: p?.ultimo_ping ?? null }
      } else if (emConsultaAgendada.has(medicoId)) {
        resultado[medicoId] = { status: 'em_consulta_agendada', ultimo_ping: p?.ultimo_ping ?? null }
      } else if (estaOnline) {
        resultado[medicoId] = { status: 'online', ultimo_ping: p.ultimo_ping }
      } else {
        resultado[medicoId] = { status: 'offline', ultimo_ping: p?.ultimo_ping ?? null }
      }
    }

    return NextResponse.json(resultado)
  } catch (err) {
    console.error('Erro na rota de presença:', err)
    return NextResponse.json({}, { status: 500 })
  }
}
