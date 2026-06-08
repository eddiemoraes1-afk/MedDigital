import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getMedico() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: medico } = await admin
    .from('medicos')
    .select('id, status, nome, crm, crm_uf, especialidade')
    .eq('usuario_id', user.id)
    .single()
  if (!medico || medico.status !== 'aprovado') return null
  return medico
}

// POST — criar receita
export async function POST(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    paciente_id, atendimento_id, tipo, tem_controlado, medicamentos, instrucoes, observacoes,
    validade, data_emissao,
    valor_cobrado, valor_medico, valor_coparticipacao,
  } = body

  if (!paciente_id || !medicamentos?.trim()) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  // ── Validação server-side: medicamento controlado não pode ter receita simples ──
  // Camada 1: flag explícita enviada pelo front (detectada pelo autocomplete)
  if (tem_controlado && tipo === 'simples') {
    return NextResponse.json(
      { error: 'Medicamentos controlados exigem Receita de Controle Especial ou Receita Antimicrobiana. Receita Simples não é permitida.' },
      { status: 400 }
    )
  }
  // Camada 2: verificação por palavras-chave (defesa em profundidade)
  const CONTROLADOS_KEYWORDS = [
    'tramadol', 'codeína', 'morfina', 'alprazolam', 'clonazepam',
    'diazepam', 'lorazepam', 'bromazepam', 'zolpidem', 'fenobarbital',
    'metilfenidato', 'lisdexanfetamina',
  ]
  const medLower = (medicamentos as string).toLowerCase()
  if (tipo === 'simples' && CONTROLADOS_KEYWORDS.some(k => medLower.includes(k))) {
    return NextResponse.json(
      { error: 'Medicamento controlado identificado na prescrição. Receita Simples não é permitida — use Receita de Controle Especial.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Buscar empresa vinculada ao paciente
  const { data: pac } = await admin.from('pacientes').select('cpf').eq('id', paciente_id).single()
  let empresa_id: string | null = null
  if (pac?.cpf) {
    const { data: vinculo } = await admin
      .from('vinculos_empresa')
      .select('empresa_id')
      .eq('cpf', pac.cpf)
      .maybeSingle()
    empresa_id = vinculo?.empresa_id ?? null
  }

  const { data, error } = await admin.from('receitas').insert({
    paciente_id,
    medico_id: medico.id,
    atendimento_id: atendimento_id || null,
    empresa_id,
    tipo: tipo ?? 'simples',
    medicamentos: medicamentos.trim(),
    instrucoes: instrucoes?.trim() || null,
    observacoes: observacoes?.trim() || null,
    validade: validade || null,
    data_emissao: data_emissao ?? new Date().toISOString().split('T')[0],
    status: 'emitida',
    valor_cobrado:        valor_cobrado        != null ? Number(valor_cobrado)        : 0,
    valor_medico:         valor_medico         != null ? Number(valor_medico)         : null,
    valor_coparticipacao: valor_coparticipacao != null ? Number(valor_coparticipacao) : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ receita: data })
}

// GET — listar receitas de um paciente
export async function GET(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const paciente_id = searchParams.get('paciente_id')
  if (!paciente_id) return NextResponse.json({ error: 'paciente_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('receitas')
    .select('*, medicos(id, nome, crm, crm_uf, especialidade)')
    .eq('paciente_id', paciente_id)
    .order('criado_em', { ascending: false })

  return NextResponse.json({ receitas: data ?? [] })
}
