import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const adminSupabase = createAdminClient()

  const body = await req.json().catch(() => ({}))
  const {
    periodo_referencia = new Date().toISOString().slice(0, 7) + '-01',
    assinante_nome = '',
    assinante_cargo = '',
  } = body

  // 1. Dados da empresa
  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('id, nome, cnpj, razao_social')
    .eq('id', empresaId)
    .single()

  // 2. Total de funcionários ativos
  const { count: totalFuncionarios } = await adminSupabase
    .from('vinculos_empresa')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('ativo', true)

  // 3. Mapeamentos de risco por setor
  const { data: mapeamentos } = await adminSupabase
    .from('mapeamento_riscos_empresa')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('atualizado_em', { ascending: false })

  // 4. Planos de ação
  const { data: planos } = await adminSupabase
    .from('plano_acao_nr1')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('criado_em', { ascending: false })

  // 5. Registros de monitoramento (últimos 12 meses)
  const dozeM = new Date()
  dozeM.setMonth(dozeM.getMonth() - 12)
  const { data: monitoramentos } = await adminSupabase
    .from('monitoramento_nr1')
    .select('*')
    .eq('empresa_id', empresaId)
    .gte('data_registro', dozeM.toISOString().slice(0, 10))
    .order('data_registro', { ascending: false })

  // 6. Triagem psicossocial — scores médios agregados por setor
  const { data: triagens } = await adminSupabase
    .from('triagem_psicossocial')
    .select('setor, nivel_risco, score_organizacao, score_relacoes, score_recursos, score_contexto')
    .eq('empresa_id', empresaId)

  // Agrega triagens por setor
  type SetorAgg = {
    total: number
    baixo: number
    medio: number
    alto: number
    somaOrg: number
    somaRel: number
    somaRec: number
    somaCon: number
  }
  const triagemPorSetor = new Map<string, SetorAgg>()
  for (const t of (triagens ?? [])) {
    const setor = t.setor ?? 'Não informado'
    const cur = triagemPorSetor.get(setor) ?? {
      total: 0, baixo: 0, medio: 0, alto: 0,
      somaOrg: 0, somaRel: 0, somaRec: 0, somaCon: 0,
    }
    cur.total++
    if (t.nivel_risco === 'baixo') cur.baixo++
    else if (t.nivel_risco === 'medio') cur.medio++
    else if (t.nivel_risco === 'alto') cur.alto++
    cur.somaOrg += t.score_organizacao ?? 0
    cur.somaRel += t.score_relacoes ?? 0
    cur.somaRec += t.score_recursos ?? 0
    cur.somaCon += t.score_contexto ?? 0
    triagemPorSetor.set(setor, cur)
  }
  const resumoTriagemPorSetor = [...triagemPorSetor.entries()].map(([setor, v]) => ({
    setor,
    totalRespondentes: v.total,
    percentualAlto: v.total > 0 ? Math.round((v.alto / v.total) * 100) : 0,
    percentualMedio: v.total > 0 ? Math.round((v.medio / v.total) * 100) : 0,
    percentualBaixo: v.total > 0 ? Math.round((v.baixo / v.total) * 100) : 0,
    mediaOrganizacao: v.total > 0 ? Math.round(v.somaOrg / v.total) : 0,
    mediaRelacoes: v.total > 0 ? Math.round(v.somaRel / v.total) : 0,
    mediaRecursos: v.total > 0 ? Math.round(v.somaRec / v.total) : 0,
    mediaContexto: v.total > 0 ? Math.round(v.somaCon / v.total) : 0,
  }))

  // 7. Status geral de compliance
  const mapeamentosData = (mapeamentos ?? []) as any[]
  const planosData = (planos ?? []) as any[]
  const monitoramentosData = (monitoramentos ?? []) as any[]

  const temMapeamento = mapeamentosData.length > 0
  const setoresComRisco = mapeamentosData.filter(
    m => m.nivel_risco_geral && m.nivel_risco_geral !== 'nao_identificado'
  )
  const planosVencidos = planosData.filter(
    p => p.status === 'pendente' && p.prazo && new Date(p.prazo) < new Date()
  )
  const planosEmDia = planosData.filter(
    p => p.status !== 'cancelado'
  )
  const ultimaRevisao = monitoramentosData[0]?.data_registro ?? null
  const mesesSemRevisao = ultimaRevisao
    ? Math.floor((Date.now() - new Date(ultimaRevisao).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null

  let statusCompliance: 'verde' | 'amarelo' | 'vermelho' = 'verde'
  const alertas: string[] = []

  if (!temMapeamento) {
    statusCompliance = 'vermelho'
    alertas.push('Mapeamento de riscos psicossociais ainda não realizado.')
  }
  if (planosVencidos.length > 0) {
    statusCompliance = statusCompliance === 'vermelho' ? 'vermelho' : 'amarelo'
    alertas.push(`${planosVencidos.length} ação(ões) do plano com prazo vencido.`)
  }
  if (mesesSemRevisao !== null && mesesSemRevisao >= 10) {
    statusCompliance = statusCompliance === 'vermelho' ? 'vermelho' : 'amarelo'
    alertas.push(`Última revisão de monitoramento há ${mesesSemRevisao} meses.`)
  }
  if (mesesSemRevisao === null) {
    alertas.push('Nenhum registro de monitoramento ainda.')
  }

  // 8. Monta o payload completo do PGR
  const pgrData = {
    empresa: {
      id: empresa?.id,
      nome: empresa?.nome,
      cnpj: empresa?.cnpj,
      razao_social: empresa?.razao_social,
    },
    periodo_referencia,
    assinante_nome,
    assinante_cargo,
    gerado_em: new Date().toISOString(),
    total_funcionarios: totalFuncionarios ?? 0,
    status_compliance: statusCompliance,
    alertas,
    secao_1_processos_trabalho: {
      descricao: 'Levantamento dos processos de trabalho com potencial de exposição a fatores de risco psicossocial, conforme Portaria MTE 1.419/2024.',
      setores: mapeamentosData.map(m => ({
        setor: m.setor,
        periodo_avaliado: m.periodo_referencia,
        nivel_risco: m.nivel_risco_geral,
        percentual_exposto: m.percentual_exposto,
      })),
    },
    secao_2_inventario_riscos: {
      descricao: 'Inventário explícito dos fatores de risco psicossocial relacionados ao trabalho (FRPRT) identificados, por setor.',
      fatores: mapeamentosData.flatMap(m =>
        ((m.fatores_identificados as string[]) ?? []).map((fator: string) => ({
          setor: m.setor,
          fator,
          nivel_risco: m.nivel_risco_geral,
        }))
      ),
      resumo_triagem_funcionarios: resumoTriagemPorSetor,
    },
    secao_3_plano_acao: {
      descricao: 'Plano de ação com medidas de controle, responsáveis, prazos e resultados esperados.',
      acoes: planosEmDia.map(p => ({
        setor: p.setor,
        fator_risco: p.fator_risco,
        medida_controle: p.medida_controle,
        responsavel: p.responsavel_nome,
        prazo: p.prazo,
        status: p.status,
        concluido_em: p.concluido_em,
        evidencia: p.evidencia_url,
      })),
      total_acoes: planosEmDia.length,
      acoes_concluidas: planosEmDia.filter(p => p.status === 'concluido').length,
      acoes_pendentes: planosEmDia.filter(p => p.status === 'pendente').length,
      acoes_vencidas: planosVencidos.length,
    },
    secao_4_monitoramento: {
      descricao: 'Registros de monitoramento e revisões periódicas realizadas nos últimos 12 meses.',
      registros: monitoramentosData.map(m => ({
        data: m.data_registro,
        tipo: m.tipo,
        observacoes: m.observacoes,
      })),
      ultima_revisao: ultimaRevisao,
      total_registros: monitoramentosData.length,
    },
    setores_com_risco_identificado: setoresComRisco.map(m => m.setor),
  }

  // 9. Gera hash do documento para integridade
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(pgrData))
    .digest('hex')

  // 10. Descobre a próxima versão
  const { data: versaoAtual } = await adminSupabase
    .from('pgr_versoes')
    .select('versao')
    .eq('empresa_id', empresaId)
    .eq('status', 'vigente')
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proximaVersao = (versaoAtual?.versao ?? 0) + 1

  // 11. Arquiva versão anterior (se existir)
  if (versaoAtual) {
    await adminSupabase
      .from('pgr_versoes')
      .update({ status: 'substituido' })
      .eq('empresa_id', empresaId)
      .eq('status', 'vigente')
  }

  // 12. Salva a nova versão no banco
  const { data: novaVersao, error: errVersao } = await adminSupabase
    .from('pgr_versoes')
    .insert({
      empresa_id: empresaId,
      versao: proximaVersao,
      periodo_referencia,
      gerado_por: perfil.usuarioId,
      assinante_nome: assinante_nome || null,
      assinante_cargo: assinante_cargo || null,
      hash_sha256: hash,
      status: 'vigente',
    })
    .select()
    .single()

  if (errVersao) {
    console.error('[pgr/gerar] erro ao salvar versão:', errVersao)
    return NextResponse.json({ error: 'Erro ao registrar versão do PGR.' }, { status: 500 })
  }

  return NextResponse.json({
    versao_id: novaVersao.id,
    versao: proximaVersao,
    hash_sha256: hash,
    status_compliance: statusCompliance,
    alertas,
    pgr: pgrData,
  })
}
