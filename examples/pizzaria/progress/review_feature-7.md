# Review — feature feature-7

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes

- R1: [x] coberto por `"retorna exatamente os pedidos com status recebido, em_preparo e saiu_para_entrega, ordenados por criado_em ascendente"` (`tests/admin-kds.test.js:53`)
- R2: [x] coberto pelo mesmo teste acima (exclui `"concluido"` e `"cancelado"`)
- R3: [x] coberto por `"retorna distanciaKm e tempoEsperaMinutos numéricos e consistentes com a fórmula documentada..."` (`tests/admin-kds.test.js:72`), que recalcula a fórmula esperada via `calcularDistanciaKm` + `calcularTempoEsperaPorDistanciaEFila` e compara com o resultado de `listarPedidosAtivosComTempoEspera`
- R4: [x] coberto por `"retorna distanciaKm e tempoEsperaMinutos como null quando o cliente não tem latitude/longitude gravadas..."` (`tests/admin-kds.test.js:99`)
- R5: [x] coberto por `"lança InvalidCoordinatesError quando origem é omitida ou não contém latitude/longitude numéricos"` (`tests/admin-kds.test.js:131`)
- R6: [x] coberto por `"atualiza o status seguindo o fluxo recebido → em_preparo → saiu_para_entrega → concluido"` (`tests/admin-kds.test.js:156`)
- R7: [x] coberto pelo mesmo teste acima (transições permitidas) + `"lança InvalidStatusTransitionError ao tentar pular etapas..."` + `"...a partir de um estado final..."`
- R8: [x] coberto por `"lança InvalidStatusTransitionError ao tentar pular etapas (recebido → concluido) e não altera o status gravado"` (`tests/admin-kds.test.js:173`) e `"...a partir de um estado final (concluido ou cancelado)"` (`tests/admin-kds.test.js:186`)
- R9: [x] coberto por `"lança OrderNotFoundError ao atualizar status ou atribuir motoboy em um pedido inexistente"` (`tests/admin-kds.test.js:206`)
- R10: [x] coberto por `"grava o nome do motoboy no pedido, tanto no valor retornado quanto ao reconsultar o banco"` (`tests/admin-kds.test.js:230`)
- R11: [x] coberto por `"lança InvalidMotoboyError para motoboy vazio, só espaços, ou null, sem alterar o campo gravado"` (`tests/admin-kds.test.js:244`)
- R12: [x] coberto por `"retorna 'desconectado' inicialmente, 'conectado' após 'ready' e volta a 'desconectado' após 'disconnected'"` (`tests/admin-kds.test.js:275`) e `"mantém 'desconectado' após 'auth_failure' quando 'ready' nunca foi emitido"` (`tests/admin-kds.test.js:301`)
- R13: [x] coberto por `"emite o evento público 'connection-status-changed' com 'conectado' em 'ready' e 'desconectado' em 'disconnected'"` (`tests/admin-kds.test.js:288`)
- R14: [x] coberto pelo mesmo teste acima (parte `"desconectado"` em `"disconnected"`)

Todos os R1–R14 têm cobertura concreta e rastreável. O mapa declarado em
`progress/impl_feature-7.md` bate com o conteúdo real de
`tests/admin-kds.test.js`.

## Tasks completas

Todas as 25 tasks (`T1`–`T25`) de `specs/feature-7/tasks.md` estão
marcadas `[x]` e correspondem ao código de fato implementado:
- T1–T6 (`src/db/errors.js`, `src/db/pedidos.js`, `src/db/index.js`): confirmado — `OrderNotFoundError`,
  `InvalidStatusTransitionError`, `InvalidMotoboyError`, `STATUS_PEDIDO_ATIVO_PAINEL`,
  `TRANSICOES_PERMITIDAS`, `updateStatusPedido`, `atribuirMotoboy`, `listPedidosAtivosComCliente`
  todos presentes e reexportados.
- T7–T9 (`src/delivery/waitTime.js`, `src/delivery/painelPedidos.js`, `src/delivery/index.js`):
  confirmado — `calcularTempoEsperaPorDistanciaEFila` extraída como função pura,
  `calcularTempoEspera` delega a ela sem mudar assinatura, `painelPedidos.js` criado
  conforme a implementação de referência do `design.md`.
- T10–T11 (`src/whatsapp/adapter.js`, `src/whatsapp/client.js`): confirmado — contrato JSDoc
  ganhou `"disconnected"`, `client.js` rastreia `connectionStatus`, expõe
  `getConnectionStatus()` e emite `"connection-status-changed"`.
- T12–T24 (`tests/admin-kds.test.js`): 13 testes escritos, todos cobrindo os R<n> declarados.
- T25: `npm test`/`./init.sh` executados; rastreabilidade documentada em `progress/impl_feature-7.md`.

## Checkpoints

- C1: [x] `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`,
  `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`
  presentes; `./init.sh` termina com exit code 0.
- C2: [x] Apenas feature-7 está `in_progress` em `feature_list.json`;
  todas as features `done` (1–6) têm testes associados passando;
  `progress/current.md` descreve a sessão ativa sem lixo de sessões
  anteriores.
