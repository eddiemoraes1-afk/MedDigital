-- ============================================================
-- Tabela: solicitacoes_exames
-- Criada em: 2025-05-12
-- ============================================================

create table if not exists public.solicitacoes_exames (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       uuid not null references public.pacientes(id) on delete cascade,
  medico_id         uuid not null references public.medicos(id) on delete restrict,
  atendimento_id    uuid references public.atendimentos(id) on delete set null,
  empresa_id        uuid references public.empresas(id) on delete set null,

  -- Conteúdo da solicitação
  exames            text not null,            -- lista de exames (um por linha)
  indicacao_clinica text,                     -- motivo / hipótese diagnóstica
  observacoes       text,                     -- orientações adicionais
  urgencia          text default 'normal'     -- normal | urgente | emergencia
                    check (urgencia in ('normal', 'urgente', 'emergencia')),

  -- Datas
  data_solicitacao  date not null default current_date,
  criado_em         timestamptz not null default now(),

  -- Status
  status            text default 'emitida'
                    check (status in ('emitida', 'realizada', 'cancelada'))
);

-- Índices para queries frequentes
create index if not exists idx_sol_exames_paciente  on public.solicitacoes_exames(paciente_id);
create index if not exists idx_sol_exames_medico    on public.solicitacoes_exames(medico_id);
create index if not exists idx_sol_exames_empresa   on public.solicitacoes_exames(empresa_id);
create index if not exists idx_sol_exames_data      on public.solicitacoes_exames(data_solicitacao);

-- RLS: desabilitado (usamos adminClient no servidor)
alter table public.solicitacoes_exames disable row level security;
