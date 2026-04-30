import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { triagem_id } = await req.json()

  // Usar admin client para buscar paciente (evita bloqueio de RLS)
  const adminSupabase = createAdminClient()
  const { data: paciente } = await adminSupabase
    .from('pacientes').select('id').eq('usuario_id', user.id).single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  // Criar sala no Daily.co
  const nomeSala = `consulta-${Date.now()}`
  const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: nomeSala,
      properties: {
        exp: Math.floor(Date.now() / 1000) + 7200,
        enable_chat: true,
        enable_screenshare: true,
      }
    })
  })

  if (!dailyRes.ok) {
    const err = await dailyRes.text()
    console.error('Daily.co error:', err)
    return NextResponse.json({ error: 'Erro ao criar sala de vídeo' }, { status: 500 })
  }

  const salaUrl = `https://${process.env.DAILY_DOMAIN}/${nomeSala}`

  // Criar atendimento
  const { data: atendimento, error } = await adminSupabase
    .from('atendimentos')
    .insert({
      paciente_id: paciente.id,
      triagem_id: triagem_id || null,
      tipo: 'virtual',
      status: 'aguardando',
      sala_video: salaUrl,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar atendimento:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ atendimentoId: atendimento.id, salaUrl })
}
