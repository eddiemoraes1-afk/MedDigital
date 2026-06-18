import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

// GET — verifica se o paciente precisa ou já respondeu recentemente
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = createAdminClient()

  const { data: paciente } = await db
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ precisa: false, motivo: 'sem_cadastro' })

  // Verifica se tem vínculo ativo com empresa
  const { data: vinculo } = await db
    .from('vinculos_empresa')
    .select('empresa_id, setor: departamento, cargo')
    .eq('paciente_id', paciente.id)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (!vinculo?.empresa_id) {
    return NextResponse.json({ precisa: false, motivo: 'sem_empresa' })
  }

  // Verifica última triagem (6 meses = 180 dias)
  const seisM = new Date()
  seisM.setDate(seisM.getDate() - 180)

  const { data: ultima } = await db
    .from('triagem_psicossocial')
    .select('id, data_resposta, nivel_risco, score_total')
    .eq('paciente_id', paciente.id)
    .eq('empresa_id', vinculo.empresa_id)
    .gte('data_resposta', seisM.toISOString())
    .order('data_resposta', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ultima) {
    return NextResponse.json({
      precisa: false,
      motivo: 'recente',
      ultima: {
        data: ultima.data_resposta,
        nivel_risco: ultima.nivel_risco,
        score_total: ultima.score_total,
      },
    })
  }

  return NextResponse.json({ precisa: true, empresa_id: vinculo.empresa_id })
}

// POST — salva as respostas
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = createAdminClient()
  const body = await req.json()
  const { respostas } = body // { [pergunta_id]: number (1-5) }

  const { data: paciente } = await db
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

  const { data: vinculo } = await db
    .from('vinculos_empresa')
    .select('empresa_id, departamento, cargo')
    .eq('paciente_id', paciente.id)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (!vinculo?.empresa_id) {
    return NextResponse.json({ error: 'Sem vínculo com empresa' }, { status: 400 })
  }

  // Calcula scores por domínio
  // Perguntas: org1, org2(inv), org3 | rel1(inv), rel2, rel3(inv) | rec1(inv), rec2(inv), rec3 | con1, con2, con3
  // (inv) = invertida: 6 - score
  function inv(v: number) { return 6 - v }
  function media(...vals: number[]) { return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) }

  const r = respostas as Record<string, number>
  const scoreOrg = media(r.org1, inv(r.org2), r.org3)
  const scoreRel = media(inv(r.rel1), r.rel2, inv(r.rel3))
  const scoreRec = media(inv(r.rec1), inv(r.rec2), r.rec3)
  const scoreCon = media(r.con1, r.con2, r.con3)
  const scoreTotal = media(scoreOrg, scoreRel, scoreRec, scoreCon)

  // Converte para escala 0-100
  const to100 = (v: number) => Math.round(((v - 1) / 4) * 100)
  const s = {
    org: to100(scoreOrg),
    rel: to100(scoreRel),
    rec: to100(scoreRec),
    con: to100(scoreCon),
    total: to100(scoreTotal),
  }

  const nivel = s.total >= 60 ? 'alto' : s.total >= 35 ? 'medio' : 'baixo'

  const { error } = await db.from('triagem_psicossocial').insert({
    paciente_id: paciente.id,
    empresa_id: vinculo.empresa_id,
    setor: vinculo.departamento ?? null,
    cargo: vinculo.cargo ?? null,
    respostas,
    score_organizacao: s.org,
    score_relacoes: s.rel,
    score_recursos: s.rec,
    score_contexto: s.con,
    score_total: s.total,
    nivel_risco: nivel,
    encaminhado_consulta: false,
  })

  if (error) {
    console.error('[triagem-psicossocial] erro:', error)
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, nivel_risco: nivel, score_total: s.total })
}
