# RovarisMed — MedDigital

Plataforma de saúde ocupacional SaaS para gestão de benefícios de saúde de funcionários de empresas clientes (prefeituras, empresas privadas). Desenvolvida por Eddie Moraes (eddiemoraes1@gmail.com).

**Sempre responder em português. No final de cada tarefa, fornecer o comando `git push` para o usuário copiar no terminal.**

---

## Stack

- **Framework**: Next.js 15 App Router (Server Components + Client Components `'use client'`)
- **Banco**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel (deploy automático no push para `main`)
- **Estilo**: Tailwind CSS
- **Linguagem**: TypeScript

---

## Estrutura de pastas principais

```
src/
  app/
    admin/          → Painel do administrador (Rovaris)
    empresa/        → Portal do RH da empresa cliente
    medico/         → Interface do médico
    paciente/       → Interface do paciente
    api/            → Rotas API (Next.js route handlers)
  components/       → Componentes compartilhados
  lib/              → Utilitários (auth, supabase, helpers)
```

---

## Autenticação e perfis

Arquivo: `src/lib/auth-sistema.ts`

Funções de proteção de rota (usadas no topo de cada Server Component):
- `requireAdmin()` → só admins
- `requireEmpresa()` → só gestores de empresa (retorna `{ empresaId }`)
- `requireMedico()` → só médicos aprovados (retorna `{ medicoId }`)
- `requirePaciente()` → só pacientes

Perfis na tabela `perfis`: `'paciente' | 'medico' | 'admin'`

Gestores de empresa têm `perfis.tipo = 'admin'` + registro na tabela `empresa_admins` (ou similar). Verificar `auth-sistema.ts` para lógica exata.

---

## Clientes Supabase

Arquivo: `src/lib/supabase/server.ts`

- `createClient()` → respeita RLS (Row Level Security), usa sessão do usuário
- `createAdminClient()` → bypass de RLS, usa `SUPABASE_SERVICE_ROLE_KEY`, usar só em API routes e Server Components protegidos

**Regra**: sempre usar `createAdminClient()` em operações administrativas e API routes. Nunca expor a service role key no cliente.

---

## Tabelas principais do banco

### `perfis` — tipo de usuário
- `id` (UUID, FK → auth.users)
- `tipo` TEXT: `'paciente' | 'medico' | 'admin'`

### `pacientes`
- `id`, `usuario_id`, `nome`, `cpf`, `data_nascimento`, `telefone`, `sexo`

### `medicos`
- `id`, `usuario_id`, `nome`, `crm`, `crm_uf`, `especialidade`, `sexo`
- `status`: `'em_analise' | 'aprovado' | 'reprovado' | 'suspenso'`

### `empresas`
- `id`, `nome`, `cnpj`, `ativo`
- `preco_mensalidade`, `preco_consulta`, `preco_receita`, `percentual_coparticipacao`

### `vinculos_empresa` — funcionários vinculados a empresas
- `paciente_id`, `empresa_id`, `ativo`
- `nome_completo`, `cpf`, `cargo`, `tipo_cargo`, `departamento`, `relacao`

### `agendamentos` — consultas agendadas
- `id`, `paciente_id`, `medico_id`, `data_hora` (timestamp sem timezone, armazenado em UTC)
- `status`: `'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'reagendado' | 'nao_compareceu'`
- **IMPORTANTE**: `data_hora` é `timestamp without timezone` armazenado como UTC. Ao criar, sempre converter para UTC: `new Date(data_hora).toISOString()`

### `atendimentos` — consultas realizadas
- `id`, `paciente_id`, `medico_id`, `agendamento_id`
- `status`: `'aguardando' | 'em_andamento' | 'concluido' | 'cancelado'`
- `finalizado_em` (TIMESTAMPTZ) — quando a consulta foi concluída
- Campos de prontuário: `queixa_principal`, `hda`, `exame_fisico`, `sinais_vitais`, `hipotese_diag`, `cid`, `plano_terapeutico`, `evolucao`, `notas_medico`

### `atestados`
- `id`, `paciente_id`, `medico_id`, `empresa_id`
- `data_emissao`, `data_inicio`, `data_fim`, `dias`, `cid`

### `receitas`
- `id`, `paciente_id`, `medico_id`
- `valor_cobrado`, `valor_medico`, `valor_coparticipacao`

### `solicitacoes_exames`
- Solicitações de exames emitidas pelo médico

### `triagens`
- Triagem por IA do paciente antes da consulta
- `classificacao_risco`: `'verde' | 'amarelo' | 'laranja' | 'vermelho'`

