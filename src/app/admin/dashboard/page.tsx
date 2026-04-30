import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Heart, Users, UserCheck, Clock, LogOut, CheckCircle2 } from 'lucide-react'
import BotoesAprovacao from '../components/BotoesAprovacao'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Usar admin client para verificar tipo sem RLS bloqueando
  const adminSupabase = createAdminClient()
  const { data: perfil } = await adminSupabase
    .from('perfis')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (perfil?.tipo !== 'admin') redirect('/paciente/dashboard')

  // Buscar médicos em análise (admin client já disponível)
  const { data: medicosEmAnalise } = await adminSupabase
    .from('medicos')
    .select('*')
    .eq('status', 'em_analise')
    .order('criado_em', { ascending: true })

  // Estatísticas gerais
  const { count: totalPacientes } = await adminSupabase
    .from('pacientes').select('*', { count: 'exact', head: true })

  const { count: totalMedicos } = await adminSupabase
    .from('medicos').select('*', { count: 'exact', head: true }).eq('status', 'aprovado')

  const { count: totalAtendimentos } = await adminSupabase
    .from('atendimentos').select('*', { count: 'exact', head: true })

  const { count: totalTriagens } = await adminSupabase
    .from('triagens').select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#2E75B6]" fill="currentColor" />
            <span className="font-bold">MedDigital</span>
            <span className="text-xs text-blue-300 ml-2">Painel Administrativo</span>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A3A5C]">Painel Administrativo</h1>
          <p className="text-gray-500 mt-1">Gestão completa da plataforma</p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pacientes', valor: totalPacientes || 0, icon: Users, cor: '#2E75B6' },
            { label: 'Médicos ativos', valor: totalMedicos || 0, icon: UserCheck, cor: '#1A7340' },
            { label: 'Triagens', valor: totalTriagens || 0, icon: Clock, cor: '#7B3FA0' },
            { label: 'Atendimentos', valor: totalAtendimentos || 0, icon: CheckCircle2, cor: '#C0392B' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: item.cor + '15' }}>
                <item.icon className="w-5 h-5" style={{ color: item.cor }} />
              </div>
              <div className="text-3xl font-bold text-[#1A3A5C]">{item.valor}</div>
              <div className="text-sm text-gray-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Médicos aguardando aprovação */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-[#1A3A5C]">Médicos aguardando aprovação</h2>
            </div>
            {medicosEmAnalise && medicosEmAnalise.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {medicosEmAnalise.length} pendente{medicosEmAnalise.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!medicosEmAnalise || medicosEmAnalise.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-200 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum médico aguardando aprovação</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {medicosEmAnalise.map((medico: any) => (
                <div key={medico.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold text-gray-800">{medico.nome}</p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          CRM {medico.crm}/{medico.crm_uf}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{medico.especialidade}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Cadastro: {new Date(medico.criado_em).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </p>
                      {medico.telefone && (
                        <p className="text-xs text-gray-400">Tel: {medico.telefone}</p>
                      )}
                    </div>
                    <BotoesAprovacao medicoId={medico.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links de gestão */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Todos os médicos', href: '/admin/medicos', icon: UserCheck, desc: 'Gerenciar cadastros e status' },
            { label: 'Todos os pacientes', href: '/admin/pacientes', icon: Users, desc: 'Visualizar histórico clínico' },
            { label: 'Todos os atendimentos', href: '/admin/atendimentos', icon: CheckCircle2, desc: 'Histórico e relatórios' },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md flex items-center gap-4">
              <div className="w-11 h-11 bg-[#1A3A5C]/10 rounded-xl flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-[#1A3A5C]" />
              </div>
              <div>
                <p className="font-semibold text-[#1A3A5C] text-sm">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
