import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const admin = createAdminClient()

  const { data: atestados } = await admin
    .from('atestados')
    .select('id, paciente_id, medico_id, data_emissao, data_inicio, data_fim, dias, cid, criado_em')
    .eq('empresa_id', empresaId)
    .order('criado_em', { ascending: false })

  const ats = (atestados ?? []) as any[]

  // Buscar vínculos desta empresa
  const { data: vinculos } = await admin
    .from('vinculos_empresa')
    .select('paciente_id, cpf, nome_completo, cargo, tipo_cargo, departamento, relacao')
    .eq('empresa_id', empresaId)

  const vinculoByPaciente = new Map<string, any>()
  for (const v of (vinculos ?? []) as any[]) {
    if (v.paciente_id) vinculoByPaciente.set(v.paciente_id, v)
  }

  // Buscar pacientes
  const pacIds = [...new Set(ats.map(a => a.paciente_id).filter(Boolean))]
  const { data: pacientes } = pacIds.length > 0
    ? await admin.from('pacientes').select('id, nome, sexo').in('id', pacIds)
    : { data: [] }
  const pacMap = new Map((pacientes ?? []).map((p: any) => [p.id, p]))

  if (ats.length === 0) {
    return NextResponse.json({
      kpis: { total: 0, totalDias: 0, mediaDias: 0, funcionariosComAtestado: 0 },
      porMes: [], porSexo: [], porSecretaria: [], porCargo: [], porRelacao: [], topFuncionarios: [],
    })
  }

  // KPIs
  const total = ats.length
  const totalDias = ats.reduce((s: number, a: any) => s + (a.dias ?? 0), 0)
  const mediaDias = total > 0 ? Math.round((totalDias / total) * 10) / 10 : 0
  const funcionariosComAtestado = new Set(ats.map(a => a.paciente_id)).size

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

  function agg(key: string, label: (a: any) => string) {
    const map = new Map<string, { label: string; atestados: number; dias: number }>()
    for (const a of ats) {
      const v = vinculoByPaciente.get(a.paciente_id)
      const lbl = label(v) || 'Não informado'
      const cur = map.get(lbl) ?? { label: lbl, atestados: 0, dias: 0 }
      cur.atestados++; cur.dias += a.dias ?? 0
      map.set(lbl, cur)
    }
    return [...map.values()].sort((a, b) => b.atestados - a.atestados)
  }

  const porSexo = (() => {
    const map = new Map<string, { atestados: number; dias: number }>()
    for (const a of ats) {
      const p = pacMap.get(a.paciente_id) as any
      const s = p?.sexo === 'masculino' ? 'Masculino' : p?.sexo === 'feminino' ? 'Feminino' : 'Não informado'
      const cur = map.get(s) ?? { atestados: 0, dias: 0 }
      cur.atestados++; cur.dias += a.dias ?? 0
      map.set(s, cur)
    }
    return [...map.entries()].map(([sexo, v]) => ({ sexo, ...v }))
  })()

  const porSecretaria = agg('departamento', v => v?.departamento).map(r => ({ secretaria: r.label, ...r }))
  const porCargo = agg('cargo', v => v?.cargo).map(r => ({ cargo: r.label, ...r }))
  const porRelacao = agg('relacao', v => v?.relacao).map(r => ({ relacao: r.label, ...r }))

  // Por CID
  const cidMap = new Map<string, { cid: string; atestados: number; dias: number; funcionarios: Set<string> }>()
  for (const a of ats) {
    const cidKey = (a.cid ?? 'Não informado').trim().toUpperCase() || 'Não informado'
    const cur = cidMap.get(cidKey) ?? { cid: cidKey, atestados: 0, dias: 0, funcionarios: new Set() }
    cur.atestados++
    cur.dias += a.dias ?? 0
    if (a.paciente_id) cur.funcionarios.add(a.paciente_id)
    cidMap.set(cidKey, cur)
  }
  const porCID = [...cidMap.values()]
    .map(r => ({ cid: r.cid, atestados: r.atestados, dias: r.dias, funcionarios: r.funcionarios.size }))
    .sort((a, b) => b.atestados - a.atestados)

  // CID mais frequente por secretaria
  const secretariaCIDMap = new Map<string, Map<string, number>>()
  for (const a of ats) {
    const v = vinculoByPaciente.get(a.paciente_id)
    const sec = v?.departamento || 'Não informado'
    const cidKey = (a.cid ?? 'Não informado').trim().toUpperCase() || 'Não informado'
    if (!secretariaCIDMap.has(sec)) secretariaCIDMap.set(sec, new Map())
    const inner = secretariaCIDMap.get(sec)!
    inner.set(cidKey, (inner.get(cidKey) ?? 0) + 1)
  }
  const cidPorSecretaria = [...secretariaCIDMap.entries()].map(([secretaria, cidCounts]) => {
    const topCID = [...cidCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cid, n]) => ({ cid, n }))
    return { secretaria, topCID }
  })

  // Top funcionários (com CID mais frequente)
  const funcMap = new Map<string, { nome: string; cargo: string; secretaria: string; atestados: number; dias: number; cids: Map<string, number> }>()
  for (const a of ats) {
    if (!a.paciente_id) continue
    const v = vinculoByPaciente.get(a.paciente_id)
    const p = pacMap.get(a.paciente_id) as any
    const nome = v?.nome_completo ?? p?.nome ?? '—'
    const cidKey = (a.cid ?? '').trim().toUpperCase() || '—'
    const cur = funcMap.get(a.paciente_id) ?? { nome, cargo: v?.cargo ?? '—', secretaria: v?.departamento ?? '—', atestados: 0, dias: 0, cids: new Map() }
    cur.atestados++
    cur.dias += a.dias ?? 0
    cur.cids.set(cidKey, (cur.cids.get(cidKey) ?? 0) + 1)
    funcMap.set(a.paciente_id, cur)
  }
  const topFuncionarios = [...funcMap.values()]
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 10)
    .map(f => ({
      nome: f.nome, cargo: f.cargo, secretaria: f.secretaria,
      atestados: f.atestados, dias: f.dias,
      cidPrincipal: [...f.cids.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
    }))

  return NextResponse.json({ kpis: { total, totalDias, mediaDias, funcionariosComAtestado }, porMes, porSexo, porSecretaria, porCargo, porRelacao, porCID, cidPorSecretaria, topFuncionarios })
}
