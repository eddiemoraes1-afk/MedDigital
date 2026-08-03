import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  await requireAdmin()
  const db = createAdminClient()
  const { searchParams } = new URL(req.url)

  const de  = searchParams.get('de')  ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const ate = searchParams.get('ate') ?? new Date().toISOString().split('T')[0]
  const conta_id = searchParams.get('conta_id')

  // Fluxo de caixa usa data_pagamento real (liquidados), não competência
  let q = db
    .from('lancamentos_financeiros')
    .select(`
      id, tipo, descricao, valor, data_pagamento,
      categorias_financeiras(nome, grupo_dre),
      empresas(nome),
      medicos(nome),
      contas_bancarias(nome)
    `)
    .not('data_pagamento', 'is', null)
    .gte('data_pagamento', de)
    .lte('data_pagamento', ate)
    .in('status', ['pago', 'recebido'])
    .order('data_pagamento', { ascending: true })

  if (conta_id) q = q.eq('conta_bancaria_id', conta_id)

  const { data: movimentos, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupar por dia
  type MovDia = {
    data: string
    entradas: number
    saidas: number
    saldo_dia: number
    saldo_acumulado: number
    movimentos: typeof movimentos
  }
  const porDia: Record<string, MovDia> = {}

  for (const m of (movimentos ?? [])) {
    const dia = m.data_pagamento!
    if (!porDia[dia]) {
      porDia[dia] = { data: dia, entradas: 0, saidas: 0, saldo_dia: 0, saldo_acumulado: 0, movimentos: [] }
    }
    const v = Number(m.valor ?? 0)
    if (m.tipo === 'receita') porDia[dia].entradas += v
    else                      porDia[dia].saidas   += v
    porDia[dia].movimentos!.push(m as any)
  }

  // Calcular saldos acumulados
  const dias = Object.values(porDia).sort((a, b) => a.data.localeCompare(b.data))
  let acumulado = 0
  for (const d of dias) {
    d.saldo_dia = d.entradas - d.saidas
    acumulado  += d.saldo_dia
    d.saldo_acumulado = acumulado
  }

  const totalEntradas = dias.reduce((s, d) => s + d.entradas, 0)
  const totalSaidas   = dias.reduce((s, d) => s + d.saidas,   0)

  return NextResponse.json({
    periodo: { de, ate },
    dias,
    sumario: {
      total_entradas: totalEntradas,
      total_saidas:   totalSaidas,
      saldo_periodo:  totalEntradas - totalSaidas,
    },
  })
}
