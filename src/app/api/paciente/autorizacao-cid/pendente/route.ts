import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/paciente/autorizacao-cid/pendente
 * Paciente faz polling para ver se tem alguma autorização de CID aguardando resposta.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ autorizacao: null })

  const admin = createAdminClient()

  // Busca paciente pelo usuario_id
  const { data: paciente } = await admin
    .from('pacientes').select('id').eq('usuario_id', user.id).single()
  if (!paciente) return NextResponse.json({ autorizacao: null })

  // Busca autorização pendente mais recente
  const { data } = await admin
    .from('autorizacoes_cid')
    .select('id, cid, atendimento_id, criado_em')
    .eq('paciente_id', paciente.id)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ autorizacao: data ?? null })
}
