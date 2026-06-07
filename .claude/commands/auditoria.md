# /auditoria — Auditoria Profunda do MedDigital

Você é um auditor sênior de software especializado em plataformas de saúde digital. Sua missão é conduzir uma auditoria profunda e imparcial do projeto **MedDigital** (plataforma de telemedicina e saúde corporativa, Next.js 15 + Supabase).

Ao final, você deve produzir um relatório completo em Markdown salvo em `.claude/auditoria_resultado.md`, cobrindo exatamente as seções definidas abaixo.

---

## INSTRUÇÕES DE EXECUÇÃO

Execute esta auditoria **de forma sistemática**, lendo os arquivos reais do projeto antes de cada avaliação. Não invente problemas — baseie-se no código lido. Para cada achado, cite o arquivo e a linha exata.

Siga esta ordem:

---

## BLOCO 1 — SEGURANÇA E AUTENTICAÇÃO

**Objetivo:** Encontrar brechas que possam expor dados médicos ou permitir acesso não autorizado.

### 1.1 Verificação de Autenticação nas Rotas API
- Leia pelo menos 15 arquivos `route.ts` de diferentes módulos (admin, medico, paciente, empresa)
- Para cada rota, verifique: a sessão é verificada antes de qualquer query ao banco?
- Identifique rotas que usam `createAdminClient()` (service_role) vs `createClient()` (RLS)
- Marque como **CRÍTICO** qualquer rota que não verifique `session.user` antes de operar

### 1.2 Exposição de Dados Sensíveis no Frontend
- Busque por `console.log` em componentes client que possam expor dados de pacientes
- Verifique se CPF, CID, dados clínicos aparecem em URLs (parâmetros de query)
- Cheque se algum Server Component passa dados sensíveis além do necessário para Client Components

### 1.3 Row Level Security (RLS) — Auditoria
- Leia `src/lib/supabase.ts` (ou equivalente) para entender como os clientes são criados
- Verifique se rotas do módulo `empresa` poderiam retornar dados de funcionários de **outras empresas**
- Verifique se um médico poderia chamar APIs de outro médico
- Verifique se um paciente poderia acessar prontuário de outro paciente

### 1.4 Segurança em Uploads e Arquivos
- Busque por rotas de upload (logo de empresa, foto de médico)
- Verifique se há validação de tipo MIME e tamanho antes de aceitar arquivos
- Verifique se os paths do Storage usam identificadores previsíveis (sequenciais/nome do arquivo original)

### 1.5 Segredos e Variáveis de Ambiente
- Verifique se há chaves hardcoded (API keys, tokens) no código
- Busque por `SUPABASE_SERVICE_ROLE_KEY` e confirme que só é usada em contexto servidor
- Verifique se `.env.local` está no `.gitignore`

---

## BLOCO 2 — LGPD E CONFORMIDADE MÉDICA

**Objetivo:** Avaliar conformidade com a LGPD e com boas práticas de dados de saúde (sensíveis por natureza, Art. 11 LGPD).

### 2.1 Consentimentos
- Leia `src/app/api/paciente/consentimentos/route.ts`
- Verifique se os 3 consentimentos (LGPD geral, telemedicina, vídeo) são realmente registrados com: texto do termo, versão, IP do paciente, data/hora
- Confirme que o `ip_address` é coletado do header real da requisição (não de IP fixo/hardcoded)

### 2.2 Dados de CID Sensíveis
- Leia os arquivos de autorização de CID (`src/app/api/medico/autorizacao-cid/` e `src/app/api/paciente/autorizacao-cid/`)
- O fluxo está completo? O médico não consegue registrar CID sensível sem autorização?
- O log de auditoria registra corretamente os 3 eventos?

### 2.3 Anonimização nas Telas de Empresa
- Leia `src/app/api/empresa/atestados/route.ts`
- Os dados retornados para o RH são realmente anonimizados? (sem nome completo + CID ao mesmo tempo?)
- Existe risco de reidentificação?

### 2.4 Retenção e Exclusão de Dados
- Existe algum mecanismo para exclusão de dados de paciente a pedido (direito ao esquecimento)?
- Há registros de quem acessou quais dados (log de acesso)?

---

## BLOCO 3 — QUALIDADE DO CÓDIGO

**Objetivo:** Avaliar robustez, manutenibilidade e cobertura de erros.

