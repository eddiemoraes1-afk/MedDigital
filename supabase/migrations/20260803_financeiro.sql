-- ============================================================
-- MÓDULO FINANCEIRO — MedDigital
-- Criado em: 2026-08-03
-- ============================================================

-- 1. Categorias financeiras
CREATE TABLE IF NOT EXISTS public.categorias_financeiras (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  grupo_dre  TEXT NOT NULL CHECK (grupo_dre IN (
               'receita_bruta', 'deducao', 'custo_operacional',
               'despesa_administrativa', 'despesa_financeira')),
  ordem      INTEGER DEFAULT 99,
  ativo      BOOLEAN NOT NULL DEFAULT true,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contas bancárias
CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           TEXT NOT NULL,
  banco          TEXT,
  agencia        TEXT,
  conta          TEXT,
  saldo_inicial  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ativo          BOOLEAN NOT NULL DEFAULT true,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lançamentos financeiros
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                  TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria_id          UUID REFERENCES public.categorias_financeiras(id),
  descricao             TEXT NOT NULL,
  valor                 NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  data_competencia      DATE NOT NULL,
  data_vencimento       DATE,
  data_pagamento        DATE,
  status                TEXT NOT NULL DEFAULT 'pendente'
                          CHECK (status IN ('pendente', 'pago', 'recebido', 'atrasado', 'cancelado')),
  conta_bancaria_id     UUID REFERENCES public.contas_bancarias(id),
  empresa_id            UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  medico_id             UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
  referencia_id         UUID,
  referencia_tipo       TEXT CHECK (referencia_tipo IN (
                          'atendimento', 'receita_medica', 'folha_medicos',
                          'mensalidade_empresa', 'manual', NULL)),
  numero_documento      TEXT,
  arquivo_url           TEXT,
  observacoes           TEXT,
  recorrente            BOOLEAN NOT NULL DEFAULT false,
  intervalo_recorrencia TEXT CHECK (intervalo_recorrencia IN ('mensal','quinzenal','semanal','anual', NULL)),
  origem_recorrencia_id UUID REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL,
  criado_por            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lanc_tipo        ON public.lancamentos_financeiros(tipo);
CREATE INDEX IF NOT EXISTS idx_lanc_status      ON public.lancamentos_financeiros(status);
CREATE INDEX IF NOT EXISTS idx_lanc_competencia ON public.lancamentos_financeiros(data_competencia DESC);
CREATE INDEX IF NOT EXISTS idx_lanc_vencimento  ON public.lancamentos_financeiros(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_lanc_empresa     ON public.lancamentos_financeiros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lanc_medico      ON public.lancamentos_financeiros(medico_id);

-- RLS
ALTER TABLE public.categorias_financeiras   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros  ENABLE ROW LEVEL SECURITY;

-- Categorias padrão
INSERT INTO public.categorias_financeiras (nome, tipo, grupo_dre, ordem) VALUES
  ('Mensalidade Empresa',        'receita', 'receita_bruta',          1),
  ('Co-participação Consulta',   'receita', 'receita_bruta',          2),
  ('Co-participação Receita',    'receita', 'receita_bruta',          3),
  ('Outras Receitas',            'receita', 'receita_bruta',          9),
  ('ISS (5%)',                   'despesa', 'deducao',                10),
  ('PIS/COFINS',                 'despesa', 'deducao',                11),
  ('Repasse Médicos',            'despesa', 'custo_operacional',      20),
  ('Daily.co (Vídeo)',           'despesa', 'custo_operacional',      21),
  ('Supabase',                   'despesa', 'custo_operacional',      22),
  ('Vercel',                     'despesa', 'custo_operacional',      23),
  ('WhatsApp / Email',           'despesa', 'custo_operacional',      24),
  ('Outros Custos Operacionais', 'despesa', 'custo_operacional',      29),
  ('Folha Administrativa',       'despesa', 'despesa_administrativa', 30),
  ('Marketing',                  'despesa', 'despesa_administrativa', 31),
  ('Ferramentas / Software',     'despesa', 'despesa_administrativa', 32),
  ('Outras Despesas Admin',      'despesa', 'despesa_administrativa', 39),
  ('Tarifas Bancárias',          'despesa', 'despesa_financeira',     40),
  ('Juros / Multas',             'despesa', 'despesa_financeira',     41)
ON CONFLICT DO NOTHING;
