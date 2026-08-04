-- =============================================================================
-- RLS POLICIES — Segurança completa do banco de dados
-- Resolve: "Table publicly accessible — rls_disabled_in_public"
-- =============================================================================
-- ESTRATÉGIA:
--   createAdminClient() usa service_role → bypassa RLS automaticamente (seguro)
--   createClient()      usa JWT autenticado → precisa de policy para acessar
--
--   Tabelas ADMIN ONLY: habilita RLS sem policies → bloqueia anon + authenticated
--   Tabelas PORTAL:     habilita RLS + policy "só autenticado" → bloqueia anon
--   Tabelas FINANCEIRO: já têm RLS (20260803_financeiro.sql)
--   consentimentos:     já tem RLS (20260607_consentimentos_lgpd.sql)
-- =============================================================================

-- =============================================================================
-- PARTE 1: TABELAS ADMIN ONLY
-- Apenas service_role acessa → nenhuma policy necessária
-- =============================================================================

-- Habilita RLS em tabelas que só o painel admin acessa (via createAdminClient)
DO $$
DECLARE
  tbl text;
  admin_tables text[] := ARRAY[
    'autorizacoes_cid',
    'configuracoes_sistema',
    'consultas',
    'empresa_pacientes',
    'logos',
    'mapeamento_riscos_empresa',
    'monitoramento_nr1',
    'perfis',
    'pgr_versoes',
    'plano_acao_nr1',
    'presenca_medicos',
    'sessoes_sistema'
  ];
BEGIN
  FOREACH tbl IN ARRAY admin_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      RAISE NOTICE 'RLS habilitado: %', tbl;
    ELSE
      RAISE NOTICE 'Tabela não encontrada (pulando): %', tbl;
    END IF;
  END LOOP;
END $$;

-- Tabela com hífen no nome precisa de tratamento especial
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'nr1-evidencias'
  ) THEN
    ALTER TABLE public."nr1-evidencias" ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado: nr1-evidencias';
  ELSE
    RAISE NOTICE 'Tabela não encontrada (pulando): nr1-evidencias';
  END IF;
END $$;

-- =============================================================================
-- PARTE 2: TABELAS DO PORTAL (paciente + médico)
-- Habilita RLS + policy: apenas usuários autenticados podem acessar
-- =============================================================================

DO $$
DECLARE
  tbl text;
  portal_tables text[] := ARRAY[
    'atendimentos',
    'medicos',
    'pacientes',
    'triagens',
    'solicitacoes_exames',
    'horarios_medico',
    'receitas',
    'atestados',
    'agendamentos',
    'exclusoes_telemedicina',
    'solicitacoes_renovacao',
    'logs_sessao_medico',
    'vinculos_empresa',
    'triagem_psicossocial',
    'perfis_sistema',
    'logs_sistema',
    'logs_antecedentes',
    'empresas'
  ];
BEGIN
  FOREACH tbl IN ARRAY portal_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Habilita RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- Remove policy antiga se existir (para rodar idempotente)
      EXECUTE format(
        'DROP POLICY IF EXISTS "portal_authenticated_only" ON public.%I', tbl
      );

      -- Cria policy: qualquer usuário autenticado pode operar
      -- (anon key sem JWT = bloqueado)
      EXECUTE format(
        'CREATE POLICY "portal_authenticated_only" ON public.%I
         FOR ALL
         TO authenticated
         USING (true)
         WITH CHECK (true)',
        tbl
      );

      RAISE NOTICE 'RLS + policy criada: %', tbl;
    ELSE
      RAISE NOTICE 'Tabela não encontrada (pulando): %', tbl;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 3: VERIFICAÇÃO FINAL
-- Lista tabelas com RLS status para confirmar
-- =============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
