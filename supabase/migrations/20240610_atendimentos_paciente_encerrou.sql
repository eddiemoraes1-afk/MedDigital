-- Registra que o encerramento foi feito pelo paciente (não pelo médico).
-- Permite auditoria e diferenciar os dois tipos de encerramento nos dashboards.
alter table atendimentos
  add column if not exists paciente_encerrou boolean default false;
