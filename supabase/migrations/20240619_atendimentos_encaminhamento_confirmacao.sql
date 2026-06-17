-- Adiciona flag para controlar ciência do paciente sobre encaminhamento presencial.
-- Usado quando o médico registra status "emergência" na elegibilidade de telemedicina:
-- o sistema sinaliza a necessidade do aceite do paciente, que confirma na tela da consulta.
-- O aceite é registrado na tabela consentimentos (tipo: encaminhamento_presencial).

alter table atendimentos
  add column if not exists encaminhamento_aguardando_confirmacao boolean default false;
