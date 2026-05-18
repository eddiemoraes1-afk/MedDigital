import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const { searchParams } = new URL(req.url)
  const de = searchParams.get('de') ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const ate = searchParams.get('ate') ?? new Date().toISOString().split('T')[0]

  const adminSupabase = createAdminClient()

  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('id, nome, preco_mensalidade, preco_consulta, percentual_coparticipacao, preco_receita')
    .eq('id', empresaId)
    .single()

  if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select('id, paciente_id, nome_completo, ativo, titular_id, relacao, cargo, departamento, registro_funcional')
    .eq('empresa_id', empresaId)

  const totalFuncionariosAtivos = vinculos?.filter(v => v.ativo).length ?? 0
  const pacienteIds = vinculos?.filter(v => v.paciente_id).map(v => v.paciente_id) ?? []

  // Maps para lookup rápido
  const vinculoByPacienteId: Record<string, any> = {}
  const vinculoById: Record<string, any> = {}
  // Map registro_funcional → vinculo do FUNCIONÁRIO TITULAR (para fallback quando titular_id é nulo)
  const registroFuncTitularMap: Record<string, any> = {}
  vinculos?.forEach(v => {
    if (v.paciente_id) vinculoByPacienteId[v.paciente_id] = v
    if (v.id) vinculoById[v.id] = v
  })

  function classRelacaoLocal(rel: string | null | undefined): 'Funcionário' | 'Dependente' {
    if (!rel) return 'Funcionário'
    const v = rel.trim().toLowerCase()
    return v === 'funcionário' || v === 'funcionario' ? 'Funcionário' : 'Dependente'
  }

  // Monta mapa registro_funcional → vinculo titular (somente funcionários)
  vinculos?.forEach(v => {
    if (v.registro_funcional && classRelacaoLocal(v.relacao) === 'Funcionário') {
      registroFuncTitularMap[v.registro_funcional] = v
    }
  })

  // Resolve o vínculo do titular de um vinculo qualquer
  function resolverTitularVinculo(v: any): any {
    if (!v) return null
    const eDep = classRelacaoLocal(v.relacao) === 'Dependente'
    if (!eDep) return v // próprio é o titular
    // 1ª opção: titular_id explícito
    if (v.titular_id && vinculoById[v.titular_id]) return vinculoById[v.titular_id]
    // 2ª opção: mesmo registro_funcional de um funcionário
    if (v.registro_funcional && registroFuncTitularMap[v.registro_funcional]) {
      return registroFuncTitularMap[v.registro_funcional]
    }
    return null // titular desconhecido
  }

  // Receitas emitidas no período para pacientes desta empresa
  const deISO_base = `${de}T00:00:00.000Z`
  const ateISO_base = `${ate}T23:59:59.999Z`
  const { data: receitasData } = pacienteIds.length > 0
    ? await adminSupabase
        .from('receitas')
        .select('id, paciente_id, atendimento_id, valor_cobrado, valor_coparticipacao, criado_em, status, observacao')
        .in('paciente_id', pacienteIds)
        .eq('status', 'emitida')
        .gte('criado_em', deISO_base)
        .lte('criado_em', ateISO_base)
        .order('criado_em', { ascending: false })
    : { data: [] }

  const precoReceita     = empresa.preco_receita ?? 0
  const percentualCopart = empresa.percentual_coparticipacao ?? 0

  const receitas = (receitasData ?? []).map((r: any) => {
    // Renovação: atendimento_id é null (não foi emitida dentro de uma consulta)
    // Em consulta: atendimento_id preenchido → sem custo para a empresa
    const isRenovacao = r.atendimento_id === null || r.atendimento_id === undefined

    const vinculo        = vinculos?.find((v: any) => v.paciente_id === r.paciente_id)
    const eDependente    = classRelacaoLocal(vinculo?.relacao) === 'Dependente'
    const titularVinculo = eDependente ? resolverTitularVinculo(vinculo) : vinculo
    const titularNome    = titularVinculo?.nome_completo ?? vinculo?.nome_completo ?? '—'
    const titularId      = titularVinculo?.id ?? vinculo?.id ?? null

    // Só renovações têm custo; receitas de consulta = R$ 0,00
    const valorCobrado = isRenovacao
      ? (r.valor_cobrado != null && r.valor_cobrado > 0 ? r.valor_cobrado : precoReceita)
      : 0
    const valorCoparticipacao = isRenovacao && percentualCopart > 0
      ? Math.round(valorCobrado * (percentualCopart / 100) * 100) / 100
      : 0

    return {
      id: r.id,
      data: r.criado_em,
      paciente_id: r.paciente_id,
      paciente_nome: vinculo?.nome_completo ?? '—',
      relacao: vinculo?.relacao ?? 'Funcionário',
      e_dependente: eDependente,
      titular_id: titularId,
      titular_nome: titularNome,
      is_renovacao: isRenovacao,
      valor_cobrado: valorCobrado,
      valor_coparticipacao: valorCoparticipacao,
      observacao: r.observacao ?? null,
    }
  })

  let consultas: any[] = []
  let medicos: any[] = []

  if (pacienteIds.length > 0) {
    const deISO = `${de}T00:00:00.000Z`
    const ateISO = `${ate}T23:59:59.999Z`

    const { data: atendimentos } = await adminSupabase
      .from('atendimentos')
      .select('id, criado_em, finalizado_em, paciente_id, medico_id, agendamento_id, valor_cobrado')
      .in('paciente_id', pacienteIds)
      .eq('status', 'concluido')
      .gte('criado_em', deISO)
      .lte('criado_em', ateISO)
      .order('criado_em', { ascending: false })

    const medicoIdsSet = [...new Set((atendimentos ?? []).map(a => a.medico_id).filter(Boolean))]
    const { data: medicosData } = medicoIdsSet.length > 0
      ? await adminSupabase.from('medicos').select('id, nome, sexo').in('id', medicoIdsSet)
      : { data: [] }
    medicos = medicosData ?? []

    const medicoMap: Record<string, { nome: string; sexo: string | null }> = {}
    medicos.forEach(m => { medicoMap[m.id] = { nome: m.nome, sexo: m.sexo ?? null } })

    const precoConsulta = empresa.preco_consulta ?? 0
    const percentualCopart = empresa.percentual_coparticipacao ?? 0

    consultas = (atendimentos ?? []).map(a => {
      const vinculo = vinculoByPacienteId[a.paciente_id]
      // e_dependente: baseado apenas na relação, não exige titular_id preenchido
      const eDependente = classRelacaoLocal(vinculo?.relacao) === 'Dependente'
      const titularVinculo = eDependente ? resolverTitularVinculo(vinculo) : vinculo
      // Se dependente mas titular não encontrado, o próprio nome é exibido como fallback
      const titularNome = titularVinculo?.nome_completo ?? vinculo?.nome_completo ?? '—'
      const titularRegistro = titularVinculo?.registro_funcional ?? null
      const titularId = titularVinculo?.id ?? vinculo?.id ?? null

      const valorCobrado = precoConsulta
      return {
        id: a.id,
        data: a.finalizado_em ?? a.criado_em,
        tipo: a.agendamento_id ? 'agendada' : 'virtual',
        paciente_id: a.paciente_id,
        paciente_nome: vinculo?.nome_completo ?? '—',
        relacao: vinculo?.relacao ?? 'Funcionário',
        e_dependente: eDependente,
        titular_id: titularId,
        titular_nome: titularNome,
        titular_registro: titularRegistro,
        medico_id: a.medico_id,
        medico_nome: medicoMap[a.medico_id]?.nome ?? 'Médico',
        medico_sexo: medicoMap[a.medico_id]?.sexo ?? null,
        valor_cobrado: valorCobrado,
        valor_coparticipacao: percentualCopart > 0
          ? Math.round(valorCobrado * (percentualCopart / 100) * 100) / 100
          : 0,
      }
    })
  }

  return NextResponse.json({
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      preco_mensalidade: empresa.preco_mensalidade ?? 0,
      preco_consulta: empresa.preco_consulta ?? 0,
      percentual_coparticipacao: empresa.percentual_coparticipacao ?? 0,
      preco_receita: empresa.preco_receita ?? 0,
    },
    consultas,
    receitas,
    funcionariosAtivos: totalFuncionariosAtivos,
    pacientesAtivos: pacienteIds.length,
    medicos,
  })
}
