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

  const { error } = await admin
    .from('atendimentos')
    .update({
      notas_medico:      notas_medico      ?? null,
      queixa_principal:  queixa_principal  ?? null,
      hda:               hda               ?? null,
      exame_fisico:      exame_fisico      ?? null,
      sinais_vitais:     sinais_vitais     ?? null,
      hipotese_diag:     hipotese_diag     ?? null,
      cid:               cid               ?? null,
      plano_terapeutico: plano_terapeutico ?? null,
      evolucao:          evolucao          ?? null,
    })
    .eq('id', id)
    .eq('medico_id', medico.id) // garantia extra: só o médico dono pode salvar

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, salvo_em: new Date().toISOString() })
}
