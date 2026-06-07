# Auditoria MedDigital — 07/06/2026

> Auditoria profunda e independente da plataforma RovarisMed/MedDigital (Next.js 15 App Router + Supabase + TypeScript), conduzida por leitura dos arquivos reais do projeto. Cada achado cita `arquivo:linha`. Escopo: 79 rotas API, 116 componentes React, ~51.627 linhas de código.

---

## Resumo Executivo

A plataforma tem **fundação arquitetural sólida e madura**: isolamento multi-tenant por empresa é disciplinado (o `empresaId` sempre vem da sessão, nunca do request), o consentimento LGPD é versionado com texto integral do termo e IP real do header, há lock otimista correto contra corrida no "assumir paciente", os dashboards evitam N+1 com `Promise.all` + lookups por `Map`, polling tem cleanup impecável e os segredos estão corretamente confinados ao servidor. O time claramente sabe o que está fazendo.

Porém, **o nível de risco atual é ALTO** por causa de um conjunto de falhas críticas concentradas em três frentes: (1) **rotas e server actions administrativas/médicas que escaparam ao padrão de autenticação** — incluindo uma rota de reset de senha pública protegida apenas por um secret hardcoded no código (takeover total do sistema) e um IDOR que expõe o prontuário completo de qualquer paciente a qualquer usuário logado; (2) **conformidade médica incompleta** — o CID (diagnóstico, dado sensível Art. 11 LGPD) pode ser impresso em atestado e exibido com nome ao RH sem autorização do paciente, e não há marcação de medicamentos controlados (opioides emitíveis como receita simples); (3) **risco de perda de dados clínicos** — o auto-save pode sobrescrever prontuário finalizado e a finalização da consulta não verifica sucesso da gravação.

A causa estrutural é que **toda a autorização depende do código da aplicação** (RLS desligado, uso onipresente de `createAdminClient()`): qualquer rota que esqueça a checagem vira um vazamento, sem rede de segurança no banco. Some-se a isso **ausência total de testes automatizados** em fluxos financeiros e de isolamento.

**Prioridade:** as correções dos itens críticos P0 (set-password, IDOR de prontuário, server actions sem auth, finalização sem verificação) são pequenas em esforço e de altíssimo impacto — devem ser feitas imediatamente, antes de qualquer nova feature.

---

## Pontos Fortes

- **Isolamento multi-tenant exemplar.** Rotas de empresa derivam `empresaId` de `requireEmpresa()` (`src/lib/auth-sistema.ts:62-68`) e filtram `.eq('empresa_id', empresaId)` em todas as 8 rotas auditadas. O `empresa_id` nunca vem do body/query (exceto `funcionarios/exportar`, que valida corretamente).
- **Consentimento LGPD bem desenhado.** `src/app/api/paciente/consentimentos/route.ts:62-70` versiona os 3 termos, grava texto integral, versão, data/hora e **IP real** extraído de `x-forwarded-for`/`x-real-ip` (`route.ts:23-30`) — não hardcoded. Cita base legal correta (Art. 11 II "a" + CFM 2.314/2022).
- **Lock otimista correto contra race condition.** `src/app/api/medico/assumir-paciente/route.ts:122-127` usa `.update(...).is('medico_id', null)` + checagem de `length === 0` para detectar perda da corrida. Dois médicos simultâneos → apenas um vence.
- **Sem N+1 nas rotas mais complexas.** `admin/dashboard/route.ts` e `empresa/dashboard/route.ts` fazem ~7 queries fixas com `Promise.all` + `Map`, independente do volume. Nenhum `await` dentro de loop.
- **Polling com cleanup impecável.** Todos os 9 pollings (`AutorizacaoCidWatcher` 3s, `HeartbeatProvider` 2min, etc.) limpam `setInterval` no unmount do `useEffect`.
- **Aba Atestados da empresa genuinamente anonimizada.** `empresa/atestados/route.ts:55-76` retorna cargo/CID/dias sem nome nem CPF; front rotula "Dados anonimizados conforme LGPD".
- **Carregamento sob demanda de bibliotecas pesadas de PDF.** `src/lib/gerarPDF.ts:6-7` carrega `jsPDF`/`html2canvas` via CDN, fora do bundle.
- **Segredos confinados ao servidor.** `SUPABASE_SERVICE_ROLE_KEY` só em `src/lib/supabase/server.ts:34`; nenhum `'use client'` o importa; `.env*` no `.gitignore`.
- **Validação numérica e tratamento de erro modelo em pontos isolados.** `admin/empresas/[id]/precos/route.ts:18-23` (range 0–100) e `api/triagem/route.ts:190,265` (try/catch que loga interno e devolve mensagem genérica) são o padrão correto a replicar.
- **Formulários com bom controle de estado.** `ReceitaForm`, `AtestadoForm`, `SolicitacaoExamesForm`, `EncaminhamentoForm` tratam salvando/erro/sucesso e desabilitam o botão durante o fetch — sem duplo-submit clássico.

