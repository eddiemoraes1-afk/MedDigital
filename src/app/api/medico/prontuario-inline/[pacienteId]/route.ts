import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { pacienteId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { pacienteId } = params

  const [
    { data: paciente },
    { data: triagens },
    { data: atendimentos },
    { data: atestados },
    { data: receitas },
    { data: exames },
    { data: exclusoes },
  ] = await Promise.all([
    admin.from('pacientes')
      .select('id, nome, cpf, telefone, data_nascimento, sexo, alergias, hpp, medicamentos_em_uso, historia_familiar, historia_social')
      .eq('id', pacienteId)
      .single(),

    admin.from('triagens')
      .select('id, classificacao_risco, resumo_ia, sintomas, criado_em')
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false })
      .limit(8),

    admin.from('atendimentos')
      .select(`
        id, criado_em, finalizado_em, status,
        notas_medico, queixa_principal, hda, exame_fisico,
        hipotese_diag, cid, plano_terapeutico, evolucao,
        medicos(nome, especialidade)
      `)
      .eq('paciente_id', pacienteId)
      .eq('status', 'concluido')
      .order('criado_em', { ascending: false })
      .limit(10),

    admin.from('atestados')
      .select('id, data_emissao, dias, cid, data_inicio, data_fim, criado_em, medicos(nome)')
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false })
      .limit(10),

    admin.from('receitas')
      .select('id, criado_em, status, observacao, validade, medicos(nome)')
      .eq('paciente_id', pacienteId)
      .eq('status', 'emitida')
      .order('criado_em', { ascending: false })
      .limit(10),

    admin.from('solicitacoes_exames')
      .select('id, data_solicitacao, exames, urgencia, indicacao_clinica, criado_em, medicos(nome)')
      .eq('paciente_id', pacienteId)
      .order('data_solicitacao', { ascending: false })
      .limit(10),

    admin.from('exclusoes_telemedicina')
      .select('id, criado_em, status, motivos, conduta, medicos(nome)')
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    paciente: paciente ?? null,
    triagens: triagens ?? [],
    atendimentos: atendimentos ?? [],
    atestados: atestados ?? [],
    receitas: receitas ?? [],
    exames: exames ?? [],
    exclusoes: exclusoes ?? [],
  })
}
