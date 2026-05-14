import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/medico/antecedentes
 * Salva antecedentes pessoais do paciente (HPP, alergias, medicamentos, histórico)
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: medico } = await admin
    .from('medicos')
    .select('id, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { paciente_id, alergias, hpp, medicamentos_em_uso, historia_familiar, historia_social } = body

  if (!paciente_id) return NextResponse.json({ error: 'paciente_id obrigatório' }, { status: 400 })

  const { error } = await admin
    .from('pacientes')
    .update({
      alergias:            alergias            ?? null,
      hpp:                 hpp                 ?? null,
      medicamentos_em_uso: medicamentos_em_uso ?? null,
      historia_familiar:   historia_familiar   ?? null,
      historia_social:     historia_social     ?? null,
    })
    .eq('id', paciente_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