---

## Achados Críticos 🔴

### 1. Rota de reset de senha pública com secret hardcoded — takeover total do sistema
- **Arquivo:** `src/app/api/admin/set-password/route.ts:5-13`
- **Descrição:** GET público, sem `auth.getUser()`. Autenticação é apenas `if (secret !== 'meddigital2025reset')` na query string. Recebe `email` e `senha` por query param e chama `auth.admin.updateUserById` com `createAdminClient()`. O secret está no código-fonte (e no histórico do Git).
- **Impacto:** Qualquer pessoa que descubra/adivinhe a string redefine a senha de qualquer conta — incluindo admin e médicos — e assume o sistema inteiro. Email e senha em query string vão para logs de servidor/proxy/browser history.
- **Correção:** **Deletar o arquivo imediatamente** (o próprio comentário diz "DELETAR APÓS USO"). Reset de senha deve usar o fluxo oficial `resetPasswordForEmail` do Supabase.

### 2. IDOR — prontuário clínico completo de qualquer paciente exposto a qualquer usuário logado
- **Arquivo:** `src/app/api/medico/prontuario-inline/[pacienteId]/route.ts:4-82`
- **Descrição:** Verifica `auth.getUser()` mas **não confere se o usuário é médico aprovado nem se tem vínculo com o paciente**. Usa `createAdminClient()` e busca por `pacienteId` da URL: CPF, todas as triagens, atendimentos (queixa, HDA, exame físico, hipótese, CID, plano), atestados, receitas, exames.
- **Impacto:** Qualquer conta autenticada (um paciente comum) iterando UUIDs extrai o histórico clínico de toda a base. Vazamento massivo de dado sensível de saúde (Art. 11 LGPD).
- **Correção:** Exigir médico aprovado (mesmo bloco de `atendimento/[id]/route.ts:15-23`) e checar vínculo médico↔paciente.

### 3. Aprovar/reprovar médico sem nenhuma autenticação
- **Arquivos:** `src/app/api/admin/medico/[id]/aprovar/route.ts:4-18`, `src/app/api/admin/medico/[id]/reprovar/route.ts:4-18`
- **Descrição:** Ambos os POST chamam `createAdminClient()` e fazem `update({ status: 'aprovado' })` direto, **sem `requireAdmin()` e sem `auth.getUser()`**.
- **Impacto:** Atacante na internet aprova médico fraudulento (que passa a atender, prescrever, emitir atestados e ver prontuários) ou reprova/suspende um médico legítimo.
- **Correção:** Adicionar `await requireAdmin()` no topo de ambas.

### 4. Server Actions de admin sem verificação de autorização — escalonamento de privilégio
- **Arquivo:** `src/app/admin/actions.ts:6-57`
- **Descrição:** As 5 server actions (`aprovarMedico`, `reprovarMedico`, `toggleMedicoAtivo`, `excluirAtendimento`, `atribuirMedicoAtendimento`) usam `createAdminClient()` e **não chamam `requireAdmin()`**. Server Actions geram endpoints HTTP públicos (POST com Action ID).
- **Impacto:** Qualquer usuário autenticado (paciente/médico) que force o Action ID pode aprovar médicos falsos ou **excluir atendimentos** (`excluirAtendimento` faz `.delete()` em `atendimentos` = destruição de registro clínico).
- **Correção:** `await requireAdmin()` como primeira linha de cada action.

