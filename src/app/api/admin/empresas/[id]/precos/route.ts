import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json()

  const preco_mensalidade = parseFloat(body.preco_mensalidade ?? 0)
  const preco_consulta = parseFloat(body.preco_consulta ?? 0)
  const percentual_coparticipacao = parseFloat(body.percentual_coparticipacao ?? 0)
  const preco_receita = parseFloat(body.preco_receita ?? 0)

  if (isNaN(preco_mensalidade) || isNaN(preco_consulta) || isNaN(percentual_coparticipacao) || isNaN(preco_receita)) {
    return NextResponse.json({ error: 'Valores inválidos' }, { status: 400 })
  }

  if (percentual_coparticipacao < 0 || percentual_coparticipacao > 100) {
    return NextResponse.json({ error: 'Percentual de co-participação deve ser entre 0 e 100' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('empresas')
    .update({ preco_mensalidade, preco_consulta, percentual_coparticipacao, preco_receita })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
