import { requireAdmin } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: atestados } = await admin
    .from('atestados')
    .select('id, paciente_id, medico_id, empresa_id, data_emissao, data_inicio, data_fim, dias, cid, criado_em')
    .order('criado_em', { ascending: false })

  const ats = (atestados ?? []) as any[]
  if (ats.length === 0) {
    return NextResponse.json({ kpis: { total: 0, totalDias: 0, mediaDias: 0, pacientesUnicos: 0 }, porMes: [], porSexo: [], porMedico: [] })
  }

  // Buscar pacientes únicos
  const pacIds = [...new Set(ats.map(a => a.paciente_id).filter(Boolean))]
  const { data: pacientes } = await admin.from('pacientes').select('id, nome, sexo, cpf').in('id', pacIds)
  const pacMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))

  // Buscar médicos únicos
  const medIds = [...new Set(ats.map(a => a.medico_id).filter(Boolean))]
  const { data: medicos } = await admin.from('medicos').select('id, nome, especialidade').in('id', medIds)
  const medMap = new Map((medicos ?? []).map((m: any) => [m.id, m]))

  // KPIs
  const total = ats.length
  const totalDias = ats.reduce((s: number, a: any) => s + (a.dias ?? 0), 0)
  const mediaDias = total > 0 ? Math.round((totalDias / total) * 10) / 10 : 0
  const pacientesUnicos = new Set(ats.map(a => a.paciente_id)).size

  // Por mês
  const mesMap = new Map<string, { atestados: number; dias: number }>()
  for (const a of ats) {
    const d = new Date(a.data_emissao || a.criado_em)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = mesMap.get(key) ?? { atestados: 0, dias: 0 }
    cur.atestados++; cur.dias += a.dias ?? 0
    mesMap.set(key, cur)
  }
  const porMes = [...mesMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v }))

  // Por sexo
  const sexoMap = new Map<string, { atestados: number; dias: number }>()
  for (const a of ats) {
    const p = pacMap.get(a.paciente_id) as any
    const s = p?.sexo === 'masculino' ? 'Masculino' : p?.sexo === 'feminino' ? 'Feminino' : 'Não informado'
    const cur = sexoMap.get(s) ?? { atestados: 0, dias: 0 }
    cur.atestados++; cur.dias += a.dias ?? 0
    sexoMap.set(s, cur)
  }
  const porSexo = [...sexoMap.entries()].map(([sexo, v]) => ({ sexo, ...v }))

  // Por médico
  const medAtMap = new Map<string, { nome: string; especialidade: string; atestados: number; dias: number }>()
  for (const a of ats) {
    if (!a.medico_id) continue
    const m = medMap.get(a.medico_id) as any
    if (!m) continue
    const cur = medAtMap.get(a.medico_id) ?? { nome: m.nome, especialidade: m.especialidade ?? '', atestados: 0, dias: 0 }
    cur.atestados++; cur.dias += a.dias ?? 0
    medAtMap.set(a.medico_id, cur)
  }
  const porMedico = [...medAtMap.values()].sort((a, b) => b.atestados - a.atestados)

  // Por CID
  const cidMap = new Map<string, { cid: string; atestados: number; dias: number; pacientes: Set<string> }>()
  for (const a of ats) {
    const cidKey = (a.cid ?? 'Não informado').trim().toUpperCase() || 'Não informado'
    const cur = cidMap.get(cidKey) ?? { cid: cidKey, atestados: 0, dias: 0, pacientes: new Set() }
    cur.atestados++
    cur.dias += a.dias ?? 0
    if (a.paciente_id) cur.pacientes.add(a.paciente_id)
    cidMap.set(cidKey, cur)
  }
  const porCID = [...cidMap.values()]
    .map(r => ({ cid: r.cid, atestados: r.atestados, dias: r.dias, pacientes: r.pacientes.size }))
    .sort((a, b) => b.atestados - a.atestados)

  // Top pacientes (com CID principal)
  const pacAtMap = new Map<string, { nome: string; empresa: string; atestados: number; dias: number; cids: Map<string, number> }>()
  for (const a of ats) {
    if (!a.paciente_id) continue
    const p = pacMap.get(a.paciente_id) as any
    const cidKey = (a.cid ?? '').trim().toUpperCase() || '—'
    const cur = pacAtMap.get(a.paciente_id) ?? { nome: p?.nome ?? '—', empresa: '—', atestados: 0, dias: 0, cids: new Map() }
    cur.atestados++
    cur.dias += a.dias ?? 0
    cur.cids.set(cidKey, (cur.cids.get(cidKey) ?? 0) + 1)
    pacAtMap.set(a.paciente_id, cur)
  }
  const topPacientes = [...pacAtMap.values()]
    .sort((a, b) => b.atestados - a.atestados)
    .slice(0, 10)
    .map(p => ({
      nome: p.nome, empresa: p.empresa, atestados: p.atestados, dias: p.dias,
      cidPrincipal: [...p.cids.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
    }))

  return NextResponse.json({ kpis: { total, totalDias, mediaDias, pacientesUnicos }, porMes, porSexo, porMedico, porCID, topPacientes })
}
