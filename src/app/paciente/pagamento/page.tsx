import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import PacienteHeader from '../PacienteHeader'
import PagamentoClient from './PagamentoClient'

/** Valor padrão da consulta avulsa quando a empresa não define um preço. */
const VALOR_PADRAO = Number(process.env.VALOR_CONSULTA_AVULSA || '89.90')

interface Props {
  searchParams: Promise<{ ref?: string; valor?: string; destino?: string }>
}

export default async function PagamentoPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: paciente } = await admin
    .from('pacientes')
    .select('id, nome, cpf')
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!paciente) redirect('/paciente/dashboard')

  const { ref, valor, destino } = await searchParams

  // Referência única: impede cobrar duas vezes a mesma consulta.
  const referencia = ref?.trim() || `avulsa:${paciente.id}:${Date.now()}`

  const valorNum = Number(valor)
  const valorFinal = Number.isFinite(valorNum) && valorNum > 0 ? valorNum : VALOR_PADRAO

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <PacienteHeader />

      <main className="max-w-xl mx-auto px-5 py-10">
        <div className="mb-7">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--txt-1)' }}>Pagamento</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--txt-2)' }}>
            Assim que o pagamento for confirmado, você entra na fila de atendimento.
          </p>
        </div>

        {!paciente.cpf ? (
          <div className="rounded-2xl p-7 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-2" style={{ color: 'var(--txt-1)' }}>
              Falta o seu CPF no cadastro
            </p>
            <p className="text-sm" style={{ color: 'var(--txt-2)' }}>
              Precisamos dele para emitir a cobrança. Atualize seu cadastro e volte aqui.
            </p>
          </div>
        ) : (
          <PagamentoClient
            valor={valorFinal}
            descricao="Consulta médica — Aduno"
            referencia={referencia}
            destino={destino || '/paciente/triagem'}
          />
        )}
      </main>
    </div>
  )
}
