import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import PacienteHeader from '../PacienteHeader'

export default async function PacienteTriagensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome')
    .eq('usuario_id', user.id)
    .single()

  if (!paciente) redirect('/paciente/dashboard')

  const { data: triagens } = await admin
    .from('triagens')
    .select('*')
    .eq('paciente_id', paciente.id)
    .order('criado_em', { ascending: false })

  const lista = triagens ?? []

  // ── Helpers ────────────────────────────────────────────────────────────────
  const RISCO_CONFIG: Record<string, { label: string; cor: string; bg: string; Icon: any }> = {
    verde:    { label: 'Risco Baixo',     cor: 'text-green-700',  bg: 'bg-green-50 border-green-100',   Icon: CheckCircle2 },
    amarelo:  { label: 'Risco Moderado',  cor: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100', Icon: AlertCircle },
    laranja:  { label: 'Risco Alto',      cor: 'text-orange-700', bg: 'bg-orange-50 border-orange-100', Icon: AlertTriangle },
    vermelho: { label: 'Urgência',        cor: 'text-red-700',    bg: 'bg-red-50 border-red-100',       Icon: Zap },
  }

  function formatarData(iso: string) {
    const d = new Date(iso)
    const data = d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })
    const hora = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
    return `${data} às ${hora}`
  }

  const contagens = {
    verde:    lista.filter(t => t.classificacao_risco === 'verde').length,
    amarelo:  lista.filter(t => t.classificacao_risco === 'amarelo').length,
    laranja:  lista.filter(t => t.classificacao_risco === 'laranja').length,
    vermelho: lista.filter(t => t.classificacao_risco === 'vermelho').length,
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <PacienteHeader />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/paciente/dashboard"
            className="p-2 rounded-xl hover:bg-white transition-colors text-gray-400 hover:text-[#1A3A2C]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1A3A2C] rounded-xl">
              <Clock className="w-5 h-5 text-[#5BBD9B]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A3A2C]">Minhas Triagens</h1>
              <p className="text-sm text-gray-400">
                {lista.length} triagem{lista.length !== 1 ? 's' : ''} realizad{lista.length !== 1 ? 'as' : 'a'}
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        {lista.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {(Object.entries(contagens) as [string, number][]).map(([risco, count]) => {
              if (count === 0) return null
              const cfg = RISCO_CONFIG[risco]
              return (
                <div key={risco} className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
                  <p className={`text-2xl font-bold ${cfg.cor}`}>{count}</p>
                  <p className={`text-[10px] font-semibold mt-0.5 ${cfg.cor}`}>{cfg.label}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* List */}
        {lista.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhuma triagem realizada ainda</p>
            <Link
              href="/paciente/triagem"
              className="mt-3 inline-block text-sm font-semibold text-[#5BBD9B] hover:underline"
            >
              Fazer triagem agora →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((t: any) => {
              const cfg = RISCO_CONFIG[t.classificacao_risco] ?? {
                label: t.classificacao_risco, cor: 'text-gray-600',
                bg: 'bg-gray-50 border-gray-100', Icon: AlertCircle,
              }
              const { Icon } = cfg
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden"
                >
                  {/* Top bar with risk color */}
                  <div className={`px-5 py-3 flex items-center justify-between border-b ${cfg.bg}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cfg.cor}`} />
                      <span className={`text-sm font-semibold ${cfg.cor}`}>{cfg.label}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatarData(t.criado_em)}</span>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4">
                    {t.resumo_ia ? (
                      <p className="text-sm text-gray-700 leading-relaxed">{t.resumo_ia}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Triagem realizada sem resumo de IA</p>
                    )}

                    {t.sintomas && (
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Sintomas relatados</p>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{t.sintomas}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
