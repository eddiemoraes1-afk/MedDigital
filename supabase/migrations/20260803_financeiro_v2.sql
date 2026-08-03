-- ============================================================
-- MÓDULO FINANCEIRO v2 — ajustes após deploy inicial
-- 2026-08-03
-- ============================================================

-- 1. Colunas de reconciliação em contas_bancarias
ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS saldo_atual              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS data_reconciliacao       DATE,
  ADD COLUMN IF NOT EXISTS observacao_reconciliacao TEXT;

-- 2. Ampliar CHECK de grupo_dre para incluir 'investimentos'
ALTER TABLE public.categorias_financeiras
  DROP CONSTRAINT IF EXISTS categorias_financeiras_grupo_dre_check;
ALTER TABLE public.categorias_financeiras
  ADD CONSTRAINT categorias_financeiras_grupo_dre_check
  CHECK (grupo_dre IN (
    'receita_bruta', 'deducao', 'custo_operacional',
    'despesa_administrativa', 'despesa_financeira', 'investimentos'
  ));

-- 3. Ampliar CHECK de referencia_tipo (adicionar 'mensalidade' e 'folha_medico')
ALTER TABLE public.lancamentos_financeiros
  DROP CONSTRAINT IF EXISTS lancamentos_financeiros_referencia_tipo_check;
ALTER TABLE public.lancamentos_financeiros
  ADD CONSTRAINT lancamentos_financeiros_referencia_tipo_check
  CHECK (referencia_tipo IN (
    'atendimento', 'receita_medica', 'folha_medicos',
    'mensalidade_empresa', 'manual', 'mensalidade', 'folha_medico'
  ));

-- 4. Categoria padrão: Investimentos (para quem quiser lançar aportes/reservas)
INSERT INTO public.categorias_financeiras (nome, tipo, grupo_dre, ordem) VALUES
  ('Aportes / Investimentos', 'despesa', 'investimentos', 50),
  ('Rendimentos Financeiros', 'receita', 'receita_bruta',  8)
ON CONFLICT DO NOTHING;
