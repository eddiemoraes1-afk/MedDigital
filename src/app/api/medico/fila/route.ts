import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: medico } = await supabase
    .from('medicos')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!medico) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminSupabase = createAdminClient()

  const { data: fila, error } = await adminSupabase
    .from('atendimentos')
    .select('id, criado_em, medico_id, paciente_id, notas_medico, pacientes(id, nome, cpf), triagens(id, classificacao_risco, resumo_ia)')
    .eq('status', 'aguardando')
    .eq('tipo', 'virtual')
    .or(`medico_id.is.null,medico_id.eq.${medico.id}`)
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ fila: fila ?? [], medicoId: medico.id })
}
