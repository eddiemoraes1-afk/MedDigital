import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const medicoId = searchParams.get('medico_id')
  const data = searchParams.get('data') // YYYY-MM-DD

  if (!medicoId || !data) {
    return NextResponse.json({ erro: 'Parâmetros obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // Forçar interpretação em Brasília para obter o dia da semana correto
  const dataObj = new Date(data + 'T12:00:00-03:00')
  const diaSemana = dataObj.getDay()

  // Buscar horários disponíveis do médico nesse dia
  const { data: horarios } = await supabase
    .from('horarios_medico')
    .select('*')
    .eq('medico_id', medicoId)
    .eq('dia_semana', diaSemana)
    .eq('ativo', true)

  if (!horarios || horarios.length === 0) {
    return NextResponse.json({ slots: [] })
  }

  // Buscar agendamentos já existentes nesse dia
  const dataInicio = data + 'T00:00:00'
  const dataFim = data + 'T23:59:59'
  const { data: agendados } = await supabase
    .from('agendamentos')
    .select('data_hora')
    .eq('medico_id', medicoId)
    .gte('data_hora', dataInicio)
    .lte('data_hora', dataFim)
    .neq('status', 'cancelado')

  const horariosOcupados = new Set(
    (agendados || []).map(a => a.data_hora.slice(11, 16))
  )

  // Gerar slots
  const slots: string[] = []
  for (const h of horarios) {
    const [inicioH, inicioM] = h.hora_inicio.split(':').map(Number)
    const [fimH, fimM] = h.hora_fim.split(':').map(Number)
    const inicioMin = inicioH * 60 + inicioM
    const fimMin = fimH * 60 + fimM

    for (let min = inicioMin; min < fimMin; min += h.duracao_minutos) {
      const hora = String(Math.floor(min / 60)).padStart(2, '0')
      const minStr = String(min % 60).padStart(2, '0')
      const slot = `${hora}:${minStr}`
      if (!horariosOcupados.has(slot)) {
        slots.push(slot)
      }
    }
  }

  return NextResponse.json({ slots: slots.sort() })
}
