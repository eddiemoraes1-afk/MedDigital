-- Novos campos de antecedentes no prontuário do paciente.
-- Adicionados para registro completo durante a consulta.
alter table pacientes
  add column if not exists comorbidades            text,
  add column if not exists antecedentes_cirurgicos text,
  add column if not exists imunizacoes             text,
  add column if not exists historico_ginecologico  text;
