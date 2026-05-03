import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data: perfil } = await admin.from('perfis_sistema').select('role').eq('usuario_id', user.id).single()
  return perfil?.role === 'admin'
}

async function buscarDados(empresaId?: string, tipo?: string, consultas?: string) {
  const adminSupabase = createAdminClient()

  const { data: todosPacientes } = await adminSupabase
    .from('pacientes')
    .select('id, nome, cpf, telefone, convenio, criado_em, agendamentos(count)')
    .order('nome')

  const cpfs = todosPacientes?.map(p => p.cpf).filter(Boolean) ?? []
  const { data: vinculos } = cpfs.length > 0
    ? await adminSupabase.from('vinculos_empresa').select('cpf, empresa_id, cargo, departamento, empresas(id, nome)').in('cpf', cpfs)
    : { data: [] }

  const vinculoMap: Record<string, any> = {}
  vinculos?.forEach(v => { if (v.cpf) vinculoMap[v.cpf] = v })

  return (todosPacientes ?? []).filter(p => {
    const vinculo = p.cpf ? vinculoMap[p.cpf] : null
    const total = p.agendamentos?.[0]?.count ?? 0
    if (empresaId === 'particular') { if (vinculo) return false }
    else if (empresaId) { if (!vinculo || (vinculo.empresas as any)?.id !== empresaId) return false }
    if (tipo === 'vinculado' && !vinculo) return false
    if (tipo === 'particular' && vinculo) return false
    if (consultas === 'sim' && total === 0) return false
    if (consultas === 'nao' && total > 0) return false
    return true
  }).map(p => ({
    paciente: p,
    vinculo: p.cpf ? vinculoMap[p.cpf] : null,
    totalConsultas: p.agendamentos?.[0]?.count ?? 0,
  }))
}

export async function GET(request: NextRequest) {
  const ok = await verificarAdmin()
  if (!ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const formato = searchParams.get('formato') ?? 'xlsx'
  const empresaId = searchParams.get('empresa_id') ?? undefined
  const tipo = searchParams.get('tipo') ?? undefined
  const consultas = searchParams.get('consultas') ?? undefined

  const dados = await buscarDados(empresaId, tipo, consultas)

  if (formato === 'xlsx') {
    // @ts-ignore
    const xlsx = await import('xlsx')
    const linhas = dados.map(({ paciente: p, vinculo, totalConsultas }) => ({
      'Nome': p.nome,
      'CPF': p.cpf ?? '',
      'Telefone': p.telefone ?? '',
      'Convênio': p.convenio ?? '',
      'Empresa': (vinculo?.empresas as any)?.nome ?? 'Particular',
      'Cargo': vinculo?.cargo ?? '',
      'Departamento': vinculo?.departamento ?? '',
      'Consultas': totalConsultas,
      'Cadastro': new Date(p.criado_em).toLocaleDateString('pt-BR'),
    }))

    const ws = xlsx.utils.json_to_sheet(linhas)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Pacientes')

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
      { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 14 },
    ]

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pacientes_${new Date().toISOString().slice(0,10)}.xlsx"`,
      },
    })
  }

  if (formato === 'pdf') {
    const dataStr = new Date().toLocaleDateString('pt-BR')
    const linhas = dados.map(({ paciente: p, vinculo, totalConsultas }) => `
      <tr>
        <td>${p.nome}</td>
        <td>${p.cpf ?? '—'}</td>
        <td>${p.telefone ?? '—'}</td>
        <td>${(vinculo?.empresas as any)?.nome ?? 'Particular'}</td>
        <td>${vinculo?.cargo ?? '—'}</td>
        <td style="text-align:center">${totalConsultas}</td>
        <td>${new Date(p.criado_em).toLocaleDateString('pt-BR')}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório de Pacientes — MedDigital</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #222; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1A3A5C; }
    .logo { font-size: 18px; font-weight: bold; color: #1A3A5C; }
    .meta { font-size: 10px; color: #666; text-align: right; }
    h2 { font-size: 14px; color: #1A3A5C; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1A3A5C; color: white; padding: 7px 8px; text-align: left; font-size: 10px; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f8f9fa; }
    .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">❤ MedDigital</div>
    <div class="meta">
      <div>Relatório de Pacientes</div>
      <div>Gerado em ${dataStr}</div>
      <div>${dados.length} registro(s)</div>
    </div>
  </div>
  <h2>Lista de Pacientes</h2>
  <table>
    <thead>
      <tr>
        <th>Nome</th><th>CPF</th><th>Telefone</th><th>Empresa</th>
        <th>Cargo</th><th>Consultas</th><th>Cadastro</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="footer">MedDigital — Relatório gerado automaticamente</div>
  <script>window.onload = () => { window.print() }</script>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
}
