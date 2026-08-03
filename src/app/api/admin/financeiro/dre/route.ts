import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const GRUPOS: Record<string, string> = {
  receita_bruta:          'Receita Bruta',
  deducao:                'Deduções',
  custo_operacional:      'Custos Operacionais',
  despesa_administrativa: 'Despesas Administrativas',
  despesa_financeira:     'Despesas Financeiras',
  investimentos:          'Investimentos',
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const db = createAdminClient()
  const { searchParams } = new URL(req.url)

  const de  = searchParams.get('de')  ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const ate = searchParams.get('ate') ?? new Date().toISOString().split('T')[0]

  // Lançamentos do período (competência), apenas não-cancelados
  const { data: lancamentos, error } = await db
    .from('lancamentos_financeiros')
    .select('tipo, valor, status, categorias_financeiras(nome, tipo, grupo_dre, ordem)')
    .gte('data_competencia', de)
    .lte('data_competencia', ate)
    .neq('status', 'cancelado')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupar por grupo_dre > categoria
  type LinhaCategoria = { nome: string; valor: number; valor_realizado: number; ordem: number }
  type GrupoDRE = { label: string; categorias: LinhaCategoria[]; total: number; total_realizado: number }
  const grupos: Record<string, GrupoDRE> = {}

  for (const l of (lancamentos ?? [])) {
    const cat   = (l.categorias_financeiras as any)
    const grupo = cat?.grupo_dre ?? (l.tipo === 'receita' ? 'receita_bruta' : 'custo_operacional')
    const nome  = cat?.nome ?? 'Sem categoria'
    const ordem = cat?.ordem ?? 99

    if (!grupos[grupo]) {
      grupos[grupo] = { label: GRUPOS[grupo] ?? grupo, categorias: [], total: 0, total_realizado: 0 }
    }

    let linha = grupos[grupo].categorias.find(c => c.nome === nome)
    if (!linha) {
      linha = { nome, valor: 0, valor_realizado: 0, ordem }
      grupos[grupo].categorias.push(linha)
    }

    const v = Number(l.valor ?? 0)
    linha.valor += v
    grupos[grupo].total += v
    if (['pago', 'recebido'].includes(l.status)) {
      linha.valor_realizado += v
      grupos[grupo].total_realizado += v
    }
  }

  // Ordenar categorias dentro de cada grupo
  for (const g of Object.values(grupos)) {
    g.categorias.sort((a, b) => a.ordem - b.ordem)
  }

  // Calcular DRE
  const receitaBruta    = grupos['receita_bruta']?.total              ?? 0
  const deducoes        = grupos['deducao']?.total                    ?? 0
  const receitaLiquida  = receitaBruta - deducoes
  const custoOp         = grupos['custo_operacional']?.total          ?? 0
  const despesaAdm      = grupos['despesa_administrativa']?.total     ?? 0
  const despesaFin      = grupos['despesa_financeira']?.total         ?? 0
  const ebitda          = receitaLiquida - custoOp - despesaAdm - despesaFin

  const receitaBrutaR   = grupos['receita_bruta']?.total_realizado    ?? 0
  const deducoesR       = grupos['deducao']?.total_realizado          ?? 0
  const receitaLiquidaR = receitaBrutaR - deducoesR
  const custoOpR        = grupos['custo_operacional']?.total_realizado ?? 0
  const despesaAdmR     = grupos['despesa_administrativa']?.total_realizado ?? 0
  const despesaFinR     = grupos['despesa_financeira']?.total_realizado     ?? 0
  const ebitdaR         = receitaLiquidaR - custoOpR - despesaAdmR - despesaFinR

  return NextResponse.json({
    periodo: { de, ate },
    grupos: Object.fromEntries(
      Object.entries(grupos).sort(([a], [b]) => {
        const ord = ['receita_bruta','deducao','custo_operacional','despesa_administrativa','despesa_financeira','investimentos']
        return ord.indexOf(a) - ord.indexOf(b)
      })
    ),
    sumario: {
      receita_bruta:    { previsto: receitaBruta,   realizado: receitaBrutaR   },
      deducoes:         { previsto: deducoes,        realizado: deducoesR       },
      receita_liquida:  { previsto: receitaLiquida,  realizado: receitaLiquidaR },
      custo_operacional:{ previsto: custoOp,         realizado: custoOpR        },
      despesa_adm:      { previsto: despesaAdm,      realizado: despesaAdmR     },
      despesa_fin:      { previsto: despesaFin,      realizado: despesaFinR     },
      ebitda:           { previsto: ebitda,           realizado: ebitdaR         },
    },
  })
}
