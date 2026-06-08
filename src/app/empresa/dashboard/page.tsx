import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import {
  Building2, LogOut, Users, Calendar,
  TrendingUp, CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { gerarTema } from '@/lib/tema'
import EmpresaTabs from './EmpresaTabs'
import ThemeToggle from '@/components/ThemeToggle'

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
    <div className="min-h-screen" style={{ ...tema.vars, background: 'var(--bg)' }}>
      {/* Header com cor da empresa */}
      <header
        style={{ backgroundColor: tema.corPrimaria, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="px-6 py-3"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {empresa?.logo_url ? (
              <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
                <img src={empresa.logo_url} alt={empresa?.nome || 'Logo'} className="h-full w-full object-contain rounded-lg" />
              </div>
            ) : (
              <img src="/logo-branca.svg" alt="RovarisMed" className="h-8" />
            )}
            <span className="text-xs font-semibold ml-1 px-2 py-0.5 rounded-full" style={{ color: tema.corTextoSuave, background: 'rgba(255,255,255,0.10)' }}>
              Portal {empresa?.nome}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:flex items-center gap-1.5" style={{ color: tema.corTextoSuave }}>
              <Building2 className="w-4 h-4" /> {empresa?.nome}
            </span>
            <ThemeToggle />
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                style={{ color: tema.corTextoSuave, background: 'rgba(255,255,255,0.10)' }}
              >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline text-xs">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Cabeçalho */}
        <div className="mb-6 flex items-center gap-4">
          {empresa?.logo_url && (
            <img src={empresa.logo_url} alt={empresa.nome} className="h-12 w-auto object-contain rounded-xl p-1.5 shadow-sm" style={{ background: 'var(--surface)' }} />
          )}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--txt-1)' }}>Gestão Digital Assistencial</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--txt-3)' }}>{empresa?.nome} · {empresa?.cnpj || 'CNPJ não informado'}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, value: totalAtivos, label: 'na empresa', tag: 'funcionários', color: tema.corPrimaria },
            { icon: CheckCircle2, value: totalVinculados, label: 'usam a plataforma', tag: 'usando', color: '#059669' },
            { icon: Calendar, value: totalConsultasMes, label: 'consultas', tag: 'este mês', color: '#D97706' },
            { icon: TrendingUp, value: `${totalAtivos > 0 ? Math.round((totalVinculados / totalAtivos) * 100) : 0}%`, label: 'da equipe', tag: 'adesão', color: '#7C3AED' },
          ].map(({ icon: Icon, value, label, tag, color }) => (
            <div key={tag} className="rounded-2xl p-5 transition-all hover:-translate-y-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-5 h-5" style={{ color }} />
                <span className="text-xs" style={{ color: 'var(--txt-3)' }}>{tag}</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--txt-1)' }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--txt-3)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Alerta de não ativação */}
        {naoAtivaram > 0 && (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-3 mb-6" style={{ background: 'var(--warning-bg)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)' }}>
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--warning)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--txt-1)' }}>
                {naoAtivaram} funcionário{naoAtivaram > 1 ? 's ainda não ativaram' : ' ainda não ativou'} a conta
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--txt-2)' }}>
                Compartilhe o link <strong>med-digital.vercel.app/cadastro</strong> com eles para que se cadastrem.
              </p>
            </div>
          </div>
        )}

        <EmpresaTabs />
      </main>
    </div>
  )
}
