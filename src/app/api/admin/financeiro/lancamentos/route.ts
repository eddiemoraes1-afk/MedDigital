import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// Helper: adiciona N meses a uma data string 'YYYY-MM-DD'
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

// GET — listar lançamentos com filtros
export async function GET(req: NextRequest) {
  await requireAdmin()
  const db = createAdminClient()
  const { searchParams } = new URL(req.url)

  const tipo       = searchParams.get('tipo')
  const status     = searchParams.get('status')
  const de         = searchParams.get('de')
  const ate        = searchParams.get('ate')
  const empresa_id = searchParams.get('empresa_id')
  const medico_id  = searchParams.get('medico_id')
  const limite     = parseInt(searchParams.get('limite') ?? '200')

  let q = db
    .from('lancamentos_financeiros')
    .select(`
      *,
      categorias_financeiras(id, nome, tipo, grupo_dre),
      empresas(id, nome),
      medicos(id, nome),
      contas_bancarias(id, nome)
    `)
    .order('data_competencia', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(limite)

  if (tipo)       q = q.eq('tipo', tipo)
  if (status)     q = q.eq('status', status)
  if (de)         q = q.gte('data_competencia', de)
  if (ate)        q = q.lte('data_competencia', ate)
  if (empresa_id) q = q.eq('empresa_id', empresa_id)
  if (medico_id)  q = q.eq('medico_id', medico_id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualizar status de atrasados automaticamente
  const hoje = new Date().toISOString().split('T')[0]
  await db
    .from('lancamentos_financeiros')
    .update({ status: 'atrasado' })
    .eq('status', 'pendente')
    .lt('data_vencimento', hoje)

  return NextResponse.json({ lancamentos: data ?? [] })
}

// POST — criar lançamento (simples ou parcelado)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  const db    = createAdminClient()
  const body  = await req.json()

  const {
    tipo, categoria_id, descricao, valor,
    data_competencia, data_vencimento, data_pagamento,
    status, conta_bancaria_id, empresa_id, medico_id,
    referencia_id, referencia_tipo, numero_documento,
    arquivo_url, observacoes, recorrente, intervalo_recorrencia,
    forma_pagamento, numero_parcelas,
  } = body

  if (!tipo || !descricao || !valor || !data_competencia) {
    return NextResponse.json({ error: 'Campos obrigatórios: tipo, descricao, valor, data_competencia' }, { status: 400 })
  }
  if (!['receita', 'despesa'].includes(tipo)) {
    return NextResponse.json({ error: 'tipo deve ser receita ou despesa' }, { status: 400 })
  }

  const parcelas    = Math.max(1, Math.min(360, parseInt(numero_parcelas ?? '1') || 1))
  const valorTotal  = Number(valor)
  // Valor de cada parcela: divide o total igualmente, última parcela absorve centavos
  const valorParc   = Math.floor((valorTotal / parcelas) * 100) / 100
  const valorUltima = Math.round((valorTotal - valorParc * (parcelas - 1)) * 100) / 100

  const grupoParcela = parcelas > 1 ? randomUUID() : null
  const adminId      = (admin as any)?.id ?? null

  const buildRecord = (i: number) => ({
    tipo,
    categoria_id:          categoria_id          ?? null,
    descricao:             parcelas > 1 ? `${descricao} (${i + 1}/${parcelas})` : descricao,
    valor:                 i === parcelas - 1 ? valorUltima : valorParc,
    data_competencia:      addMonths(data_competencia, i),
    data_vencimento:       data_vencimento ? addMonths(data_vencimento, i) : null,
    data_pagamento:        parcelas > 1 ? null : (data_pagamento ?? null),
    status:                parcelas > 1
                             ? 'pendente'
                             : data_pagamento
                               ? (tipo === 'receita' ? 'recebido' : 'pago')
                               : (status ?? 'pendente'),
    conta_bancaria_id:     conta_bancaria_id     ?? null,
    empresa_id:            empresa_id            ?? null,
    medico_id:             medico_id             ?? null,
    referencia_id:         referencia_id         ?? null,
    referencia_tipo:       referencia_tipo       ?? 'manual',
    numero_documento:      numero_documento      ?? null,
    arquivo_url:           arquivo_url           ?? null,
    observacoes:           observacoes           ?? null,
    recorrente:            recorrente            ?? false,
    intervalo_recorrencia: intervalo_recorrencia ?? null,
    forma_pagamento:       forma_pagamento       ?? null,
    grupo_parcela:         grupoParcela,
    criado_por:            adminId,
    atualizado_em:         new Date().toISOString(),
  })

  if (parcelas === 1) {
    const { data, error } = await db
      .from('lancamentos_financeiros')
      .insert(buildRecord(0))
      .select(`*, categorias_financeiras(id, nome, tipo, grupo_dre), empresas(id, nome), medicos(id, nome)`)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lancamento: data }, { status: 201 })
  }

  // Parcelado: insere N registros de uma vez
  const records = Array.from({ length: parcelas }, (_, i) => buildRecord(i))
  const { data, error } = await db
    .from('lancamentos_financeiros')
    .insert(records)
    .select(`*, categorias_financeiras(id, nome, tipo, grupo_dre), empresas(id, nome), medicos(id, nome)`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lancamentos: data, parcelas, grupo_parcela: grupoParcela }, { status: 201 })
}
