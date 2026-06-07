-- ============================================================
-- Correção do schema da tabela consentimentos
-- Adiciona colunas que podem estar ausentes se a tabela foi
-- criada manualmente com schema básico antes da migration oficial
-- ============================================================

DO $$
BEGIN
  -- versao_termo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consentimentos' AND column_name = 'versao_termo'
  ) THEN
    ALTER TABLE consentimentos ADD COLUMN versao_termo text;
  END IF;

  -- texto_termo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consentimentos' AND column_name = 'texto_termo'
  ) THEN
    ALTER TABLE consentimentos ADD COLUMN texto_termo text;
  END IF;

  -- triagem_id (FK opcional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consentimentos' AND column_name = 'triagem_id'
  ) THEN
    ALTER TABLE consentimentos ADD COLUMN triagem_id uuid REFERENCES triagens(id) ON DELETE SET NULL;
  END IF;

  -- atendimento_id (FK opcional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consentimentos' AND column_name = 'atendimento_id'
  ) THEN
    ALTER TABLE consentimentos ADD COLUMN atendimento_id uuid REFERENCES atendimentos(id) ON DELETE SET NULL;
  END IF;

  -- ip_address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consentimentos' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE consentimentos ADD COLUMN ip_address text;
  END IF;

END $$;
