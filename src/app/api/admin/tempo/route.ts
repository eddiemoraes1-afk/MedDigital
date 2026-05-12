import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function diffMin(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 60000
  return d >= 0 ? Math.round(d * 10) / 10 : null
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const admin = createAdminClient()

  const { searchParams } = new URL(req.url)
  const dataInicio  = searchParams.get('dataInicio') || ''
  const dataFim     = searchParams.get('dataFim')    || ''
  const empresaId   = searchParams.get('empresa_id') || ''
  const medicoId    = searchParams.get('medico_id')  || ''
  const nomePac     = searchParams.get('nome')?.toLowerCase().trim() || ''

  // ── Atendimentos concluídos com tempos ─────────────────────────────────────
  let q = admin
    .from('atendimentos')
    .select('id, paciente_id, medico_id, criado_em, iniciado_em, finalizado_em')
    .eq('status', 'concluido')
    .not('iniciado_em', 'is', null)
    .not('finalizado_em', 'is', null)
    .order('finalizado_em', { ascending: false })

  if (dataInicio) q = q.gte('finalizado_em', new Date(dataInicio + 'T00:00:00-03:00').toISOString())
  if (dataFim)    q = q.lte('finalizado_em', new Date(dataFim    + 'T23:59:59-03:00').toISOString())
  if (medicoId)   q = q.eq('medico_id', medicoId)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let registros = (rows ?? []) as any[]

  // ── Lookup: pacientes ──────────────────────────────────────────────────────
  const pacIds = [...new Set(registros.map(r => r.paciente_id).filter(Boolean))]
  const { data: pacientes } = pacIds.length
    ? await admin.from('pacientes').select('id, nome, cpf, sexo').in('id', pacIds)
    : { data: [] }
  const pacMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))

  // ── Lookup: vinculos empresa (por CPF) ─────────────────────────────────────
  const cpfs = (pacientes ?? []).map((p: any) => p.cpf).filter(Boolean)
  const { data: vinculos } = cpfs.length
    ? await admin.from('vinculos_empresa').select('cpf, empresa_id').in('cpf', cpfs)
    : { data: [] }
  const cpfEmpMap = new Map((vinculos ?? []).map((v: any) => [v.cpf, v.empresa_id]))

  // ── Lookup: medicos ────────────────────────────────────────────────────────
  const medIds = [...new Set(registros.map(r => r.medico_id).filter(Boolean))]
  const { data: medicos } = medIds.length
    ? await admin.from('medicos').select('id, nome, especialidade').in('id', medIds)
    : { data: [] }
  const medMap = new Map((medicos ?? []).map((m: any) => [m.id, m]))

  // ── Lookup: empresas ───────────────────────────────────────────────────────
  const { data: empresasList } = await admin.from('empresas').select('id, nome').order('nome')
  const empMap = new Map((empresasList ?? []).map((e: any) => [e.id, e]))

  // ── Filtro por empresa ─────────────────────────────────────────────────────
  if (empresaId) {
    registros = registros.filter(r => {
      const pac = pacMap.get(r.paciente_id) as any
      const empId = cpfEmpMap.get(pac?.cpf) ?? null
      if (empresaId === '__particular__') return !empId
      return empId === empresaId
    })
  }

  // ── Filtro por nome paciente ───────────────────────────────────────────────
  if (nomePac) {
    registros = registros.filter(r => {
      const pac = pacMap.get(r.paciente_id) as any
      return pac?.nome?.toLowerCase().includes(nomePac)
    })
  }

  // ── Enriquecer com tempos calculados ──────────────────────────────────────
  const enriched = registros.map(r => {
    const pac   = pacMap.get(r.paciente_id) as any
    const med   = medMap.get(r.medico_id)  as any
    const empId = cpfEmpMap.get(pac?.cpf)  ?? null
    const emp   = empId ? (empMap.get(empId) as any) : null
    const dataLocal = r.finalizado_em
      ? new Date(r.finalizado_em).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      : null
    return {
      id:               r.id,
      paciente_id:      r.paciente_id,
      paciente_nome:    pac?.nome     ?? 'Desconhecido',
      medico_id:        r.medico_id,
      medico_nome:      med?.nome     ?? 'Desconhecido',
      medico_esp:       med?.especialidade ?? '',
      empresa_id:       empId,
      empresa_nome:     emp?.nome     ?? 'Particular',
      data:             dataLocal,
      criado_em:        r.criado_em,
      iniciado_em:      r.iniciado_em,
      finalizado_em:    r.finalizado_em,
      espera_min:       diffMin(r.criado_em, r.iniciado_em),
      consulta_min:     diffMin(r.iniciado_em, r.finalizado_em),
    }
  })

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const withEspera  = enriched.filter(r => r.espera_min   !== null).map(r => r.espera_min!)
  const withConsulta = enriched.filter(r => r.consulta_min !== null).map(r => r.consulta_min!)
  const kpis = {
    totalConsultas:    enriched.length,
    pacientesUnicos:   new Set(enriched.map(r => r.paciente_id)).size,
    mediaEspera:       avg(withEspera),
    mediaConsulta:     avg(withConsulta),
    somaEspera:        Math.round(withEspera.reduce((s, v) => s + v, 0) * 10) / 10,
    somaConsulta:      Math.round(withConsulta.reduce((s, v) => s + v, 0) * 10) / 10,
  }

  // ── Por mês ───────────────────────────────────────────────────────────────
  const mesBucket: Record<string, { esperas: number[]; consultas: number[] }> = {}
  enriched.forEach(r => {
    const mes = r.data?.slice(0, 7) ?? 'N/A'
    if (!mesBucket[mes]) mesBucket[mes] = { esperas: [], consultas: [] }
    if (r.espera_min   !== null) mesBucket[mes].esperas.push(r.espera_min)
    if (r.consulta_min !== null) mesBucket[mes].consultas.push(r.consulta_min)
  })
  const porMes = Object.entries(mesBucket)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, d]) => ({
      mes,
      mediaEspera:   avg(d.esperas),
      mediaConsulta: avg(d.consultas),
      total:         Math.max(d.esperas.length, d.consultas.length),
    }))

  // ── Por médico ────────────────────────────────────────────────────────────
  const medBucket: Record<string, { nome: string; esp: string; esperas: number[]; consultas: number[] }> = {}
  enriched.forEach(r => {
    if (!medBucket[r.medico_id]) medBucket[r.medico_id] = { nome: r.medico_nome, esp: r.medico_esp, esperas: [], consultas: [] }
    if (r.espera_min   !== null) medBucket[r.medico_id].esperas.push(r.espera_min)
    if (r.consulta_min !== null) medBucket[r.medico_id].consultas.push(r.consulta_min)
  })
  const porMedico = Object.values(medBucket)
    .map(d => ({
      nome:          d.nome,
      especialidade: d.esp,
      total:         Math.max(d.esperas.length, d.consultas.length),
      mediaEspera:   avg(d.esperas),
      mediaConsulta: avg(d.consultas),
      somaEspera:    Math.round(d.esperas.reduce((s, v) => s + v, 0) * 10) / 10,
      somaConsulta:  Math.round(d.consultas.reduce((s, v) => s + v, 0) * 10) / 10,
    }))
    .sort((a, b) => b.total - a.total)

  // ── Por empresa ───────────────────────────────────────────────────────────
  const empBucket: Record<string, { esperas: number[]; consultas: number[] }> = {}
  enriched.forEach(r => {
    const key = r.empresa_nome
    if (!empBucket[key]) empBucket[key] = { esperas: [], consultas: [] }
    if (r.espera_min   !== null) empBucket[key].esperas.push(r.espera_min)
    if (r.consulta_min !== null) empBucket[key].consultas.push(r.consulta_min)
  })
  const porEmpresa = Object.entries(empBucket)
    .map(([nome, d]) => ({
      nome,
      total:         Math.max(d.esperas.length, d.consultas.length),
      mediaEspera:   avg(d.esperas),
      mediaConsulta: avg(d.consultas),
    }))
    .sort((a, b) => b.total - a.total)

  // ── Por paciente (top 20) ─────────────────────────────────────────────────
  const pacBucket: Record<string, { nome: string; empresa: string; esperas: number[]; consultas: number[] }> = {}
  enriched.forEach(r => {
    if (!pacBucket[r.paciente_id]) pacBucket[r.paciente_id] = { nome: r.paciente_nome, empresa: r.empresa_nome, esperas: [], consultas: [] }
    if (r.espera_min   !== null) pacBucket[r.paciente_id].esperas.push(r.espera_min)
    if (r.consulta_min !== null) pacBucket[r.paciente_id].consultas.push(r.consulta_min)
  })
  const porPaciente = Object.values(pacBucket)
    .map(d => ({
      nome:          d.nome,
      empresa:       d.empresa,
      total:         Math.max(d.esperas.length, d.consultas.length),
      mediaEspera:   avg(d.esperas),
      mediaConsulta: avg(d.consultas),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  // ── Por data (últimos 90 dias) ────────────────────────────────────────────
  const dataBucket: Record<string, { esperas: number[]; consultas: number[] }> = {}
  enriched.forEach(r => {
    if (!r.data) return
    if (!dataBucket[r.data]) dataBucket[r.data] = { esperas: [], consultas: [] }
    if (r.espera_min   !== null) dataBucket[r.data].esperas.push(r.espera_min)
    if (r.consulta_min !== null) dataBucket[r.data].consultas.push(r.consulta_min)
  })
  const porData = Object.entries(dataBucket)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 90)
    .reverse()
    .map(([data, d]) => ({
      data,
      total:         Math.max(d.esperas.length, d.consultas.length),
      mediaEspera:   avg(d.esperas),
      mediaConsulta: avg(d.consultas),
    }))

  // ── Registros completos (para tabela e export) ────────────────────────────
  const registrosExport = enriched.map(r => ({
    data:          r.data ?? '',
    paciente:      r.paciente_nome,
    medico:        r.medico_nome,
    especialidade: r.medico_esp,
    empresa:       r.empresa_nome,
    espera_min:    r.espera_min ?? '',
    consulta_min:  r.consulta_min ?? '',
    criado_em:     r.criado_em ?? '',
    iniciado_em:   r.iniciado_em ?? '',
    finalizado_em: r.finalizado_em ?? '',
  }))

  return NextResponse.json({
    kpis,
    porMes,
    porMedico,
    porEmpresa,
    porPaciente,
    porData,
    registros: registrosExport,
    empresas:  empresasList ?? [],
    medicos:   (medicos ?? []).map((m: any) => ({ id: m.id, nome: m.nome })),
  })
}
