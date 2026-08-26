import Link from 'next/link'
import {
  Video, Stethoscope, FileText, FlaskConical, ClipboardList, RefreshCw,
  BarChart3, Users, ShieldCheck, Smartphone, Clock, HeartPulse,
  ArrowRight, Check, MessageCircle,
} from 'lucide-react'

// ⚠️ TROCAR pelo WhatsApp comercial da Aduno (formato: 55 + DDD + número)
const WHATSAPP = '5548000000000'
const zap = (texto: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`

const BRAND = '#19382E'
const SAGE = '#6E8570'
const LIGHT = '#8FA891'
const BG = '#F3F6F3'
const TXT = '#5D6B61'
const LINE = '#E1E8E2'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-30 px-6 py-4" style={{ background: BRAND }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><img src="/aduno-logo-branca.png" alt="Aduno" className="h-7 md:h-8" /></Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login" className="text-sm px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
              style={{ color: 'rgba(255,255,255,.75)' }}>
              Entrar
            </Link>
            <a href={zap('Olá! Quero conhecer a Aduno para a minha empresa.')}
              target="_blank" rel="noopener noreferrer"
              className="text-sm px-4 py-2 rounded-xl font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: SAGE }}>
              Falar com a gente
            </a>
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32" style={{ background: BRAND }}>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full opacity-[0.07]"
          style={{ border: `56px solid ${LIGHT}` }} />
        <div aria-hidden className="pointer-events-none absolute -left-32 -bottom-24 h-[320px] w-[320px] rounded-full opacity-[0.05]"
          style={{ border: `44px solid ${LIGHT}` }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs md:text-sm px-4 py-1.5 rounded-full mb-8 font-medium"
            style={{ background: 'rgba(143,168,145,.16)', color: LIGHT }}>
            Saúde para quem faz a sua empresa acontecer
          </span>

          <h1 className="text-4xl md:text-6xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
            Sua empresa é tão forte
            <span style={{ color: LIGHT }}> quanto o seu time</span>
          </h1>

          <p className="text-base md:text-lg mb-4 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'rgba(255,255,255,.75)' }}>
            Atendimento médico de verdade para os seus funcionários — por vídeo, direto do celular,
            sem fila e sem pagar por consulta.
          </p>
          <p className="text-sm md:text-base mb-10 max-w-xl mx-auto"
            style={{ color: 'rgba(255,255,255,.5)' }}>
            Sem plano de saúde. Sem burocracia. Pronto para usar em poucos dias.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={zap('Olá! Quero conhecer a Aduno para a minha empresa.')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-transform hover:-translate-y-0.5"
              style={{ background: '#FFFFFF', color: BRAND }}>
              Quero conhecer <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#o-que-fazemos"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-base text-white transition-opacity hover:opacity-80"
              style={{ border: '1px solid rgba(255,255,255,.28)' }}>
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* ══ FAIXA DE DESTAQUES ══ */}
      <section className="px-6 py-8" style={{ background: '#152F26' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Smartphone, t: 'Do celular' },
            { icon: Clock, t: 'Sem fila de espera' },
            { icon: Stethoscope, t: 'Médicos verificados' },
            { icon: BarChart3, t: 'Painel para o RH' },
          ].map(({ icon: Icon, t }) => (
            <div key={t} className="flex items-center gap-3 justify-center md:justify-start">
              <Icon className="w-5 h-5 shrink-0" style={{ color: LIGHT }} />
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,.85)' }}>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ O PROBLEMA ══ */}
      <section className="px-6 py-20 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight" style={{ color: BRAND }}>
              Quando alguém do time adoece, a conta não chega sozinha
            </h2>
            <p className="text-base leading-relaxed" style={{ color: TXT }}>
              Ela vem acompanhada de prazo perdido, colega sobrecarregado, cliente esperando
              e um gestor apagando incêndio. Na maioria das vezes, tudo isso começou com algo
              pequeno — que ninguém tratou porque marcar consulta dá trabalho demais.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                t: 'A pessoa adia até virar problema',
                d: 'Faltar meio dia de trabalho para ir ao médico custa caro para quem ganha por hora. Então adia. E o que era simples vira afastamento.',
              },
              {
                t: 'O RH vira central de atendimento',
                d: 'Atestado que chega no WhatsApp, exame que ninguém sabe se foi feito, funcionário perguntando onde marcar. Tudo manual, tudo no papel.',
              },
              {
                t: 'Plano de saúde não cabe no orçamento',
                d: 'Para muitas empresas, oferecer plano é inviável. Aí não se oferece nada — e o time sente que a empresa não se importa.',
              },
            ].map(({ t, d }) => (
              <div key={t} className="rounded-2xl p-6" style={{ background: BG }}>
                <h3 className="font-semibold mb-2 text-[15px]" style={{ color: BRAND }}>{t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ O QUE FAZEMOS ══ */}
      <section id="o-que-fazemos" className="px-6 py-20 md:py-24" style={{ background: BG }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold tracking-widest" style={{ color: SAGE }}>O QUE A ADUNO FAZ</span>
            <h2 className="text-3xl md:text-4xl font-semibold mt-3 mb-4 tracking-tight" style={{ color: BRAND }}>
              Tudo o que seu time precisa, num aplicativo só
            </h2>
            <p className="text-base leading-relaxed" style={{ color: TXT }}>
              Não é um desconto. Não é um telefone de emergência. É atendimento médico completo,
              com médico de verdade do outro lado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: HeartPulse, t: 'Avaliação inicial em minutos',
                d: 'O funcionário descreve o que está sentindo e recebe uma orientação imediata sobre a gravidade e o próximo passo. Sem precisar adivinhar se aquilo é sério.',
              },
              {
                icon: Video, t: 'Consulta por vídeo com médico',
                d: 'Atendimento ao vivo, do celular, de casa ou do trabalho. Sem sala de espera, sem deslocamento, sem perder o dia.',
              },
              {
                icon: FileText, t: 'Receita e atestado digitais',
                d: 'Emitidos na hora, com validade legal, direto no celular. A farmácia aceita, o RH recebe, ninguém precisa de papel.',
              },
              {
                icon: FlaskConical, t: 'Solicitação de exames',
                d: 'O médico pede o exame pela plataforma e o funcionário recebe o pedido no aplicativo, pronto para levar ao laboratório.',
              },
              {
                icon: ClipboardList, t: 'Histórico que não se perde',
                d: 'Todo atendimento fica registrado. O próximo médico já sabe o que aconteceu antes — o que evita repetir exame e errar conduta.',
              },
              {
                icon: RefreshCw, t: 'Renovação de receita contínua',
                d: 'Quem usa medicamento de uso contínuo renova pelo aplicativo, sem precisar de uma consulta inteira só para isso.',
              },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl p-7 bg-white transition-shadow hover:shadow-md"
                style={{ border: `1px solid ${LINE}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(110,133,112,.12)' }}>
                  <Icon className="w-5 h-5" style={{ color: SAGE }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: BRAND }}>{t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMO FUNCIONA ══ */}
      <section className="px-6 py-20 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-3 tracking-tight" style={{ color: BRAND }}>
            Para o funcionário, são três passos
          </h2>
          <p className="text-center mb-14" style={{ color: '#85928A' }}>
            Simples o suficiente para quem nunca usou um aplicativo de saúde
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: '01', t: 'Ele abre o app e diz o que sente', d: 'Sem cadastro complicado. O acesso é liberado pelo CPF que a empresa já informou.' },
              { n: '02', t: 'Entra na fila virtual', d: 'A ordem segue a prioridade clínica — quem está pior é atendido primeiro. E ele espera onde quiser.' },
              { n: '03', t: 'É atendido por vídeo', d: 'O médico avalia, orienta e emite o que for preciso. Tudo fica salvo no histórico dele.' },
            ].map(({ n, t, d }) => (
              <div key={n} className="relative rounded-2xl p-7" style={{ background: BG }}>
                <span className="text-4xl font-semibold block mb-3" style={{ color: LIGHT }}>{n}</span>
                <h3 className="text-lg font-semibold mb-2" style={{ color: BRAND }}>{t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PARA O RH ══ */}
      <section className="px-6 py-20 md:py-24" style={{ background: BRAND }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest" style={{ color: LIGHT }}>PARA QUEM GERENCIA</span>
            <h2 className="text-3xl md:text-4xl font-semibold text-white mt-3 mb-5 tracking-tight">
              O RH para de correr atrás de papel
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,.7)' }}>
              Você abre um painel e vê a saúde da sua equipe em números. Sem planilha,
              sem pasta de atestado, sem depender da memória de ninguém.
            </p>
            <a href={zap('Olá! Quero ver o painel da Aduno para o RH.')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-base transition-transform hover:-translate-y-0.5"
              style={{ background: '#FFFFFF', color: BRAND }}>
              Ver o painel <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="rounded-2xl p-7" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)' }}>
            {[
              'Adicionar e desligar funcionários em tempo real, sem planilha',
              'Todos os atestados reunidos, com data e motivo',
              'Quanto a equipe usou no mês e quanto isso custou',
              'Quem já ativou a conta e quem ainda não',
              'Exames solicitados e realizados, por funcionário',
              'Relatórios prontos para exportar em Excel e PDF',
              'Obrigações legais da empresa organizadas e em dia',
            ].map(item => (
              <div key={item} className="flex gap-3 items-start py-2.5">
                <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: LIGHT }} />
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.82)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ POR QUE A ADUNO ══ */}
      <section className="px-6 py-20 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-14 tracking-tight" style={{ color: BRAND }}>
            Por que empresas escolhem a Aduno
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: Stethoscope, t: 'Tem médico na frente, não só tecnologia',
                d: 'A Aduno é liderada por médico. Quem define o cuidado aqui é quem entende de gente doente — não quem entende só de software.',
              },
              {
                icon: Users, t: 'Cabe no orçamento de qualquer empresa',
                d: 'Custa uma fração de um plano de saúde. Empresas que nunca puderam oferecer nada, agora conseguem oferecer algo de verdade.',
              },
              {
                icon: ShieldCheck, t: 'Seus dados são tratados com seriedade',
                d: 'Informação de saúde é sigilosa. O gestor vê números e indicadores — nunca o prontuário de ninguém.',
              },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl p-7" style={{ background: BG }}>
                <Icon className="w-6 h-6 mb-4" style={{ color: SAGE }} />
                <h3 className="font-semibold mb-2 text-[17px]" style={{ color: BRAND }}>{t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="px-6 py-20 md:py-24" style={{ background: BG }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12 tracking-tight" style={{ color: BRAND }}>
            Perguntas que todo mundo faz
          </h2>

          <div className="space-y-3">
            {[
              {
                q: 'Isso substitui o plano de saúde?',
                a: 'Não, e a gente não promete isso. Plano de saúde cobre internação, cirurgia e urgência hospitalar. A Aduno resolve o dia a dia: aquela dor que apareceu, a receita que acabou, o exame que precisa pedir. Muitas empresas usam os dois. Outras só a Aduno, porque plano não cabe no orçamento.',
              },
              {
                q: 'Meu time é simples, vai conseguir usar?',
                a: 'Sim. Foi feito para isso. O funcionário entra com o CPF, escreve o que está sentindo e espera ser chamado. Se ele usa WhatsApp, usa a Aduno. E a gente ajuda na comunicação interna para todo mundo entender.',
              },
              {
                q: 'Quanto tempo leva para começar?',
                a: 'Poucos dias. Você envia a lista de funcionários, a gente configura, e sua equipe já pode usar. Não precisa instalar nada na empresa nem integrar com sistema nenhum.',
              },
              {
                q: 'E se o funcionário quase não usar?',
                a: 'Uso baixo geralmente é sinal de comunicação fraca, não de falta de necessidade. Por isso a gente acompanha a adesão junto com você e age quando o número não sobe. Você enxerga isso no painel a qualquer momento.',
              },
              {
                q: 'Quanto custa?',
                a: 'Depende do tamanho da equipe. O valor é por funcionário e cai conforme o número aumenta. Fale com a gente que montamos uma proposta para o seu caso — sem compromisso.',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-2xl bg-white overflow-hidden"
                style={{ border: `1px solid ${LINE}` }}>
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-6 py-5 font-semibold text-[15px] flex items-center justify-between gap-4"
                  style={{ color: BRAND }}>
                  {q}
                  <span className="shrink-0 text-xl font-normal transition-transform group-open:rotate-45"
                    style={{ color: SAGE }}>+</span>
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: TXT }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="relative overflow-hidden px-6 py-24 text-center" style={{ background: BRAND }}>
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-[280px] w-[280px] rounded-full opacity-[0.06]"
          style={{ border: `40px solid ${LIGHT}` }} />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
            Seu time cuida da sua empresa todo dia
          </h2>
          <p className="text-lg mb-3" style={{ color: LIGHT }}>
            Que tal a empresa cuidar dele de volta?
          </p>
          <p className="text-sm mb-10 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,.55)' }}>
            Conversa de 15 minutos, sem compromisso. A gente entende o seu caso
            e mostra exatamente como funcionaria na sua empresa.
          </p>
          <a href={zap('Olá! Quero conversar sobre a Aduno para a minha empresa.')}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl font-semibold text-base text-white transition-transform hover:-translate-y-0.5"
            style={{ background: SAGE }}>
            <MessageCircle className="w-5 h-5" />
            Falar com a gente agora
          </a>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-12 px-6" style={{ background: '#111F18' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8"
            style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <img src="/aduno-logo-branca.png" alt="Aduno" className="h-7 opacity-90" />
            <div className="flex items-center gap-6 text-sm">
              <a href="#o-que-fazemos" style={{ color: 'rgba(255,255,255,.5)' }}>O que fazemos</a>
              <Link href="/login" style={{ color: 'rgba(255,255,255,.5)' }}>Entrar</Link>
              <a href={zap('Olá! Quero falar com a Aduno.')} target="_blank" rel="noopener noreferrer"
                style={{ color: LIGHT }}>Contato</a>
            </div>
          </div>
          <div className="pt-6 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,.42)' }}>
              © 2026 Aduno. Todos os direitos reservados.
            </p>
            <p className="mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,.28)' }}>
              Atendimento realizado por médicos inscritos no CRM, conforme a Resolução CFM 2.314/2022.
              Dados tratados de acordo com a LGPD.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
