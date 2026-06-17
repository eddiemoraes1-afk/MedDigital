import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()

  const dozeM = new Date()
  dozeM.setMonth(dozeM.getMonth() - 12)

  const [
    { data: mapeamentos },
    { data: planos },
    { data: monitoramentos },
    { data: versoes },
    { count: totalFuncionarios },
    { data: triagens },
  ] = await Promise.all([
    db.from('mapeamento_riscos_empresa').select('*').eq('empresa_id', empresaId).order('atualizado_em', { ascending: false }),
    db.from('plano_acao_nr1').select('*').eq('empresa_id', empresaId).order('prazo', { ascending: true }),
    db.from('monitoramento_nr1').select('*').eq('empresa_id', empresaId).gte('data_registro', dozeM.toISOString().slice(0, 10)).order('data_registro', { ascending: false }),
    db.from('pgr_versoes').select('*').eq('empresa_id', empresaId).order('gerado_em', { ascending: false }).limit(10),
    db.from('vinculos_empresa').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('ativo', true),
    db.from('triagem_psicossocial').select('setor, nivel_risco').eq('empresa_id', empresaId),
  ])

  const ms = (mapeamentos ?? []) as any[]
  const ps = (planos ?? []) as any[]
  const mons = (monitoramentos ?? []) as any[]
  const vs = (versoes ?? []) as any[]
  const ts = (triagens ?? []) as any[]

  // Agregações
  const agora = new Date()
  const planosVencidos = ps.filter(p => p.status === 'pendente' && p.prazo && new Date(p.prazo) < agora)
  const planosPendentes = ps.filter(p => p.status === 'pendente')
  const planosConcluidos = ps.filter(p => p.status === 'concluido')
  const ultimaRevisao = mons[0]?.data_registro ?? null
  const mesesSemRevisao = ultimaRevisao
    ? Math.floor((agora.getTime() - new Date(ultimaRevisao).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null
  const pgrVigente = vs.find(v => v.status === 'vigente') ?? null

  // Resumo de triagem por setor
  const setorMap = new Map<string, { total: number; alto: number; medio: number; baixo: number }>()
  for (const t of ts) {
    const s = t.setor ?? 'Não informado'
    const cur = setorMap.get(s) ?? { total: 0, alto: 0, medio: 0, baixo: 0 }
    cur.total++
    if (t.nivel_risco === 'alto') cur.alto++
    else if (t.nivel_risco === 'medio') cur.medio++
    else cur.baixo++
    setorMap.set(s, cur)
  }
  const resumoTriagem = [...setorMap.entries()].map(([setor, v]) => ({
    setor,
    total: v.total,
    percentualAlto: v.total > 0 ? Math.round((v.alto / v.total) * 100) : 0,
    percentualMedio: v.total > 0 ? Math.round((v.medio / v.total) * 100) : 0,
  }))

  // Status compliance
  let status: 'verde' | 'amarelo' | 'vermelho' = 'verde'
  const alertas: string[] = []

  if (ms.length === 0) {
    status = 'vermelho'
    alertas.push('Mapeamento de riscos psicossociais ainda não realizado.')
  }
  if (planosVencidos.length > 0) {
    if (status !== 'vermelho') status = 'amarelo'
    alertas.push(`${planosVencidos.length} ação(ões) do plano com prazo vencido.`)
  }
  if (mesesSemRevisao === null) {
    alertas.push('Nenhum registro de monitoramento ainda.')
  } else if (mesesSemRevisao >= 10) {
    if (status !== 'vermelho') status = 'amarelo'
    alertas.push(`Última revisão há ${mesesSemRevisao} meses — recomendado rever antes de 12 meses.`)
  }

  return NextResponse.json({
    status_compliance: status,
    alertas,
    kpis: {
      totalFuncionarios: totalFuncionarios ?? 0,
      setoresMapeados: ms.length,
      totalAcoes: ps.length,
      acoesConcluidas: planosConcluidos.length,
      acoesPendentes: planosPendentes.length,
      acoesVencidas: planosVencidos.length,
      monitoramentosAno: mons.length,
      ultimaRevisao,
      mesesSemRevisao,
      pgrVigente: pgrVigente ? {
        versao: pgrVigente.versao,
        gerado_em: pgrVigente.gerado_em,
        assinante_nome: pgrVigente.assinante_nome,
        hash_sha256: pgrVigente.hash_sha256,
      } : null,
    },
    mapeamentos: ms,
    planos: ps,
    monitoramentos: mons,
    versoes: vs,
    resumoTriagem,
  })
}
