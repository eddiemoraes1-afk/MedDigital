-- ============================================================
-- Índices de performance nas 5 tabelas de maior tráfego
-- Gerado em: 2026-06-07
-- ============================================================

-- ── 1. ATENDIMENTOS ─────────────────────────────────────────
-- Consultas por paciente (prontuário, empresa, listagens)
CREATE INDEX IF NOT EXISTS idx_atendimentos_paciente_id
  ON atendimentos(paciente_id);

-- Consultas por médico (dashboard médico, listagens)
CREATE INDEX IF NOT EXISTS idx_atendimentos_medico_id
  ON atendimentos(medico_id);

-- Filtros por status (em_andamento, concluido)
CREATE INDEX IF NOT EXISTS idx_atendimentos_status
  ON atendimentos(status);

-- Empresa + status + criado_em → consultas do portal empresa (range de datas)
CREATE INDEX IF NOT EXISTS idx_atendimentos_paciente_status_data
  ON atendimentos(paciente_id, status, criado_em DESC);

-- ── 2. ATESTADOS ────────────────────────────────────────────
-- Consultas por paciente (prontuário, histórico)
CREATE INDEX IF NOT EXISTS idx_atestados_paciente_id
  ON atestados(paciente_id);

-- Consultas por médico
CREATE INDEX IF NOT EXISTS idx_atestados_medico_id
  ON atestados(medico_id);

-- Lookup de atestados por atendimento (validação IDOR)
CREATE INDEX IF NOT EXISTS idx_atestados_atendimento_id
  ON atestados(atendimento_id);

-- ── 3. RECEITAS ─────────────────────────────────────────────
-- Consultas por paciente
CREATE INDEX IF NOT EXISTS idx_receitas_paciente_id
  ON receitas(paciente_id);

-- Consultas por médico
CREATE INDEX IF NOT EXISTS idx_receitas_medico_id
  ON receitas(medico_id);

-- Filtro por status (emitida, cancelada)
CREATE INDEX IF NOT EXISTS idx_receitas_status
  ON receitas(status);

-- Lookup por atendimento
CREATE INDEX IF NOT EXISTS idx_receitas_atendimento_id
  ON receitas(atendimento_id);

-- ── 4. VINCULOS_EMPRESA ─────────────────────────────────────
-- Lookup por paciente (portal empresa, relatórios)
CREATE INDEX IF NOT EXISTS idx_vinculos_paciente_id
  ON vinculos_empresa(paciente_id);

-- Lookup por empresa (listar funcionários, dashboard)
CREATE INDEX IF NOT EXISTS idx_vinculos_empresa_id
  ON vinculos_empresa(empresa_id);

-- Lookup por CPF (vinculação no cadastro e em receitas/atestados)
CREATE INDEX IF NOT EXISTS idx_vinculos_cpf
  ON vinculos_empresa(cpf);

-- Empresa + ativo (filtra só funcionários ativos)
CREATE INDEX IF NOT EXISTS idx_vinculos_empresa_ativo
  ON vinculos_empresa(empresa_id, ativo)
  WHERE ativo = true;

-- ── 5. TRIAGENS ─────────────────────────────────────────────
-- Consultas por paciente (histórico de triagens)
CREATE INDEX IF NOT EXISTS idx_triagens_paciente_id
  ON triagens(paciente_id);

-- Ordenação por data (sempre usada)
CREATE INDEX IF NOT EXISTS idx_triagens_criado_em
  ON triagens(criado_em DESC);

-- Paciente + data combinado (mais eficiente para prontuário)
CREATE INDEX IF NOT EXISTS idx_triagens_paciente_data
  ON triagens(paciente_id, criado_em DESC);
