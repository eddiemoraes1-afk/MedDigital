import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import MedicoHeader from '@/app/medico/MedicoHeader'
import { LogIn, LogOut, UserCheck, PhoneOff, Clock } from 'lucide-react'

const POR_PAGINA = 50

// ── Tipos e helpers ───────────────────────────────────────────────────────────

type LogTipo = 'login' | 'logout' | 'assumiu_paciente' | 'encerrou_consulta'

const TIPO_CONFIG: Record<LogTipo, { label: string; cor: string; bg: string; Icone: React.FC<any> }> = {
  login:             { label: 'Login',             cor: '#4ade80', bg: 'rgba(74,222,128,0.12)',  Icone: LogIn     },
  logout:            { label: 'Logout',            cor: '#f87171', bg: 'rgba(248,113,113,0.12)', Icone: LogOut    },
  assumiu_paciente:  { label: 'Assumiu paciente',  cor: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  Icone: UserCheck },
  encerrou_consulta: { label: 'Encerrou consulta', cor: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  Icone: PhoneOff  },
}

function formatarDuracao(segundos: number | null): string {
  if (segundos == null) return '—'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 0) return `${h}h ${m}min ${s}s`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatarDataHora(iso: string): { data: string; hora: string } {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' }),
  }
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default async function LogsMedicoPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; tipo?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: medico } = await admin
    .from('medicos')
    .select('id, nome, sexo, foto_url, status')
    .eq('usuario_id', user.id)
    .single()

  if (!medico || medico.status !== 'aprovado') redirect('/medico/dashboard')

  const params   = await searchParams
  const pagina   = Math.max(1, Number(params.pagina) || 1)
  const tipoFiltro = params.tipo || ''
  const offset   = (pagina - 1) * POR_PAGINA

  // ── Query dos logs ──────────────────────────────────────────────────────────
  let query = admin
    .from('logs_sessao_medico')
    .select('*', { count: 'exact' })
    .eq('medico_id', medico.id)
    .order('criado_em', { ascending: false })
    .range(offset, offset + POR_PAGINA - 1)

  if (tipoFiltro) {
    query = query.eq('tipo', tipoFiltro)
  }

  const { data: logs, count } = await query

  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA)

  // ── Resumo rápido ───────────────────────────────────────────────────────────
  const { data: resumo } = await admin
    .from('logs_sessao_medico')
    .select('tipo, dados')
    .eq('medico_id', medico.id)

  const totalLogins    = (resumo ?? []).filter(l => l.tipo === 'login').length
  const totalConsultas = (resumo ?? []).filter(l => l.tipo === 'encerrou_consulta').length
  const totalSegundos  = (resumo ?? [])
    .filter(l => l.tipo === 'logout' && l.dados?.duracao_segundos)
    .reduce((acc: number, l: any) => acc + (l.dados.duracao_segundos ?? 0), 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <MedicoHeader
        titulo="Histórico de Sessão"
        backHref="/medico/dashboard"
        medicoNome={medico.nome}
        medicoSexo={medico.sexo}
        medicoFotoUrl={medico.foto_url}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Título */}
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: 'var(--txt-1)' }}>Histórico de Atividade</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--txt-3)' }}>
            Registro completo de sessões, consultas e eventos com horário e IP de acesso.
          </p>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total de logins',    valor: totalLogins,    Icone: LogIn,   cor: '#4ade80' },
            { label: 'Consultas realizadas', valor: totalConsultas, Icone: UserCheck, cor: '#60a5fa' },
            { label: 'Tempo total logado',   valor: formatarDuracao(totalSegundos), Icone: Clock, cor: '#fbbf24' },
          ].map(({ label, valor, Icone, cor }) => (
            <div
              key={label}
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cor}20` }}>
                <Icone className="w-5 h-5" style={{ color: cor }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--txt-3)' }}>{label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--txt-1)' }}>{valor}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros por tipo */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { value: '', label: 'Todos' },
            { value: 'login',             label: 'Login' },
            { value: 'logout',            label: 'Logout' },
            { value: 'assumiu_paciente',  label: 'Assumiu paciente' },
            { value: 'encerrou_consulta', label: 'Encerrou consulta' },
          ].map(({ value, label }) => {
            const ativo = tipoFiltro === value
            return (
              <a
                key={value}
                href={value ? `/medico/logs?tipo=${value}` : '/medico/logs'}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                style={
                  ativo
                    ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                    : { background: 'var(--surface)', color: 'var(--txt-2)', borderColor: 'var(--border)' }
                }
              >
                {label}
              </a>
            )
          })}
        </div>

        {/* Tabela */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          {/* Cabeçalho */}
          <div
            className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '1fr 160px 180px 140px 120px',
              background: 'var(--surface-2)',
              color: 'var(--txt-3)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span>Descrição</span>
            <span>Tipo</span>
            <span>Data / Hora</span>
            <span>IP</span>
            <span>Duração</span>
          </div>

          {/* Linhas */}
          {(logs ?? []).length === 0 ? (
            <div className="px-5 py-16 text-center" style={{ color: 'var(--txt-3)' }}>
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum registro encontrado.</p>
            </div>
          ) : (
            (logs ?? []).map((log: any, idx: number) => {
              const cfg = TIPO_CONFIG[log.tipo as LogTipo] ?? {
                label: log.tipo, cor: 'var(--txt-3)', bg: 'var(--surface)', Icone: Clock,
              }
              const { data, hora } = formatarDataHora(log.criado_em)
              const duracao = log.dados?.duracao_segundos != null
                ? formatarDuracao(log.dados.duracao_segundos)
                : '—'

              return (
                <div
                  key={log.id}
                  className="grid gap-4 px-5 py-3.5 items-center text-sm"
                  style={{
                    gridTemplateColumns: '1fr 160px 180px 140px 120px',
                    background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {/* Descrição */}
                  <span style={{ color: 'var(--txt-1)' }} className="truncate" title={log.descricao ?? ''}>
                    {log.descricao || '—'}
                  </span>

                  {/* Badge tipo */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit"
                    style={{ color: cfg.cor, background: cfg.bg }}
                  >
                    <cfg.Icone className="w-3 h-3" />
                    {cfg.label}
                  </span>

                  {/* Data / Hora */}
                  <div>
                    <span className="font-medium" style={{ color: 'var(--txt-1)' }}>{data}</span>
                    <span className="ml-2 font-mono text-xs" style={{ color: 'var(--txt-3)' }}>{hora}</span>
                  </div>

                  {/* IP */}
                  <span className="font-mono text-xs" style={{ color: 'var(--txt-2)' }}>
                    {log.ip || '—'}
                  </span>

                  {/* Duração */}
                  <span className="tabular-nums text-xs" style={{ color: 'var(--txt-2)' }}>
                    {duracao}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {pagina > 1 && (
              <a
                href={`/medico/logs?pagina=${pagina - 1}${tipoFiltro ? `&tipo=${tipoFiltro}` : ''}`}
                className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--txt-2)', borderColor: 'var(--border)' }}
              >
                ← Anterior
              </a>
            )}
            <span className="px-4 py-2 text-sm" style={{ color: 'var(--txt-3)' }}>
              {pagina} / {totalPaginas}
            </span>
            {pagina < totalPaginas && (
              <a
                href={`/medico/logs?pagina=${pagina + 1}${tipoFiltro ? `&tipo=${tipoFiltro}` : ''}`}
                className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--txt-2)', borderColor: 'var(--border)' }}
              >
                Próxima →
              </a>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
