import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') || 'simples'

  const admin = createAdminClient()

  const { data: paciente } = await admin
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) {
    return NextResponse.json({ elegivel: false, motivo: 'sem_historico', totalConsultas: 0, totalReceitas: 0 })
  }

  // Busca paralela: consultas concluídas + receitas do tipo solicitado
  const [consultasRes, receitasRes] = await Promise.all([
    admin
      .from('atendimentos')
      .select('id')
      .eq('paciente_id', paciente.id)
      .eq('status', 'concluido')
      .limit(1),

    admin
      .from('receitas')
      .select('id, medicamentos, instrucoes, data_emissao, medicos(nome, sexo)')
      .eq('paciente_id', paciente.id)
      .eq('tipo', tipo)
      .order('data_emissao', { ascending: false })
      .limit(3),
  ])

  const totalConsultas = consultasRes.data?.length ?? 0
  const receitas       = receitasRes.data ?? []
  const totalReceitas  = receitas.length

  // Sem nenhuma consulta E sem nenhuma receita: completamente sem histórico
  if (totalConsultas === 0 && totalReceitas === 0) {
    return NextResponse.json({ elegivel: false, motivo: 'sem_historico', totalConsultas, totalReceitas })
  }

  // Tem consultas mas não tem receita desse tipo
  if (totalReceitas === 0) {
    return NextResponse.json({ elegivel: false, motivo: 'sem_receita_tipo', totalConsultas, totalReceitas })
  }

  // Elegível: retorna a receita mais recente do tipo
  const ultima = receitas[0]
  return NextResponse.json({
    elegivel: true,
    ultimaReceita: {
      id:           ultima.id,
      medicamentos: ultima.medicamentos,
      instrucoes:   ultima.instrucoes ?? '',
      data_emissao: ultima.data_emissao,
      medico_nome:  (ultima.medicos as any)?.nome ?? 'Médico',
      medico_sexo:  (ultima.medicos as any)?.sexo ?? null,
    },
    todasReceitas: receitas.map(r => ({
      id:           r.id,
      medicamentos: r.medicamentos,
      instrucoes:   r.instrucoes ?? '',
      data_emissao: r.data_emissao,
      medico_nome:  (r.medicos as any)?.nome ?? 'Médico',
      medico_sexo:  (r.medicos as any)?.sexo ?? null,
    })),
    totalConsultas,
    totalReceitas,
  })
}
