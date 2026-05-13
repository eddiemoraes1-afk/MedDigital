import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Gera todos os slots de tempo para um bloco de horário */
function gerarSlots(horaInicio: string, horaFim: string, duracaoMin: number): string[] {
  const [hI, mI] = horaInicio.slice(0, 5).split(':').map(Number)
  const [hF, mF] = horaFim.slice(0, 5).split(':').map(Number)

  const inicioMin = hI * 60 + mI
  const fimMin    = hF * 60 + mF

  const slots: string[] = []
  for (let t = inicioMin; t + duracaoMin <= fimMin; t += duracaoMin) {
    const h = Math.floor(t / 60).toString().padStart(2, '0')
    const m = (t % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be a medico
  const { data: medicoAtual } = await supabase
    .from('medicos')
    .select('id')
    .eq('usuario_id', user.id)
    .single()
  if (!medicoAtual) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const medicoId = searchParams.get('medico_id')
  const data     = searchParams.get('data') // YYYY-MM-DD

  if (!medicoId) return NextResponse.json({ error: 'medico_id obrigatório' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // ── Sem data → retorna quais dias da semana têm agenda ativa ────────────────
  if (!data) {
    const { data: horarios, error } = await adminSupabase
      .from('horarios_medico')
      .select('dia_semana')
      .eq('medico_id', medicoId)
      .eq('ativo', true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const diasSemana = [...new Set((horarios ?? []).map((h: any) => h.dia_semana as number))]
    return NextResponse.json({ diasSemana })
  }

  // ── Com data → retorna slots disponíveis para aquela data ───────────────────
  const dateParts = data.split('-').map(Number)
  const dateObj   = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
  const diaSemana = dateObj.getDay() // 0=Dom...6=Sab

  // Busca blocos ativos desse dia
  const { data: horarios, error: errH } = await adminSupabase
    .from('horarios_medico')
    .select('hora_inicio, hora_fim, duracao_minutos')
    .eq('medico_id', medicoId)
    .eq('dia_semana', diaSemana)
    .eq('ativo', true)

  if (errH) return NextResponse.json({ error: errH.message }, { status: 500 })
  if (!horarios || horarios.length === 0) {
    return NextResponse.json({ slots: [], duracao_minutos: 30 })
  }

  // Slots do dia (vários blocos possíveis, ex: manhã + tarde)
  const todosSlots = new Set<string>()
  let duracaoMinutos = 30
  for (const h of horarios) {
    duracaoMinutos = h.duracao_minutos
    for (const slot of gerarSlots(h.hora_inicio, h.hora_fim, h.duracao_minutos)) {
      todosSlots.add(slot)
    }
  }

  // Busca agendamentos já marcados nessa data (não cancelados)
  // data_hora é timestamp → filtra por range do dia (São Paulo UTC-3 fixo)
  const diaInicio = `${data}T00:00:00-03:00`
  const diaFim    = `${data}T23:59:59-03:00`

  const { data: agendados } = await adminSupabase
    .from('agendamentos')
    .select('data_hora')
    .eq('medico_id', medicoId)
    .neq('status', 'cancelado')
    .gte('data_hora', diaInicio)
    .lte('data_hora', diaFim)

  // Extrai horários já ocupados (HH:MM no fuso de São Paulo)
  const ocupados = new Set<string>()
  for (const ag of agendados ?? []) {
    const d = new Date(ag.data_hora)
    const hh = d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    ocupados.add(hh)
  }

  // Slots disponíveis = todos - ocupados, ordenados
  const slotsDisponiveis = [...todosSlots]
    .filter(s => !ocupados.has(s))
    .sort()

  return NextResponse.json({ slots: slotsDisponiveis, duracao_minutos: duracaoMinutos })
}
