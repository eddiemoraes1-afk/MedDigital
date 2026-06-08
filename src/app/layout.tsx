import type { Metadata } from 'next'
import './globals.css'
import HeartbeatProvider from './HeartbeatProvider'
import ThemeScript from './ThemeScript'

export const metadata: Metadata = {
  title: 'RovarisMed — Pronto Atendimento Médico Digital',
  description: 'Triagem inteligente por IA e consultas médicas virtuais',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full antialiased" style={{ background: 'var(--bg)', color: 'var(--txt-1)' }}>
        <HeartbeatProvider />
        {children}
      </body>
    </html>
  )
}
