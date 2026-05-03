import { NextResponse } from 'next/server'
import { enviarEmailConfirmacao } from '@/lib/notifications'

export async function GET() {
  const logs: string[] = []

  // Teste 1: variável de ambiente
  const apiKey = process.env.RESEND_API_KEY
  logs.push(apiKey ? `RESEND_API_KEY: OK (${apiKey.slice(0,8)}...)` : 'RESEND_API_KEY: AUSENTE')

  // Teste 2: chamar a função exata que o agendamento usa
  try {
    await enviarEmailConfirmacao({
      pacienteNome: 'Maria da Silva',
      pacienteEmail: 'metaemultipla@gmail.com',
      pacienteTelefone: undefined,
      medicoNome: 'Marcelo Rovaris',
      medicoEspecialidade: 'Gastroenterologia',
      dataHora: new Date('2026-05-02T11:00:00.000Z'),
    })
    logs.push('enviarEmailConfirmacao: executou sem exceção')
  } catch (err: any) {
    logs.push(`enviarEmailConfirmacao: EXCEÇÃO — ${err?.message || String(err)}`)
  }

  // Teste 3: fetch direto para confirmar
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RovarisMed <onboarding@resend.dev>',
        to: ['eddiemoraes1@gmail.com'],
        subject: '🧪 Teste direto',
        html: '<p>Teste fetch direto OK</p>',
      }),
    })
    const result = await response.json()
    logs.push(`fetch direto: status ${response.status} — ${JSON.stringify(result)}`)
  } catch (err: any) {
    logs.push(`fetch direto: EXCEÇÃO — ${err?.message}`)
  }

  return NextResponse.json({ logs })
}
