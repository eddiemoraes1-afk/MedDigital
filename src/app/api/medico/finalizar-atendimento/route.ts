import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/medico/finalizar-atendimento
 * Conclui um atendimento e registra o valor_cobrado baseado no preço da empresa do paciente.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const {
    atendimento_id,
    notas_medico,
    queixa_principal,
    hda,
    exame_fisico,
    sinais_vitais,
    hipotese_diag,
    cid,
    plano_terapeutico,
    evolucao,
  } = body

  if (!atendimento_id) return NextResponse.json({ error: 'atendimento_id obrigatório' }, { status: 400 })

  const adminSupabase = createAdminClient()

  // Buscar atendimento
  const { data: atendimento } = await adminSupabase
    .from('atendimentos')
    .select('id, paciente_id, agendamento_id, medico_id')
    .eq('id', atendimento_id)
    .single()

  if (!atendimento) return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 })

  // Calcular valor_cobrado: buscar empresa do paciente
  let valorCobrado: number | null = null

  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('cpf')
    .eq('id', atendimento.paciente_id)
    .single()

  if (paciente?.cpf) {
    const { data: vinculo } = await adminSupabase
      .from('vinculos_empresa')
      .select('empresa_id')
      .eq('cpf', paciente.cpf)
      .maybeSingle()

    if (vinculo?.empresa_id) {
      const { data: empresa } = await adminSupabase
        .from('empresas')
        .select('preco_consulta')
        .eq('id', vinculo.empresa_id)
        .single()

      if (empresa?.preco_consulta != null) {
        valorCobrado = empresa.preco_consulta
      }
    }
  }

  // Atualizar atendimento
  const updateData: any = {
    status: 'concluido',
    finalizado_em: new Date().toISOString(),
    ...(notas_medico         !== undefined && { notas_medico }),
    ...(queixa_principal     !== undefined && { queixa_principal }),
    ...(hda                  !== undefined && { hda }),
    ...(exame_fisico         !== undefined && { exame_fisico }),
    ...(sinais_vitais        !== undefined && { sinais_vitais }),
    ...(hipotese_diag        !== undefined && { hipotese_diag }),
    ...(cid                  !== undefined && { cid }),
    ...(plano_terapeutico    !== undefined && { plano_terapeutico }),
    ...(evolucao             !== undefined && { evolucao }),
    ...(valorCobrado !== null && { valor_cobrado: valorCobrado }),
  }

  const { error } = await adminSupabase
    .from('atendimentos')
    .update(updateData)
    .eq('id', atendimento_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se houver agendamento vinculado, marcá-lo como concluído
  if (atendimento.agendamento_id) {
    await adminSupabase
      .from('agendamentos')
      .update({ status: 'concluido' })
      .eq('id', atendimento.agendamento_id)
  }

  return NextResponse.json({ ok: true, valor_cobrado: valorCobrado })
}