- C3: [x] `src/` contém somente os domínios previstos em
  `docs/architecture.md` (`db`, `menu`, `whatsapp`, `ai`, `delivery` — sem
  `src/ui/`, conforme decisão de escopo documentada); nenhuma dependência
  nova foi adicionada ao `package.json` (confirmado: `react`, `react-dom`
  e libs de teste de DOM não aparecem); sem `console.log` de debug nem
  TODOs sem contexto nos arquivos revisados.
- C4: [x] `tests/admin-kds.test.js` cobre os módulos públicos novos
  (`listarPedidosAtivosComTempoEspera`, `updateStatusPedido`,
  `atribuirMotoboy`, `listPedidosAtivosComCliente`, `getConnectionStatus`);
  usa `fs.mkdtempSync`/`openDatabase` real, sem mocks de fs; `./init.sh`
  mostra 93 testes, todos verdes.
- C5: [x] Nenhum arquivo suspeito não rastreado (`*.tmp`, `node_modules/`,
  `*.sqlite` fora do `.gitignore`); `progress/current.md` reflete o
  estado real da última sessão trabalhada (feature-7, aguardando review).
  (`progress/history.md` é responsabilidade do leader ao fechar a sessão,
  não bloqueia esta revisão de código.)
- C6: [x] `specs/feature-7/` tem os 3 arquivos (`requirements.md`,
  `design.md`, `tasks.md`); `requirements.md` usa EARS estrito (QUANDO/SE
  .../O sistema DEVE); todas as 25 tasks marcadas `[x]`; cada `R<n>` tem
  cobertura de teste concreta (ver tabela acima).

## Verificações adicionais específicas desta revisão

1. **Compatibilidade retroativa (features 1, 3, 6 já `done`):**
   `./init.sh` executado e confirmado 93/93 testes passando, incluindo os
   80 pré-existentes (`tests/database.test.js` 12, `tests/config-menu.test.js`
   10, `tests/whatsapp-queue.test.js` 9, `tests/ai-multimodal.test.js` 19,
   `tests/conversation-engine.test.js` 19, `tests/delivery-time.test.js`
   11) intactos e sem alteração de comportamento. As mudanças em
   `src/db/errors.js`, `src/db/pedidos.js`, `src/db/index.js` são
   estritamente aditivas (novas classes de erro, novas funções, novas
   constantes) — `STATUS_PERMITIDOS`, `STATUS_DEMANDA_ATIVA`,
   `insertPedido`, `contarPedidosAtivos` permanecem inalterados. Em
   `src/delivery/waitTime.js`, `calcularTempoEspera` mantém assinatura e
   comportamento público idênticos, apenas delegando internamente a
   `calcularTempoEsperaPorDistanciaEFila` — confirmado pelos 11 testes de
   `tests/delivery-time.test.js` continuando verdes sem alteração. Em
   `src/whatsapp/adapter.js` e `src/whatsapp/client.js`, o único símbolo
   de runtime novo é `getConnectionStatus` no objeto retornado por
   `createWhatsAppClient` e o novo listener `adapter.on("disconnected", ...)`
   — nenhum comportamento existente (`"qr"`, `"error"`,
   `"message-processed"`, fila FIFO) foi alterado, confirmado pelos 9
   testes de `tests/whatsapp-queue.test.js` continuando verdes.

2. **Transições de status (`TRANSICOES_PERMITIDAS`):** coerentes com o
   enum `STATUS_PERMITIDOS` já existente (feature-1) — todas as chaves e
   valores de `TRANSICOES_PERMITIDAS` são um subconjunto dos 5 status já
   enumerados; nenhum valor novo de status foi introduzido. A regra é
   testada nos dois sentidos (transição válida e inválida, incluindo
   estados finais) em `tests/admin-kds.test.js`.

3. **Nenhuma UI React introduzida:** confirmado — não existe `src/ui/`
   nem `electron/` no repositório; `package.json` não declara `react`,
   `react-dom` nem bibliotecas de teste de DOM (`devDependencies` contém
   somente `vitest`, `dependencies` somente `better-sqlite3`). A decisão
   de escopo está documentada e justificada em
   `specs/feature-7/requirements.md` ("Decisão de escopo") e
   `specs/feature-7/design.md` ("Alternativa descartada 1"), coerente com
   `docs/architecture.md` (princípio 3: não adicionar dependência sem
   justificativa).

## Observação não bloqueante

- `src/delivery/painelPedidos.js` usa `camelCase.js` em vez de
  `kebab-case.js` como nomenclatura de arquivo de módulo
  (`docs/conventions.md`, tabela "Nomes"). Isso já é um padrão
  pré-existente no diretório (`src/delivery/waitTime.js`, feature-6,
  `done`, já usa a mesma convenção camelCase) — não é uma regressão
  introduzida por esta feature, mas fica registrado para eventual
  padronização futura do diretório `src/delivery/`.

## Mudanças necessárias (se aplicável)

Nenhuma. Feature aprovada.
