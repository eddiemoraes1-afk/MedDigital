-- ============================================================
-- Migration: Prontuário Médico Estruturado (CFM)
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Campos de anamnese estruturada no atendimento
ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS queixa_principal    TEXT,
  ADD COLUMN IF NOT EXISTS hda                 TEXT,
  ADD COLUMN IF NOT EXISTS exame_fisico        TEXT,
  ADD COLUMN IF NOT EXISTS sinais_vitais       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hipotese_diag       TEXT,
  ADD COLUMN IF NOT EXISTS cid                 TEXT,
  ADD COLUMN IF NOT EXISTS plano_terapeutico   TEXT,
  ADD COLUMN IF NOT EXISTS evolucao            TEXT;

-- 2. Antecedentes pessoais do paciente (persistem entre consultas)
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS alergias            TEXT,
  ADD COLUMN IF NOT EXISTS hpp                 TEXT,
  ADD COLUMN IF NOT EXISTS medicamentos_em_uso TEXT,
  ADD COLUMN IF NOT EXISTS historia_familiar   TEXT,
  ADD COLUMN IF NOT EXISTS historia_social     TEXT;