### 5. Finalização da consulta não verifica sucesso — perda silenciosa de prontuário
- **Arquivo:** `src/app/medico/atendimento/[id]/page.tsx:280-297`
- **Descrição:** `finalizarConsulta()` faz `await fetch('/api/medico/finalizar-atendimento', ...)` mas **nunca checa `res.ok`**. Em seguida `router.push('/medico/dashboard')` executa incondicionalmente.
- **Impacto:** Se a API retornar 500, o médico é levado ao dashboard achando que salvou — e todo o prontuário (queixa, HDA, exame físico, CID, plano) é perdido sem aviso. Gravíssimo em registro clínico legal.
- **Correção:**
  ```ts
  const res = await fetch('/api/medico/finalizar-atendimento', {...})
  if (!res.ok) { setSalvando(false); setErro('Falha ao finalizar. Tente novamente.'); return }
  router.push('/medico/dashboard')
  ```

### 6. Auto-save de rascunho sobrescreve prontuário já finalizado com `null`
- **Arquivo:** `src/app/api/medico/atendimento/[id]/rascunho/route.ts:45-59`
- **Descrição:** O UPDATE filtra apenas por `.eq('id', id).eq('medico_id', medico.id)` — **não filtra por status**. O auto-save roda a cada 30s usando `campo ?? null`. Se a consulta foi finalizada mas a aba continua aberta, o próximo PATCH regrava campos sobre o registro `concluido`, apagando dados com `null`.
- **Impacto:** Perda de dados de prontuário após finalização. Diferente de `finalizar-atendimento/route.ts:73-81` que usa `!== undefined` para preservar.
- **Correção:** Adicionar `.eq('status', 'em_andamento')` ao UPDATE e usar a lógica `!== undefined` para não sobrescrever com null.

### 7. CID gravado em atestado sem autorização do paciente (validação só no front)
- **Arquivos:** `src/components/AtestadoForm.tsx:90`, `src/app/api/medico/atestados/route.ts:52-69`
- **Descrição:** No front, `mostrarCid` só oculta o CID quando o paciente **negou explicitamente** (`cidAutorizado === false`); no estado inicial `null` (médico nunca pediu) o **CID é impresso**. No backend, o POST grava `cid` e `cid_autorizado` direto do body, **sem verificar** se existe `autorizacoes_cid` com `status='autorizado'`. A solicitação de autorização é totalmente opcional.
- **Impacto:** Diagnóstico (dado sensível Art. 11) consta no atestado entregue ao RH sem consentimento do titular. Viola o próprio fluxo de consentimento granular que o sistema implementa.
- **Correção:** No backend, antes de persistir `cid` em atestado de afastamento, verificar `autorizacoes_cid` com `status='autorizado'`. Se não houver, gravar `cid=null`. Nunca confiar no flag do cliente.

### 8. Aba "Consultas" da empresa expõe nome completo + CID na mesma linha
- **Arquivos:** `src/app/api/empresa/consultas/route.ts:93,102`, `src/app/empresa/dashboard/ConsultasDashboard.tsx:344,382-383`
- **Descrição:** A resposta traz `funcionario: vinculo.nome_completo` E `atestado_cid` no mesmo objeto; o front renderiza ambos juntos e o CSV exporta as colunas "Funcionário" + "CID" lado a lado (`:150,159`).
- **Impacto:** O RH **reidentifica diretamente** o diagnóstico de um funcionário nominal — exatamente o que a aba Atestados tenta evitar. Risco alto de discriminação no trabalho.
- **Correção:** Remover `atestado_cid` da resposta de `empresa/consultas` (ou trocar por flag booleana "tem atestado"/dias) e remover a coluna CID do dashboard e do CSV.

### 9. Medicamentos controlados sem marcação — opioides emitíveis como receita simples
- **Arquivos:** `src/lib/medicamentos.ts:7-13`, `src/components/ReceitaForm.tsx:30-34`
- **Descrição:** A interface `Medicamento` não tem campo `controlado`/`tarja`/`lista`. Tramadol, Morfina, Codeína estão tratados como qualquer outro. O tipo de receita (`simples`/`especial`/`antimicrobiano`) é escolhido manualmente e **não tem relação com os medicamentos selecionados**.
- **Impacto:** Médico pode emitir Morfina/Tramadol em "Receita Simples" sem alerta ou bloqueio. Falha de conformidade com a Portaria SVS/MS 344/98.
- **Correção:** Adicionar campo `controle` ao `Medicamento`; em `adicionarMedicamento` forçar `tipo='especial'` e bloquear salvar em receita simples se houver item controlado; revalidar no backend.

