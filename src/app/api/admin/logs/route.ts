import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  await requireAdmin()
  const admin = createAdminClient()

  const { searchParams } = new URL(req.url)
  const dataInicio = searchParams.get('dataInicio') || ''
  const dataFim    = searchParams.get('dataFim')    || ''
  const horaInicio = searchParams.get('horaInicio') || ''   // HH:MM
  const horaFim    = searchParams.get('horaFim')    || ''   // HH:MM
  const empresaId  = searchParams.get('empresa_id') || ''
  const medicoId   = searchParams.get('medico_id')  || ''
  const tipoBusca  = searchParams.get('tipo')       || ''
  const nomeBusca  = searchParams.get('nome')?.toLowerCase().trim() || ''

  const tsInicio = dataInicio ? new Date(dataInicio + 'T00:00:00-03:00').toISOString() : null
  const tsFim    = dataFim    ? new Date(dataFim    + 'T23:59:59-03:00').toISOString() : null

  // ── Lookups base ──────────────────────────────────────────────────────────
  const [{ data: empresasList }, { data: medicosList }] = await Promise.all([
    admin.from('empresas').select('id, nome').order('nome'),
    admin.from('medicos').select('id, nome, especialidade'),
  ])
  const empMap = new Map((empresasList ?? []).map((e: any) => [e.id, e.nome]))
  const medMap = new Map((medicosList ?? []).map((m: any) => [m.id, m]))

  // ── Fetch paralelo de todas as tabelas de eventos ─────────────────────────
  const [
    { data: atendRows },
    { data: atestRows },
    { data: recRows },
    { data: examRows },
    { data: triagemRows },
    { data: agendRows },
  ] = await Promise.all([
    // Atendimentos: gera eventos (entrada fila, início, fim, encaminhamento)
    (() => {
      let q = admin
        .from('atendimentos')
        .select('id, paciente_id, medico_id, criado_em, iniciado_em, finalizado_em, status, notas_medico, agendamento_id')
        .order('criado_em', { ascending: false })
        .limit(3000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      if (medicoId) q = q.eq('medico_id', medicoId)
      return q
    })(),

    // Atestados
    (() => {
      let q = admin
        .from('atestados')
        .select('id, paciente_id, medico_id, empresa_id, criado_em, dias, cid')
        .order('criado_em', { ascending: false })
        .limit(2000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      if (medicoId) q = q.eq('medico_id', medicoId)
      if (empresaId && empresaId !== '__particular__') q = q.eq('empresa_id', empresaId)
      return q
    })(),

    // Receitas
    (() => {
      let q = admin
        .from('receitas')
        .select('id, paciente_id, medico_id, empresa_id, criado_em, tipo, medicamentos')
        .order('criado_em', { ascending: false })
        .limit(2000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      if (medicoId) q = q.eq('medico_id', medicoId)
      if (empresaId && empresaId !== '__particular__') q = q.eq('empresa_id', empresaId)
      return q
    })(),

    // Solicitações de exames
    (() => {
      let q = admin
        .from('solicitacoes_exames')
        .select('id, paciente_id, medico_id, empresa_id, criado_em, exames, urgencia')
        .order('criado_em', { ascending: false })
        .limit(2000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      if (medicoId) q = q.eq('medico_id', medicoId)
      if (empresaId && empresaId !== '__particular__') q = q.eq('empresa_id', empresaId)
      return q
    })(),

    // Triagens
    (() => {
      let q = admin
        .from('triagens')
        .select('id, paciente_id, atendimento_id, criado_em, classificacao_risco, status')
        .order('criado_em', { ascending: false })
        .limit(2000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      return q
    })(),

    // Agendamentos com marcador de encaminhamento
    (() => {
      let q = admin
        .from('agendamentos')
        .select('id, paciente_id, medico_id, criado_em, data_hora, observacoes, status')
        .not('observacoes', 'is', null)
        .order('criado_em', { ascending: false })
        .limit(2000)
      if (tsInicio) q = q.gte('criado_em', tsInicio)
      if (tsFim)    q = q.lte('criado_em', tsFim)
      if (medicoId) q = q.eq('medico_id', medicoId)
      return q
    })(),
  ])

  // ── Lookup de pacientes ───────────────────────────────────────────────────
  const allPacIds = [
    ...new Set([
      ...(atendRows   ?? []).map((r: any) => r.paciente_id),
      ...(atestRows   ?? []).map((r: any) => r.paciente_id),
      ...(recRows     ?? []).map((r: any) => r.paciente_id),
      ...(examRows    ?? []).map((r: any) => r.paciente_id),
      ...(triagemRows ?? []).map((r: any) => r.paciente_id),
      ...(agendRows   ?? []).map((r: any) => r.paciente_id),
    ].filter(Boolean)),
  ]

  const { data: pacientes } = allPacIds.length
    ? await admin.from('pacientes').select('id, nome, cpf').in('id', allPacIds)
    : { data: [] }
  const pacMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))

  // Lookup empresa por CPF
  const cpfs = (pacientes ?? []).map((p: any) => p.cpf).filter(Boolean)
  const { data: vinculos } = cpfs.length
    ? await admin.from('vinculos_empresa').select('cpf, empresa_id').in('cpf', cpfs)
    : { data: [] }
  const cpfEmpMap = new Map((vinculos ?? []).map((v: any) => [v.cpf, v.empresa_id]))

  // ── Helpers ───────────────────────────────────────────────────────────────
  function pacEmpresaId(pacienteId: string | null): string | null {
    if (!pacienteId) return null
    const pac = pacMap.get(pacienteId) as any
    return cpfEmpMap.get(pac?.cpf) ?? null
  }
  function pacEmpresaNome(pacienteId: string | null): string {
    const eid = pacEmpresaId(pacienteId)
    return eid ? (empMap.get(eid) ?? 'Particular') : 'Particular'
  }
  function extractReferrer(text: string | null): string | null {
    if (!text) return null
    const m = text.match(/\[Encaminhado por (.+?)\]/)
    return m ? m[1] : null
  }

  // ── Montar log entries ────────────────────────────────────────────────────
  type LogEntry = {
    id: string
    criado_em: string
    tipo: string
    tipo_label: string
    descricao: string
    paciente_nome: string
    medico_nome: string
    medico_esp: string
    empresa_nome: string
    referencia_id: string
    detalhe: string
  }

  const logs: LogEntry[] = []

  // ── Atendimentos ──────────────────────────────────────────────────────────
  for (const r of atendRows ?? []) {
    const pac = pacMap.get(r.paciente_id) as any
    const med = medMap.get(r.medico_id)  as any
    const empId = pacEmpresaId(r.paciente_id)
    const empNome = pacEmpresaNome(r.paciente_id)
    const pacNome = pac?.nome ?? 'Desconhecido'
    const medNome = (med as any)?.nome ?? '—'
    const medEsp  = (med as any)?.especialidade ?? ''

    // Filtro empresa
    if (empresaId) {
      if (empresaId === '__particular__' && empId) continue
      if (empresaId !== '__particular__' && empId !== empresaId) continue
    }

    const referrerNotas = extractReferrer(r.notas_medico)
    const isEncVirtual = !!referrerNotas

    // Evento 1: Entrada na fila
    if (r.criado_em) {
      logs.push({
        id: `atend-entrada-${r.id}`,
        criado_em: r.criado_em,
        tipo: 'entrada_fila',
        tipo_label: 'Entrada na Fila',
        descricao: `${pacNome} entrou na fila de atendimento`,
        paciente_nome: pacNome,
        medico_nome: '—',
        medico_esp: '',
        empresa_nome: empNome,
        referencia_id: r.id,
        detalhe: '',
      })
    }

    // Evento 2: Início da consulta
    if (r.iniciado_em && (!tsInicio || r.iniciado_em >= tsInicio) && (!tsFim || r.iniciado_em <= tsFim)) {
      logs.push({
        id: `atend-inicio-${r.id}`,
        criado_em: r.iniciado_em,
        tipo: 'consulta_inicio',
        tipo_label: 'Consulta Iniciada',
        descricao: `Consulta de ${pacNome} iniciada por ${medNome}`,
        paciente_nome: pacNome,
        medico_nome: medNome,
        medico_esp: medEsp,
        empresa_nome: empNome,
        referencia_id: r.id,
        detalhe: medEsp,
      })
    }

    // Evento 3: Fim da consulta
    if (r.finalizado_em && r.status === 'concluido' &&
        (!tsInicio || r.finalizado_em >= tsInicio) && (!tsFim || r.finalizado_em <= tsFim)) {
      logs.push({
        id: `atend-fim-${r.id}`,
        criado_em: r.finalizado_em,
        tipo: 'consulta_fim',
        tipo_label: 'Consulta Concluída',
        descricao: `Consulta de ${pacNome} concluída por ${medNome}`,
        paciente_nome: pacNome,
        medico_nome: medNome,
        medico_esp: medEsp,
        empresa_nome: empNome,
        referencia_id: r.id,
        detalhe: '',
      })
    }

    // Evento 4: Encaminhamento virtual (detectado por notas_medico)
    if (isEncVirtual && r.finalizado_em &&
        (!tsInicio || r.finalizado_em >= tsInicio) && (!tsFim || r.finalizado_em <= tsFim)) {
      logs.push({
        id: `atend-enc-${r.id}`,
        criado_em: r.finalizado_em,
        tipo: 'encaminhamento_virtual',
        tipo_label: 'Encaminhamento Virtual',
        descricao: `${referrerNotas} encaminhou ${pacNome} para ${medNome} (imediato)`,
        paciente_nome: pacNome,
        medico_nome: medNome,
        medico_esp: medEsp,
        empresa_nome: empNome,
        referencia_id: r.id,
        detalhe: `Por: ${referrerNotas}`,
      })
    }
  }

  // ── Agendamentos com encaminhamento ───────────────────────────────────────
  for (const r of agendRows ?? []) {
    const referrer = extractReferrer(r.observacoes)
    if (!referrer) continue // pula agendamentos sem marcador de encaminhamento

    const pac = pacMap.get(r.paciente_id) as any
    const med = medMap.get(r.medico_id)  as any
    const empId = pacEmpresaId(r.paciente_id)
    const empNome = pacEmpresaNome(r.paciente_id)
    const pacNome = pac?.nome ?? 'Desconhecido'
    const medNome = (med as any)?.nome ?? '—'
    const medEsp  = (med as any)?.especialidade ?? ''

    if (empresaId) {
      if (empresaId === '__particular__' && empId) continue
      if (empresaId !== '__particular__' && empId !== empresaId) continue
    }
    if (medicoId && r.medico_id !== medicoId) continue

    const dtAgend = r.data_hora
      ? new Date(r.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—'

    logs.push({
      id: `agend-enc-${r.id}`,
      criado_em: r.criado_em,
      tipo: 'encaminhamento_agendado',
      tipo_label: 'Encaminhamento Agendado',
      descricao: `${referrer} encaminhou ${pacNome} para ${medNome} — consulta em ${dtAgend}`,
      paciente_nome: pacNome,
      medico_nome: medNome,
      medico_esp: medEsp,
      empresa_nome: empNome,
      referencia_id: r.id,
      detalhe: `Por: ${referrer} · Agendado: ${dtAgend}`,
    })
  }

  // ── Atestados ──────────────────────────────────────────────────────────────
  for (const r of atestRows ?? []) {
    const pac = pacMap.get(r.paciente_id) as any
    const med = medMap.get(r.medico_id)  as any
    const empId = r.empresa_id ?? pacEmpresaId(r.paciente_id)
    const empNome = empId ? (empMap.get(empId) ?? 'Particular') : 'Particular'
    const pacNome = pac?.nome ?? 'Desconhecido'
    const medNome = (med as any)?.nome ?? '—'
    const medEsp  = (med as any)?.especialidade ?? ''

    if (empresaId) {
      if (empresaId === '__particular__' && empId) continue
      if (empresaId !== '__particular__' && empId !== empresaId) continue
    }

    logs.push({
      id: `atest-${r.id}`,
      criado_em: r.criado_em,
      tipo: 'atestado',
      tipo_label: 'Atestado Emitido',
      descricao: `Atestado de ${r.dias} dia(s) emitido para ${pacNome}${r.cid ? ` (CID: ${r.cid})` : ''}`,
      paciente_nome: pacNome,
      medico_nome: medNome,
      medico_esp: medEsp,
      empresa_nome: empNome,
      referencia_id: r.id,
      detalhe: r.cid ?? '',
    })
  }

  // ── Receitas ──────────────────────────────────────────────────────────────
  for (const r of recRows ?? []) {
    const pac = pacMap.get(r.paciente_id) as any
    const med = medMap.get(r.medico_id)  as any
    const empId = r.empresa_id ?? pacEmpresaId(r.paciente_id)
    const empNome = empId ? (empMap.get(empId) ?? 'Particular') : 'Particular'
    const pacNome = pac?.nome ?? 'Desconhecido'
    const medNome = (med as any)?.nome ?? '—'
    const medEsp  = (med as any)?.especialidade ?? ''
    const medShort = r.medicamentos?.split('\n')[0]?.slice(0, 40) ?? ''

    if (empresaId) {
      if (empresaId === '__particular__' && empId) continue
      if (empresaId !== '__particular__' && empId !== empresaId) continue
    }

    logs.push({
      id: `rec-${r.id}`,
      criado_em: r.criado_em,
      tipo: 'receita',
      tipo_label: 'Receita Emitida',
      descricao: `Receita emitida para ${pacNome}${medShort ? `: ${medShort}` : ''}`,
      paciente_nome: pacNome,
      medico_nome: medNome,
      medico_esp: medEsp,
      empresa_nome: empNome,
      referencia_id: r.id,
      detalhe: r.tipo ?? 'simples',
    })
  }

  // ── Exames ────────────────────────────────────────────────────────────────
  for (const r of examRows ?? []) {
    const pac = pacMap.get(r.paciente_id) as any
    const med = medMap.get(r.medico_id)  as any
    const empId = r.empresa_id ?? pacEmpresaId(r.paciente_id)
    const empNome = empId ? (empMap.get(empId) ?? 'Particular') : 'Particular'
    const pacNome = pac?.nome ?? 'Desconhecido'
    const medNome = (med as any)?.nome ?? '—'
    const medEsp  = (med as any)?.especialidade ?? ''

    if (empresaId) {
      if (empresaId === '__particular__' && empId) continue
      if (empresaId !== '__particular__' && empId !== empresaId) continue
    }

    logs.push({
      id: `exam-${r.id}`,
      criado_em: r.criado_em,
      tipo: 'exame',
      tipo_label: 'Exame Solicitado',
      descricao: `Exame solicitado para ${pacNome} — ${r.exames?.split('\n')[0]?.slice(0, 50) ?? ''}`,
      paciente_nome: pacNome,
      medico_nome: medNome,
      medico_esp: medEsp,
      empresa_nome: empNome,
      referencia_id: r.id,
      detalhe: r.urgencia ?? 'normal',
    })
  }

  // ── Triagens ──────────────────────────────────────────────────────────────
  for (const r of triagemRows ?? []) {
    const pac = pacMap.get(r.paciente_id) as any
    const pacNome = pac?.nome ?? 'Desconhecido'
    const empId = pacEmpresaId(r.paciente_id)
    const empNome = pacEmpresaNome(r.paciente_id)

    if (medicoId) continue
    if (empresaId) {
      if (empresaId === '__particular__' && empId) continue
      if (empresaId !== '__particular__' && empId !== empresaId) continue
    }

    logs.push({
      id: `triagem-${r.id}`,
      criado_em: r.criado_em,
      tipo: 'triagem',
      tipo_label: 'Triagem Realizada',
      descricao: `Triagem de ${pacNome} — risco ${r.classificacao_risco ?? '?'}`,
      paciente_nome: pacNome,
      medico_nome: '—',
      medico_esp: '',
      empresa_nome: empNome,
      referencia_id: r.id,
      detalhe: r.classificacao_risco ?? '',
    })
  }

  // ── Ordenar por data desc ─────────────────────────────────────────────────
  logs.sort((a, b) => b.criado_em.localeCompare(a.criado_em))

  // ── Filtros: tipo, nome (busca), hora ─────────────────────────────────────
  let resultado = logs
  if (tipoBusca) resultado = resultado.filter(l => l.tipo === tipoBusca)
  if (nomeBusca) resultado = resultado.filter(l =>
    l.paciente_nome.toLowerCase().includes(nomeBusca) ||
    l.medico_nome.toLowerCase().includes(nomeBusca)
  )
  // Filtro hora (aplicado sobre hora local BRT)
  if (horaInicio || horaFim) {
    resultado = resultado.filter(l => {
      if (!l.criado_em) return true
      const h = new Date(l.criado_em).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
      }) // "HH:MM"
      if (horaInicio && h < horaInicio) return false
      if (horaFim    && h > horaFim)    return false
      return true
    })
  }

  // ── Contagem por tipo ─────────────────────────────────────────────────────
  const contagem: Record<string, number> = {}
  for (const l of resultado) {
    contagem[l.tipo] = (contagem[l.tipo] ?? 0) + 1
  }

  return NextResponse.json({
    logs: resultado,
    total: resultado.length,
    contagem,
    empresas: empresasList ?? [],
    medicos: (medicosList ?? []).map((m: any) => ({ id: m.id, nome: m.nome })),
    pacientes: (pacientes ?? []).map((p: any) => ({ id: p.id, nome: p.nome })),
  })
}
