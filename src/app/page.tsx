import Link from 'next/link'
import { Heart, Video, Brain, Shield, Clock, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#1A3A5C] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-7 h-7 text-[#2E75B6]" fill="currentColor" />
            <span className="text-xl font-bold">MedDigital</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-blue-200 hover:text-white">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="bg-[#2E75B6] hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A3A5C] to-[#2E75B6] text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-blue-500/30 text-blue-200 text-sm px-3 py-1 rounded-full mb-6">
            Telemedicina com Inteligência Artificial
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Atendimento médico quando você
            <span className="text-blue-300"> mais precisa</span>
          </h1>
          <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
            Triagem inteligente por IA, consultas virtuais com médicos reais e
            histórico clínico completo — tudo num só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cadastro"
              className="bg-white text-[#1A3A5C] hover:bg-blue-50 px-8 py-4 rounded-xl font-semibold text-lg"
            >
              Fazer triagem agora — grátis
            </Link>
            <Link
              href="/login"
              className="border border-white/40 hover:bg-white/10 px-8 py-4 rounded-xl font-semibold text-lg"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-6 bg-[#F4F7FB]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1A3A5C] mb-4">Como funciona</h2>
          <p className="text-center text-gray-500 mb-14">Do sintoma ao médico em menos de 10 minutos</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                numero: '1', titulo: 'Descreva seus sintomas',
                descricao: 'Nossa IA faz uma triagem completa por chat, classifica o risco e orienta o próximo passo.',
                icon: Brain, cor: '#2E75B6',
              },
              {
                numero: '2', titulo: 'Entre na fila virtual',
                descricao: 'Se precisar de médico, você entra na fila e é atendido em ordem de prioridade clínica.',
                icon: Clock, cor: '#1A7340',
              },
              {
                numero: '3', titulo: 'Consulta por vídeo',
                descricao: 'O médico te atende ao vivo, emite receitas e documentos médicos digitalmente.',
                icon: Video, cor: '#1A3A5C',
              },
            ].map((item) => (
              <div key={item.numero} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: item.cor + '20' }}>
                  <item.icon className="w-6 h-6" style={{ color: item.cor }} />
                </div>
                <div className="text-xs font-bold mb-2" style={{ color: item.cor }}>PASSO {item.numero}</div>
                <h3 className="text-lg font-bold text-[#1A3A5C] mb-3">{item.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1A3A5C] mb-14">Por que o MedDigital?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Brain, titulo: 'IA treinada para saúde', descricao: 'Triagem baseada em protocolos clínicos reconhecidos, com classificação de risco em tempo real.' },
              { icon: Shield, titulo: 'Seguro e em conformidade com LGPD', descricao: 'Seus dados de saúde são criptografados e nunca compartilhados sem sua autorização.' },
              { icon: Video, titulo: 'Médicos verificados', descricao: 'Todos os médicos passam por validação de CRM e aprovação manual antes de atender.' },
              { icon: Users, titulo: 'Para clínicas e hospitais', descricao: 'Solução B2B para digitalizar o pronto atendimento de qualquer clínica ou hospital.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 p-6 rounded-2xl bg-[#F4F7FB]">
                <div className="w-11 h-11 bg-[#2E75B6]/10 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-[#2E75B6]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A3A5C] mb-1">{item.titulo}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A3A5C] text-white py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Pronto para seu primeiro atendimento?</h2>
        <p className="text-blue-200 mb-8">Cadastro gratuito. Sem burocracia. Atendimento em minutos.</p>
        <Link href="/cadastro"
          className="bg-[#2E75B6] hover:bg-blue-500 text-white px-10 py-4 rounded-xl font-semibold text-lg inline-block">
          Criar conta gratuita
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-[#2E75B6]" fill="currentColor" />
          <span className="font-semibold text-white">MedDigital</span>
        </div>
        <p>© 2026 MedDigital. Todos os direitos reservados.</p>
        <p className="mt-1 text-xs">Plataforma regulamentada conforme Resolução CFM 2.314/2022 e LGPD.</p>
      </footer>
    </div>
  )
}
