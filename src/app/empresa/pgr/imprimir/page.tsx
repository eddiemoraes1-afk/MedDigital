import { requireEmpresa } from '@/lib/auth-sistema'
import { createAdminClient } from '@/lib/supabase/server'
import PrintButton from './PrintButton'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtNivel(n: string | null | undefined) {
  const m: Record<string, string> = {
    nao_identificado: 'Não identificado',
    baixo: 'Baixo',
    medio: 'Médio',
    alto: 'Alto',
  }
  return m[n ?? 'nao_identificado'] ?? (n ?? '—')
}

function fmtStatus(s: string) {
  const m: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  }
  return m[s] ?? s
}

function fmtTipo(t: string) {
  const m: Record<string, string> = {
    revisao_periodica: 'Revisão periódica',
    reavaliacao: 'Reavaliação',
    incidente: 'Incidente',
  }
  return m[t] ?? t
}

function nivelColor(n: string | null | undefined) {
  const m: Record<string, { bg: string; color: string; border: string }> = {
    baixo: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
    medio: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
    alto: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
    nao_identificado: { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' },
  }
  return m[n ?? 'nao_identificado'] ?? m['nao_identificado']
}

function statusColor(s: string) {
  const m: Record<string, { bg: string; color: string }> = {
    pendente: { bg: '#FFFBEB', color: '#92400E' },
    em_andamento: { bg: '#EFF6FF', color: '#1E40AF' },
    concluido: { bg: '#ECFDF5', color: '#065F46' },
    cancelado: { bg: '#F3F4F6', color: '#6B7280' },
  }
  return m[s] ?? { bg: '#F3F4F6', color: '#6B7280' }
}

// ── Componentes visuais ───────────────────────────────────────────────────────
function SectionHeader({ num, title, norma }: { num: string; title: string; norma: string }) {
  return (
    <div style={{ marginTop: 32, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 5, minHeight: 36, background: '#5BBD9B', borderRadius: 3, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 1 }}>Seção {num}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A3A2C', lineHeight: 1.2 }}>{title}</div>
        </div>
        <div style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic', paddingTop: 6, flexShrink: 0 }}>{norma}</div>
      </div>
      <div style={{ height: 1, background: '#E5E7EB', marginTop: 4 }} />
    </div>
  )
}

function Badge({ text, bg, color, border }: { text: string; bg: string; color: string; border?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 99,
      fontSize: 9,
      fontWeight: 700,
      background: bg,
      color,
      border: border ? `1px solid ${border}` : undefined,
    }}>
      {text}
    </span>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default async function PgrImprimirPage() {
  const perfil = await requireEmpresa()
  const empresaId = perfil.empresaId!
  const db = createAdminClient()

  const [
    { data: empresa },
    { count: totalFuncionarios },
    { data: mapeamentos },
    { data: planos },
    { data: monitoramentos },
    { data: versaoVigente },
    { data: triagens },
  ] = await Promise.all([
    db.from('empresas').select('id, nome, cnpj, razao_social').eq('id', empresaId).single(),
    db.from('vinculos_empresa').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('ativo', true),
    db.from('mapeamento_riscos_empresa').select('*').eq('empresa_id', empresaId).order('setor'),
    db.from('plano_acao_nr1').select('*').eq('empresa_id', empresaId).order('criado_em'),
    db.from('monitoramento_nr1').select('*').eq('empresa_id', empresaId)
      .gte('data_registro', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order('data_registro', { ascending: false }),
    db.from('pgr_versoes').select('*').eq('empresa_id', empresaId).eq('status', 'vigente')
      .order('versao', { ascending: false }).limit(1).maybeSingle(),
    db.from('triagem_psicossocial')
      .select('setor, nivel_risco, score_organizacao, score_relacoes, score_recursos, score_contexto')
      .eq('empresa_id', empresaId),
  ])

  // Agrega triagens por setor
  const triagemMap = new Map<string, { total: number; alto: number; medio: number; baixo: number }>()
  for (const t of (triagens ?? [])) {
    const s = (t as any).setor ?? 'Não informado'
    const cur = triagemMap.get(s) ?? { total: 0, alto: 0, medio: 0, baixo: 0 }
    cur.total++
    if ((t as any).nivel_risco === 'alto') cur.alto++
    else if ((t as any).nivel_risco === 'medio') cur.medio++
    else cur.baixo++
    triagemMap.set(s, cur)
  }

  const mapeamentosArr = (mapeamentos ?? []) as any[]
  const planosArr = (planos ?? []) as any[]
  const monitoramentosArr = (monitoramentos ?? []) as any[]
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const totalAcoes = planosArr.length
  const acoesConcluidas = planosArr.filter((p: any) => p.status === 'concluido').length
  const acoesEmAndamento = planosArr.filter((p: any) => p.status === 'em_andamento').length
  const acoesPendentes = planosArr.filter((p: any) => p.status === 'pendente').length

  const tdStyle: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: 10,
    borderBottom: '1px solid #E5E7EB',
    color: '#374151',
    verticalAlign: 'top',
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 9,
    fontWeight: 700,
    background: '#1A3A2C',
    color: '#FFFFFF',
    textAlign: 'left',
    letterSpacing: '0.03em',
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 12,
    fontSize: 10,
  }

  return (
    <>
      {/* Print + screen CSS */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; }
        @media screen {
          body { background: #F3F4F6; }
          #pgr-doc { max-width: 800px; margin: 24px auto; background: white; padding: 48px; box-shadow: 0 4px 32px rgba(0,0,0,0.12); border-radius: 12px; }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #pgr-doc { margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
          .page-break { page-break-before: always; }
          @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <PrintButton />

      <div id="pgr-doc">

        {/* ── CAPA ─────────────────────────────────────────────────────── */}
        <div style={{ background: '#1A3A2C', borderRadius: 8, padding: '32px 36px 28px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, background: '#5BBD9B', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>PGR</span>
            </div>
            <div>
              <div style={{ color: '#5BBD9B', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Programa de Gerenciamento de Riscos
              </div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
                Riscos Psicossociais
              </div>
            </div>
          </div>
          <div style={{ color: '#A7F3D0', fontSize: 11 }}>
            Portaria MTE 1.419/2024 · NR-1 · Vigência com penalidades a partir de maio/2026
          </div>
        </div>

        {/* Dados da empresa */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Identificação da Empresa
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A3A2C', marginBottom: 4 }}>
              {empresa?.razao_social || empresa?.nome || '—'}
            </div>
            {empresa?.nome && empresa?.razao_social && empresa.nome !== empresa.razao_social && (
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Nome fantasia: {empresa.nome}</div>
            )}
            <div style={{ fontSize: 11, color: '#6B7280' }}>CNPJ: {empresa?.cnpj || '—'}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              {totalFuncionarios ?? 0} funcionário(s) ativo(s)
            </div>
          </div>

          <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Informações do Documento
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A3A2C', marginBottom: 4 }}>
              {versaoVigente ? `Versão ${versaoVigente.versao}` : 'Versão 1'}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>
              Gerado em: {versaoVigente ? fmtData(versaoVigente.gerado_em) : hoje}
            </div>
            {versaoVigente?.assinante_nome && (
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 1 }}>
                Responsável: {versaoVigente.assinante_nome}
              </div>
            )}
            {versaoVigente?.assinante_cargo && (
              <div style={{ fontSize: 11, color: '#6B7280' }}>{versaoVigente.assinante_cargo}</div>
            )}
          </div>
        </div>

        {/* Hash SHA-256 */}
        {versaoVigente?.hash_sha256 && (
          <div style={{ background: '#F3F4F6', borderRadius: 6, padding: '10px 14px', marginBottom: 32, border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 600 }}>Integridade do Documento (SHA-256): </span>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all' }}>
              {versaoVigente.hash_sha256}
            </span>
          </div>
        )}

        {/* ── SEÇÃO 1 ──────────────────────────────────────────────────── */}
        <div className="page-break" />
        <SectionHeader
          num="1"
          title="Caracterização dos Processos de Trabalho"
          norma="NR-1, item 1.5.2 (a)"
        />

        <p style={{ fontSize: 10, color: '#6B7280', margin: '10px 0 0', lineHeight: 1.6 }}>
          Levantamento dos processos de trabalho com potencial de exposição a fatores de risco psicossocial
          relacionados ao trabalho (FRPRT), conforme Portaria MTE 1.419/2024 e orientações do Guia Prático do MTE.
        </p>

        {mapeamentosArr.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Setor / Departamento</th>
                <th style={thStyle}>Período Avaliado</th>
                <th style={thStyle}>Nível de Risco</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>% Funcionários Expostos</th>
              </tr>
            </thead>
            <tbody>
              {mapeamentosArr.map((m: any, i: number) => {
                const nc = nivelColor(m.nivel_risco_geral)
                return (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#F9FAFB' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1A3A2C' }}>{m.setor}</td>
                    <td style={tdStyle}>{fmtData(m.periodo_referencia)}</td>
                    <td style={tdStyle}>
                      <Badge text={fmtNivel(m.nivel_risco_geral)} bg={nc.bg} color={nc.color} border={nc.border} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {m.percentual_exposto != null ? `${m.percentual_exposto}%` : 'Não informado'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 12 }}>
            Nenhum setor mapeado até o momento.
          </p>
        )}

        {/* ── SEÇÃO 2 ──────────────────────────────────────────────────── */}
        <div className="page-break" />
        <SectionHeader
          num="2"
          title="Inventário de Riscos Psicossociais"
          norma="NR-1, item 1.5.2 (b)"
        />

        <p style={{ fontSize: 10, color: '#6B7280', margin: '10px 0 0', lineHeight: 1.6 }}>
          Inventário explícito dos fatores de risco psicossocial relacionados ao trabalho (FRPRT) identificados,
          organizados segundo as quatro dimensões do Guia do MTE: Organização do Trabalho, Relações e Liderança,
          Recursos e Ambiente, e Contexto Externo.
        </p>

        {(() => {
          const fatores = mapeamentosArr.flatMap((m: any) =>
            ((m.fatores_identificados as string[]) ?? []).map((f: string, fi: number) => ({ setor: m.setor, fator: f, nivel: m.nivel_risco_geral, key: `${m.id}-${fi}` }))
          )
          if (fatores.length === 0) {
            return (
              <p style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 12 }}>
                Nenhum fator de risco identificado até o momento.
              </p>
            )
          }
          return (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '30%' }}>Setor</th>
                  <th style={thStyle}>Fator de Risco Psicossocial Identificado</th>
                  <th style={{ ...thStyle, width: '12%' }}>Nível</th>
                </tr>
              </thead>
              <tbody>
                {fatores.map((f: any, i: number) => {
                  const nc = nivelColor(f.nivel)
                  return (
                    <tr key={f.key} style={{ background: i % 2 === 0 ? 'white' : '#F9FAFB' }}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#1A3A2C' }}>{f.setor}</td>
                      <td style={tdStyle}>{f.fator}</td>
                      <td style={tdStyle}>
                        <Badge text={fmtNivel(f.nivel)} bg={nc.bg} color={nc.color} border={nc.border} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        })()}

        {/* Triagem anonimizada */}
        {triagemMap.size > 0 && (
          <>
            <div style={{ marginTop: 24, marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A3A2C' }}>2.1 Resultado das Triagens dos Funcionários (Anonimizado)</div>
              <p style={{ fontSize: 10, color: '#6B7280', margin: '4px 0 0', lineHeight: 1.6 }}>
                Resultados agregados das triagens respondidas pelos funcionários. Nenhum dado individual é identificável,
                em conformidade com a LGPD.
              </p>
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Setor</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Respondentes</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% Risco Alto</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% Risco Médio</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% Risco Baixo</th>
                </tr>
              </thead>
              <tbody>
                {[...triagemMap.entries()].map(([setor, v], i) => (
                  <tr key={setor} style={{ background: i % 2 === 0 ? 'white' : '#F9FAFB' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1A3A2C' }}>{setor}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{v.total}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: v.alto > 0 ? '#991B1B' : '#374151', fontWeight: v.alto > 0 ? 700 : 400 }}>
                      {v.total > 0 ? Math.round((v.alto / v.total) * 100) : 0}%
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: v.medio > 0 ? '#92400E' : '#374151', fontWeight: v.medio > 0 ? 600 : 400 }}>
                      {v.total > 0 ? Math.round((v.medio / v.total) * 100) : 0}%
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#065F46' }}>
                      {v.total > 0 ? Math.round((v.baixo / v.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── SEÇÃO 3 ──────────────────────────────────────────────────── */}
        <div className="page-break" />
        <SectionHeader
          num="3"
          title="Plano de Ação"
          norma="NR-1, item 1.5.2 (c)"
        />

        <p style={{ fontSize: 10, color: '#6B7280', margin: '10px 0 12px', lineHeight: 1.6 }}>
          Medidas de prevenção, controle e mitigação dos fatores de risco psicossocial identificados,
          com definição de responsáveis, prazos e resultados esperados.
        </p>

        {/* Cards de resumo */}
        {totalAcoes > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Total de ações', val: totalAcoes, bg: '#F0FBF7', color: '#1A3A2C' },
              { label: 'Concluídas', val: acoesConcluidas, bg: '#ECFDF5', color: '#065F46' },
              { label: 'Em andamento', val: acoesEmAndamento, bg: '#EFF6FF', color: '#1E40AF' },
              { label: 'Pendentes', val: acoesPendentes, bg: '#FFFBEB', color: '#92400E' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.val}</div>
                <div style={{ fontSize: 9, color: '#6B7280', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {planosArr.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '13%' }}>Setor</th>
                <th style={{ ...thStyle, width: '18%' }}>Fator de Risco</th>
                <th style={thStyle}>Medida de Controle</th>
                <th style={{ ...thStyle, width: '14%' }}>Responsável</th>
                <th style={{ ...thStyle, width: '10%' }}>Prazo</th>
                <th style={{ ...thStyle, width: '12%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {planosArr.map((p: any, i: number) => {
                const sc = statusColor(p.status)
                const vencido = p.status === 'pendente' && p.prazo && new Date(p.prazo) < new Date()
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#F9FAFB' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1A3A2C' }}>{p.setor || 'Geral'}</td>
                    <td style={{ ...tdStyle, fontSize: 9 }}>{p.fator_risco || '—'}</td>
                    <td style={tdStyle}>{p.medida_controle}</td>
                    <td style={tdStyle}>{p.responsavel_nome || '—'}</td>
                    <td style={{ ...tdStyle, color: vencido ? '#991B1B' : '#374151', fontWeight: vencido ? 700 : 400 }}>
                      {fmtData(p.prazo)}
                    </td>
                    <td style={tdStyle}>
                      {vencido
                        ? <Badge text="Vencido" bg="#FEF2F2" color="#991B1B" border="#FECACA" />
                        : <Badge text={fmtStatus(p.status)} bg={sc.bg} color={sc.color} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 12 }}>
            Nenhuma ação cadastrada até o momento.
          </p>
        )}

        {/* ── SEÇÃO 4 ──────────────────────────────────────────────────── */}
        <div className="page-break" />
        <SectionHeader
          num="4"
          title="Registros de Monitoramento"
          norma="NR-1, item 1.5.2 (d)"
        />

        <p style={{ fontSize: 10, color: '#6B7280', margin: '10px 0 0', lineHeight: 1.6 }}>
          Registros de revisões periódicas, reavaliações e incidentes relacionados aos riscos psicossociais,
          realizados nos últimos 12 meses.
        </p>

        {monitoramentosArr.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '14%' }}>Data</th>
                <th style={{ ...thStyle, width: '22%' }}>Tipo de Registro</th>
                <th style={thStyle}>Observações</th>
              </tr>
            </thead>
            <tbody>
              {monitoramentosArr.map((m: any, i: number) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#F9FAFB' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtData(m.data_registro)}</td>
                  <td style={tdStyle}>{fmtTipo(m.tipo)}</td>
                  <td style={tdStyle}>{m.observacoes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 12 }}>
            Nenhum registro de monitoramento nos últimos 12 meses.
          </p>
        )}

        {/* ── RODAPÉ LEGAL ──────────────────────────────────────────────── */}
        <div style={{ marginTop: 40, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>BASE LEGAL</div>
              <div style={{ fontSize: 9, color: '#9CA3AF', lineHeight: 1.5 }}>
                NR-1 · Portaria MTE 1.419, de 28 de novembro de 2024 · Lei 13.709/2018 (LGPD)
              </div>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>
                Os dados individuais dos funcionários são protegidos e não constam neste documento.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#6B7280' }}>Documento gerado em {hoje}</div>
              {versaoVigente && (
                <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>
                  {versaoVigente.assinante_nome && `${versaoVigente.assinante_nome} · `}
                  {versaoVigente.assinante_cargo || ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Espaço extra no final para a tela (o botão flutuante não cobre) */}
        <div className="no-print" style={{ height: 80 }} />

      </div>
    </>
  )
}
