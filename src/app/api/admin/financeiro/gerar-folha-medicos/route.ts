import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST — gerar folha de pagamento dos médicos baseada em produção
// Body: { mes: "2026-08", valor_por_consulta?: number, conta_bancaria_id?: string }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  const db    = createAdminClient()
  const body  = await req.json()

  const { mes, valor_por_consulta, conta_bancaria_id } = body
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Parâmetro "mes" obrigatório no formato YYYY-MM' }, { status: 400 })
  }

  const [ano, mesNum] = mes.split('-').map(Number)
  const competencia   = `${mes}-01`
  const inicioPeriodo = `${mes}-01`
  const fimPeriodo    = new Date(ano, mesNum, 0).toISOString().split('T')[0] // último dia do mês

  // Vencimento padrão: dia 5 do mês seguinte
  const vencMes  = mesNum === 12 ? 1 : mesNum + 1
  const vencAno  = mesNum === 12 ? ano + 1 : ano
  const vencimento = `${vencAno}-${String(vencMes).padStart(2, '0')}-05`

  // Buscar categoria "Honorários Médicos"
  const { data: catData } = await db
    .from('categorias_financeiras')
    .select('id')
    .ilike('nome', '%honorár%')
    .eq('tipo', 'despesa')
    .limit(1)
    .single()

  const categoriaId = catData?.id ?? null

  // Contar consultas concluídas por médico no período
  const { data: producao, error: errProd } = await db
    .from('consultas')
    .select('medico_id, medicos(id, nome, valor_consulta)')
    .eq('status', 'concluida')
    .gte('data_consulta', inicioPeriodo)
    .lte('data_consulta', fimPeriodo)

  if (errProd) return NextResponse.json({ error: errProd.message }, { status: 500 })

  // Agrupar por médico
  const porMedico: Record<string, { medico_id: string; nome: string; consultas: number; valor_unit: number }> = {}
  for (const c of (producao ?? [])) {
    const m = c.medicos as any
    if (!m) continue
    if (!porMedico[m.id]) {
      const vUnit = Number(m.valor_consulta ?? valor_por_consulta ?? 0)
      porMedico[m.id] = { medico_id: m.id, nome: m.nome, consultas: 0, valor_unit: vUnit }
    }
    porMedico[m.id].consultas += 1
  }

  const medicos = Object.values(porMedico).filter(m => m.consultas > 0)
  if (!medicos.length) {
    return NextResponse.json({ gerados: 0, mensagem: `Nenhuma consulta concluída em ${mes}` })
  }

  // Verificar duplicatas
  const medIds = medicos.map(m => m.medico_id)
  const { data: existentes } = await db
    .from('lancamentos_financeiros')
    .select('medico_id')
    .eq('data_competencia', competencia)
    .eq('referencia_tipo', 'folha_medico')
    .in('medico_id', medIds)

  const jaGerados = new Set((existentes ?? []).map(e => e.medico_id))

  const novas = medicos
    .filter(m => !jaGerados.has(m.medico_id))
    .map(m => ({
      tipo:              'despesa',
      categoria_id:      categoriaId,
      medico_id:         m.medico_id,
      descricao:         `Honorários Dr(a). ${m.nome} — ${m.consultas} consultas — ${mes}`,
      valor:             m.consultas * m.valor_unit,
      data_competencia:  competencia,
      data_vencimento:   vencimento,
      data_pagamento:    null,
      status:            'pendente',
      referencia_tipo:   'folha_medico',
      conta_bancaria_id: conta_bancaria_id ?? null,
      observacoes:       `${m.consultas} consultas × R$ ${m.valor_unit.toFixed(2)}`,
      criado_por:        (admin as any)?.id ?? null,
      atualizado_em:     new Date().toISOString(),
    }))

  if (!novas.length) {
    return NextResponse.json({ gerados: 0, mensagem: `Folha de ${mes} já foi gerada para todos os médicos` })
  }

  const { data: inseridos, error: errIns } = await db
    .from('lancamentos_financeiros')
    .insert(novas)
    .select('id, medico_id, descricao, valor, data_vencimento')

  if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 })

  return NextResponse.json({
    gerados:   inseridos?.length ?? 0,
    ignorados: jaGerados.size,
    mes,
    vencimento,
    total_honorarios: novas.reduce((s, n) => s + n.valor, 0),
    lancamentos: inseridos,
  }, { status: 201 })
}
