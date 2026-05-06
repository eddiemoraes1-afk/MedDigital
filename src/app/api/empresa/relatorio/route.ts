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
    .select('id, nome, preco_mensalidade, preco_consulta')
    .eq('id', empresaId)
    .single()

  if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select('paciente_id, nome_completo, ativo')
    .eq('empresa_id', empresaId)

  const totalFuncionariosAtivos = vinculos?.filter(v => v.ativo).length ?? 0
  const pacienteIds = vinculos?.filter(v => v.paciente_id).map(v => v.paciente_id) ?? []

  const nomePaciente: Record<string, string> = {}
  vinculos?.forEach(v => { if (v.paciente_id) nomePaciente[v.paciente_id] = v.nome_completo })

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
      ? await adminSupabase.from('medicos').select('id, nome').in('id', medicoIdsSet)
      : { data: [] }
    medicos = medicosData ?? []

    const medicoMap: Record<string, string> = {}
    medicos.forEach(m => { medicoMap[m.id] = m.nome })

    const precoConsulta = empresa.preco_consulta ?? 0

    consultas = (atendimentos ?? []).map(a => ({
      id: a.id,
      data: a.finalizado_em ?? a.criado_em,
      tipo: a.agendamento_id ? 'agendada' : 'virtual',
      paciente_id: a.paciente_id,
      paciente_nome: nomePaciente[a.paciente_id] ?? 'Funcionário',
      medico_id: a.medico_id,
      medico_nome: medicoMap[a.medico_id] ?? 'Médico',
      valor_cobrado: a.valor_cobrado ?? precoConsulta,
    }))
  }

  return NextResponse.json({
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      preco_mensalidade: empresa.preco_mensalidade ?? 0,
      preco_consulta: empresa.preco_consulta ?? 0,
    },
    consultas,
    funcionariosAtivos: totalFuncionariosAtivos,
    pacientesAtivos: pacienteIds.length,
    medicos,
  })
}
