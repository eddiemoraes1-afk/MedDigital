-- Adiciona 'azul' ao check constraint de classificacao_risco (Protocolo de Manchester)
-- O Protocolo de Manchester usa 5 níveis: vermelho, laranja, amarelo, verde, azul

-- Remove o constraint antigo (o nome pode variar conforme criação da tabela)
ALTER TABLE triagens DROP CONSTRAINT IF EXISTS triagens_classificacao_risco_check;

-- Recria com os 5 níveis do Protocolo de Manchester
ALTER TABLE triagens
  ADD CONSTRAINT triagens_classificacao_risco_check
  CHECK (classificacao_risco IN ('vermelho', 'laranja', 'amarelo', 'verde', 'azul'));