### 3.1 Tratamento de Erros nas Rotas API
- Amostre 10 rotas API aleatórias
- Para cada uma: há `try/catch`? O erro retornado ao cliente expõe stack trace ou mensagem interna?
- Há tratamento para erros específicos do Supabase (ex: violação de unique constraint)?

### 3.2 TypeScript — Uso de `any`
- Busque por `: any` e `as any` em arquivos `.ts` e `.tsx`
- Liste os 10 casos mais críticos (em lógica de negócio, não em tipos de biblioteca)
- Avalie se esses `any` podem esconder bugs

### 3.3 Race Conditions e Concorrência
- Analise o fluxo de "assumir paciente": dois médicos poderiam assumir o mesmo paciente simultaneamente?
  - Leia `src/app/api/medico/assumir-paciente/route.ts`
  - Há algum mecanismo de lock otimista (ex: `updated_at` check)?
- O auto-save de rascunho (`/rascunho/route.ts`) pode sobrescrever dados salvos definitivamente?

### 3.4 Validação de Inputs
- Em rotas POST/PUT, os dados recebidos no body são validados antes de ir ao banco?
- Busque por rotas que fazem `.eq('coluna', body.valor)` sem sanitização
- Há validação de formato de CPF, CRM, datas?

### 3.5 Estados de Loading e Erro nos Componentes
- Amostre 5 formulários (ReceitaForm, AtestadoForm, SolicitacaoExamesForm, EncaminhamentoForm, triagem)
- Cada um trata o estado `salvando`, `erro` e sucesso corretamente?
- Há duplo-submit possível (botão salvar sem `disabled` durante o fetch)?

---

## BLOCO 4 — PERFORMANCE E BANCO DE DADOS

**Objetivo:** Identificar gargalos e queries problemáticas.

### 4.1 Queries N+1
- Leia as rotas de dashboard (`/api/admin/dashboard/`, `/api/empresa/dashboard/`)
- Há múltiplas queries sequenciais que poderiam ser uma só com JOIN ou RPC?
- Quantas queries são feitas por carregamento de página?

### 4.2 Paginação
- Rotas que retornam listas (funcionários, pacientes, atestados, logs) têm paginação?
- Leia `/api/admin/pacientes/` e `/api/empresa/funcionarios/lista/`
- Uma empresa com 10.000 funcionários causaria timeout/OOM?

### 4.3 Polling Excessivo
- Busque por `setInterval` e `setTimeout` em componentes client
- O `AutorizacaoCidWatcher` usa polling? Com qual intervalo?
- O heartbeat (`HeartbeatProvider.tsx`) qual é o intervalo? Está cancelado no unmount?
- Esses pollings são cancelados quando o componente desmonta?

### 4.4 Bundle Size e Imports
- O arquivo `src/lib/medicamentos.ts` tem 861 entradas e é importado no cliente (`ReceitaForm`)
- Esse arquivo está sendo enviado inteiro para o browser? Considere lazy loading ou API
- Há imports de bibliotecas pesadas direto em Client Components?

### 4.5 Índices de Banco
- Baseado nas queries mais frequentes (busca por `paciente_id`, `medico_id`, `empresa_id`, `created_at`), quais índices provavelmente estão faltando?
- Há queries com `LIKE '%termo%'` que impedem uso de índice?

---

## BLOCO 5 — FLUXOS CLÍNICOS E REGRAS DE NEGÓCIO

**Objetivo:** Garantir que os fluxos médicos são seguros e completos.

### 5.1 Validade dos Documentos
- Atestados, receitas e exames têm data de validade definida?
- Leia os schemas ou as rotas de criação para verificar se o campo `validade` é populado corretamente
- O cálculo "documento ativo" usa a data correta (fuso horário Brasília)?

### 5.2 Receitas Controladas
- Há distinção entre receita comum e receita de controle especial (psicotrópicos, benzodiazepínicos)?
- Um médico pode prescrever qualquer medicamento sem restrições?
- Leia `ReceitaForm.tsx` e a rota `/api/medico/receitas/route.ts`

### 5.3 Fluxo de Atendimento — Integridade
- O que acontece se a conexão do médico cair durante a consulta?
- O auto-save (`/rascunho`) garante que nenhum dado clínico é perdido?
- Um atendimento pode ser finalizado sem nenhum documento emitido? Isso é alertado?

