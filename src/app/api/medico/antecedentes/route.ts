import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Campos auditáveis de antecedentes
const CAMPOS = [
  'alergias', 'hpp', 'medicamentos_em_uso',
  'historia_familiar', 'historia_social',
  'comorbidades', 'antecedentes_cirurgicos',
  'imunizacoes', 'historico_ginecologico',
] as const

type CampoAntecedente = typeof CAMPOS[number]

interface DiffEntry {
  campo: string
  de:    string | null
  para:  string | null
}

/**
 * POST /api/medico/antecedentes
 * Salva antecedentes pessoais do paciente.
 * Registra diff em logs_antecedentes (médico, IP, campos alterados).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  // Captura IP do cliente
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
           ?? req.headers.get('x-real-ip')
           ?? null

  const { data: medico } = await admin
    .from('medicos')
    .select('id, status, nome, crm, crm_uf')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const {
    paciente_id, alergias, hpp, medicamentos_em_uso,
    historia_familiar, historia_social,
    comorbidades, antecedentes_cirurgicos, imunizacoes, historico_ginecologico,
  } = body

  if (!paciente_id) return NextResponse.json({ error: 'paciente_id obrigatório' }, { status: 400 })

  const novosValores: Record<CampoAntecedente, string | null> = {
    alergias:                alergias                 ?? null,
    hpp:                     hpp                      ?? null,
    medicamentos_em_uso:     medicamentos_em_uso      ?? null,
    historia_familiar:       historia_familiar        ?? null,
    historia_social:         historia_social          ?? null,
    comorbidades:            comorbidades             ?? null,
    antecedentes_cirurgicos: antecedentes_cirurgicos  ?? null,
    imunizacoes:             imunizacoes              ?? null,
    historico_ginecologico:  historico_ginecologico   ?? null,
  }

  // ── Buscar valores atuais para calcular diff ──────────────────────────────
  const { data: atual } = await admin
    .from('pacientes')
    .select('alergias, hpp, medicamentos_em_uso, historia_familiar, historia_social, comorbidades, antecedentes_cirurgicos, imunizacoes, historico_ginecologico')
    .eq('id', paciente_id)
    .single()

  // ── Atualizar paciente ────────────────────────────────────────────────────
  const { error } = await admin
    .from('pacientes')
    .update(novosValores)
    .eq('id', paciente_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Calcular diff e registrar log ─────────────────────────────────────────
  const diff: DiffEntry[] = []
  if (atual) {
    for (const campo of CAMPOS) {
      const de   = (atual as any)[campo] ?? null
      const para = novosValores[campo]   ?? null
      if (de !== para) {
        diff.push({ campo, de, para })
      }
    }
  }

  if (diff.length > 0) {
    await admin.from('logs_antecedentes').insert({
      paciente_id,
      medico_id:       medico.id,
      campos_alterados: diff,
      ip_address:      ip,
    })
  }

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/medico/antecedentes?paciente_id=...
 * Retorna histórico de edições de antecedentes de um paciente.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: medico } = await admin
    .from('medicos')
    .select('id, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const pacienteId = req.nextUrl.searchParams.get('paciente_id')
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id obrigatório' }, { status: 400 })

  const { data: logs } = await admin
    .from('logs_antecedentes')
    .select('id, criado_em, campos_alterados, ip_address, medicos(id, nome, crm, crm_uf, sexo)')
    .eq('paciente_id', pacienteId)
    .order('criado_em', { ascending: false })
    .limit(50)

  return NextResponse.json({ logs: logs ?? [] })
}
