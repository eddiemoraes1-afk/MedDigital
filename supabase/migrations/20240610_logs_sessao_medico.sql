-- Migration: logs_sessao_medico
-- Registra login, logout, assumiu_paciente e encerrou_consulta com IP e dados extras.

create table if not exists logs_sessao_medico (
  id           uuid        primary key default gen_random_uuid(),
  medico_id    uuid        not null references medicos(id) on delete cascade,
  tipo         text        not null,
  descricao    text,
  ip           text,
  dados        jsonb,
  criado_em    timestamptz not null default now(),

  constraint chk_tipo check (tipo in ('login','logout','assumiu_paciente','encerrou_consulta'))
);

create index idx_logs_sessao_medico_medico_id  on logs_sessao_medico(medico_id);
create index idx_logs_sessao_medico_criado_em  on logs_sessao_medico(criado_em desc);

-- RLS: médico só lê os próprios logs; escrita via service_role (admin client)
alter table logs_sessao_medico enable row level security;

create policy "medico le proprios logs"
  on logs_sessao_medico for select
  using (
    medico_id = (select id from medicos where usuario_id = auth.uid())
  );
