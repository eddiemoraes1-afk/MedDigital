import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Building2, LogOut, Users, Calendar,
  TrendingUp, CheckCircle2,
  AlertCircle, UserX,
} from 'lucide-react'
import { gerarTema } from '@/lib/tema'
import EmpresaTabs from './EmpresaTabs'

interface Props {
  searchParams: Promise<{ departamento?: string; status?: string }>
}

export default async function EmpresaDashboardPage({ searchParams }: Props) {
  const perfil = await requireEmpresa()
  const adminSupabase = createAdminClient()
  const empresaId = perfil.empresaId!
  const { departamento, status } = await searchParams

  // Dados da empresa (incluindo logo e cor)
  const { data: empresa } = await adminSupabase
    .from('empresas')
    .select('id, nome, cnpj, logo_url, cor_primaria')
    .eq('id', empresaId)
    .single()

  // Gerar tema com base na cor da empresa
  const tema = gerarTema(empresa?.cor_primaria ?? null)

  // Funcionários com vínculo
  const { data: vinculos } = await adminSupabase
    .from('vinculos_empresa')
    .select('id, nome_completo, cpf, cargo, departamento, email, ativo, paciente_id, data_admissao')
    .eq('empresa_id', empresaId)
    .order('nome_completo', { ascending: true })

  // Contagem e última consulta por paciente
  const pacienteIds = vinculos?.filter(v => v.paciente_id).map(v => v.paciente_id) ?? []

  let consultasPorPaciente: Record<string, { total: number; ultima: string | null }> = {}
  let agendamentosRecentes: any[] = []
  let totalConsultasMes = 0

  if (pacienteIds.length > 0) {
    // Busca atendimentos concluídos (não agendamentos, que podem estar vazios para consultas virtuais)
    const { data: todasConsultas } = await adminSupabase
      .from('atendimentos')
      .select('id, paciente_id, criado_em, finalizado_em, medico_id')
      .in('paciente_id', pacienteIds)
      .eq('status', 'concluido')
      .order('criado_em', { ascending: false })

    todasConsultas?.forEach(c => {
      if (!consultasPorPaciente[c.paciente_id]) {
        consultasPorPaciente[c.paciente_id] = { total: 0, ultima: null }
      }
      consultasPorPaciente[c.paciente_id].total++
      if (!consultasPorPaciente[c.paciente_id].ultima) {
        consultasPorPaciente[c.paciente_id].ultima = c.finalizado_em ?? c.criado_em
      }
    })

    agendamentosRecentes = (todasConsultas ?? []).slice(0, 8)

    const inicioMes = new Date()
    inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
    const { count } = await adminSupabase
      .from('atendimentos')
      .select('*', { count: 'exact', head: true })
      .in('paciente_id', pacienteIds)
      .eq('status', 'concluido')
      .gte('criado_em', inicioMes.toISOString())
    totalConsultasMes = count ?? 0
  }

  const mapPaciente: Record<string, string> = {}
  vinculos?.forEach(v => { if (v.paciente_id) mapPaciente[v.paciente_id] = v.nome_completo })

  // KPIs
  const totalAtivos = vinculos?.filter(v => v.ativo).length ?? 0
  const totalVinculados = vinculos?.filter(v => v.paciente_id).length ?? 0
  const naoAtivaram = totalAtivos - totalVinculados


  return (
    <div className="min-h-screen" style={{ ...tema.vars, backgroundColor: tema.corBgPagina }}>
      {/* Header com cor da empresa */}
      <header style={{ backgroundColor: tema.corPrimaria }} className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {empresa?.logo_url ? (
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
                <img
                  src={empresa.logo_url}
                  alt={empresa?.nome || 'Logo'}
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
            )}
            <span className="text-xs ml-1" style={{ color: tema.corTextoSuave }}>Portal {empresa?.nome}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm flex items-center gap-1.5" style={{ color: tema.corTextoSuave }}>
              <Building2 className="w-4 h-4" /> {empresa?.nome}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm flex items-center gap-1.5 transition-opacity hover:opacity-80"
                style={{ color: tema.corTextoSuave }}
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Cabeçalho com logo da empresa */}
        <div className="mb-6 flex items-center gap-4">
          {empresa?.logo_url && (
            <img
              src={empresa.logo_url}
              alt={empresa.nome}
              className="h-12 w-auto object-contain rounded-xl bg-white p-1.5 shadow-sm"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#1A3A2C]">Gestão Digital Assistencial e Regulação Clínica</h1>
            <p className="text-gray-500 text-sm mt-1">{empresa?.nome} · {empresa?.cnpj || 'CNPJ não informado'}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5" style={{ color: tema.corPrimaria }} />
              <span className="text-xs text-gray-400">funcionários</span>
            </div>
            <p className="text-3xl font-bold text-[#1A3A2C]">{totalAtivos}</p>
            <p className="text-xs text-gray-500 mt-1">na empresa</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-xs text-gray-400">usando</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{totalVinculados}</p>
            <p className="text-xs text-gray-500 mt-1">usam a plataforma</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-400">este mês</span>
            </div>
            <p className="text-3xl font-bold text-orange-500">{totalConsultasMes}</p>
            <p className="text-xs text-gray-500 mt-1">consultas</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-400">adesão</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {totalAtivos > 0 ? Math.round((totalVinculados / totalAtivos) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">da equipe</p>
          </div>
        </div>

        {/* Alerta de não ativação */}
        {naoAtivaram > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {naoAtivaram} funcionário{naoAtivaram > 1 ? 's ainda não ativaram' : ' ainda não ativou'} a conta
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Compartilhe o link <strong>med-digital.vercel.app/cadastro</strong> com eles para que se cadastrem.
              </p>
            </div>
          </div>
        )}

        {/* Tabs: Relatório de Cobrança / Dashboard de Gastos / Funcionários / Atestados */}
        <EmpresaTabs />

      </main>
    </div>
  )
}
