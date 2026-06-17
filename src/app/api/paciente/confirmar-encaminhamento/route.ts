import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/paciente/confirmar-encaminhamento
 * Registra a ciência do paciente sobre o encaminhamento presencial.
 * Grava em `consentimentos` (visível na auditoria) e limpa a flag do atendimento.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  // Busca o paciente
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()
  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 403 })

  const body = await req.json()
  const { atendimento_id } = body
  if (!atendimento_id) return NextResponse.json({ error: 'atendimento_id obrigatório' }, { status: 400 })

  // Verifica que o atendimento pertence ao paciente
  const { data: atend } = await admin
    .from('atendimentos')
    .select('id, paciente_id')
    .eq('id', atendimento_id)
    .eq('paciente_id', paciente.id)
    .single()
  if (!atend) return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 })

  // Captura IP do paciente
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? null

  // Grava o consentimento na tabela de auditoria
  const { error: errConsent } = await admin
    .from('consentimentos')
    .insert({
      paciente_id:    paciente.id,
      atendimento_id: atendimento_id,
      tipo:           'encaminhamento_presencial',
      aceito:         true,
      versao_termo:   '1.0',
      texto_termo:    'Estou ciente e fui informado(a) e orientado(a) de que devo procurar atendimento presencial.',
      ip_address:     ip,
    })

  if (errConsent) return NextResponse.json({ error: errConsent.message }, { status: 500 })

  // Limpa a flag no atendimento
  await admin
    .from('atendimentos')
    .update({ encaminhamento_aguardando_confirmacao: false })
    .eq('id', atendimento_id)

  return NextResponse.json({ ok: true })
}
