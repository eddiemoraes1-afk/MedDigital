-- ═══════════════════════════════════════════════════════════════════════════════
-- PAGAMENTOS — integração com o Asaas
--
-- Desenhado para sobreviver à troca de conta do Asaas:
--   · Os dados do pagamento vivem AQUI. O Asaas é só a referência externa.
--   · Toda linha guarda de qual conta ela veio (coluna asaas_conta).
--   · O mapeamento paciente ↔ cliente do Asaas é por conta, então as duas
--     contas podem coexistir durante a migração sem conflito.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Pagamentos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  paciente_id        UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,

  -- Chave de idempotência. Impede cobrar duas vezes a mesma coisa.
  -- Ex.: 'consulta:9f2c...' ou 'triagem:4a1b...'
  referencia         TEXT NOT NULL UNIQUE,

  descricao          TEXT NOT NULL,
  valor              NUMERIC(10,2) NOT NULL CHECK (valor > 0),

  metodo             TEXT NOT NULL CHECK (metodo IN ('pix', 'cartao')),

  status             TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente','pago','expirado','cancelado','estornado','falhou')),

  -- ── Rastro da conta Asaas de origem ──
  -- Quando migrarmos para o CNPJ novo, esta coluna permite conciliar
  -- o que foi cobrado antes e o que foi cobrado depois.
  asaas_conta        TEXT NOT NULL,
  asaas_cobranca_id  TEXT,
  asaas_cliente_id   TEXT,

  -- ── PIX ──
  pix_copia_cola     TEXT,
  pix_qrcode_base64  TEXT,
  pix_expira_em      TIMESTAMPTZ,

  -- ── Cartão / fatura hospedada no Asaas ──
  link_pagamento     TEXT,

  vencimento         DATE,
  pago_em            TIMESTAMPTZ,

  -- Vínculos opcionais com o atendimento
  agendamento_id     UUID,
  atendimento_id     UUID,

  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_paciente   ON public.pagamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status     ON public.pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cobranca   ON public.pagamentos(asaas_cobranca_id)
  WHERE asaas_cobranca_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagamentos_conta      ON public.pagamentos(asaas_conta, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_criado     ON public.pagamentos(criado_em DESC);


-- ── 2. Histórico de eventos ───────────────────────────────────────────────────
-- Toda chamada à API e todo aviso recebido fica registrado aqui.
-- Se houver divergência, dá para reconstruir exatamente o que aconteceu.
CREATE TABLE IF NOT EXISTS public.pagamentos_eventos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id  UUID REFERENCES public.pagamentos(id) ON DELETE CASCADE,
  origem        TEXT NOT NULL CHECK (origem IN ('api','webhook','sistema')),
  evento        TEXT NOT NULL,
  detalhe       JSONB,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pag_eventos_pagamento ON public.pagamentos_eventos(pagamento_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pag_eventos_criado    ON public.pagamentos_eventos(criado_em DESC);


-- ── 3. Mapeamento paciente ↔ cliente do Asaas ─────────────────────────────────
-- O identificador do cliente é específico de cada conta do Asaas.
-- Guardar por conta permite que a conta antiga e a nova convivam na transição.
CREATE TABLE IF NOT EXISTS public.asaas_clientes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id       UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  asaas_conta       TEXT NOT NULL,
  asaas_cliente_id  TEXT NOT NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, asaas_conta)
);

CREATE INDEX IF NOT EXISTS idx_asaas_clientes_paciente ON public.asaas_clientes(paciente_id);


-- ── 4. Atualização automática de atualizado_em ────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_pagamentos_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pagamentos_atualizado_em ON public.pagamentos;
CREATE TRIGGER trg_pagamentos_atualizado_em
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_pagamentos_atualizado_em();


-- ── 5. Segurança (RLS) ────────────────────────────────────────────────────────
-- Mesma estratégia das outras tabelas administrativas:
-- RLS ligado sem policy = ninguém acessa pelo navegador.
-- Só a service_role (usada nas rotas de API do servidor) passa.
ALTER TABLE public.pagamentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_eventos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_clientes      ENABLE ROW LEVEL SECURITY;