---

## Fuso horário

O sistema usa **America/Sao_Paulo** (UTC-3, UTC-2 no horário de verão).

- `data_hora` em `agendamentos`: armazenado como UTC em coluna `timestamp without timezone`
- `finalizado_em` em `atendimentos`: `TIMESTAMPTZ` (armazenado em UTC)
- Ao filtrar "hoje" em queries, usar fuso Brasília:
  ```ts
  const hojeBrasil = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  ```
- Ao exibir datas, sempre passar `timeZone: 'America/Sao_Paulo'` para `toLocaleDateString`/`toLocaleTimeString`

---

## Padrões de código importantes

### Título do médico
Arquivo: `src/lib/medico-utils.ts`
```ts
drTitle(sexo: string | null | undefined): 'Dr.' | 'Dra.' | 'Dr(a).'
```
Usar sempre em vez de hardcodar "Dr(a).".

### CID tooltips
Arquivo: `src/components/CidTooltip.tsx`
- `<CidBadge cid={cid} />` — badge com tooltip (fundo colorido)
- `<CidBadgeTable cid={cid} />` — versão para tabelas
- `<CidBadgePill cid={cid} />` — pill compacto
- `<GrupoLabel abrev={abrev} grupo={grupo} />` — grupo CID-10

### Co-participação
Cada empresa tem `percentual_coparticipacao`. O valor descontado do paciente é calculado em `src/app/api/empresa/relatorio/route.ts`.

### Theming por empresa
Arquivo: `src/lib/tema.ts`
Cada empresa pode ter logo e cor primária. Aplicado via `TemaProvider` no layout do paciente.

### Geração de PDFs
- Atestados: `src/lib/atestadoHTML.ts` + `src/lib/gerarPDF.ts`
- Receitas: `src/lib/receitaHTML.ts`
- Exames: `src/lib/examesHTML.ts`

---

## Páginas por perfil

### Admin (`/admin`)
- `/admin` — painel com KPIs (consultas realizadas hoje via `atendimentos.finalizado_em`, empresas ativas, médicos aprovados)
- `/admin/empresas` — lista + cadastro de empresas
- `/admin/empresas/[id]` — ficha da empresa (logo, preços, funcionários, co-participação)
- `/admin/medicos` — lista com filtros, aprovação/reprovação
- `/admin/medicos/[id]` — ficha do médico
- `/admin/pacientes` — lista de pacientes
- `/admin/pacientes/[id]` — ficha do paciente
- `/admin/agendamentos` — agenda por médico (semana/mês)
- `/admin/dashboard` — analytics (faturamento, produção, gráficos)
- `/admin/tempo-real` — fila em tempo real

### Empresa (`/empresa`)
- `/empresa/dashboard` — portal RH com tabs: Consultas, Atestados, Exames, Exclusões, Relatório, Funcionários

### Médico (`/medico`)
- `/medico/dashboard` — agenda do dia + fila
- `/medico/atendimento/[id]` — sala de atendimento (prontuário, timer, drawer)
- `/medico/pacientes` — lista de pacientes atendidos
- `/medico/pacientes/[id]` — ficha completa do paciente (prontuário, atestados, receitas, exames)
- `/medico/producao` — produção mensal com relatório e CSV
- `/medico/renovacao/[id]` — atender renovação de receita

### Paciente (`/paciente`)
- `/paciente/dashboard` — resumo, consultas, documentos
- `/paciente/triagem` — triagem por IA
- `/paciente/agendar` — agendamento de consulta
- `/paciente/renovacao-receita` — solicitação de renovação (CPF read-only por LGPD)

---

## Notificações

Arquivo: `src/lib/notifications.ts`
- Email de confirmação/cancelamento de agendamento
- WhatsApp via API
- Interface `DadosAgendamento` inclui `medicoSexo` para usar `drTitle()`

---

## Deploy

- **Vercel**: deploy automático no `git push origin main`
- **Variáveis de ambiente**: configuradas no Vercel (não no `.env.local` para produção)
- Após cada tarefa, rodar `npx tsc --noEmit` para checar TypeScript antes do push

---

## Convenções

- Sempre `'use client'` em componentes com hooks/interatividade
- Server Components para páginas que fazem queries ao banco
- API routes em `src/app/api/` usando `NextResponse.json()`
- Queries ao banco sempre com `createAdminClient()` nas API routes
- Cores da marca: `#1A3A2C` (verde escuro), `#5BBD9B` (verde médio), `#F3FAF7` (fundo)
- Sem nomes de pacientes/funcionários em respostas de API pública (LGPD)
