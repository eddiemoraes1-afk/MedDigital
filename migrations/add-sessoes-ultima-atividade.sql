-- Migration: adicionar ultima_atividade em sessoes_sistema
-- Executar no SQL Editor do Supabase

ALTER TABLE sessoes_sistema
  ADD COLUMN IF NOT EXISTS ultima_atividade timestamptz NULL;

-- Índice para o cleanup query ficar rápido
CREATE INDEX IF NOT EXISTS idx_sessoes_logout_null
  ON sessoes_sistema (logout_em, login_em)
  WHERE logout_em IS NULL;

-- Fechar imediatamente todas as sessões sem logout abertas há mais de 4 horas
-- (dados históricos que nunca tiveram heartbeat)
UPDATE sessoes_sistema
SET
  logout_em         = login_em + INTERVAL '4 hours',
  duracao_segundos  = 14400   -- 4h em segundos
WHERE
  logout_em IS NULL
  AND login_em < NOW() - INTERVAL '4 hours';
