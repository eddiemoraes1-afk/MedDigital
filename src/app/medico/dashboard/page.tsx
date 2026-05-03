import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Clock, Video, CheckCircle2, LogOut, AlertTriangle, Calendar } from 'lucide-react'

export default async function MedicoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: medico } = await supabase
    .from('medicos')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

  if (!medico) redirect('/login')

  if (medico.status !== 'aprovado') {
    return (
      <div className="min-h-screen bg-[#F3FAF7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1A3A2C] mb-2">Cadastro em análise</h2>
          <p className="text-gray-500 text-sm mb-4">
            Seu cadastro está sendo verificado pela nossa equipe. Você receberá um e-mail assim que for aprovado.
          </p>
          <p className="text-xs text-gray-400">Status: <strong>{medico.status}</strong></p>
          <Link href="/login" className="mt-4 inline-block text-[#5BBD9B] text-sm">Sair</Link>
        </div>
      </div>
    )
  }

  // Buscar fila de atendimentos aguardando
  const { data: fila } = await supabase
    .from('atendimentos')
    .select(`
      *,
      pacientes (nome, cpf),
      triagens (classificacao_risco, resumo_ia)
    `)
    .eq('status', 'aguardando')
    .eq('tipo', 'virtual')
    .order('criado_em', { ascending: true })

  // Buscar atendimentos do médico hoje
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const { data: atendimentosHoje } = await supabase
    .from('atendimentos')
    .select('*')
    .eq('medico_id', medico.id)
    .gte('criado_em', hoje.toISOString())

  const primeiroNome = medico.nome.split(' ')[0]

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-yellow-100 text-yellow-700',
    laranja: 'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
    default: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <header className="bg-[#1A3A2C] text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-branca.svg" alt="RovarisMed" className="h-10" />
            <span className="text-xs text-green-300 ml-2">Painel do Médico</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-green-200">Dr(a). {primeiroNome}</span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="text-green-200 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A2C]">Bom dia, Dr(a). {primeiroNome}!</h1>
          <p className="text-gray-500 mt-1">{medico.especialidade} — CRM {medico.crm}/{medico.crm_uf}</p>
        </div>

        {/* Métricas do dia */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Na fila agora', valor: fila?.length || 0, icon: Clock, cor: '#5BBD9B', destaque: (fila?.length || 0) > 0 },
            { label: 'Atendidos hoje', valor: atendimentosHoje?.filter(a => a.status === 'concluido').length || 0, icon: CheckCircle2, cor: '#1A7340', destaque: false },
            { label: 'Em andamento', valor: atendimentosHoje?.filter(a => a.status === 'em_andamento').length || 0, icon: Video, cor: '#7B3FA0', destaque: false },
          ].map((item) => (
            <div key={item.label} className={`bg-white rounded-2xl p-6 shadow-sm ${item.destaque ? 'ring-2 ring-[#5BBD9B]' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.cor + '15' }}>
                  <item.icon className="w-5 h-5" style={{ color: item.cor }} />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#1A3A2C]">{item.valor}</div>
              <div className="text-sm text-gray-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/medico/disponibilidade"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center gap-4 group">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-[#1A3A2C] text-sm">Minha disponibilidade</p>
              <p className="text-xs text-gray-400">Gerenciar horários de atendimento</p>
            </div>
          </Link>
          <Link href="/medico/agendamentos"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center gap-4 group">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-[#1A3A2C] text-sm">Agenda</p>
              <p className="text-xs text-gray-400">Ver consultas agendadas</p>
            </div>
          </Link>
        </div>

        {/* Fila de pacientes */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#5BBD9B]" />
              <h2 className="font-bold text-[#1A3A2C]">Fila de Atendimento Virtual</h2>
            </div>
            {fila && fila.length > 0 && (
              <span className="bg-[#5BBD9B] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {fila.length} aguardando
              </span>
            )}
          </div>

          {!fila || fila.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Fila vazia</p>
              <p className="text-gray-300 text-sm mt-1">Nenhum paciente aguardando no momento</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {fila.map((atendimento: any, index: number) => {
                const risco = atendimento.triagens?.classificacao_risco || 'verde'
                return (
                  <div key={atendimento.id} className="px-6 py-5 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#1A3A2C]/10 rounded-full flex items-center justify-center font-bold text-[#1A3A2C] text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{atendimento.pacientes?.nome || 'Paciente'}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corRisco[risco] || corRisco.default}`}>
                            {risco === 'verde' ? 'Baixo' : risco === 'amarelo' ? 'Moderado' : risco === 'laranja' ? 'Alto' : 'Urgência'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {atendimento.triagens?.resumo_ia || 'Sem resumo de triagem'}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">
                          Aguardando desde {new Date(atendimento.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/medico/atendimento/${atendimento.id}`}
                      className="bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0"
                    >
                      <Video className="w-4 h-4" />
                      Atender
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
