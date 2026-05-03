import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogOut, ArrowLeft, User, Phone, FileText, Calendar, Stethoscope, Brain, Clock, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

export default async function ProntuarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  // Dados do paciente
  const { data: paciente } = await adminSupabase
    .from('pacientes')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) redirect('/paciente/dashboard')

  // Todas as triagens
  const { data: triagens } = await adminSupabase
    .from('triagens')
    .select('*')
    .eq('paciente_id', paciente.id)
    .order('criado_em', { ascending: false })

  // Todos os atendimentos com dados do médico
  const { data: atendimentos } = await adminSupabase
    .from('atendimentos')
    .select('*')
    .eq('paciente_id', paciente.id)
    .order('criado_em', { ascending: false })

  // Buscar dados dos médicos separadamente
  const medicoIds = [...new Set((atendimentos || []).map((a: any) => a.medico_id).filter(Boolean))]
  const { data: medicos } = medicoIds.length > 0
    ? await adminSupabase.from('medicos').select('id, nome, especialidade').in('id', medicoIds)
    : { data: [] }

  const medicoMap: Record<string, any> = {}
  ;(medicos || []).forEach((m: any) => { medicoMap[m.id] = m })

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700 border-green-200',
    amarelo: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    laranja: 'bg-orange-100 text-orange-700 border-orange-200',
    vermelho: 'bg-red-100 text-red-700 border-red-200',
  }

  const labelRisco: Record<string, string> = {
    verde: 'Risco Baixo',
    amarelo: 'Risco Moderado',
    laranja: 'Risco Alto',
    vermelho: 'Urgência',
  }

  const iconRisco: Record<string, string> = {
    verde: '🟢',
    amarelo: '🟡',
    laranja: '🟠',
    vermelho: '🔴',
  }

  const totalTriagens = triagens?.length || 0
  const totalAtendimentos = atendimentos?.length || 0
  const atendimentosConcluidos = atendimentos?.filter((a: any) => a.status === 'concluido').length || 0
  const ultimaConsulta = atendimentos?.[0]?.criado_em
    ? new Date(atendimentos[0].criado_em).toLocaleDateString('pt-BR')
    : null

  // Montar linha do tempo unificada
  const timeline: any[] = [
    ...(triagens || []).map((t: any) => ({ ...t, _tipo: 'triagem' })),
    ...(atendimentos || []).map((a: any) => ({ ...a, _tipo: 'atendimento' })),
  ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      {/* Header */}
      <header className="bg-[#1A3A2C] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-branca.svg" alt="RovarisMed" className="h-8" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-green-200">{paciente.nome}</span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="flex items-center gap-1 text-sm text-green-200 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Voltar */}
        <Link href="/paciente/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A3A2C] mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao painel
        </Link>

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A2C] flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Prontuário Médico
          </h1>
          <p className="text-gray-500 mt-1">Histórico completo de saúde</p>
        </div>

        {/* Card do Paciente */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-[#1A3A2C] mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Dados do Paciente
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Nome completo</p>
              <p className="text-sm font-medium text-gray-800">{paciente.nome}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">E-mail</p>
              <p className="text-sm font-medium text-gray-800">{user.email}</p>
            </div>
            {paciente.cpf && (
              <div>
                <p className="text-xs text-gray-400 mb-1">CPF</p>
                <p className="text-sm font-medium text-gray-800">{paciente.cpf}</p>
              </div>
            )}
            {paciente.telefone && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Telefone</p>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {paciente.telefone}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Paciente desde</p>
              <p className="text-sm font-medium text-gray-800">
                {new Date(paciente.criado_em || user.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Resumo estatístico */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Triagens realizadas', valor: totalTriagens, cor: '#5BBD9B', icone: Brain },
            { label: 'Consultas totais', valor: totalAtendimentos, cor: '#1A7340', icone: Stethoscope },
            { label: 'Consultas concluídas', valor: atendimentosConcluidos, cor: '#7B3FA0', icone: CheckCircle2 },
            { label: 'Última consulta', valor: ultimaConsulta || '—', cor: '#C0392B', icone: Calendar },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: item.cor + '15' }}>
                <item.icone className="w-4 h-4" style={{ color: item.cor }} />
              </div>
              <p className="text-xl font-bold text-[#1A3A2C]">{item.valor}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Linha do tempo */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-[#1A3A2C] mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico completo
          </h2>

          {timeline.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum registro encontrado</p>
              <Link href="/paciente/triagem"
                className="mt-3 inline-block text-sm text-[#5BBD9B] font-medium hover:underline">
                Fazer primeira triagem →
              </Link>
            </div>
          ) : (
            <div className="relative">
              {/* Linha vertical */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />

              <div className="space-y-6">
                {timeline.map((item: any) => (
                  <div key={`${item._tipo}-${item.id}`} className="relative flex gap-4">
                    {/* Ícone */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      item._tipo === 'triagem'
                        ? 'bg-green-100'
                        : item.status === 'concluido' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      {item._tipo === 'triagem'
                        ? <Brain className="w-5 h-5 text-green-600" />
                        : <Stethoscope className={`w-5 h-5 ${item.status === 'concluido' ? 'text-green-600' : 'text-purple-600'}`} />
                      }
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 pb-4">
                      {/* Header do item */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-[#1A3A2C] text-sm">
                            {item._tipo === 'triagem' ? '🧠 Triagem por IA' : '📹 Consulta virtual'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(item.criado_em).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>

                        {/* Badge de status/risco */}
                        {item._tipo === 'triagem' && item.classificacao_risco && (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${corRisco[item.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                            {iconRisco[item.classificacao_risco]} {labelRisco[item.classificacao_risco] || item.classificacao_risco}
                          </span>
                        )}
                        {item._tipo === 'atendimento' && (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            item.status === 'concluido' ? 'bg-green-100 text-green-700' :
                            item.status === 'em_andamento' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {item.status === 'concluido' ? 'Concluído' :
                             item.status === 'em_andamento' ? 'Em andamento' : 'Aguardando'}
                          </span>
                        )}
                      </div>

                      {/* Resumo da triagem */}
                      {item._tipo === 'triagem' && item.resumo_ia && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 font-medium mb-1">Resumo da triagem:</p>
                          <p className="text-sm text-gray-700">{item.resumo_ia}</p>
                        </div>
                      )}

                      {/* Médico do atendimento */}
                      {item._tipo === 'atendimento' && item.medico_id && medicoMap[item.medico_id] && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 font-medium mb-1">Médico responsável:</p>
                          <p className="text-sm text-gray-700">
                            Dr(a). {medicoMap[item.medico_id].nome}
                            {medicoMap[item.medico_id].especialidade && (
                              <span className="text-gray-400"> — {medicoMap[item.medico_id].especialidade}</span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Notas médicas */}
                      {item._tipo === 'atendimento' && item.notas_medico && (
                        <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Anotações do médico:
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{item.notas_medico}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
