import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, Brain, Clock, FileText, Calendar, Video, LogOut, ChevronRight } from 'lucide-react'

export default async function PacienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Buscar dados do paciente
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('usuario_id', user.id)
    .single()

  // Buscar últimas triagens
  const { data: triagens } = await supabase
    .from('triagens')
    .select('*')
    .eq('paciente_id', paciente?.id)
    .order('criado_em', { ascending: false })
    .limit(3)

  // Buscar últimos atendimentos
  const { data: atendimentos } = await supabase
    .from('atendimentos')
    .select('*')
    .eq('paciente_id', paciente?.id)
    .order('criado_em', { ascending: false })
    .limit(3)

  const nome = paciente?.nome || user.user_metadata?.nome || 'Paciente'
  const primeiroNome = nome.split(' ')[0]

  const corRisco: Record<string, string> = {
    verde: 'bg-green-100 text-green-700',
    amarelo: 'bg-yellow-100 text-yellow-700',
    laranja: 'bg-orange-100 text-orange-700',
    vermelho: 'bg-red-100 text-red-700',
  }

  const labelRisco: Record<string, string> = {
    verde: 'Risco Baixo',
    amarelo: 'Risco Moderado',
    laranja: 'Risco Alto',
    vermelho: 'Urgência',
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      {/* Header */}
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold">MedDigital</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">Olá, {primeiroNome}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="flex items-center gap-1 text-sm text-blue-200 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Saudação */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A5C]">Bom dia, {primeiroNome}! 👋</h1>
          <p className="text-gray-500 mt-1">Como você está se sentindo hoje?</p>
        </div>

        {/* Ação Principal — Iniciar Triagem */}
        <div className="bg-gradient-to-br from-[#1A3A5C] to-[#2E75B6] rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Precisa de atendimento?</h2>
              <p className="text-blue-200 text-sm">Nossa IA faz a triagem em poucos minutos</p>
            </div>
          </div>
          <Link
            href="/paciente/triagem"
            className="inline-flex items-center gap-2 bg-white text-[#1A3A5C] hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Iniciar triagem agora
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cards de acesso rápido */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Brain, label: 'Nova triagem', href: '/paciente/triagem', cor: '#2E75B6' },
            { icon: Video, label: 'Consulta virtual', href: '/paciente/consulta', cor: '#1A7340' },
            { icon: Calendar, label: 'Agendar consulta', href: '/paciente/agendar', cor: '#7B3FA0' },
            { icon: FileText, label: 'Prontuário', href: '/paciente/prontuario', cor: '#C0392B' },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md text-center group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: item.cor + '15' }}>
                <item.icon className="w-5 h-5" style={{ color: item.cor }} />
              </div>
              <span className="text-sm font-medium text-[#1A3A5C]">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Últimas triagens */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1A3A5C]">Últimas triagens</h3>
              <Link href="/paciente/triagens" className="text-xs text-[#2E75B6] hover:underline">Ver todas</Link>
            </div>
            {triagens && triagens.length > 0 ? (
              <div className="space-y-3">
                {triagens.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700 line-clamp-1">{t.resumo_ia || 'Triagem realizada'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${corRisco[t.classificacao_risco] || 'bg-gray-100 text-gray-600'}`}>
                      {labelRisco[t.classificacao_risco] || t.classificacao_risco}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhuma triagem realizada ainda</p>
                <Link href="/paciente/triagem" className="text-sm text-[#2E75B6] font-medium mt-2 inline-block">
                  Fazer primeira triagem →
                </Link>
              </div>
            )}
          </div>

          {/* Últimos atendimentos */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1A3A5C]">Histórico de atendimentos</h3>
              <Link href="/paciente/atendimentos" className="text-xs text-[#2E75B6] hover:underline">Ver todos</Link>
            </div>
            {atendimentos && atendimentos.length > 0 ? (
              <div className="space-y-3">
                {atendimentos.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {a.tipo === 'virtual' ? '📹 Consulta virtual' : '🏥 Presencial'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      a.status === 'concluido' ? 'bg-green-100 text-green-700' :
                      a.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {a.status === 'concluido' ? 'Concluído' :
                       a.status === 'em_andamento' ? 'Em andamento' :
                       a.status === 'aguardando' ? 'Aguardando' : a.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhum atendimento realizado ainda</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
