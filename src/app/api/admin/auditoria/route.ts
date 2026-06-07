import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/auditoria
 * Retorna todos os registros de consentimento e autorização para auditoria.
 * Consolida: consentimentos (LGPD/telemedicina/vídeo) + autorizacoes_cid
 */
export async function GET(req: NextRequest) {
  await requireAdmin()
  const admin = createAdminClient()

  const { searchParams } = new URL(req.url)
  const dataInicio = searchParams.get('dataInicio') || ''
  const dataFim    = searchParams.get('dataFim')    || ''
  const tipo       = searchParams.get('tipo')       || ''
  const nomeBusca  = searchParams.get('nome')?.toLowerCase().trim() || ''

  const tsInicio = dataInicio ? new Date(dataInicio + 'T00:00:00-03:00').toISOString() : null
  const tsFim    = dataFim    ? new Date(dataFim    + 'T23:59:59-03:00').toISOString() : null

  // ── Fetch paralelo ────────────────────────────────────────────────────────
  const [
    { data: consentRows },
    { data: cidRows },
  ] = await Promise.all([

    // Consentimentos LGPD / telemedicina / vídeo
    (() => {
      let q = admin
        .from('consentimentos')
        .select('id, paciente_id, tipo, aceito, versao_termo, texto_termo, triagem_id, atendimento_id, criado_em')
        .order('criado_em', { ascending: false })
        .limit(3000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      if (tipo && ['lgpd_geral', 'telemedicina', 'video_voz'].includes(tipo)) q = q.eq('tipo', tipo)
      return q
    })(),

    // Autorizações de CID (LGPD no atestado)
    (() => {
      let q = admin
        .from('autorizacoes_cid')
        .select('id, paciente_id, cid, status, criado_em, respondido_em, atendimento_id, atendimentos(medico_id, medicos(nome))')
        .order('criado_em', { ascending: false })
        .limit(2000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      if (tipo && ['cid_autorizado', 'cid_negado', 'cid_pendente'].includes(tipo)) {
        const statusMap: Record<string, string> = {
          cid_autorizado: 'autorizado',
          cid_negado: 'negado',
          cid_pendente: 'pendente',
        }
        q = q.eq('status', statusMap[tipo])
      }
      return q
    })(),
  ])

  // ── Lookup de pacientes ───────────────────────────────────────────────────
  const pacIds = [...new Set([
    ...(consentRows ?? []).map((r: any) => r.paciente_id),
    ...(cidRows     ?? []).map((r: any) => r.paciente_id),
  ].filter(Boolean))]

  const { data: pacientes } = pacIds.length
    ? await admin.from('pacientes').select('id, nome, cpf').in('id', pacIds)
    : { data: [] }
  const pacMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))

  // ── Montar registros unificados ───────────────────────────────────────────
  type RegistroAuditoria = {
    id: string
    criado_em: string
    tipo: string
    tipo_label: string
    status: string
    status_label: string
    paciente_nome: string
    paciente_cpf: string
    medico_nome: string
    detalhe: string
    texto_termo?: string
    versao_termo?: string
    referencia_id: string
  }

  const registros: RegistroAuditoria[] = []

  const TIPO_LABEL: Record<string, string> = {
    lgpd_geral:    '🔒 LGPD — Dados Pessoais de Saúde',
    telemedicina:  '💊 Autorização de Telemedicina',
    video_voz:     '🎥 Autorização de Vídeo e Voz',
    cid_autorizado: '✅ CID Autorizado no Atestado',
    cid_negado:     '❌ CID Recusado no Atestado',
    cid_pendente:   '⏳ CID — Aguardando Resposta',
  }

  // Consentimentos
  for (const r of consentRows ?? []) {
    const pac = pacMap.get(r.paciente_id) as any
    if (nomeBusca && !pac?.nome?.toLowerCase().includes(nomeBusca)) continue

    registros.push({
      id: r.id,
      criado_em: r.criado_em,
      tipo: r.tipo,
      tipo_label: TIPO_LABEL[r.tipo] ?? r.tipo,
      status: r.aceito ? 'aceito' : 'recusado',
      status_label: r.aceito ? 'Aceito' : 'Recusado',
      paciente_nome: pac?.nome ?? '—',
      paciente_cpf:  pac?.cpf  ?? '—',
      medico_nome: '—',
      detalhe: `Versão ${r.versao_termo}`,
      texto_termo: r.texto_termo,
      versao_termo: r.versao_termo,
      referencia_id: r.triagem_id ?? r.atendimento_id ?? r.id,
    })
  }

  // Autorizações de CID
  for (const r of cidRows ?? []) {
    const pac = pacMap.get(r.paciente_id) as any
    if (nomeBusca && !pac?.nome?.toLowerCase().includes(nomeBusca)) continue

    const medNome = (r as any).atendimentos?.medicos?.nome ?? '—'
    const tipoCid = r.status === 'autorizado'
      ? 'cid_autorizado'
      : r.status === 'negado'
        ? 'cid_negado'
        : 'cid_pendente'

    // Pula filtro de tipo se não for cid
    if (tipo && !tipo.startsWith('cid') && ['lgpd_geral', 'telemedicina', 'video_voz'].includes(tipo)) continue

    registros.push({
      id: r.id,
      criado_em: r.respondido_em ?? r.criado_em,
      tipo: tipoCid,
      tipo_label: TIPO_LABEL[tipoCid],
      status: r.status,
      status_label: r.status === 'autorizado' ? 'Autorizado' : r.status === 'negado' ? 'Recusado' : 'Pendente',
      paciente_nome: pac?.nome ?? '—',
      paciente_cpf:  pac?.cpf  ?? '—',
      medico_nome: medNome,
      detalhe: `CID: ${r.cid} · Solicitado em ${new Date(r.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      referencia_id: r.id,
    })
  }

  // Ordenar por data desc
  registros.sort((a, b) => b.criado_em.localeCompare(a.criado_em))

  // Contagens por tipo
  const contagem: Record<string, number> = {}
  for (const r of registros) {
    contagem[r.tipo] = (contagem[r.tipo] ?? 0) + 1
  }

  return NextResponse.json({
    registros,
    total: registros.length,
    contagem,
  })
}