### 10. Renovação de receita não valida posse da receita original
- **Arquivo:** `src/app/api/renovacao/solicitar/route.ts:10,42`
- **Descrição:** Recebe `receita_id` do body e grava como `receita_referencia_id` **sem confirmar** que `receitas.paciente_id === paciente.id`. Medicamentos vêm do body sem validação contra a receita original. (O `verificar/route.ts` é seguro, mas os dois não estão acoplados.)
- **Impacto:** Paciente pode referenciar receita de OUTRO paciente ou solicitar renovação de medicamentos arbitrários (incluindo controlados) que nunca constaram em receita sua.
- **Correção:** `SELECT ... FROM receitas WHERE id = receita_id AND paciente_id = paciente.id`; rejeitar (403) se não existir; derivar medicamentos/tipo da receita encontrada.

### 11. No-show não libera slot; agendamentos simultâneos do mesmo paciente
- **Arquivos:** `src/app/api/agendamento/criar/route.ts:44-49`, `src/app/api/agendamento/cancelar/route.ts:12`, `src/app/api/agendamento/slots/route.ts:39`
- **Descrição:** (a) O status `'nao_compareceu'` é definido no CLAUDE.md mas **nenhuma rota o utiliza**; um agendamento não comparecido continua bloqueando o horário. (b) O conflito é verificado **apenas por `medico_id` + `data_hora`** — não há checagem de que o paciente já tem outro agendamento no mesmo horário.
- **Impacto:** Vagas desperdiçadas por no-shows; o mesmo paciente pode agendar 10h com Dr. A e 10h com Dra. B simultaneamente.
- **Correção:** Criar fluxo `nao_compareceu` e incluí-lo nos status que não bloqueiam slot; antes do insert checar agendamento ativo do mesmo paciente no horário.

### 12. Sem log de acesso/leitura e sem mecanismo de exclusão (direito ao esquecimento)
- **Arquivos:** `src/app/api/admin/logs/route.ts` (todo), ausência de endpoint de exclusão
- **Descrição:** A trilha de auditoria registra apenas **eventos de escrita** reconstruídos das tabelas de dados — não há registro de **quem visualizou** prontuário/atestado/receita. Não existe endpoint de exclusão/anonimização de dados do titular (as `.delete()` existentes só removem vínculos de empresa). Atenção: `empresa/exclusoes` e `medico/exclusao-telemedicina` tratam de exclusão de telemedicina, **não** de exclusão LGPD.
- **Impacto:** Não atende Art. 37 (registro das operações) nem Art. 18 VI (eliminação) da LGPD, nem o requisito CFM/SBIS de log de acesso a prontuário eletrônico. Impossível detectar acesso indevido.
- **Correção:** Criar tabela `logs_acesso` (usuario, perfil, recurso, paciente_id, ação=leitura, timestamp, IP) e gravar em cada leitura de dado clínico; implementar fluxo de exclusão/anonimização respeitando a retenção legal de prontuário (CFM, 20 anos).

---

## Achados Importantes 🟡

### Segurança / Autorização
- **IDOR horizontal entre médicos.** `medico/receitas/route.ts:70-85`, `medico/atestados/route.ts:77-92` (GET por `paciente_id` retorna dados de qualquer paciente para qualquer médico aprovado) e `medico/antecedentes/route.ts:30-39` (UPDATE de `pacientes` só por `.eq('id', paciente_id)` — qualquer médico sobrescreve alergias/HPP de qualquer paciente). **Correção:** validar vínculo médico↔paciente.
- **`finalizar-atendimento` não confere o dono.** `finalizar-atendimento/route.ts:32-38` checa só `user`, não `atendimento.medico_id`. Qualquer médico finaliza atendimento de outro.
- **PATCH de renovação muda status sem checar papel.** `renovacao/solicitar/route.ts:62-81` aceita `medico_id` do body sem confirmar médico aprovado.
- **DELETE de logo sem checar admin.** `admin/empresas/[id]/logo/route.ts:96-117` verifica apenas `user` (o POST verifica admin).
- **`test-email` público vaza prefixo da API key.** `test-email/route.ts:9` retorna `RESEND_API_KEY.slice(0,8)` e dispara emails. Remover/proteger.
- **RLS desligado em todas as tabelas.** A segurança depende 100% do código. **Recomendação:** habilitar RLS nas tabelas sensíveis como defesa em profundidade.
- **`empresa_id` por query param.** `empresa/funcionarios/exportar/route.ts:19-24` lê do query string (valida corretamente, mas padrão frágil/inconsistente).