### 5.4 Renovação de Receita
- Leia `/api/renovacao/` (solicitar e verificar)
- O fluxo valida se a receita original pertence ao paciente que está solicitando renovação?
- Há prazo para o médico responder à solicitação?

### 5.5 Agendamento — Edge Cases
- O que acontece se o paciente agenda e não comparece?
- Slots são liberados automaticamente após no-show?
- Um paciente pode ter múltiplos agendamentos simultâneos para o mesmo médico?

---

## BLOCO 6 — ARQUITETURA E ESCALABILIDADE

**Objetivo:** Avaliar se a arquitetura suporta crescimento.

### 6.1 Separação de Responsabilidades
- Há lógica de negócio complexa em componentes React que deveria estar em rotas API ou em `lib/`?
- Server Actions são usadas? Onde? Estão protegidas com autenticação?
- Leia `src/app/admin/actions.ts`

### 6.2 Multi-tenancy
- O isolamento entre empresas é feito por RLS no banco ou por filtros no código?
- Se for por filtro no código, um bug poderia vazar dados entre empresas?

### 6.3 Dependências Externas
- Quais serviços externos são usados? (Supabase, Daily.co, Gmail SMTP, outros?)
- Há fallback se o Daily.co estiver fora do ar?
- O envio de email é bloqueante (await) no fluxo crítico de agendamento?

### 6.4 Testes
- Há testes automatizados? (busque por `*.test.ts`, `*.spec.ts`, arquivos Vitest/Jest)
- Quais fluxos críticos estão sem cobertura de teste?

---

## BLOCO 7 — UX E ACESSIBILIDADE

**Objetivo:** Identificar problemas de usabilidade especialmente no contexto de uso médico (pressa, stress).

### 7.1 Feedback de Erros
- Quando uma API retorna erro, o médico vê uma mensagem clara? Ou apenas "erro"?
- Formulários com campos obrigatórios indicam claramente quais faltam?

### 7.2 Mobile
- Os formulários de atendimento são usáveis em tablet? (médico pode usar iPad)
- Há elementos com `min-width` fixo que quebram em telas menores?

### 7.3 Acessibilidade
- Inputs têm `<label>` correto ou apenas `placeholder`?
- Botões de ação têm texto descritivo ou apenas ícones (sem `aria-label`)?
- Contraste de cores atende WCAG AA?

---

## FORMATO DO RELATÓRIO FINAL

Ao terminar todas as verificações acima, crie o arquivo `.claude/auditoria_resultado.md` com exatamente esta estrutura:

```markdown
# Auditoria MedDigital — [data de hoje]

## Resumo Executivo
[Parágrafo de 5-8 linhas com a avaliação geral: o que está bem, o nível de risco, prioridade de correções]

## Pontos Fortes
[Liste os aspectos técnicos e de segurança que estão bem implementados, com exemplos do código]

## Achados Críticos 🔴
[Problemas que precisam de correção imediata — risco de segurança, vazamento de dados, perda de dados clínicos]
Para cada achado:
- **Título do problema**
- Arquivo: `caminho/do/arquivo.ts` linha X
- Descrição do problema
- Impacto potencial
- Correção recomendada (com código de exemplo quando aplicável)

## Achados Importantes 🟡
[Problemas relevantes que devem ser corrigidos em breve — bugs potenciais, performance, compliance]
[Mesma estrutura dos críticos]

## Melhorias Recomendadas 🟢
[Oportunidades de melhoria — não são bugs, mas elevariam significativamente a qualidade]
[Mesma estrutura]

## Ideias de Novas Funcionalidades 💡
[Funcionalidades que fariam sentido para a plataforma, com justificativa de valor clínico/negócio]

## Plano de Ação Sugerido
[Tabela com: Prioridade | Achado | Esforço estimado]

## Métricas do Projeto
- Total de arquivos TypeScript analisados: X
- Rotas API: X
- Componentes React: X
- Linhas de código (aproximado): X
- Cobertura de testes: X%
```

---

## INSTRUÇÃO FINAL

Seja honesto e direto. Este é um sistema médico — erros têm consequências reais para pacientes. Não minimize problemas para parecer positivo. Se encontrar algo crítico, diga claramente. Ao mesmo tempo, reconheça o que foi bem feito.

Salve o relatório em `.claude/auditoria_resultado.md` e informe o caminho ao terminar.
