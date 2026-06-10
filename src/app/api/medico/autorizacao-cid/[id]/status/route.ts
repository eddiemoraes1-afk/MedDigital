import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/medico/autorizacao-cid/[id]/status
 * Médico faz polling para saber se o paciente já respondeu.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('autorizacoes_cid')
    .select('id, status, respondido_em, ip_paciente')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({
    status: data.status,
    respondido_em: data.respondido_em,
    ip_paciente: data.ip_paciente,
  })
}
