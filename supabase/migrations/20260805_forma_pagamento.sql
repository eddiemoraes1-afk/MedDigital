-- Adiciona forma de pagamento e índice para parcelas
ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT
    CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao_credito', 'cartao_debito', 'dinheiro', 'cheque')),
  ADD COLUMN IF NOT EXISTS grupo_parcela UUID;  -- mesmo UUID agrupa parcelas de uma compra

CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo_parcela
  ON public.lancamentos_financeiros(grupo_parcela)
  WHERE grupo_parcela IS NOT NULL;
