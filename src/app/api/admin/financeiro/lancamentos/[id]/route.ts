import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// PATCH — atualizar lançamento (inclui marcar como pago/recebido)
export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin()
  const db  = createAdminClient()
  const { id } = await params
  const body = await req.json()

  const {
    descricao, valor, data_competencia, data_vencimento,
    data_pagamento, status, categoria_id, conta_bancaria_id,
    empresa_id, medico_id, numero_documento, arquivo_url, observacoes,
  } = body

  // Montar objeto de update só com campos presentes
  const update: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  if (descricao         !== undefined) update.descricao         = descricao
  if (valor             !== undefined) update.valor             = Number(valor)
  if (data_competencia  !== undefined) update.data_competencia  = data_competencia
  if (data_vencimento   !== undefined) update.data_vencimento   = data_vencimento ?? null
  if (data_pagamento    !== undefined) update.data_pagamento    = data_pagamento  ?? null
  if (status            !== undefined) update.status            = status
  if (categoria_id      !== undefined) update.categoria_id      = categoria_id    ?? null
  if (conta_bancaria_id !== undefined) update.conta_bancaria_id = conta_bancaria_id ?? null
  if (empresa_id        !== undefined) update.empresa_id        = empresa_id      ?? null
  if (medico_id         !== undefined) update.medico_id         = medico_id       ?? null
  if (numero_documento  !== undefined) update.numero_documento  = numero_documento ?? null
  if (arquivo_url       !== undefined) update.arquivo_url       = arquivo_url     ?? null
  if (observacoes       !== undefined) update.observacoes       = observacoes     ?? null

  // Se data_pagamento foi fornecida e status não foi, definir automaticamente
  if (data_pagamento && !status) {
    const { data: atual } = await db
      .from('lancamentos_financeiros')
      .select('tipo')
      .eq('id', id)
      .single()
    if (atual) update.status = atual.tipo === 'receita' ? 'recebido' : 'pago'
  }

  const { data, error } = await db
    .from('lancamentos_financeiros')
    .update(update)
    .eq('id', id)
    .select(`
      *,
      categorias_financeiras(id, nome, tipo, grupo_dre),
      empresas(id, nome),
      medicos(id, nome)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lancamento: data })
}

// DELETE — cancelar lançamento (soft delete via status)
export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin()
  const db  = createAdminClient()
  const { id } = await params

  const { error } = await db
    .from('lancamentos_financeiros')
    .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