### Qualidade de Código
- **`error.message` do Postgres exposto ao cliente (~48 locais).** Ex.: `medico/receitas/route.ts:65`, `agendamento/criar/route.ts:70`. Vaza schema interno. **Correção:** logar no servidor, retornar mensagem genérica.
- **Maioria das rotas sem try/catch.** Apenas 9 de 79 rotas. JSON malformado em POST quebra o handler.
- **Sem tratamento de erro específico do Supabase.** Nenhuma checagem de `error.code` (`23505` unique, `23503` FK). CPF duplicado retorna 500 cru em vez de 409 amigável.
- **Sem validação de CPF/CRM.** `auth/cadastro/route.ts:26,51` só limpa máscara, não valida dígito verificador. CPF é chave de vínculo com empresa.
- **Mass-assignment na triagem.** `triagem/salvar/route.ts:58` faz `insert({ ...base, ...dados })` com objeto arbitrário do body.
- **`any` em cálculos financeiros e ordenação de fila.** `admin/producao-medica/route.ts:101`, `admin/dashboard/route.ts:122`, `paciente/posicao-fila/route.ts:48,61` — valores e priorização de risco clínico operam sobre `any` (NaN/fallback silencioso).
- **TOCTOU residual em assumir-paciente.** `assumir-paciente/route.ts:122` — o UPDATE protege `medico_id` mas não revalida `status='aguardando'`.
- **Agendamento sem atomicidade.** `agendamento/criar/route.ts:44-67` checa conflito por SELECT + INSERT separados (depende de UNIQUE constraint no banco, não verificável no código).

### Performance
- **Sem paginação nas listagens.** `empresa/funcionarios/lista/route.ts:23-32` e `admin/pacientes/exportar/route.ts:16-19` carregam a tabela inteira — risco real de OOM/timeout com 10.000 funcionários; o `.in('cpf', cpfs)` com array ilimitado pode estourar limite do PostgREST. `admin/logs` tem teto fixo de 2-3k (trunca histórico silenciosamente).
- **Índices de banco faltando.** `atendimentos`, `vinculos_empresa`, `atestados`, `receitas`, `agendamentos` não têm índices nas colunas de filtro (`paciente_id`, `medico_id`, `empresa_id`, `data_hora`, `status`, `criado_em`). Só `solicitacoes_exames` e poucas têm.
- **`ilike '%termo%'` não-sargable.** `admin/atestados/route.ts:32`, `admin/receitas/route.ts:66`, `admin/exames/route.ts:58` — força full scan. Usar prefixo (`'termo%'`) onde possível ou índice GIN `pg_trgm`.
- **`xlsx` importado estaticamente em 9 client components.** Ex.: `AtestadosDashboard.tsx:8`, `AuditoriaClient.tsx:5` — ~400-900KB por dashboard mesmo sem exportar. Usar `await import('xlsx')` (como já faz `pacientes/exportar/route.ts:60`).
- **`medicamentos.ts` (~861 entradas, 1132 linhas) bundlado no client** via `ReceitaForm.tsx:6`. Mover busca para API route ou dynamic import.

### Conformidade / LGPD
- **Fallback de consentimento descarta IP/versão/texto e retorna `ok:true`.** `consentimentos/route.ts:77-93` — registro juridicamente fraco mas marcado como consentido. Após rodar a migration, remover o fallback ou retornar 500.
- **IP da resposta de autorização de CID nunca é gravado.** `auditoria/route.ts:153` lê `ip_address` mas `responder/route.ts:32` não o captura — auditoria sempre mostra "—".
- **Aba "Exames" expõe nome + indicação clínica + observações.** `empresa/exames/route.ts:142-160` — indicação clínica revela suspeita diagnóstica.
- **`topFuncionarios` trafega nome+CID no JSON** mesmo sem renderizar. `empresa/atestados/route.ts:221-228`.
- **Sem política de retenção/expurgo** por prazo (triagens, consentimentos, logs crescem indefinidamente).
- **Validade de receita opcional sem default legal.** `receitas/route.ts:57` — controle especial/antimicrobiano têm prazo legal não aplicado.
- **Sem cálculo de "documento vigente".** Nenhuma query compara `data_fim >= hoje`/`validade >= hoje` (fuso Brasília) — RH não distingue afastamento em vigor de encerrado.

