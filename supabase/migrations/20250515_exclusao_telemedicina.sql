-- Protocolo de Exclusão de Telemedicina
-- Ref: CFM Res. 2.314/2022 — critérios de exclusão para atendimento online

CREATE TABLE IF NOT EXISTS exclusoes_telemedicina (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  UUID        REFERENCES atendimentos(id) ON DELETE CASCADE,
  paciente_id     UUID        NOT NULL REFERENCES pacientes(id),
  medico_id       UUID        NOT NULL REFERENCES medicos(id),
  -- 'apto' | 'apto_ressalvas' | 'nao_apto' | 'emergencia'
  status          TEXT        NOT NULL CHECK (status IN ('apto', 'apto_ressalvas', 'nao_apto', 'emergencia')),
  motivos         TEXT[]      NOT NULL DEFAULT '{}',
  motivo_outro    TEXT,
  conduta         TEXT        NOT NULL,
  ciente_paciente BOOLEAN     NOT NULL DEFAULT FALSE,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exclusoes_paciente
  ON exclusoes_telemedicina (paciente_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_exclusoes_atendimento
  ON exclusoes_telemedicina (atendimento_id);
