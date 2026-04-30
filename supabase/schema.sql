-- ============================================================
-- MEDDIGITAL — Schema do Banco de Dados (v2 — idempotente)
-- Execute este arquivo no Supabase SQL Editor
-- ============================================================

-- Extensão para vetores (IA)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabelas
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('paciente', 'medico', 'admin')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  data_nascimento DATE,
  telefone TEXT,
  endereco TEXT,
  convenio TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  crm TEXT NOT NULL,
  crm_uf CHAR(2) NOT NULL,
  especialidade TEXT NOT NULL,
  telefone TEXT,
  status TEXT NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise', 'aprovado', 'reprovado', 'suspenso')),
  dados_bancarios JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.triagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  classificacao_risco TEXT NOT NULL CHECK (classificacao_risco IN ('verde', 'amarelo', 'laranja', 'vermelho')),
  direcionamento TEXT NOT NULL CHECK (direcionamento IN ('virtual', 'presencial', 'orientacao')),
  resumo_ia TEXT,
  historico_chat JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'concluida' CHECK (status IN ('em_andamento', 'concluida')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES public.medicos(id),
  triagem_id UUID REFERENCES public.triagens(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('virtual', 'presencial')),
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_andamento', 'concluido', 'cancelado')),
  notas_medico TEXT,
  duracao_minutos INTEGER,
  sala_video TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  iniciado_em TIMESTAMPTZ,
  finalizado_em TIMESTAMPTZ
);

-- Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, tipo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'tipo', 'paciente'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes antes de recriar
DROP POLICY IF EXISTS "usuario_ve_proprio_perfil" ON public.perfis;
DROP POLICY IF EXISTS "admin_ve_tudo_perfis" ON public.perfis;
DROP POLICY IF EXISTS "paciente_ve_proprio" ON public.pacientes;
DROP POLICY IF EXISTS "medico_ve_pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "admin_ve_tudo_pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "medico_ve_proprio" ON public.medicos;
DROP POLICY IF EXISTS "admin_ve_tudo_medicos" ON public.medicos;
DROP POLICY IF EXISTS "paciente_ve_triagens" ON public.triagens;
DROP POLICY IF EXISTS "medico_ve_triagens" ON public.triagens;
DROP POLICY IF EXISTS "paciente_ve_atendimentos" ON public.atendimentos;
DROP POLICY IF EXISTS "medico_ve_atendimentos" ON public.atendimentos;

-- Recriar policies
CREATE POLICY "usuario_ve_proprio_perfil" ON public.perfis
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admin_ve_tudo_perfis" ON public.perfis
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND tipo = 'admin')
  );

CREATE POLICY "paciente_ve_proprio" ON public.pacientes
  FOR ALL USING (auth.uid() = usuario_id);

CREATE POLICY "medico_ve_pacientes" ON public.pacientes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.medicos WHERE usuario_id = auth.uid() AND status = 'aprovado')
  );

CREATE POLICY "admin_ve_tudo_pacientes" ON public.pacientes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND tipo = 'admin')
  );

CREATE POLICY "medico_ve_proprio" ON public.medicos
  FOR ALL USING (auth.uid() = usuario_id);

CREATE POLICY "admin_ve_tudo_medicos" ON public.medicos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND tipo = 'admin')
  );

CREATE POLICY "paciente_ve_triagens" ON public.triagens
  FOR ALL USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

CREATE POLICY "medico_ve_triagens" ON public.triagens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.medicos WHERE usuario_id = auth.uid() AND status = 'aprovado')
  );

CREATE POLICY "paciente_ve_atendimentos" ON public.atendimentos
  FOR ALL USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())
  );

CREATE POLICY "medico_ve_atendimentos" ON public.atendimentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.medicos WHERE usuario_id = auth.uid() AND status = 'aprovado')
  );

-- ============================================================
-- CRIAR PRIMEIRO ADMIN
-- Após criar sua conta no sistema, execute este comando
-- substituindo 'seu@email.com' pelo seu e-mail:
-- ============================================================
-- UPDATE public.perfis SET tipo = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');