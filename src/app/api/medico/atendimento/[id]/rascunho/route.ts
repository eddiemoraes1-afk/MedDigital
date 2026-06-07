import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * PATCH /api/medico/atendimento/[id]/rascunho
 * Salva o rascunho da consulta sem finalizar (não muda status).
 * Chamado automaticamente a cada 30s pela página de atendimento.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const {
    notas_medico,
    queixa_principal,
    hda,
    exame_fisico,
    sinais_vitais,
    hipotese_diag,
    cid,
    plano_terapeutico,
    evolucao,
  } = body

  const admin = createAdminClient()

  // Verificar que o atendimento pertence a um médico aprovado
  const { data: medico } = await admin
    .from('medicos')
    .select('id, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Monta apenas os campos presentes no body (undefined = não veio = não sobrescrever)
  const campos: Record<string, unknown> = {}
  if (notas_medico      !== undefined) campos.notas_medico      = notas_medico      ?? null
  if (queixa_principal  !== undefined) campos.queixa_principal  = queixa_principal  ?? null
  if (hda               !== undefined) campos.hda               = hda               ?? null
  if (exame_fisico      !== undefined) campos.exame_fisico      = exame_fisico      ?? null
  if (sinais_vitais     !== undefined) campos.sinais_vitais     = sinais_vitais     ?? null
  if (hipotese_diag     !== undefined) campos.hipotese_diag     = hipotese_diag     ?? null
  if (cid               !== undefined) campos.cid               = cid               ?? null
  if (plano_terapeutico !== undefined) campos.plano_terapeutico = plano_terapeutico ?? null
  if (evolucao          !== undefined) campos.evolucao          = evolucao          ?? null

  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ ok: true, salvo_em: new Date().toISOString() })
  }

  const { error } = await admin
    .from('atendimentos')
    .update(campos)
    .eq('id', id)
    .eq('medico_id', medico.id)   // só o médico dono pode salvar
    .eq('status', 'em_andamento') // nunca sobrescrever consulta já finalizada

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, salvo_em: new Date().toISOString() })
}
