import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return NextResponse.json({ erro: 'RESEND_API_KEY não encontrada no ambiente' }, { status: 500 })
  }

  const keyPreview = apiKey.slice(0, 8) + '...' + apiKey.slice(-4)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MedDigital <onboarding@resend.dev>',
        to: ['eddiemoraes1@gmail.com'],
        subject: '🧪 Teste MedDigital — Resend funcionando',
        html: '<h2>Teste bem-sucedido!</h2><p>O Resend está configurado corretamente no MedDigital.</p>',
      }),
    })

    const result = await response.json()

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      keyUsada: keyPreview,
      respostaResend: result,
    })
  } catch (err: any) {
    return NextResponse.json({
      erro: 'Exceção ao chamar Resend',
      detalhe: err?.message || String(err),
      keyUsada: keyPreview,
    }, { status: 500 })
  }
}
