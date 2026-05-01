// Notificações por email (Gmail SMTP) e WhatsApp (Twilio)
import nodemailer from 'nodemailer'

interface DadosAgendamento {
  pacienteNome: string
  pacienteEmail: string
  pacienteTelefone?: string
  medicoNome: string
  medicoEspecialidade: string
  dataHora: Date
}

function formatarDataHora(dataHora: Date) {
  const tz = 'America/Sao_Paulo'
  const data = dataHora.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  })
  const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  return { data, hora }
}

// ─── EMAIL via Gmail SMTP ────────────────────────────────────────────────────

export async function enviarEmailConfirmacao(dados: DadosAgendamento) {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (!gmailUser || !gmailPass) {
    console.error('GMAIL_USER ou GMAIL_APP_PASSWORD não configurados')
    return
  }

  const { data, hora } = formatarDataHora(dados.dataHora)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F4F7FB; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #1A3A5C; padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 22px; }
        .header p { color: #93C5FD; margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px; }
        .greeting { font-size: 16px; color: #374151; margin-bottom: 24px; }
        .card { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .card-row { display: flex; margin-bottom: 12px; }
        .card-label { color: #6B7280; font-size: 13px; width: 90px; }
        .card-value { color: #1A3A5C; font-size: 13px; font-weight: 600; }
        .badge { display: inline-block; background: #22C55E; color: white; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
        .footer { background: #F9FAFB; padding: 20px 32px; text-align: center; }
        .footer p { color: #9CA3AF; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💙 MedDigital</h1>
          <p>Sua saúde em boas mãos</p>
        </div>
        <div class="body">
          <p class="greeting">Olá, <strong>${dados.pacienteNome}</strong>!</p>
          <span class="badge">✅ Consulta confirmada</span>
          <div class="card">
            <div class="card-row">
              <span class="card-label">Médico</span>
              <span class="card-value">Dr(a). ${dados.medicoNome}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Especialidade</span>
              <span class="card-value">${dados.medicoEspecialidade}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Data</span>
              <span class="card-value">${data}</span>
            </div>
            <div class="card-row" style="margin-bottom: 0">
              <span class="card-label">Horário</span>
              <span class="card-value">${hora}</span>
            </div>
          </div>
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
            Você receberá um lembrete 1 hora antes da consulta. Em caso de imprevistos, entre em contato conosco.
          </p>
        </div>
        <div class="footer">
          <p>MedDigital — Telemedicina com Inteligência Artificial</p>
          <p style="margin-top: 4px;">med-digital.vercel.app</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const info = await transporter.sendMail({
      from: `MedDigital <${gmailUser}>`,
      to: dados.pacienteEmail,
      subject: `✅ Consulta confirmada — ${data} às ${hora}`,
      html,
    })
    console.log('Email enviado para', dados.pacienteEmail, '| messageId:', info.messageId)
  } catch (err) {
    console.error('Erro ao enviar email:', err)
  }
}

// ─── EMAIL CANCELAMENTO ──────────────────────────────────────────────────────

export async function enviarEmailCancelamento(dados: DadosAgendamento) {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (!gmailUser || !gmailPass) return

  const { data, hora } = formatarDataHora(dados.dataHora)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F4F7FB; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #1A3A5C; padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 22px; }
        .header p { color: #93C5FD; margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px; }
        .greeting { font-size: 16px; color: #374151; margin-bottom: 24px; }
        .card { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .card-row { display: flex; margin-bottom: 12px; }
        .card-label { color: #6B7280; font-size: 13px; width: 90px; }
        .card-value { color: #1A3A5C; font-size: 13px; font-weight: 600; }
        .badge { display: inline-block; background: #EF4444; color: white; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
        .footer { background: #F9FAFB; padding: 20px 32px; text-align: center; }
        .footer p { color: #9CA3AF; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💙 MedDigital</h1>
          <p>Sua saúde em boas mãos</p>
        </div>
        <div class="body">
          <p class="greeting">Olá, <strong>${dados.pacienteNome}</strong>!</p>
          <span class="badge">❌ Consulta cancelada</span>
          <div class="card">
            <div class="card-row">
              <span class="card-label">Médico</span>
              <span class="card-value">Dr(a). ${dados.medicoNome}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Especialidade</span>
              <span class="card-value">${dados.medicoEspecialidade}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Data</span>
              <span class="card-value">${data}</span>
            </div>
            <div class="card-row" style="margin-bottom: 0">
              <span class="card-label">Horário</span>
              <span class="card-value">${hora}</span>
            </div>
          </div>
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
            Sua consulta foi cancelada com sucesso. Caso queira reagendar, acesse o aplicativo a qualquer momento.
          </p>
        </div>
        <div class="footer">
          <p>MedDigital — Telemedicina com Inteligência Artificial</p>
          <p style="margin-top: 4px;">med-digital.vercel.app</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const info = await transporter.sendMail({
      from: `MedDigital <${gmailUser}>`,
      to: dados.pacienteEmail,
      subject: `❌ Consulta cancelada — ${data} às ${hora}`,
      html,
    })
    console.log('Email cancelamento enviado para', dados.pacienteEmail, '| messageId:', info.messageId)
  } catch (err) {
    console.error('Erro ao enviar email de cancelamento:', err)
  }
}

// ─── WHATSAPP via Twilio ─────────────────────────────────────────────────────

export async function enviarWhatsAppConfirmacao(dados: DadosAgendamento) {
  if (!dados.pacienteTelefone) return
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return

  const { data, hora } = formatarDataHora(dados.dataHora)

  let telefone = dados.pacienteTelefone.replace(/\D/g, '')
  if (!telefone.startsWith('55')) telefone = '55' + telefone

  const mensagem = `✅ *Consulta confirmada no MedDigital!*

Olá, ${dados.pacienteNome} 👋

Sua consulta foi agendada com sucesso:

👨‍⚕️ *Médico:* Dr(a). ${dados.medicoNome}
🩺 *Especialidade:* ${dados.medicoEspecialidade}
📅 *Data:* ${data}
⏰ *Horário:* ${hora}

Acesse med-digital.vercel.app para entrar na consulta no horário marcado.

Em caso de imprevistos, entre em contato conosco.`

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
    const body = new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || '+14155238886'}`,
      To: `whatsapp:+${telefone}`,
      Body: mensagem,
    })

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const result = await response.json()
    if (response.ok) {
      console.log('WhatsApp enviado para', telefone)
    } else {
      console.error('Erro WhatsApp:', result)
    }
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err)
  }
}
