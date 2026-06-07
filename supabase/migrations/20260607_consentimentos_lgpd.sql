-- ============================================================
-- Tabela de consentimentos LGPD / Telemedicina / Vídeo+Voz
-- Criada em: 2026-06-07
-- ============================================================

CREATE TABLE IF NOT EXISTS consentimentos (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id     uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo            text        NOT NULL CHECK (tipo IN ('lgpd_geral', 'telemedicina', 'video_voz')),
  aceito          boolean     NOT NULL DEFAULT true,
  versao_termo    text,
  texto_termo     text,
  triagem_id      uuid        REFERENCES triagens(id)    ON DELETE SET NULL,
  atendimento_id  uuid        REFERENCES atendimentos(id) ON DELETE SET NULL,
  ip_address      text,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_consentimentos_paciente_id ON consentimentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consentimentos_criado_em   ON consentimentos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_consentimentos_tipo        ON consentimentos(tipo);

-- RLS
ALTER TABLE consentimentos ENABLE ROW LEVEL SECURITY;

-- Paciente pode inserir seus próprios consentimentos
CREATE POLICY "paciente_insert_consentimentos" ON consentimentos
  FOR INSERT
  WITH CHECK (
    paciente_id IN (
      SELECT id FROM pacientes WHERE usuario_id = auth.uid()
    )
  );

-- Paciente pode ver seus próprios consentimentos
CREATE POLICY "paciente_select_consentimentos" ON consentimentos
  FOR SELECT
  USING (
    paciente_id IN (
      SELECT id FROM pacientes WHERE usuario_id = auth.uid()
    )
  );

-- Admins lêem tudo via service_role (bypass RLS automático com createAdminClient)

-- Coluna ip_address: adiciona caso a tabela já exista sem ela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consentimentos' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE consentimentos ADD COLUMN ip_address text;
  END IF;
END $$;
