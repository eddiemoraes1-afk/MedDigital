import React from 'react'
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

// Cores que funcionam sem depender de print background graphics
function nivelStyle(n: string | null | undefined): React.CSSProperties {
  const m: Record<string, React.CSSProperties> = {
    baixo: { color: '#065F46', border: '1.5px solid #065F46' },
    medio: { color: '#92400E', border: '1.5px solid #D97706' },
    alto: { color: '#991B1B', border: '1.5px solid #DC2626' },
    nao_identificado: { color: '#6B7280', border: '1.5px solid #9CA3AF' },
  }
  return m[n ?? 'nao_identificado'] ?? m['nao_identificado']
}

function statusStyle(s: string): React.CSSProperties {
  const m: Record<string, React.CSSProperties> = {
    pendente: { color: '#92400E', border: '1.5px solid #D97706' },
    em_andamento: { color: '#1E40AF', border: '1.5px solid #3B82F6' },
    concluido: { color: '#065F46', border: '1.5px solid #059669' },
    cancelado: { color: '#6B7280', border: '1.5px solid #9CA3AF' },
  }
  return m[s] ?? { color: '#6B7280', border: '1.5px solid #9CA3AF' }
}

function Badge({ text, style }: { text: string; style: React.CSSProperties }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 99,
      fontSize: 9,
      fontWeight: 700,
      background: 'transparent',
      ...style,
    }}>
      {text}
    </span>
  )
}

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

  // Estilos de tabela — todos inline para garantia máxima de impressão
  const TH: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'left',
    borderBottom: '2px solid #1A3A2C',
    color: '#1A3A2C',
    background: 'transparent',
    letterSpacing: '0.03em',
  }

  const TD: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: 9,
    borderBottom: '1px solid #E5E7EB',
    color: '#374151',
    verticalAlign: 'top',
    background: 'transparent',
  }

  const TABLE: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 12,
    tableLayout: 'fixed',
  }

  return (
    <>
      {/* Estilos com href+precedence para ser hoistado ao <head> pelo React 18 */}
      <style href="pgr-print-v3" precedence="high">{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body {
          margin: 0; padding: 0;
          font-family: -apple-system, Helvetica Neue, Arial, sans-serif;
          font-size: 11px;
          color: #111827;
          background: white;
        }
        @media screen {
          body { background: #F3F4F6; }
          #pgr { max-width: 780px; margin: 24px auto 80px; background: white; padding: 40px 48px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); border-radius: 10px; }
        }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          #pgr { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
          .no-print { display: none !important; }
          .pg-break { page-break-before: always; break-before: page; margin-top: 0 !important; padding-top: 0 !important; }
          table { page-break-inside: auto !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          thead { display: table-header-group !important; }
          @page { size: A4; margin: 14mm 16mm; }
        }
      `}</style>

      <PrintButton />

      <div id="pgr">

        {/* ── CAPA ────────────────────────────────────────────────────────── */}
        {/* Design sem texto branco — funciona sem background printing */}
        <div style={{ borderTop: '6px solid #1A3A2C', paddingTop: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Ícone PGR como borda colorida */}
            <div style={{ width: 52, height: 52, border: '3px solid #1A3A2C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#1A3A2C', fontWeight: 900, fontSize: 13, letterSpacing: '-0.5px' }}>PGR</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#5BBD9B', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                Programa de Gerenciamento de Riscos
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1A3A2C', lineHeight: 1.1 }}>
                Riscos Psicossociais
              </div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>
                Portaria MTE 1.419/2024 · NR-1 · Vigência com penalidades a partir de maio/2026
              </div>
            </div>
          </div>
        </div>

        {/* Dados da empresa */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 10 }}>
                <div style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '12px 16px' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Identificação da Empresa</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A3A2C', marginBottom: 3 }}>
                    {empresa?.razao_social || empresa?.nome || '—'}
                  </div>
                  {empresa?.nome && empresa?.razao_social && empresa.nome !== empresa.razao_social && (
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>Nome fantasia: {empresa.nome}</div>
                  )}
                  <div style={{ fontSize: 10, color: '#6B7280' }}>CNPJ: {empresa?.cnpj || '—'}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 3 }}>{totalFuncionarios ?? 0} funcionário(s) ativo(s)</div>
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: 10 }}>
                <div style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '12px 16px' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Informações do Documento</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A3A2C', marginBottom: 3 }}>
                    {versaoVigente ? `Versão ${versaoVigente.versao}` : 'Versão 1'}
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>Gerado em: {versaoVigente ? fmtData(versaoVigente.gerado_em) : hoje}</div>
                  {versaoVigente?.assinante_nome && (
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 1 }}>Responsável: {versaoVigente.assinante_nome}</div>
                  )}
                  {versaoVigente?.assinante_cargo && (
                    <div style={{ fontSize: 10, color: '#6B7280' }}>{versaoVigente.assinante_cargo}</div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Hash SHA-256 */}
        {versaoVigente?.hash_sha256 && (
          <div style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#6B7280' }}>Integridade do Documento (SHA-256): </span>
            <span style={{ fontSize: 8, fontFamily: 'Courier New, monospace', color: '#374151', wordBreak: 'break-all' }}>
              {versaoVigente.hash_sha256}
            </span>
          </div>
        )}

        {/* ── SEÇÃO 1 ─────────────────────────────────────────────────────── */}
        <div className="pg-break" />
        <div style={{ marginTop: 0, marginBottom: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><tr>
              <td style={{ width: 5, background: '#5BBD9B', borderRadius: 2 }}>&nbsp;</td>
              <td style={{ paddingLeft: 10, verticalAlign: 'top' }}>
                <div style={{ fontSize: 9, color: '#6B7280' }}>Seção 1</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1A3A2C', lineHeight: 1.1 }}>Caracterização dos Processos de Trabalho</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', fontSize: 8, color: '#9CA3AF', fontStyle: 'italic', whiteSpace: 'nowrap', paddingLeft: 10 }}>NR-1, item 1.5.2 (a)</td>
            </tr></tbody>
          </table>
          <div style={{ height: 1, background: '#E5E7EB', marginTop: 6 }} />
        </div>

        <p style={{ fontSize: 9, color: '#6B7280', margin: '0 0 0', lineHeight: 1.6 }}>
          Levantamento dos processos de trabalho com potencial de exposição a FRPRT, conforme Portaria MTE 1.419/2024 e Guia Prático do MTE.
        </p>

        {mapeamentosArr.length > 0 ? (
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '35%' }}>Setor / Departamento</th>
                <th style={{ ...TH, width: '20%' }}>Período Avaliado</th>
                <th style={{ ...TH, width: '20%' }}>Nível de Risco</th>
                <th style={{ ...TH, width: '25%', textAlign: 'right' }}>% Funcionários Expostos</th>
              </tr>
            </thead>
            <tbody>
              {mapeamentosArr.map((m: any) => (
                <tr key={m.id}>
                  <td style={{ ...TD, fontWeight: 600, color: '#1A3A2C' }}>{m.setor}</td>
                  <td style={TD}>{fmtData(m.periodo_referencia)}</td>
                  <td style={TD}><Badge text={fmtNivel(m.nivel_risco_geral)} style={nivelStyle(m.nivel_risco_geral)} /></td>
                  <td style={{ ...TD, textAlign: 'right' }}>{m.percentual_exposto != null ? `${m.percentual_exposto}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic', marginTop: 10 }}>Nenhum setor mapeado até o momento.</p>
        )}

        {/* ── SEÇÃO 2 ─────────────────────────────────────────────────────── */}
        <div className="pg-break" />
        <div style={{ marginTop: 0, marginBottom: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><tr>
              <td style={{ width: 5, background: '#5BBD9B', borderRadius: 2 }}>&nbsp;</td>
              <td style={{ paddingLeft: 10, verticalAlign: 'top' }}>
                <div style={{ fontSize: 9, color: '#6B7280' }}>Seção 2</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1A3A2C', lineHeight: 1.1 }}>Inventário de Riscos Psicossociais</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', fontSize: 8, color: '#9CA3AF', fontStyle: 'italic', whiteSpace: 'nowrap', paddingLeft: 10 }}>NR-1, item 1.5.2 (b)</td>
            </tr></tbody>
          </table>
          <div style={{ height: 1, background: '#E5E7EB', marginTop: 6 }} />
        </div>

        <p style={{ fontSize: 9, color: '#6B7280', margin: '0 0 0', lineHeight: 1.6 }}>
          Inventário dos fatores de risco psicossocial (FRPRT) identificados por setor, segundo as 4 dimensões do Guia MTE.
        </p>

        {(() => {
          const fatores = mapeamentosArr.flatMap((m: any) =>
            ((m.fatores_identificados as string[]) ?? []).map((f: string, fi: number) => ({
              setor: m.setor, fator: f, nivel: m.nivel_risco_geral, key: `${m.id}-${fi}`,
            }))
          )
          return fatores.length > 0 ? (
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>Setor</th>
                  <th style={TH}>Fator de Risco Psicossocial Identificado</th>
                  <th style={{ ...TH, width: '14%' }}>Nível</th>
                </tr>
              </thead>
              <tbody>
                {fatores.map((f: any) => (
                  <tr key={f.key}>
                    <td style={{ ...TD, fontWeight: 600, color: '#1A3A2C' }}>{f.setor}</td>
                    <td style={TD}>{f.fator}</td>
                    <td style={TD}><Badge text={fmtNivel(f.nivel)} style={nivelStyle(f.nivel)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic', marginTop: 10 }}>Nenhum fator de risco identificado até o momento.</p>
        })()}

        {triagemMap.size > 0 && (
          <>
            <div style={{ marginTop: 20, marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1A3A2C' }}>2.1 Resultado das Triagens (Anonimizado)</div>
              <p style={{ fontSize: 9, color: '#6B7280', margin: '3px 0 0', lineHeight: 1.6 }}>
                Resultados agregados por setor. Nenhum dado individual é identificável (LGPD).
              </p>
            </div>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={TH}>Setor</th>
                  <th style={{ ...TH, textAlign: 'right', width: '14%' }}>Respondentes</th>
                  <th style={{ ...TH, textAlign: 'right', width: '14%' }}>% Alto</th>
                  <th style={{ ...TH, textAlign: 'right', width: '14%' }}>% Médio</th>
                  <th style={{ ...TH, textAlign: 'right', width: '14%' }}>% Baixo</th>
                </tr>
              </thead>
              <tbody>
                {[...triagemMap.entries()].map(([setor, v]) => (
                  <tr key={setor}>
                    <td style={{ ...TD, fontWeight: 600, color: '#1A3A2C' }}>{setor}</td>
                    <td style={{ ...TD, textAlign: 'right' }}>{v.total}</td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: v.alto > 0 ? 700 : 400, color: v.alto > 0 ? '#991B1B' : '#374151' }}>
                      {v.total > 0 ? Math.round((v.alto / v.total) * 100) : 0}%
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: v.medio > 0 ? 600 : 400, color: v.medio > 0 ? '#92400E' : '#374151' }}>
                      {v.total > 0 ? Math.round((v.medio / v.total) * 100) : 0}%
                    </td>
                    <td style={{ ...TD, textAlign: 'right', color: '#065F46' }}>
                      {v.total > 0 ? Math.round((v.baixo / v.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── SEÇÃO 3 ─────────────────────────────────────────────────────── */}
        <div className="pg-break" />
        <div style={{ marginTop: 0, marginBottom: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><tr>
              <td style={{ width: 5, background: '#5BBD9B', borderRadius: 2 }}>&nbsp;</td>
              <td style={{ paddingLeft: 10, verticalAlign: 'top' }}>
                <div style={{ fontSize: 9, color: '#6B7280' }}>Seção 3</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1A3A2C', lineHeight: 1.1 }}>Plano de Ação</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', fontSize: 8, color: '#9CA3AF', fontStyle: 'italic', whiteSpace: 'nowrap', paddingLeft: 10 }}>NR-1, item 1.5.2 (c)</td>
            </tr></tbody>
          </table>
          <div style={{ height: 1, background: '#E5E7EB', marginTop: 6 }} />
        </div>

        <p style={{ fontSize: 9, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.6 }}>
          Medidas de controle dos riscos identificados, com responsáveis, prazos e status.
        </p>

        {/* Resumo em texto — sem backgrounds */}
        {totalAcoes > 0 && (
          <div style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 10, color: '#374151' }}>
            <strong style={{ color: '#1A3A2C' }}>{totalAcoes}</strong> ações no plano ·&nbsp;
            <strong style={{ color: '#065F46' }}>{acoesConcluidas}</strong> concluída(s) ·&nbsp;
            <strong style={{ color: '#1E40AF' }}>{acoesEmAndamento}</strong> em andamento ·&nbsp;
            <strong style={{ color: '#92400E' }}>{acoesPendentes}</strong> pendente(s)
          </div>
        )}

        {planosArr.length > 0 ? (
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '13%' }}>Setor</th>
                <th style={{ ...TH, width: '17%' }}>Fator de Risco</th>
                <th style={TH}>Medida de Controle</th>
                <th style={{ ...TH, width: '13%' }}>Responsável</th>
                <th style={{ ...TH, width: '10%' }}>Prazo</th>
                <th style={{ ...TH, width: '11%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {planosArr.map((p: any) => {
                const vencido = p.status === 'pendente' && p.prazo && new Date(p.prazo) < new Date()
                return (
                  <tr key={p.id}>
                    <td style={{ ...TD, fontWeight: 600, color: '#1A3A2C' }}>{p.setor || 'Geral'}</td>
                    <td style={{ ...TD, fontSize: 8 }}>{p.fator_risco || '—'}</td>
                    <td style={TD}>{p.medida_controle}</td>
                    <td style={TD}>{p.responsavel_nome || '—'}</td>
                    <td style={{ ...TD, color: vencido ? '#991B1B' : '#374151', fontWeight: vencido ? 700 : 400 }}>
                      {fmtData(p.prazo)}
                    </td>
                    <td style={TD}>
                      {vencido
                        ? <Badge text="Vencido" style={{ color: '#991B1B', border: '1.5px solid #DC2626' }} />
                        : <Badge text={fmtStatus(p.status)} style={statusStyle(p.status)} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic', marginTop: 10 }}>Nenhuma ação cadastrada até o momento.</p>
        )}

        {/* ── SEÇÃO 4 ─────────────────────────────────────────────────────── */}
        <div className="pg-break" />
        <div style={{ marginTop: 0, marginBottom: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><tr>
              <td style={{ width: 5, background: '#5BBD9B', borderRadius: 2 }}>&nbsp;</td>
              <td style={{ paddingLeft: 10, verticalAlign: 'top' }}>
                <div style={{ fontSize: 9, color: '#6B7280' }}>Seção 4</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1A3A2C', lineHeight: 1.1 }}>Registros de Monitoramento</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', fontSize: 8, color: '#9CA3AF', fontStyle: 'italic', whiteSpace: 'nowrap', paddingLeft: 10 }}>NR-1, item 1.5.2 (d)</td>
            </tr></tbody>
          </table>
          <div style={{ height: 1, background: '#E5E7EB', marginTop: 6 }} />
        </div>

        <p style={{ fontSize: 9, color: '#6B7280', margin: '0 0 0', lineHeight: 1.6 }}>
          Revisões periódicas, reavaliações e incidentes registrados nos últimos 12 meses.
        </p>

        {monitoramentosArr.length > 0 ? (
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '14%' }}>Data</th>
                <th style={{ ...TH, width: '22%' }}>Tipo de Registro</th>
                <th style={TH}>Observações</th>
              </tr>
            </thead>
            <tbody>
              {monitoramentosArr.map((m: any) => (
                <tr key={m.id}>
                  <td style={{ ...TD, fontWeight: 600 }}>{fmtData(m.data_registro)}</td>
                  <td style={TD}>{fmtTipo(m.tipo)}</td>
                  <td style={TD}>{m.observacoes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic', marginTop: 10 }}>Nenhum registro de monitoramento nos últimos 12 meses.</p>
        )}

        {/* ── RODAPÉ ──────────────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 32, borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#6B7280', marginBottom: 3 }}>BASE LEGAL</div>
                <div style={{ fontSize: 8, color: '#9CA3AF', lineHeight: 1.5 }}>
                  NR-1 · Portaria MTE 1.419, de 28/11/2024 · Lei 13.709/2018 (LGPD)
                </div>
                <div style={{ fontSize: 8, color: '#9CA3AF' }}>Dados individuais dos funcionários protegidos — não constam neste documento.</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: 12, paddingLeft: 16, whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: 8, color: '#6B7280' }}>Documento gerado em {hoje}</div>
                {versaoVigente?.assinante_nome && (
                  <div style={{ fontSize: 8, color: '#9CA3AF', marginTop: 2 }}>
                    {versaoVigente.assinante_nome}{versaoVigente.assinante_cargo ? ` · ${versaoVigente.assinante_cargo}` : ''}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="no-print" style={{ height: 80 }} />
      </div>
    </>
  )
}
