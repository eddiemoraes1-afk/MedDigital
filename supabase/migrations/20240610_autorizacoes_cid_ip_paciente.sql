-- Guarda o IP do paciente no momento em que ele autoriza a divulgação do CID.
-- Esse dado aparece no atestado PDF como evidência do consentimento digital (LGPD).
alter table autorizacoes_cid
  add column if not exists ip_paciente text;
