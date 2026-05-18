-- ============================================================
-- Migration: Campos completos de triagem e IA
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Adiciona 'azul' ao CHECK constraint de classificacao_risco
--    (Protocolo de Manchester usa 5 níveis: vermelho, laranja, amarelo, verde, azul)
ALTER TABLE triagens DROP CONSTRAINT IF EXISTS triagens_classificacao_risco_check;
ALTER TABLE triagens
  ADD CONSTRAINT triagens_classificacao_risco_check
  CHECK (classificacao_risco IN ('vermelho', 'laranja', 'amarelo', 'verde', 'azul'));

-- 2. Adiciona 'pulou_triagem' ao CHECK constraint de status
ALTER TABLE triagens DROP CONSTRAINT IF EXISTS triagens_status_check;
ALTER TABLE triagens
  ADD CONSTRAINT triagens_status_check
  CHECK (status IN ('em_andamento', 'concluida', 'pulou_triagem'));

-- 3. Campos de resultado da IA
ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS recomendacao_ia TEXT;

-- 4. Dados estruturados de sintomas e urgência (JSONB)
ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS dados_sintomas JSONB DEFAULT NULL;

ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS dados_urgencia JSONB DEFAULT NULL;

-- 5. Campos de consentimento e identificação
ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS consentimento_lgpd BOOLEAN DEFAULT FALSE;

ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS consentimento_em TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS cpf_confirmado TEXT DEFAULT NULL;

ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS telefone_contato TEXT DEFAULT NULL;

-- 6. Escolha do paciente após a triagem
--    'consulta_imediata' = clicou em "Consultar agora"
--    'agendamento'       = clicou em "Agendar uma consulta"
--    NULL = saiu da tela sem escolher (emergência vermelho, etc.)
ALTER TABLE triagens
  ADD COLUMN IF NOT EXISTS opcao_apos_triagem TEXT DEFAULT NULL;
