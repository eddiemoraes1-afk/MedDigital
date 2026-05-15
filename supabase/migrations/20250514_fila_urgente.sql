-- Adiciona coluna urgente à tabela atendimentos para fila preferencial (laranja Manchester)
ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS urgente BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para consultas frequentes por urgência na fila
CREATE INDEX IF NOT EXISTS idx_atendimentos_urgente
  ON atendimentos (urgente, status, criado_em)
  WHERE status = 'aguardando';
