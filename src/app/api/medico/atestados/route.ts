import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getMedico() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: medico } = await admin.from('medicos').select('id, status').eq('usuario_id', user.id).single()
  if (!medico || medico.status !== 'aprovado') return null
  return medico
}

// POST — criar atestado
export async function POST(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    paciente_id, atendimento_id, data_inicio, data_fim, dias, cid,
    texto_complementar, observacoes, tipo,
    hora_inicio, hora_fim, nome_acompanhante, relacao_acompanhante,
    cid_autorizado,
  } = body

  const tipoAtestado: 'afastamento' | 'comparecimento' | 'acompanhamento' = tipo || 'afastamento'

  if (!paciente_id || !data_inicio || !data_fim) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }
  if (tipoAtestado === 'afastamento' && !dias) {
    return NextResponse.json({ error: 'Dias de afastamento é obrigatório' }, { status: 400 })
  }
  if (tipoAtestado === 'comparecimento' && (!hora_inicio || !hora_fim)) {
    return NextResponse.json({ error: 'Hora de entrada e saída são obrigatórias' }, { status: 400 })
  }
  if (tipoAtestado === 'acompanhamento' && (!hora_inicio || !hora_fim || !nome_acompanhante || !relacao_acompanhante)) {
    return NextResponse.json({ error: 'Nome do acompanhante, relação e horários são obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Validação IDOR: atendimento_id deve pertencer a este médico e paciente ──
  if (atendimento_id) {
    const { data: atendimento } = await admin
      .from('atendimentos')
      .select('id, paciente_id, medico_id')
      .eq('id', atendimento_id)
      .maybeSingle()

    if (!atendimento) {
      return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 })
    }
    if (atendimento.paciente_id !== paciente_id) {
      return NextResponse.json(
        { error: 'Atendimento não pertence a este paciente' },
        { status: 403 }
      )
    }
    if (atendimento.medico_id !== medico.id) {
      return NextResponse.json(
        { error: 'Não autorizado: o atendimento foi realizado por outro médico' },
        { status: 403 }
      )
    }
  }

  // ── Verificação server-side de autorização de CID (LGPD / Art. 11) ──────────
  // Se o CID foi enviado, verificar se o paciente negou explicitamente a autorização.
  // Impede que chamadas diretas à API gravem CID após o paciente ter negado.
  let cidFinal: string | null = cid || null
  let cidAutorizadoFinal: boolean | null = cid_autorizado ?? null

  if (cidFinal && atendimento_id) {
    const { data: autorizacao } = await admin
      .from('autorizacoes_cid')
      .select('status')
      .eq('atendimento_id', atendimento_id)
      .eq('cid', cidFinal)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (autorizacao?.status === 'negado') {
      // Paciente negou explicitamente — nunca gravar o CID
      cidFinal = null
      cidAutorizadoFinal = false
    } else if (autorizacao?.status === 'autorizado') {
      // Confirmação server-side de autorização
      cidAutorizadoFinal = true
    }
    // Se não há registro de autorização: CID não-sensível, segue normalmente
  }

  // Buscar empresa vinculada ao paciente
  const { data: pac } = await admin.from('pacientes').select('cpf').eq('id', paciente_id).single()
  let empresa_id: string | null = null
  if (pac?.cpf) {
    const { data: vinculo } = await admin.from('vinculos_empresa').select('empresa_id').eq('cpf', pac.cpf).maybeSingle()
    empresa_id = vinculo?.empresa_id ?? null
  }

  const { data, error } = await admin.from('atestados').insert({
    paciente_id,
    medico_id: medico.id,
    atendimento_id: atendimento_id || null,
    empresa_id,
    data_emissao: new Date().toISOString().split('T')[0],
    data_inicio,
    data_fim,
    dias: dias || 1,
    cid: cidFinal,
    texto_complementar: texto_complementar || null,
    observacoes: observacoes || null,
    tipo: tipoAtestado,
    hora_inicio: hora_inicio || null,
    hora_fim: hora_fim || null,
    nome_acompanhante: nome_acompanhante || null,
    relacao_acompanhante: relacao_acompanhante || null,
    cid_autorizado: cidAutorizadoFinal,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ atestado: data })
}

// GET — listar atestados de um paciente
export async function GET(req: NextRequest) {
  const medico = await getMedico()
  if (!medico) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const paciente_id = searchParams.get('paciente_id')
  if (!paciente_id) return NextResponse.json({ error: 'paciente_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('atestados')
    .select('*, medicos(nome, crm, crm_uf, especialidade, sexo)')
    .eq('paciente_id', paciente_id)
    .order('criado_em', { ascending: false })

  return NextResponse.json({ atestados: data ?? [] })
}
