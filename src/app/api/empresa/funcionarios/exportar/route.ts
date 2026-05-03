import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function verificarEmpresa(empresaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis_sistema')
    .select('role, empresa_id')
    .eq('usuario_id', user.id)
    .single()
  return perfil?.role === 'admin' || (perfil?.role === 'empresa' && perfil?.empresa_id === empresaId)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const empresaId = searchParams.get('empresa_id') ?? ''
  const departamento = searchParams.get('departamento') ?? ''
  const status = searchParams.get('status') ?? ''

  const ok = await verificarEmpresa(empresaId)
  if (!ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const adminSupabase = createAdminClient()

  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select('id, nome_completo, cpf, cargo, departamento, email, ativo, paciente_id, data_admissao')
    .eq('empresa_id', empresaId)
    .order('nome_completo')

  const pacienteIds = vinculos?.filter(v => v.paciente_id).map(v => v.paciente_id) ?? []

  let consultasPorPaciente: Record<string, { total: number; ultima: string | null }> = {}
  if (pacienteIds.length > 0) {
    const { data: consultas } = await adminSupabase
      .from('agendamentos')
      .select('paciente_id, data_hora')
      .in('paciente_id', pacienteIds)
      .neq('status', 'cancelado')
      .order('data_hora', { ascending: false })

    consultas?.forEach(c => {
      if (!consultasPorPaciente[c.paciente_id]) {
        consultasPorPaciente[c.paciente_id] = { total: 0, ultima: null }
      }
      consultasPorPaciente[c.paciente_id].total++
      if (!consultasPorPaciente[c.paciente_id].ultima) {
        consultasPorPaciente[c.paciente_id].ultima = c.data_hora
      }
    })
  }

  // Aplicar filtros
  let lista = (vinculos ?? []).filter(v => {
    if (departamento && v.departamento !== departamento) return false
    if (status === 'ativo' && !v.paciente_id) return false
    if (status === 'inativo' && v.paciente_id) return false
    return true
  })

  // @ts-ignore
  const xlsx = await import('xlsx')

  const linhas = lista.map(v => {
    const saude = v.paciente_id ? (consultasPorPaciente[v.paciente_id] ?? { total: 0, ultima: null }) : null
    return {
      'Nome': v.nome_completo,
      'CPF': v.cpf ?? '',
      'E-mail': v.email ?? '',
      'Cargo': v.cargo ?? '',
      'Departamento': v.departamento ?? '',
      'Admissão': v.data_admissao ?? '',
      'Status na plataforma': v.paciente_id ? 'Ativo' : 'Não ativou',
      'Total de consultas': saude?.total ?? 0,
      'Última consulta': saude?.ultima
        ? new Date(saude.ultima + (saude.ultima.endsWith('Z') ? '' : 'Z'))
            .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : '—',
    }
  })

  const ws = xlsx.utils.json_to_sheet(linhas)
  ws['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
    { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
  ]
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Funcionários')

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="saude_corporativa_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
