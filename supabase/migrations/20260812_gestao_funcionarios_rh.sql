-- ═══════════════════════════════════════════════════════════════════════════════
-- Gestão de funcionários pelo RH da empresa (Caminho 1)
-- Permite que o RH adicione, edite e desative funcionários em tempo real,
-- sem depender de planilha Excel.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Registra quando o funcionário foi desligado da empresa
ALTER TABLE public.vinculos_empresa
  ADD COLUMN IF NOT EXISTS data_desligamento DATE;

-- 2. Registra a origem do cadastro (planilha vs. portal do RH)
ALTER TABLE public.vinculos_empresa
  ADD COLUMN IF NOT EXISTS origem_cadastro TEXT DEFAULT 'importacao';

-- 3. Índice para listar rapidamente quem foi desligado no período
CREATE INDEX IF NOT EXISTS idx_vinculos_data_desligamento
  ON public.vinculos_empresa(empresa_id, data_desligamento)
  WHERE data_desligamento IS NOT NULL;

-- 4. Índice para busca por nome no portal do RH
CREATE INDEX IF NOT EXISTS idx_vinculos_nome_completo
  ON public.vinculos_empresa(empresa_id, nome_completo);
