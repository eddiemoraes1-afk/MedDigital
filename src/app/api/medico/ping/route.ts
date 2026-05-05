import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Chamado pelo browser do médico a cada 30s para registrar presença
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const adminSupabase = createAdminClient()
    const { data: medico } = await adminSupabase
      .from('medicos')
      .select('id')
      .eq('usuario_id', user.id)
      .single()

    if (!medico) return NextResponse.json({ ok: false }, { status: 404 })

    await adminSupabase
      .from('presenca_medicos')
      .upsert({ medico_id: medico.id, ultimo_ping: new Date().toISOString() }, { onConflict: 'medico_id' })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
