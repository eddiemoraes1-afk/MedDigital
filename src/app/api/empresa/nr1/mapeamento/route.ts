import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()
  const body = await req.json()

  const { setor, periodo_referencia, nivel_risco_geral, fatores_identificados, percentual_exposto } = body

  if (!setor || !nivel_risco_geral) {
    return NextResponse.json({ error: 'Setor e nível de risco são obrigatórios.' }, { status: 400 })
  }

  // Upsert: se já existe mapeamento para esse setor, atualiza
  const { data: existente } = await db
    .from('mapeamento_riscos_empresa')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('setor', setor)
    .maybeSingle()

  let error
  if (existente) {
    ;({ error } = await db
      .from('mapeamento_riscos_empresa')
      .update({
        periodo_referencia: periodo_referencia || new Date().toISOString().slice(0, 10),
        nivel_risco_geral,
        fatores_identificados: fatores_identificados ?? [],
        percentual_exposto: percentual_exposto ?? null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', existente.id))
  } else {
    ;({ error } = await db
      .from('mapeamento_riscos_empresa')
      .insert({
        empresa_id: empresaId,
        setor,
        periodo_referencia: periodo_referencia || new Date().toISOString().slice(0, 10),
        nivel_risco_geral,
        fatores_identificados: fatores_identificados ?? [],
        percentual_exposto: percentual_exposto ?? null,
      }))
  }

  if (error) {
    console.error('[nr1/mapeamento] erro:', error)
    return NextResponse.json({ error: 'Erro ao salvar mapeamento.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
