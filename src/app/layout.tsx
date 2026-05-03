import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