### Arquitetura / UX
- **Email/WhatsApp bloqueantes no agendamento.** `agendamento/criar/route.ts:90-94` faz `await Promise.all([...])` antes do `return` (latência sob SMTP lento; consistência ok por try/catch interno). Usar `waitUntil()` da Vercel.
- **Vídeo sem fallback.** `atendimento/[id]/page.tsx:320-329` — iframe quebrado se o provedor cair, sem retry nem contato alternativo.
- **Auto-save silencioso em falha.** `page.tsx:177` (`catch { /* silencioso */ }`) e `salvarAntecedentes` sem checar `res.ok` — sem aviso de "falha ao salvar" nem `beforeunload`.
- **Atendimento finalizável sem documento/registro clínico e sem confirmação.** `finalizar-atendimento/route.ts:69-90` + `page.tsx:435` — um clique conclui prontuário vazio.
- **Sala de atendimento com larguras fixas grandes.** `atendimento/[id]/page.tsx:94-99` (`w-[440px]`/`w-[580px]`) + `h-screen overflow-hidden` quebra em iPad retrato (768px).
- **Acessibilidade: 0 `htmlFor` em 138 `<label>`** — labels apenas visuais, inacessíveis a leitor de tela (WCAG 1.3.1/4.1.2; LBI Lei 13.146). Botões icon-only sem `aria-label` (só 5 no projeto).
- **Contraste:** `#5BBD9B` sobre branco ≈ 2.0:1 **reprova WCAG AA** — nunca usar como texto sobre fundo claro. `#1A3A2C` ≈ 11:1 (excelente).

---

## Melhorias Recomendadas 🟢

- **Logger que silencie `console.*` em produção** (hoje há `console.error` genéricos em componentes — não vazam dados, mas higiene).
- **Sanitizar SVG em uploads** (`logo/route.ts` aceita `image/svg+xml`, que permite scripts) e usar `crypto.randomUUID()` em vez de `Date.now()` nos paths de Storage.
- **Validar magic bytes** do conteúdo de upload além do `arquivo.type` (controlado pelo cliente).
- **`catch (e: any); setErro(e.message)` frágil** nos formulários — usar `e?.message || 'Erro ao salvar. Tente novamente.'`.
- **Extrair lógica de faturamento duplicada** de `empresa/relatorio/route.ts:40-177` e `consultas/route.ts` para `src/lib/faturamento.ts`.
- **Supressão de grupos com n < 3-5** nas quebras por cargo/secretaria cruzadas com CID (k-anonimato), mesmo na aba já anonimizada.
- **SLA/expiração para renovação de receita** (ex.: 48h) com notificação de atraso.
- **Validação de data passada e antecedência mínima** no agendamento; conflito por intervalo `[início, início+duração)` em vez de igualdade exata.
- **Aumentar intervalo de polling de 3s** (`AutorizacaoCidWatcher`, `AtestadoForm`) ou migrar para Supabase Realtime (websocket).
- **Remover dependência morta `resend`** (instalada, não usada — email usa nodemailer/Gmail).
- **Registrar `user-agent` e recusas de consentimento** para reforçar a trilha probatória.

---

## Ideias de Novas Funcionalidades 💡

