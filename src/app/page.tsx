import Link from 'next/link'
import { Video, Brain, Shield, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react'

const BRAND = '#19382E'
const SAGE  = '#6E8570'
const SAGE_LIGHT = '#8FA891'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 px-6 py-4" style={{ background: BRAND }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/aduno-logo-branca.png" alt="Aduno" className="h-7 md:h-8" />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
              style={{ color: 'rgba(255,255,255,.75)' }}
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="text-sm px-4 py-2 rounded-xl font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: SAGE }}
            >
              Começar agora
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32" style={{ background: BRAND }}>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-[0.07]"
          style={{ border: `56px solid ${SAGE_LIGHT}` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -bottom-20 h-[320px] w-[320px] rounded-full opacity-[0.05]"
          style={{ border: `44px solid ${SAGE_LIGHT}` }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <span
            className="inline-block text-xs md:text-sm px-4 py-1.5 rounded-full mb-8 font-medium"
            style={{ background: 'rgba(143,168,145,.16)', color: SAGE_LIGHT }}
          >
            Saúde ocupacional digital
          </span>

          <h1 className="text-4xl md:text-6xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
            Cuidar da saúde da sua equipe
            <span style={{ color: SAGE_LIGHT }}> ficou simples</span>
          </h1>

          <p
            className="text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'rgba(255,255,255,.72)' }}
          >
            Medicina do trabalho, telemedicina ilimitada e conformidade com a NR-1 —
            tudo em uma única plataforma.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-transform hover:-translate-y-0.5"
              style={{ background: '#FFFFFF', color: BRAND }}
            >
              Começar agora <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-base text-white transition-opacity hover:opacity-80"
              style={{ border: '1px solid rgba(255,255,255,.28)' }}
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────────── */}
      <section className="py-20 md:py-24 px-6" style={{ background: '#F3F6F3' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-3 tracking-tight" style={{ color: BRAND }}>
            Como funciona
          </h2>
          <p className="text-center mb-14" style={{ color: '#85928A' }}>
            Do primeiro acesso ao atendimento em minutos
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: '01', titulo: 'Descreva os sintomas', icon: Brain,
                desc: 'A triagem inteligente avalia o quadro, classifica o risco e orienta o próximo passo.' },
              { n: '02', titulo: 'Entre na fila virtual', icon: Clock,
                desc: 'Quando há necessidade de médico, o atendimento segue a ordem de prioridade clínica.' },
              { n: '03', titulo: 'Consulta por vídeo', icon: Video,
                desc: 'O médico atende ao vivo e emite receitas, atestados e laudos digitalmente.' },
            ].map(({ n, titulo, desc, icon: Icon }) => (
              <div
                key={n}
                className="rounded-2xl p-7 transition-shadow hover:shadow-md"
                style={{ background: '#FFFFFF', border: '1px solid #E1E8E2' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(110,133,112,.12)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: SAGE }} />
                </div>
                <div className="text-xs font-semibold tracking-widest mb-2" style={{ color: SAGE }}>
                  PASSO {n}
                </div>
                <h3 className="text-lg font-semibold mb-2.5" style={{ color: BRAND }}>{titulo}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#5D6B61' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diferenciais ─────────────────────────────────────────── */}
      <section className="py-20 md:py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-14 tracking-tight" style={{ color: BRAND }}>
            Por que a Aduno
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Shield, titulo: 'Conformidade com a NR-1',
                desc: 'Mapeamento de riscos psicossociais, PGR digital e documentação sempre pronta para fiscalização.' },
              { icon: Video, titulo: 'Telemedicina ilimitada',
                desc: 'Sua equipe consulta quando precisar, sem custo adicional por atendimento.' },
              { icon: CheckCircle2, titulo: 'Médicos verificados',
                desc: 'Todos passam por validação de CRM e aprovação manual antes de atender.' },
              { icon: Users, titulo: 'Painel para o RH',
                desc: 'Gestão de funcionários em tempo real, indicadores de adesão e relatórios de utilização.' },
            ].map(({ icon: Icon, titulo, desc }, i) => (
              <div key={i} className="flex gap-5 p-6 rounded-2xl" style={{ background: '#F3F6F3' }}>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(110,133,112,.14)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: SAGE }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5" style={{ color: BRAND }}>{titulo}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#5D6B61' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 px-6 text-center" style={{ background: BRAND }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
            Pronto para começar?
          </h2>
          <p className="mb-9" style={{ color: 'rgba(255,255,255,.68)' }}>
            Cadastro gratuito. Sem burocracia. Atendimento em minutos.
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-semibold text-base text-white transition-transform hover:-translate-y-0.5"
            style={{ background: SAGE }}
          >
            Criar conta gratuita <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-10 px-6 text-center" style={{ background: '#111F18' }}>
        <img src="/aduno-logo-branca.png" alt="Aduno" className="h-7 mx-auto mb-4 opacity-90" />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,.45)' }}>
          © 2026 Aduno. Todos os direitos reservados.
        </p>
        <p className="mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,.30)' }}>
          Plataforma regulamentada conforme Resolução CFM 2.314/2022 e LGPD.
        </p>
      </footer>
    </div>
  )
}
