-- Tabela de sessões de usuário para rastreamento de login/logout
create table if not exists public.sessoes_sistema (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null,
  email              text not null,
  perfil             text not null default 'desconhecido', -- admin | empresa | medico | paciente
  login_em           timestamptz not null default now(),
  logout_em          timestamptz,
  duracao_segundos   int,  -- preenchido no logout
  ip                 text,
  created_at         timestamptz not null default now()
);

create index if not exists sessoes_sistema_usuario_id_idx on public.sessoes_sistema(usuario_id);
create index if not exists sessoes_sistema_login_em_idx   on public.sessoes_sistema(login_em desc);
create index if not exists sessoes_sistema_email_idx      on public.sessoes_sistema(email);
