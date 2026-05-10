import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, ScrollText, CheckCircle2, ClipboardList } from 'lucide-react'
import MedicoHeader from '../../MedicoHeader'
import RenovacaoAtenderClient from './RenovacaoAtenderClient'

export default async function RenovacaoAtenderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: medico } = await supabase
    .from('medicos')
    .select('id, nome, crm, crm_uf, especialidade, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') redirect('/medico/dashboard')

  // Buscar a solicitação de renovação
  const { data: solicitacao, error } = await admin
    .from('solicitacoes_renovacao')
    .select(`
      id, tipo_receita, medicamentos, instrucoes, status, criado_em,
      cpf_confirmado, telefone_contato,
      pacientes(id, nome, cpf, data_nascimento, sexo)
    `)
    .eq('id', id)
    .single()

  if (error || !solicitacao) redirect('/medico/dashboard')
  if (solicitacao.status !== 'pendente') redirect('/medico/dashboard')

  const paciente = solicitacao.pacientes as any
  const LABEL_TIPO: Record<string, string> = {
    simples:        'Receita Simples',
    especial:       'Receita Especial',
    antimicrobiano: 'Antimicrobiano (2 vias)',
  }

  function fmtData(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
  }

  return (
    <div className="min-h-screen bg-[#F3FAF7]">
      <MedicoHeader titulo="Renovação de Receita" backHref="/medico/dashboard" medicoNome={medico.nome} />

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        <div>
          <Link href="/medico/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1A3A2C] mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao painel
          </Link>
          <h1 className="text-xl font-bold text-[#1A3A2C]">Solicitação de Renovação</h1>
          <p className="text-sm text-gray-500 mt-1">Recebida em {fmtData(solicitacao.criado_em)}</p>
        </div>

        {/* Info do paciente */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1A3A2C]/10 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[#1A3A2C]" />
            </div>
            <h2 className="font-bold text-[#1A3A2C]">Dados do Paciente</h2>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm"><span className="text-gray-400">Nome: </span><strong>{paciente?.nome ?? '—'}</strong></p>
            <p className="text-sm"><span className="text-gray-400">CPF: </span>{solicitacao.cpf_confirmado ?? paciente?.cpf ?? '—'}</p>
            {paciente?.data_nascimento && (
              <p className="text-sm"><span className="text-gray-400">Nascimento: </span>{fmtData(paciente.data_nascimento)}</p>
            )}
            {solicitacao.telefone_contato && (
              <p className="text-sm"><span className="text-gray-400">Telefone: </span>{solicitacao.telefone_contato}</p>
            )}
          </div>
        </div>

        {/* Receita solicitada */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A3A2C]">Receita Solicitada</h2>
              <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-bold">
                {LABEL_TIPO[solicitacao.tipo_receita] ?? solicitacao.tipo_receita}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
            {solicitacao.medicamentos.split('\n').filter(Boolean).map((m: string, i: number) => (
              <p key={i} className="text-sm text-gray-700 font-mono leading-relaxed">
                <span className="text-[#5BBD9B] font-bold mr-1.5">℞</span>{m}
              </p>
            ))}
          </div>

          {solicitacao.instrucoes && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Observação do paciente</p>
              <p className="text-sm text-blue-800">{solicitacao.instrucoes}</p>
            </div>
          )}
        </div>

        {/* Formulário do médico para emitir a receita */}
        <RenovacaoAtenderClient
          solicitacaoId={solicitacao.id}
          pacienteId={paciente?.id ?? ''}
          pacienteNome={paciente?.nome ?? ''}
          pacienteCPF={paciente?.cpf ?? ''}
          pacienteNascimento={paciente?.data_nascimento ?? ''}
          medicoId={medico.id}
          medicoNome={medico.nome}
          medicoCRM={medico.crm ?? ''}
          medicoCRMUF={medico.crm_uf ?? ''}
          medicoEspecialidade={medico.especialidade ?? ''}
          tipoReceita={solicitacao.tipo_receita}
          medicamentosIniciais={solicitacao.medicamentos}
          instrucoesIniciais={solicitacao.instrucoes ?? ''}
        />
      </main>
    </div>
  )
}
