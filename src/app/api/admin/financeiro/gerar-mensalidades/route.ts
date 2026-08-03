import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST — gerar faturas mensais automáticas para todas as empresas ativas
// Body: { mes: "2026-08", conta_bancaria_id?: string, dias_vencimento?: number }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  const db    = createAdminClient()
  const body  = await req.json()

  const { mes, conta_bancaria_id, dias_vencimento } = body
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Parâmetro "mes" obrigatório no formato YYYY-MM' }, { status: 400 })
  }

  const [ano, mesNum] = mes.split('-').map(Number)
  const competencia = `${mes}-01`
  // Vencimento padrão: dia 10 do mês seguinte
  const diasVenc = dias_vencimento ?? 10
  const vencMes  = mesNum === 12 ? 1 : mesNum + 1
  const vencAno  = mesNum === 12 ? ano + 1 : ano
  const vencimento = `${vencAno}-${String(vencMes).padStart(2, '0')}-${String(diasVenc).padStart(2, '0')}`

  // Buscar categoria "Mensalidade Empresa"
  const { data: catData } = await db
    .from('categorias_financeiras')
    .select('id')
    .ilike('nome', '%mensalidade%')
    .eq('tipo', 'receita')
    .limit(1)
    .single()

  const categoriaId = catData?.id ?? null

  // Buscar empresas ativas com plano/valor definido
  const { data: empresas, error: errEmp } = await db
    .from('empresas')
    .select('id, nome, plano, valor_plano')
    .eq('status', 'ativo')
    .not('valor_plano', 'is', null)

  if (errEmp) return NextResponse.json({ error: errEmp.message }, { status: 500 })
  if (!empresas?.length) return NextResponse.json({ gerados: 0, mensagem: 'Nenhuma empresa ativa com valor configurado' })

  // Verificar quais já têm fatura no período para evitar duplicatas
  const empIds = empresas.map(e => e.id)
  const { data: existentes } = await db
    .from('lancamentos_financeiros')
    .select('empresa_id')
    .eq('data_competencia', competencia)
    .eq('referencia_tipo', 'mensalidade')
    .in('empresa_id', empIds)

  const jaGerados = new Set((existentes ?? []).map(e => e.empresa_id))

  const novas = empresas
    .filter(e => !jaGerados.has(e.id))
    .map(e => ({
      tipo:             'receita',
      categoria_id:     categoriaId,
      empresa_id:       e.id,
      descricao:        `Mensalidade ${e.plano ?? 'Plano'} — ${e.nome} — ${mes}`,
      valor:            Number(e.valor_plano),
      data_competencia: competencia,
      data_vencimento:  vencimento,
      data_pagamento:   null,
      status:           'pendente',
      referencia_tipo:  'mensalidade',
      conta_bancaria_id: conta_bancaria_id ?? null,
      criado_por:       (admin as any)?.id ?? null,
      atualizado_em:    new Date().toISOString(),
    }))

  if (!novas.length) {
    return NextResponse.json({ gerados: 0, mensagem: `Todas as faturas de ${mes} já foram geradas` })
  }

  const { data: inseridos, error: errIns } = await db
    .from('lancamentos_financeiros')
    .insert(novas)
    .select('id, empresa_id, descricao, valor, data_vencimento')

  if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 })

  return NextResponse.json({
    gerados:  inseridos?.length ?? 0,
    ignorados: jaGerados.size,
    mes,
    vencimento,
    lancamentos: inseridos,
  }, { status: 201 })
}