- **Painel de afastamentos ativos (saúde ocupacional).** Visão por empresa de atestados em vigor hoje, com agregação por CID/secretaria e alerta de afastamentos prolongados — núcleo do valor de saúde ocupacional, hoje ausente por falta do conceito de "documento vigente".
- **Alerta de interação medicamentosa e dose máxima.** Ao montar a receita, cruzar princípios ativos para alertar interações e doses — ganho clínico direto e diferencial de segurança.
- **Portal de exercício de direitos do titular (LGPD).** Autoatendimento para o paciente solicitar exportação, correção e exclusão de seus dados, com fila para o DPO — atende Art. 18 e vira argumento comercial.
- **Receituário digital com assinatura ICP-Brasil / validação Memed.** Integração com assinatura digital qualificada e validação de receita controlada eletrônica (CFM 2.299/2021) — destrava a emissão legal de controlados.
- **Dashboard de no-show e ocupação de agenda** para o médico/admin, com reativação automática de slots e lembretes (WhatsApp) — reduz desperdício de agenda.
- **Triagem com encaminhamento automático por risco.** Usar a classificação verde/amarelo/laranja/vermelho já existente para priorizar a fila e sugerir especialidade.
- **Relatório de produtividade médica com metas** e exportação contábil pronta para folha — aproveita os dados de produção já calculados.

---

## Plano de Ação Sugerido

| Prioridade | Achado | Arquivo principal | Esforço |
|---|---|---|---|
| **P0** | Deletar rota de reset de senha pública | `admin/set-password/route.ts` | Trivial (minutos) |
| **P0** | Adicionar `requireAdmin()` nas server actions | `admin/actions.ts` | Baixo |
| **P0** | Auth em aprovar/reprovar médico | `admin/medico/[id]/{aprovar,reprovar}/route.ts` | Baixo |
| **P0** | Corrigir IDOR do prontuário inline | `medico/prontuario-inline/[pacienteId]/route.ts` | Baixo |
| **P0** | `finalizarConsulta` checar `res.ok` | `medico/atendimento/[id]/page.tsx:280` | Trivial |
| **P0** | Rascunho não sobrescrever consulta finalizada | `medico/atendimento/[id]/rascunho/route.ts:58` | Baixo |
| **P1** | Validar CID autorizado no backend | `medico/atestados/route.ts` | Médio |
| **P1** | Remover CID nominal da aba Consultas | `empresa/consultas/route.ts` + `ConsultasDashboard.tsx` | Baixo |
| **P1** | Validar posse de `receita_id` na renovação | `renovacao/solicitar/route.ts` | Baixo |
| **P1** | Corrigir IDOR horizontal entre médicos | `medico/{receitas,atestados,antecedentes}/route.ts` | Médio |
| **P1** | Mascarar `error.message` ao cliente (~48 locais) | helper central | Médio |
| **P1** | Validação de CPF/CRM no cadastro | `auth/cadastro/route.ts` | Baixo |
| **P1** | Marcar medicamentos controlados + trava de tipo | `lib/medicamentos.ts` + `ReceitaForm.tsx` | Médio/Alto |
| **P2** | Índices de banco (5 tabelas) | nova migration | Baixo (alto ganho) |
| **P2** | Fluxo de no-show + conflito por paciente | `agendamento/*` | Médio |
| **P2** | Paginação em listagens | `empresa/funcionarios/lista`, `pacientes/exportar` | Médio |
| **P2** | Import dinâmico de `xlsx` (9 dashboards) | dashboards admin | Baixo |
| **P2** | Log de acesso + fluxo de exclusão LGPD | nova tabela + endpoints | Alto |
| **P2** | Habilitar RLS (defesa em profundidade) | migrations | Alto |
| **P3** | Conceito de "documento vigente" + badges | helper + listagens | Médio |
| **P3** | Acessibilidade (`htmlFor`, `aria-label`, contraste) | formulários | Médio |
| **P3** | Introduzir Vitest (timezone, faturamento, tenant) | novo setup | Médio |

---

## Métricas do Projeto

- **Arquivos TypeScript/TSX analisados:** 215
- **Rotas API (`route.ts`):** 79
- **Componentes React (`.tsx`):** 116
- **Linhas de código (aproximado):** ~51.627
- **Cobertura de testes:** **0%** (nenhum `*.test.ts`/`*.spec.ts`; sem vitest/jest no `package.json`)
- **Achados críticos 🔴:** 12 · **Importantes 🟡:** ~30 · **Melhorias 🟢:** ~11

---

*Auditoria conduzida por leitura direta do código-fonte. Nenhum arquivo foi modificado. Recomenda-se tratar os itens P0 antes de qualquer novo desenvolvimento.*
