import Link from 'next/link'
import {
  Video, Stethoscope, FileText, FlaskConical, ClipboardList, RefreshCw,
  Users, ShieldCheck, Smartphone, Clock, HeartPulse,
  ArrowRight, Check, MessageCircle,
} from 'lucide-react'

// WhatsApp comercial da Aduno — (47) 99601-8399
const WHATSAPP = '5547996018399'
const zap = (texto: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`

const BRAND = '#19382E'
const DEEP  = '#122A21'
const SAGE  = '#6E8570'
const LIGHT = '#8FA891'
const BG    = '#F3F6F3'
const TXT   = '#5D6B61'
const LINE  = '#E1E8E2'

/* ─────────────────────────────────────────────────────────────
   Anel da marca — usado como elemento gráfico em toda a página
   ───────────────────────────────────────────────────────────── */
function Anel({ className = '', cor = LIGHT, esp = 40, op = 0.07 }:
  { className?: string; cor?: string; esp?: number; op?: number }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute rounded-full ${className}`}
      style={{ border: `${esp}px solid ${cor}`, opacity: op }} />
  )
}

function Rotulo({ children, claro = false }: { children: React.ReactNode; claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.18em]"
      style={{ color: claro ? LIGHT : SAGE }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Ilustração do produto — composição abstrata, não é captura de tela
   ───────────────────────────────────────────────────────────── */
function Ilustracao() {
  return (
    <svg viewBox="0 0 720 420" className="w-full h-auto" role="img"
      aria-label="Ilustração do painel do RH e do aplicativo de consulta do funcionário">
      <defs>
        <clipPath id="tela"><rect x="452" y="46" width="176" height="336" rx="22" /></clipPath>
      </defs>

      {/* painel do RH */}
      <rect x="20" y="40" width="530" height="330" rx="18" fill="#FFFFFF" stroke={LINE} />
      <rect x="20" y="40" width="530" height="46" rx="18" fill={BG} />
      <rect x="20" y="70" width="530" height="16" fill={BG} />
      <circle cx="44" cy="63" r="4" fill="#D8E0D9" />
      <circle cx="58" cy="63" r="4" fill="#D8E0D9" />
      <circle cx="72" cy="63" r="4" fill="#D8E0D9" />
      <rect x="96" y="58" width="92" height="10" rx="5" fill="#DCE4DD" />

      {/* cartões de indicador */}
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${44 + i * 162}, 108)`}>
          <rect width="146" height="80" rx="12" fill={BG} />
          <rect x="16" y="18" width="42" height="7" rx="3.5" fill="#C9D4CB" />
          <rect x="16" y="36" width="64" height="20" rx="5" fill={BRAND} opacity="0.85" />
          <rect x="16" y="63" width="80" height="6" rx="3" fill="#D3DCD4" />
        </g>
      ))}

      {/* gráfico de barras */}
      <g transform="translate(44, 212)">
        <rect width="470" height="136" rx="12" fill="#FFFFFF" stroke={LINE} />
        <rect x="18" y="18" width="88" height="7" rx="3.5" fill="#C9D4CB" />
        {[38, 62, 46, 82, 58, 96, 70, 104].map((h, i) => (
          <rect key={i} x={20 + i * 56} y={116 - h} width="34" height={h} rx="6"
            fill={i % 2 === 0 ? SAGE : LIGHT} opacity={i % 2 === 0 ? 0.9 : 0.55} />
        ))}
      </g>

      {/* celular do funcionário */}
      <g>
        <rect x="446" y="40" width="188" height="348" rx="28" fill={BRAND} />
        <rect x="452" y="46" width="176" height="336" rx="22" fill="#FFFFFF" />
        <g clipPath="url(#tela)">
          <rect x="452" y="46" width="176" height="92" fill={BRAND} />
          <circle cx="540" cy="86" r="21" fill="#FFFFFF" opacity="0.14" />
          <circle cx="540" cy="80" r="7.5" fill="#FFFFFF" opacity="0.6" />
          <path d="M 527 98 a 13 13 0 0 1 26 0 z" fill="#FFFFFF" opacity="0.6" />
          <rect x="504" y="116" width="72" height="7" rx="3.5" fill={LIGHT} opacity="0.75" />

          {/* balões de conversa */}
          <rect x="468" y="156" width="104" height="30" rx="12" fill={BG} />
          <rect x="480" y="166" width="66" height="6" rx="3" fill="#C9D4CB" />
          <rect x="480" y="176" width="44" height="5" rx="2.5" fill="#D6DED7" />

          <rect x="510" y="198" width="102" height="30" rx="12" fill={SAGE} opacity="0.16" />
          <rect x="522" y="208" width="62" height="6" rx="3" fill={SAGE} opacity="0.55" />
          <rect x="522" y="218" width="40" height="5" rx="2.5" fill={SAGE} opacity="0.35" />

          <rect x="468" y="240" width="118" height="30" rx="12" fill={BG} />
          <rect x="480" y="250" width="80" height="6" rx="3" fill="#C9D4CB" />
          <rect x="480" y="260" width="52" height="5" rx="2.5" fill="#D6DED7" />

          {/* botão */}
          <rect x="474" y="306" width="132" height="38" rx="14" fill={BRAND} />
          <rect x="506" y="321" width="68" height="8" rx="4" fill="#FFFFFF" opacity="0.85" />
        </g>
        <rect x="524" y="54" width="32" height="5" rx="2.5" fill="#FFFFFF" opacity="0.25" />
      </g>
    </svg>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased">

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-40 px-6 py-3.5 backdrop-blur"
        style={{ background: 'rgba(25,56,46,.94)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><img src="/aduno-logo-branca.png" alt="Aduno" className="h-7 md:h-[30px]" /></Link>
          <div className="flex items-center gap-1.5 md:gap-3">
            <Link href="/login" className="text-sm px-4 py-2 rounded-xl transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,.72)' }}>
              Entrar
            </Link>
            <a href={zap('Olá! Quero conhecer a Aduno para a minha empresa.')}
              target="_blank" rel="noopener noreferrer"
              className="text-sm px-5 py-2.5 rounded-xl font-medium text-white transition-all hover:brightness-110"
              style={{ background: SAGE }}>
              Falar com a gente
            </a>
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden px-6 pt-24 md:pt-32 pb-52 md:pb-64"
        style={{ background: BRAND }}>
        <Anel className="-right-32 -top-40 h-[520px] w-[520px]" esp={64} op={0.06} />
        <Anel className="-left-40 top-32 h-[380px] w-[380px]" esp={48} op={0.045} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
          style={{ background: `linear-gradient(to bottom, transparent, ${DEEP})` }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs md:text-[13px] px-4 py-1.5 rounded-full mb-9 font-medium"
            style={{ background: 'rgba(143,168,145,.15)', color: LIGHT, border: '1px solid rgba(143,168,145,.22)' }}>
            Saúde para quem faz a sua empresa acontecer
          </span>

          <h1 className="text-[2.6rem] leading-[1.06] md:text-[4.4rem] md:leading-[1.03] font-semibold text-white mb-7 tracking-[-0.03em]">
            Sua empresa é tão forte
            <br className="hidden sm:block" />
            <span style={{ color: LIGHT }}> quanto o seu time</span>
          </h1>

          <p className="text-[17px] md:text-xl mb-4 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'rgba(255,255,255,.78)' }}>
            Atendimento médico de verdade para os seus funcionários — por vídeo,
            direto do celular, sem fila e sem pagar por consulta.
          </p>
          <p className="text-sm md:text-[15px] mb-11" style={{ color: 'rgba(255,255,255,.45)' }}>
            Sem plano de saúde · Sem burocracia · Pronto em poucos dias
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={zap('Olá! Quero conhecer a Aduno para a minha empresa.')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-2xl font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: '#FFFFFF', color: BRAND }}>
              Quero conhecer <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#o-que-fazemos"
              className="inline-flex items-center justify-center px-9 py-4 rounded-2xl font-semibold text-[15px] text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,.26)' }}>
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* ══ ILUSTRAÇÃO FLUTUANTE ══ */}
      <section className="relative px-6" style={{ background: BG }}>
        <div className="max-w-4xl mx-auto -mt-40 md:-mt-52 relative z-10">
          <div className="rounded-[28px] p-4 md:p-7"
            style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, boxShadow: '0 32px 70px -30px rgba(18,42,33,.45)' }}>
            <Ilustracao />
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-14 pb-20">
          {[
            { icon: Smartphone, t: 'Do celular' },
            { icon: Clock, t: 'Sem fila de espera' },
            { icon: Stethoscope, t: 'Médicos verificados' },
            { icon: Users, t: 'Painel para o RH' },
          ].map(({ icon: Icon, t }) => (
            <div key={t} className="flex items-center gap-3 justify-center">
              <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: SAGE }} />
              <span className="text-[13px] md:text-sm font-medium" style={{ color: BRAND }}>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ O PROBLEMA ══ */}
      <section className="px-6 py-24 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-16">
            <Rotulo>O PROBLEMA</Rotulo>
            <h2 className="text-[2rem] md:text-[2.7rem] leading-[1.12] font-semibold mt-5 mb-5 tracking-[-0.02em]"
              style={{ color: BRAND }}>
              Quando alguém do time adoece,
              a conta não chega sozinha
            </h2>
            <p className="text-[17px] leading-relaxed" style={{ color: TXT }}>
              Ela vem acompanhada de prazo perdido, colega sobrecarregado, cliente esperando
              e um gestor apagando incêndio. Quase sempre começou com algo pequeno — que
              ninguém tratou porque marcar consulta dá trabalho demais.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { t: 'A pessoa adia até virar problema',
                d: 'Faltar meio dia de trabalho para ir ao médico custa caro para quem ganha por hora. Então adia. E o que era simples vira afastamento.' },
              { t: 'O RH vira central de atendimento',
                d: 'Atestado que chega no WhatsApp, exame que ninguém sabe se foi feito, funcionário perguntando onde marcar. Tudo manual, tudo no papel.' },
              { t: 'Plano de saúde não cabe no orçamento',
                d: 'Para muitas empresas, oferecer plano é inviável. Aí não se oferece nada — e o time sente que a empresa não se importa.' },
            ].map(({ t, d }, i) => (
              <div key={t} className="relative rounded-2xl p-7 overflow-hidden" style={{ background: BG }}>
                <span className="block text-[13px] font-semibold mb-4 tabular-nums" style={{ color: LIGHT }}>
                  0{i + 1}
                </span>
                <h3 className="font-semibold mb-2.5 text-[16px] leading-snug" style={{ color: BRAND }}>{t}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ O QUE FAZEMOS ══ */}
      <section id="o-que-fazemos" className="relative overflow-hidden px-6 py-24 md:py-28" style={{ background: BG }}>
        <Anel className="-right-28 top-16 h-[300px] w-[300px]" cor={SAGE} esp={38} op={0.05} />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Rotulo>O QUE A ADUNO FAZ</Rotulo>
            <h2 className="text-[2rem] md:text-[2.7rem] leading-[1.12] font-semibold mt-5 mb-5 tracking-[-0.02em]"
              style={{ color: BRAND }}>
              Tudo o que seu time precisa,
              num aplicativo só
            </h2>
            <p className="text-[17px] leading-relaxed" style={{ color: TXT }}>
              Não é um desconto. Não é um telefone de emergência. É atendimento médico
              completo, com médico de verdade do outro lado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: HeartPulse, t: 'Avaliação inicial em minutos',
                d: 'O funcionário descreve o que sente e recebe orientação imediata sobre a gravidade e o próximo passo.' },
              { icon: Video, t: 'Consulta por vídeo com médico',
                d: 'Ao vivo, do celular, de casa ou do trabalho. Sem sala de espera, sem deslocamento, sem perder o dia.' },
              { icon: FileText, t: 'Receita e atestado digitais',
                d: 'Emitidos na hora, com validade legal. A farmácia aceita, o RH recebe, ninguém precisa de papel.' },
              { icon: FlaskConical, t: 'Solicitação de exames',
                d: 'O médico pede pela plataforma e o funcionário recebe no aplicativo, pronto para levar ao laboratório.' },
              { icon: ClipboardList, t: 'Histórico que não se perde',
                d: 'Todo atendimento fica registrado. O próximo médico já sabe o que aconteceu antes.' },
              { icon: RefreshCw, t: 'Renovação de receita contínua',
                d: 'Quem usa medicamento contínuo renova pelo aplicativo, sem gastar uma consulta inteira com isso.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="group rounded-2xl p-7 bg-white transition-all hover:-translate-y-1"
                style={{ border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(18,42,33,.04)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-colors"
                  style={{ background: 'rgba(110,133,112,.11)' }}>
                  <Icon className="w-[19px] h-[19px]" style={{ color: SAGE }} />
                </div>
                <h3 className="text-[16px] font-semibold mb-2.5 leading-snug" style={{ color: BRAND }}>{t}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMO FUNCIONA ══ */}
      <section className="px-6 py-24 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Rotulo>PASSO A PASSO</Rotulo>
            <h2 className="text-[2rem] md:text-[2.7rem] leading-[1.12] font-semibold mt-5 mb-4 tracking-[-0.02em]"
              style={{ color: BRAND }}>
              Para o funcionário, são três passos
            </h2>
            <p className="text-[16px]" style={{ color: '#85928A' }}>
              Simples o suficiente para quem nunca usou um aplicativo de saúde
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-6">
            <div aria-hidden className="hidden md:block absolute top-9 left-[16%] right-[16%] border-t border-dashed"
              style={{ borderColor: '#D5DFD7' }} />
            {[
              { n: '1', t: 'Abre o app e diz o que sente', d: 'Sem cadastro complicado. O acesso é liberado pelo CPF que a empresa já informou.' },
              { n: '2', t: 'Entra na fila virtual', d: 'A ordem segue a prioridade clínica — quem está pior é atendido primeiro. E espera onde quiser.' },
              { n: '3', t: 'É atendido por vídeo', d: 'O médico avalia, orienta e emite o que for preciso. Tudo fica salvo no histórico dele.' },
            ].map(({ n, t, d }) => (
              <div key={n} className="relative text-center px-2">
                <div className="relative z-10 mx-auto w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-6 text-[26px] font-semibold text-white"
                  style={{ background: BRAND, boxShadow: '0 10px 24px -10px rgba(25,56,46,.5)' }}>
                  {n}
                </div>
                <h3 className="text-[17px] font-semibold mb-2.5" style={{ color: BRAND }}>{t}</h3>
                <p className="text-[14px] leading-relaxed max-w-[15rem] mx-auto" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PARA O RH ══ */}
      <section className="relative overflow-hidden px-6 py-24 md:py-28" style={{ background: BRAND }}>
        <Anel className="-left-36 -bottom-28 h-[380px] w-[380px]" esp={48} op={0.055} />
        <div className="relative max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <Rotulo claro>PARA QUEM GERENCIA</Rotulo>
            <h2 className="text-[2rem] md:text-[2.7rem] leading-[1.12] font-semibold text-white mt-5 mb-6 tracking-[-0.02em]">
              O RH para de correr atrás de papel
            </h2>
            <p className="text-[17px] leading-relaxed mb-9" style={{ color: 'rgba(255,255,255,.72)' }}>
              Você abre um painel e vê a saúde da sua equipe em números. Sem planilha,
              sem pasta de atestado, sem depender da memória de ninguém.
            </p>
            <a href={zap('Olá! Quero ver o painel da Aduno para o RH.')}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-[15px] transition-all hover:-translate-y-0.5"
              style={{ background: '#FFFFFF', color: BRAND }}>
              Ver o painel <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="rounded-2xl p-7 md:p-8"
            style={{ background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.11)' }}>
            {[
              'Adicionar e desligar funcionários em tempo real',
              'Todos os atestados reunidos, com data e motivo',
              'Quanto a equipe usou no mês e quanto isso custou',
              'Quem já ativou a conta e quem ainda não',
              'Exames solicitados e realizados, por funcionário',
              'Relatórios prontos para exportar em Excel e PDF',
              'Obrigações legais da empresa organizadas e em dia',
            ].map(item => (
              <div key={item} className="flex gap-3.5 items-start py-[9px]">
                <span className="mt-0.5 shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(143,168,145,.2)' }}>
                  <Check className="w-3 h-3" style={{ color: LIGHT }} />
                </span>
                <span className="text-[14.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,.85)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ POR QUE A ADUNO ══ */}
      <section className="px-6 py-24 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Rotulo>DIFERENCIAIS</Rotulo>
            <h2 className="text-[2rem] md:text-[2.7rem] leading-[1.12] font-semibold mt-5 tracking-[-0.02em]"
              style={{ color: BRAND }}>
              Por que empresas escolhem a Aduno
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Stethoscope, t: 'Tem médico na frente, não só tecnologia',
                d: 'A Aduno é liderada por médico. Quem define o cuidado aqui é quem entende de gente doente — não quem entende só de software.' },
              { icon: Users, t: 'Cabe no orçamento de qualquer empresa',
                d: 'Custa uma fração de um plano de saúde. Empresas que nunca puderam oferecer nada, agora conseguem oferecer algo de verdade.' },
              { icon: ShieldCheck, t: 'Seus dados tratados com seriedade',
                d: 'Informação de saúde é sigilosa. O gestor vê números e indicadores — nunca o prontuário de ninguém.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl p-8" style={{ background: BG }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: '#FFFFFF', border: `1px solid ${LINE}` }}>
                  <Icon className="w-5 h-5" style={{ color: SAGE }} />
                </div>
                <h3 className="font-semibold mb-3 text-[17px] leading-snug" style={{ color: BRAND }}>{t}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: TXT }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="px-6 py-24 md:py-28" style={{ background: BG }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <Rotulo>DÚVIDAS</Rotulo>
            <h2 className="text-[2rem] md:text-[2.7rem] leading-[1.12] font-semibold mt-5 tracking-[-0.02em]"
              style={{ color: BRAND }}>
              Perguntas que todo mundo faz
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { q: 'Isso substitui o plano de saúde?',
                a: 'Não, e a gente não promete isso. Plano de saúde cobre internação, cirurgia e urgência hospitalar. A Aduno resolve o dia a dia: aquela dor que apareceu, a receita que acabou, o exame que precisa pedir. Muitas empresas usam os dois. Outras só a Aduno, porque plano não cabe no orçamento.' },
              { q: 'Meu time é simples, vai conseguir usar?',
                a: 'Sim. Foi feito para isso. O funcionário entra com o CPF, escreve o que está sentindo e espera ser chamado. Se ele usa WhatsApp, usa a Aduno. E a gente ajuda na comunicação interna para todo mundo entender.' },
              { q: 'Quanto tempo leva para começar?',
                a: 'Poucos dias. Você envia a lista de funcionários, a gente configura, e sua equipe já pode usar. Não precisa instalar nada na empresa nem integrar com sistema nenhum.' },
              { q: 'E se o funcionário quase não usar?',
                a: 'Uso baixo geralmente é sinal de comunicação fraca, não de falta de necessidade. Por isso a gente acompanha a adesão junto com você e age quando o número não sobe. Você enxerga isso no painel a qualquer momento.' },
              { q: 'Quanto custa?',
                a: 'Depende do tamanho da equipe. O valor é por funcionário e cai conforme o número aumenta. Fale com a gente que montamos uma proposta para o seu caso — sem compromisso.' },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-2xl bg-white overflow-hidden transition-shadow hover:shadow-sm"
                style={{ border: `1px solid ${LINE}` }}>
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-7 py-5 font-semibold text-[15.5px] flex items-center justify-between gap-5"
                  style={{ color: BRAND }}>
                  {q}
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-lg font-normal leading-none transition-transform duration-200 group-open:rotate-45"
                    style={{ background: 'rgba(110,133,112,.12)', color: SAGE }}>+</span>
                </summary>
                <p className="px-7 pb-6 text-[14.5px] leading-relaxed" style={{ color: TXT }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="relative overflow-hidden px-6 py-28 text-center" style={{ background: BRAND }}>
        <Anel className="-left-24 -top-24 h-[320px] w-[320px]" esp={42} op={0.06} />
        <Anel className="-right-28 -bottom-28 h-[360px] w-[360px]" esp={46} op={0.05} />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-[2.1rem] md:text-[3rem] leading-[1.1] font-semibold text-white mb-5 tracking-[-0.025em]">
            Seu time cuida da sua empresa todo dia
          </h2>
          <p className="text-xl md:text-2xl mb-6" style={{ color: LIGHT }}>
            Que tal a empresa cuidar dele de volta?
          </p>
          <p className="text-[15px] mb-11 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>
            Conversa de 15 minutos, sem compromisso. A gente entende o seu caso e mostra
            exatamente como funcionaria na sua empresa.
          </p>
          <a href={zap('Olá! Quero conversar sobre a Aduno para a minha empresa.')}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-11 py-4.5 rounded-2xl font-semibold text-[16px] text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: SAGE, paddingTop: '1.05rem', paddingBottom: '1.05rem' }}>
            <MessageCircle className="w-5 h-5" />
            Falar com a gente agora
          </a>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-14 px-6" style={{ background: DEEP }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-7 pb-9"
            style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
            <img src="/aduno-logo-branca.png" alt="Aduno" className="h-7 opacity-90" />
            <div className="flex items-center gap-7 text-[14px]">
              <a href="#o-que-fazemos" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,.5)' }}>O que fazemos</a>
              <Link href="/login" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,.5)' }}>Entrar</Link>
              <a href={zap('Olá! Quero falar com a Aduno.')} target="_blank" rel="noopener noreferrer"
                style={{ color: LIGHT }}>Contato</a>
            </div>
          </div>
          <div className="pt-7 text-center">
            <p className="text-[13.5px]" style={{ color: 'rgba(255,255,255,.4)' }}>
              © 2026 Aduno. Todos os direitos reservados.
            </p>
            <p className="mt-2 text-[12px] max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,.26)' }}>
              Atendimento realizado por médicos inscritos no CRM, conforme a Resolução CFM 2.314/2022.
              Dados tratados de acordo com a LGPD.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
