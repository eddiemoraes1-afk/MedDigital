import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Heart, Building2, LogOut, Users, Calendar,
  TrendingUp, Activity, CheckCircle2, Clock
} from 'lucide-react'

export default async function EmpresaDashboardPage() {
  const perfil = await requireEmpresa()
  const adminSupabase = createAdminClient()

  const empresaId = perfil.empresaId!

  // Dados da empresa
  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('nome, cnpj')
    .eq('id', empresaId)
    .single()

  // Funcionários
  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select(`
      id, nome_completo, cpf, cargo, departamento,
      email, ativo, paciente_id
    `)
    .eq('empresa_id', empresaId)
    .order('nome_completo', { ascending: true })

  const totalAtivos = vinculos?.filter(v => v.ativo).length ?? 0
  const totalVinculados = vinculos?.filter(v => v.paciente_id).length ?? 0

  // Agendamentos dos funcionários vinculados
  const pacienteIds = vinculos?.filter(v => v.paciente_id).map(v => v.paciente_id) ?? []

  let agendamentosRecentes: any[] = []
  let totalConsultasMes = 0

  if (pacienteIds.length > 0) {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const { data: ags } = await adminSupabase
      .from('agendamentos')
      .select('id, data_hora, status, paciente_id')
      .in('paciente_id', pacienteIds)
      .neq('status', 'cancelado')
      .order('data_hora', { ascending: false })
      .limit(10)

    agendamentosRecentes = ags ?? []

    const { count } = await adminSupabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .in('paciente_id', pacienteIds)
      .gte('data_hora', inicioMes.toISOString())
      .neq('status', 'cancelado')

    totalConsultasMes = count ?? 0
  }

  // Mapear paciente_id → nome do funcionário
  const mapPaciente: Record<string, string> = {}
  vinculos?.forEach(v => {
    if (v.paciente_id) mapPaciente[v.paciente_id] = v.nome_completo
  })

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <div>
              <span className="font-bold">MedDigital</span>
              <span className="text-xs text-blue-300 ml-2">Portal RH</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> {empresa?.nome}
            </span>
            <Link href="/api/auth/signout" className="text-sm text-blue-300 hover:text-white flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Sair
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A3A5C]">Painel de Saúde Corporativa</h1>
          <p className="text-gray-500 text-sm mt-1">{empresa?.nome} · {empresa?.cnpj || 'CNPJ não informado'}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-[#2E75B6]" />
              <span className="text-xs text-gray-400">funcionários</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalAtivos}</p>
            <p className="text-xs text-gray-500 mt-1">ativos</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-xs text-gray-400">vinculados</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalVinculados}</p>
            <p className="text-xs text-gray-500 mt-1">usam a plataforma</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-400">este mês</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">{totalConsultasMes}</p>
            <p className="text-xs text-gray-500 mt-1">consultas</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-400">adesão</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A5C]">
              {totalAtivos > 0 ? Math.round((totalVinculados / totalAtivos) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">da equipe</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Consultas recentes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#2E75B6]" /> Consultas recentes
            </h2>
            {agendamentosRecentes.length > 0 ? (
              <div className="space-y-2">
                {agendamentosRecentes.map((a: any) => {
                  const nomeFuncionario = mapPaciente[a.paciente_id] || 'Funcionário'
                  const dataHora = new Date(a.data_hora + (a.data_hora.endsWith('Z') ? '' : 'Z'))
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{nomeFuncionario}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dataHora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short' })}
                          {' '}
                          {dataHora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.status === 'concluido' ? 'bg-green-100 text-green-700' :
                        a.status === 'confirmado' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status === 'concluido' ? 'Concluída' :
                         a.status === 'confirmado' ? 'Confirmada' :
                         a.status === 'pendente' ? 'Pendente' : a.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma consulta registrada</p>
              </div>
            )}
          </div>

          {/* Lista de funcionários */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#1A3A5C] flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#2E75B6]" /> Funcionários
            </h2>
            {vinculos && vinculos.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {vinculos.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{v.nome_completo}</p>
                      <p className="text-xs text-gray-400">{v.cargo || ''}{v.departamento ? ` · ${v.departamento}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.paciente_id ? (
                        <span className="text-xs text-green-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Não ativou</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum funcionário importado</p>
                <p className="text-xs text-gray-400 mt-1">Contate o administrador para importar a lista.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
