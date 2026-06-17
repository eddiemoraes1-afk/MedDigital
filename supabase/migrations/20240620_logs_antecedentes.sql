-- Auditoria de edições de antecedentes pessoais do paciente.
-- Registra médico, IP, data/hora e diff dos campos alterados a cada edição.

CREATE TABLE IF NOT EXISTS logs_antecedentes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      uuid        NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id        uuid        NOT NULL REFERENCES medicos(id)   ON DELETE SET NULL,
  campos_alterados jsonb       NOT NULL DEFAULT '[]',
  ip_address       text,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas por paciente e por médico
CREATE INDEX IF NOT EXISTS logs_antecedentes_paciente_idx
  ON logs_antecedentes(paciente_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS logs_antecedentes_medico_idx
  ON logs_antecedentes(medico_id, criado_em DESC);
