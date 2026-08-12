# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se añade aquí.
> No edites entradas anteriores. Solo añades al final.

---

## 2026-04-20 — Bootstrap del proyecto
- **Agente:** humano (Martín)
- **Cambios:** estructura inicial del arnés (AGENTS.md, init.sh, feature_list.json, docs/).
- **Resultado:** entorno listo. `./init.sh` verde.

## 2026-04-22 — Feature 1: storage_layer
- **Agente:** implementador #1
- **Plan:** crear `src/storage.py` con `load()` / `save()` atómicos y tests.
- **Cambios:** `src/storage.py`, `tests/test_storage.py`.
- **Verificación:** `./init.sh` verde, 3 tests pasan.
- **Cierre:** feature 1 marcada `done`.

## 2026-04-23 — Feature 2: note_model
- **Agente:** implementador #2
- **Plan:** dataclass `Note` con `Note.new(title, body)` y serialización dict.
- **Cambios:** `src/notes.py`, `tests/test_notes.py`.
- **Verificación:** `./init.sh` verde.
- **Cierre:** feature 2 marcada `done`.

## 2026-04-25 — Feature 3: cli_add_list
- **Agente:** implementador #3, revisado por reviewer-agent.
- **Plan:** `src/cli.py` con argparse, comandos `add` y `list`.
- **Cambios:** `src/cli.py`, `tests/test_cli.py`.
- **Verificación:** `./init.sh` verde, 7 tests pasan.
- **Cierre:** feature 3 marcada `done`. Próximo: feature 4 (show/delete).

## 2026-04-27 — Feature 4: cli_show_delete
- **Agente:** Claude Opus 4.7
- **Plan:** añadir `cmd_show` y `cmd_delete` en `src/cli.py` con manejo de `NoteNotFound` (stderr + exit 1).
- **Cambios:** `src/cli.py` (subcomandos `show`/`delete` y captura de `NoteError` en `main`), `tests/test_cli.py` (4 tests nuevos: éxito y fallo de cada comando, captura de stderr).
- **Verificación:** `./init.sh` verde, 14 tests pasan.
- **Cierre:** feature 4 marcada `done`. Próximo: feature 5 (search).

## 2026-04-27 — Feature 5: cli_search
- **Agente:** Claude Opus 4.6
- **Plan:** añadir `cmd_search` en `src/cli.py` con búsqueda case-insensitive en título y body. Sin coincidencias → NoteNotFound (stderr + exit 1).
- **Cambios:** `src/cli.py` (subcomando `search` con `cmd_search`), `tests/test_cli.py` (3 tests nuevos: coincidencia, no-coincidencia, case-insensitivity).
- **Verificación:** `./init.sh` verde, 17 tests pasan.
- **Cierre:** feature 5 marcada `done`. Todas las features completadas.

## 2026-04-29 — Feature 6: cli_edit
- **Agente:** Claude Opus 4.7 (leader) → implementer → reviewer.
- **Plan:** añadir `cmd_edit` en `src/cli.py` con `--title` y `--body` opcionales; sin flags → `NoteError`; id inexistente → `NoteNotFound`.
- **Cambios:** `src/cli.py` (subcomando `edit` y `cmd_edit` que construye una nueva instancia `Note` preservando `id`/`created_at`), `tests/test_cli.py` (5 tests: cada flag, ambos juntos, id inexistente, ausencia de flags).
- **Verificación:** `./init.sh` verde, 22 tests pasan. Reviewer APPROVED (`progress/review_cli_edit.md`).
- **Cierre:** feature 6 marcada `done`. Todas las features del proyecto completadas.

## 2026-05-13 — Feature 7: cli_recent
- **Agente:** Claude Opus 4.7 (leader) → spec_author → implementer → reviewer.
- **Plan:** ejecutar las 8 tasks de `specs/cli_recent/tasks.md`: añadir `cmd_recent` y subparser `recent` en `src/cli.py`, cubrir R1–R7 con tests, validar trazabilidad y `./init.sh`.
- **Cambios:** `src/cli.py` (`cmd_recent` + subparser con `--limit`), `tests/test_cli.py` (5 tests nuevos: orden por defecto, límite custom, archivo vacío, límite 0, límite negativo; helper `_add_with_created_at`).
- **Verificación:** `./init.sh` verde, 27 tests pasan. Reviewer APPROVED (`progress/review_cli_recent.md`); trazabilidad en `progress/impl_cli_recent.md`.
- **Cierre:** feature 7 marcada `done`. Próximo: feature 8 (cli_count).

## 2026-08-11 — Feature 1 (novo projeto): Banco de Dados SQLite e Modelagem Inicial
- **Agente:** leader → spec_author → implementer → reviewer.
- **Migração do arnês:** detectado desalinhamento entre `feature_list.json`
  (novo projeto `pizzaria-whatsapp-delivery-desktop`, stack
  Node/Electron/Vitest) e o restante do arnês (ainda Python/notes-cli).
  Reescritos `docs/architecture.md`, `docs/conventions.md`,
  `docs/verification.md`, `init.sh`, `CHECKPOINTS.md`, `.gitignore`,
  `README.md` para o stack Node/Electron/Vitest. Removido código legado
  Python de `src/`/`tests/` (autorização humana explícita) e
  `specs/cli_recent/` órfão. Criado `package.json` e `vitest.config.js`.
  A pedido do humano, todo o arnês (`CLAUDE.md`, `AGENTS.md`, `docs/*.md`,
  `CHECKPOINTS.md`, `README.md`, `.claude/agents/*.md`, comentários de
  `init.sh`/`scripts/validate-features.mjs`) foi traduzido para português
  do Brasil.
- **Spec:** `spec_author` redigiu `specs/feature-1/` (Banco de Dados
  SQLite e Modelagem Inicial): requirements EARS R1–R11, design
  justificando `better-sqlite3` (duas alternativas descartadas), 14
  tasks rastreadas. Humano pediu mudança de escopo — tabela `clientes`
  deve ter endereço e coordenadas de geolocalização (latitude/longitude)
  — o que gerou R12/R13 novos, schema atualizado com `endereco`/
  `latitude`/`longitude` e tasks T5/T14/T15/T16 revisadas. Humano
  aprovou o spec revisado; feature mudou de `spec_ready` para
  `in_progress`.
- **Implementação:** `implementer` executou T1–T16 de
  `specs/feature-1/tasks.md`: instalou `better-sqlite3`, criou
  `src/db/{errors,schema,index,clientes,sessoes,pedidos}.js` e
  `tests/database.test.js` (12 testes cobrindo R1–R13, incluindo
  criação/reabertura do arquivo SQLite, `resolveUserDataPath`, criação
  das três tabelas, unicidade de telefone, limpeza de sessões antigas,
  serialização de itens em JSON, validação de enum de status, motoboy,
  fechamento de conexão, e endereço/coordenadas nulos ou preenchidos).
  Rastreabilidade R1–R13 documentada em `progress/impl_feature-1.md`.
- **Revisão:** `reviewer` validou trazabilidade completa (R1–R13, todas
  as 16 tasks `[x]`), conformidade com `docs/architecture.md` e
  `docs/conventions.md` (camadas por domínio, `index.js` como única
  superfície pública, erros explícitos com classes nomeadas, sem
  `console.log`/TODOs soltos, ESM, ausência de mocks de fs em favor de
  diretório temporário real). `./init.sh` e `npm test` verdes (12/12
  testes). Veredito `APPROVED` sem mudanças pendentes
  (`progress/review_feature-1.md`).
- **Cierre:** feature-1 marcada `done` em `feature_list.json`. Próximo:
  feature-2 (Leitor de Cardápio e Configurações Globais).

## 2026-08-11 — Feature 2: Leitor de Cardápio e Configurações Globais
- **Agente:** leader → implementer → reviewer.
- **Spec:** `specs/feature-2/{requirements,design,tasks}.md` já aprovado
  pelo humano antes do início da implementação (R1–R9, 16 tasks).
- **Implementação:** `implementer` executou T1–T16 de
  `specs/feature-2/tasks.md`: criou `src/menu/errors.js` (`MenuError`,
  `MenuFileNotFoundError`, `InvalidMenuSchemaError`,
  `InvalidConfigError`), `src/menu/cardapio.js` (`loadCardapio` com
  validação de schema e leitura protegida de JSON),
  `src/menu/config.js` (`getDefaultConfig`, `loadConfig` com merge raso,
  `saveConfig` com escrita atômica via arquivo temporário +
  `renameSync` e `chmodSync(0o600)` condicionado a API key preenchida) e
  `src/menu/index.js` como única superfície pública do domínio. Escrito
  `tests/config-menu.test.js` (10 testes cobrindo R1–R9: leitura válida
  do cardápio, erros de schema inválido/item sem nome-preço, arquivo
  inexistente, JSON malformado, config padrão sem criar arquivo,
  persistência atômica sem restos temporários, chaves de API com
  permissões restritas, releitura de systemPrompt/audioEnabled/
  imageEnabled, e `InvalidConfigError` sem escrita em disco para tipos
  inválidos). Rastreabilidade R1–R9 documentada em
  `progress/impl_feature-2.md`.
- **Revisão:** `reviewer` validou trazabilidade completa (R1–R9, todas
  as 16 tasks `[x]`), conformidade com `docs/architecture.md` e
  `docs/conventions.md` (camadas por domínio, `index.js` como única
  superfície pública, erros explícitos com classes nomeadas, escrita
  atômica de config, permissões restritas de arquivo com API key).
  `./init.sh` e `npm test` verdes (22/22 testes, incluindo os 12 de
  feature-1). Veredito `APPROVED` sem mudanças pendentes
  (`progress/review_feature-2.md`).
- **Cierre:** feature-2 marcada `done` em `feature_list.json`. Próximo:
  feature-3 (Conexão WhatsApp e Fila de Mensagens Sequencial).

## 2026-08-11 — Feature 3: Conexão WhatsApp e Fila de Mensagens Sequencial
- **Agente:** leader → implementer → reviewer.
- **Spec:** `specs/feature-3/{requirements,design,tasks}.md` já aprovado
  pelo humano antes do início da implementação (R1–R11, 16 tasks).
- **Implementação:** `implementer` executou T1–T16 de
  `specs/feature-3/tasks.md`: criou `src/whatsapp/errors.js`
  (`WhatsAppError`, `AuthenticationError`), `src/whatsapp/adapter.js`
  (contrato JSDoc de adapter injetável, sem import de biblioteca
  concreta de WhatsApp), `src/whatsapp/queue.js` (fila FIFO com flag de
  processamento, delay humanizado entre itens, captura de erro por item
  via evento `"error"` sem interromper o loop), `src/whatsapp/client.js`
  (orquestra adapter + queue + isolamento de sessão, eventos `"qr"`,
  `"error"`, `"message-processed"`) e `src/whatsapp/index.js` (superfície
  pública única do domínio). Adicionou `findSessaoByClienteId(db,
  clienteId)` em `src/db/sessoes.js` (retorna `null` se ausente),
  reexportada em `src/db/index.js`. Escrito `tests/whatsapp-queue.test.js`
  (9 testes cobrindo R2–R11: repasse de QR Code, erro de autenticação sem
  exceção não tratada, processamento sequencial estrito sem concorrência,
  delay mensurável entre itens, continuidade após exceção em um item,
  recuperação de histórico de sessão existente, tratamento de cliente sem
  sessão prévia como histórico vazio, isolamento de histórico entre
  clientes, e ordem FIFO global com ordem relativa por cliente
  preservada). Rastreabilidade R1–R11 documentada em
  `progress/impl_feature-3.md`.
- **Revisão:** `reviewer` validou trazabilidade completa (R1–R11, todas
  as 16 tasks `[x]`), conformidade com `docs/architecture.md` e
  `docs/conventions.md` (isolamento da lib de WhatsApp atrás de adapter
  injetável, sem dependência nova em `package.json`, camadas por
  domínio, `index.js` como única superfície pública, erros por classes
  nomeadas, sem `console.log`/TODOs soltos). `./init.sh` e `npm test`
  verdes (31/31 testes, incluindo os de feature-1 e feature-2). Veredito
  `APPROVED` sem mudanças pendentes (`progress/review_feature-3.md`).
- **Cierre:** feature-3 marcada `done` em `feature_list.json`. Próximo:
  feature-4 (Processamento Multimodal com IA — Whisper e Visão).

## 2026-08-11 — Feature 4: Processamento Multimodal com IA (Whisper, Visão e PDF)
- **Agente:** leader → spec_author → implementer → reviewer.
- **Spec:** `specs/feature-4/{requirements,design,tasks}.md` redigido pelo
  `spec_author` (R1–R14, tasks T1–T27 iniciais). Antes da aprovação humana,
  o spec passou por uma revisão de escopo que adicionou o fluxo de
  conversão de PDF (comprovantes em PDF baixados, convertidos para imagem
  na primeira página e enviados ao modelo de visão), gerando os novos
  requisitos R15–R23 e as tasks T15/T16/T28 (mais os testes T10–T27
  reorganizados). O spec revisado foi aprovado pelo humano antes de a
  feature mudar de `spec_ready` para `in_progress`.
- **Implementação:** `implementer` executou T1–T28 de
  `specs/feature-4/tasks.md`: criou `src/ai/errors.js` (`AiError`,
  `MediaDownloadError`, `AudioTranscriptionError`, `ImageDescriptionError`,
  `UnsupportedMediaTypeError`, `PdfConversionError`), `src/ai/client.js` e
  `src/ai/media.js` (contratos JSDoc de adapter injetável, sem import de
  SDK concreto de IA), `src/ai/pdfConverter.js` (contrato de conversão de
  PDF para imagem), `src/ai/audio.js` (download + transcrição via
  Whisper), `src/ai/image.js` (download + descrição via modelo de visão,
  condicionado a `imageEnabled`), `src/ai/pdf.js` (download + conversão da
  primeira página + descrição via modelo de visão, também condicionado a
  `imageEnabled`), `src/ai/conversation.js` (dispatcher por
  `media.tipo` — `"audio"`, `"imagem"`, `"pdf"` — preservando `clienteId`
  e sem mutar a mensagem original) e `src/ai/index.js` como superfície
  pública única do domínio. Escrito `tests/ai-multimodal.test.js` (19
  testes cobrindo R1–R23: transcrição de áudio e propagação de erros de
  download/transcrição, descrição de imagem com switch ligado/desligado e
  erros de download/descrição, fluxo completo de PDF com ordem estrita
  download→conversão→descrição, switch de imagem desligado sem chamadas
  ao pipeline de PDF, erros de download/conversão/descrição do PDF,
  dispatcher de conversação para os três tipos de mídia mais tipo
  desconhecido e ausência de mídia). Rastreabilidade R1–R23 documentada em
  `progress/impl_feature-4.md`.
- **Revisão:** `reviewer` validou trazabilidade completa (R1–R23, todas
  as 28 tasks `[x]`), conformidade com `docs/architecture.md` e
  `docs/conventions.md` (camadas por domínio, `index.js` como única
  superfície pública, erros por classes nomeadas, adapters injetáveis sem
  dependência concreta de SDK de IA, sem `console.log`/TODOs soltos).
  `./init.sh` e `npm test` verdes (50/50 testes, incluindo os de
  feature-1, feature-2 e feature-3). Veredito `APPROVED` sem mudanças
  pendentes (`progress/review_feature-4.md`).
- **Cierre:** feature-4 marcada `done` em `feature_list.json`. Próximo:
  feature-5 (Motor de Conversação com OpenAI e DeepSeek).

## 2026-08-11 — Feature 5: Motor de Conversação com OpenAI e DeepSeek
- **Agente:** leader → spec_author → implementer (bloqueado) → spec_author
  (correção) → implementer (retomada) → reviewer.
- **Spec:** `specs/feature-5/{requirements,design,tasks}.md` redigido pelo
  `spec_author` (R1–R15, tasks T1–T22 iniciais) e aprovado pelo humano.
- **Ciclo incomum — bloqueio real por inconsistência de spec:** durante a
  implementação (T1–T7 concluídas), o `implementer` encontrou uma
  inconsistência genuína entre o spec aprovado e contratos já `done`:
  `requirements.md` (R9/R10 antigos) e `design.md` assumiam que o
  `clienteId` recebido por `processarMensagemConversa` era o **telefone**
  do cliente e o usavam diretamente em `findSessaoByClienteId`/
  `upsertSessao`. Porém o schema de `sessoes.cliente_id` (feature-1,
  `INTEGER REFERENCES clientes(id)`) e o uso já `done` em `src/whatsapp/`
  (feature-3) exigem o **id interno** de `clientes.id`, não o telefone —
  o que quebrava a FK (`SqliteError: FOREIGN KEY constraint failed`) em
  15 de 17 testes. A sessão foi corretamente encerrada como `blocked`
  (`progress/impl_feature-5.md`), sem o `implementer` inventar uma
  decisão de design nova para contornar o problema.
  - **Correção do spec:** o `spec_author` foi relançado, propôs e
    registrou a correção (decidida pelo humano) de reordenar
    `processarMensagemConversa` para resolver/criar o cliente por
    telefone **antes** de tocar em sessão, obtendo o id interno
    (`cliente.id`) e usando-o em toda chamada subsequente a
    `findSessaoByClienteId`/`upsertSessao` — sem alterar os contratos já
    `done` de `src/db/sessoes.js` e `src/whatsapp/`. `requirements.md`
    (R4 novo, R5–R15 renumerados/ajustados), `design.md` (nova seção de
    resolução do cliente por telefone) e `tasks.md` (T6 reaberta,
    T8–T22 renumeradas para T8–T23, T11 nova) foram atualizados; feature
    voltou de `blocked` para `spec_ready`, exigindo **nova aprovação
    humana** antes de retomar a implementação.
- **Implementação (retomada):** após reaprovação humana, o `implementer`
  reescreveu `src/ai/conversationEngine.js` seguindo a nova ordem
  (`selectChatClient` → resolver/criar cliente por telefone →
  `findSessaoByClienteId`/histórico com id interno → `generateReply` →
  `upsertSessao` com id interno → `updateCliente` condicional →
  fechamento de pedido exigindo nome+endereço → retorno com `clienteId` =
  telefone original), estendeu `src/menu/config.js`
  (`modeloSelecionado`), `src/ai/errors.js`
  (`MissingApiKeyError`/`ChatCompletionError`/`IncompleteOrderDataError`),
  criou `src/ai/chatClient.js` e `src/ai/modelSelector.js`
  (`selectChatClient`), e `updateCliente` em `src/db/clientes.js`.
  Ajustou os 4 testes identificados como incompatíveis com a nova ordem e
  adicionou os testes novos de R4, totalizando `tests/conversation-engine.test.js`
  com 19 testes cobrindo R1–R15. Rastreabilidade documentada em
  `progress/impl_feature-5.md`.
- **Revisão:** `reviewer` validou rastreabilidade completa (R1–R15, todas
  as 23 tasks `[x]`), conferiu linha a linha que a nova ordem de
  operações está de fato implementada em `conversationEngine.js`
  (resolução do cliente por telefone antes da sessão, uso do id interno
  em `upsertSessao`/`findSessaoByClienteId`, retorno do telefone original
  como `clienteId`), e confirmou que `src/db/sessoes.js` e `src/whatsapp/`
  não foram alterados. `./init.sh` e `npm test` verdes (69/69 testes,
  incluindo os de feature-1 a feature-4, sem regressão). Veredito
  `APPROVED` sem mudanças pendentes (`progress/review_feature-5.md`).
- **Cierre:** feature-5 marcada `done` em `feature_list.json`. Todas as
  features com spec aprovado até o momento foram concluídas; próximas
  features (feature-6 a feature-8) seguem `pending`.

## 2026-08-11 — Feature 6: Geocodificação e Cálculo Dinâmico de Tempo de Espera
- **Agente:** leader → spec_author → implementer → reviewer.
- **Spec:** `specs/feature-6/{requirements,design,tasks}.md` redigido pelo
  `spec_author` (R1–R13, tasks T1–T18) e aprovado pelo humano.
- **Implementação:** `implementer` executou T1–T18 de
  `specs/feature-6/tasks.md`: criou `src/delivery/errors.js`
  (`DeliveryError` + `InvalidAddressError`/`AddressNotFoundError`/
  `GeocodingError`/`InvalidCoordinatesError`), `src/delivery/geocoder.js`
  (contrato JSDoc `GeocoderAdapter` injetável, sem cliente HTTP concreto,
  seguindo o mesmo padrão de `src/ai/client.js`),
  `src/delivery/geocoding.js` (`geocodeEndereco`: valida endereço →
  chama o adapter → traduz null/rejeição em erros específicos),
  `src/delivery/distance.js` (`calcularDistanciaKm`, Haversine com raio
  6371km, função pura, valida coordenadas), `src/delivery/waitTime.js`
  (`calcularTempoEspera`: orquestra origem → geocodificação → distância
  → contagem de demanda ativa → fórmula do tempo estimado) e
  `src/delivery/index.js` como superfície pública única do domínio.
  Estendeu `src/db/pedidos.js` (+ `STATUS_DEMANDA_ATIVA` = subconjunto
  `["recebido", "em_preparo"]` de `STATUS_PERMITIDOS`, +
  `contarPedidosAtivos(db)`) e reexportou em `src/db/index.js`. Escrito
  `tests/delivery-time.test.js` (11 testes cobrindo R1–R13:
  geocodificação bem-sucedida e seus três modos de falha
  — endereço inválido, endereço não encontrado, erro do provedor com
  causa preservada —, distância zero e distância real conhecida
  (Sé x Paulista), validação de coordenadas inválidas, contagem
  exclusiva de pedidos `recebido`/`em_preparo` excluindo
  `saiu_para_entrega`/`concluido`/`cancelado`, orquestração completa do
  tempo de espera com fórmula validada, coordenadas de origem
  omitidas/incompletas sem chamar geocoder nem banco, e propagação de
  erro de geocodificação sem consultar a contagem de pedidos ativos via
  espião `vi.spyOn`). Rastreabilidade R1–R13 documentada em
  `progress/impl_feature-6.md`.
- **Revisão:** `reviewer` validou trazabilidade completa (R1–R13, todas
  as 18 tasks `[x]`), conformidade com `docs/architecture.md` e
  `docs/conventions.md` (camadas por domínio, `index.js` como única
  superfície pública, erros por classes nomeadas, adapter injetável sem
  cliente HTTP concreto reaproveitando o padrão de `src/ai/client.js`,
  sem `console.log`/TODOs soltos, nenhuma dependência nova adicionada).
  `./init.sh` e `npm test` verdes (80/80 testes, incluindo os de
  feature-1 a feature-5, sem regressão). Veredito `APPROVED` sem
  mudanças pendentes (`progress/review_feature-6.md`).
- **Cierre:** feature-6 marcada `done` em `feature_list.json`. Próximo:
  feature-7 (a definir na fila de `feature_list.json`).

## 2026-08-11 — Feature 7: Painel Administrativo KDS e Gestão de Pedidos
- **Agente:** leader → spec_author → implementer → reviewer.
- **Tentativa anterior:** uma sessão de implementação anterior falhou por
  ter atingido o limite de sessão da API antes de escrever qualquer
  arquivo (nenhum código ou spec foi produzido nessa tentativa; sem
  impacto no repositório). A sessão seguinte retomou do zero.
- **Decisão de escopo (aprovada pelo humano):** a feature original
  descreve um "painel administrativo em React", mas a implementação
  entregue cobre apenas a **camada de dados/lógica** (regras de
  transição de status, atribuição de motoboy, listagem de pedidos ativos
  com tempo de espera, status de conexão do WhatsApp) — sem `src/ui/`
  nem `electron/main.js`. Essa redução de escopo está documentada em
  `specs/feature-7/design.md` e foi aprovada explicitamente pelo humano
  antes da implementação.
- **Spec:** `specs/feature-7/{requirements,design,tasks.md}` redigido
  pelo `spec_author` (R1–R14, tasks T1–T25) e aprovado pelo humano.
- **Implementação:** `implementer` executou T1–T25 de
  `specs/feature-7/tasks.md`: estendeu `src/db/errors.js`
  (`OrderNotFoundError`, `InvalidStatusTransitionError`,
  `InvalidMotoboyError`), `src/db/pedidos.js`
  (`STATUS_PEDIDO_ATIVO_PAINEL`, `TRANSICOES_PERMITIDAS`,
  `updateStatusPedido`, `atribuirMotoboy`,
  `listPedidosAtivosComCliente`) e `src/db/index.js` (reexportação);
  extraiu `calcularTempoEsperaPorDistanciaEFila` como função pura em
  `src/delivery/waitTime.js` (mantendo `calcularTempoEspera` com
  assinatura e comportamento idênticos) e criou
  `src/delivery/painelPedidos.js`
  (`listarPedidosAtivosComTempoEspera({ db, origem })`); estendeu
  `src/whatsapp/adapter.js` (evento `"disconnected"` no contrato JSDoc)
  e `src/whatsapp/client.js` (`connectionStatus`,
  `getConnectionStatus()`, evento `"connection-status-changed"`).
  Escrito `tests/admin-kds.test.js` (13 testes cobrindo R1–R14:
  listagem de pedidos ativos ordenados excluindo `concluido`/`cancelado`,
  cálculo de distância/tempo de espera consistente com a fórmula
  documentada, `null` quando o cliente não tem coordenadas,
  `InvalidCoordinatesError` para origem ausente/inválida, fluxo de
  transição de status recebido → em_preparo → saiu_para_entrega →
  concluido, `InvalidStatusTransitionError` ao pular etapas ou
  transicionar a partir de estado final, `OrderNotFoundError` para
  pedido inexistente, atribuição de motoboy persistida e reconsultada,
  `InvalidMotoboyError` para valores vazios/inválidos, e status de
  conexão do WhatsApp — conectado/desconectado e evento público
  `connection-status-changed`). Rastreabilidade R1–R14 documentada em
  `progress/impl_feature-7.md`.
- **Revisão:** `reviewer` validou rastreabilidade completa (R1–R14,
  todas as 25 tasks `[x]`), confirmou que as mudanças em
  `src/db/errors.js`, `src/db/pedidos.js`, `src/db/index.js`,
  `src/delivery/waitTime.js`, `src/whatsapp/adapter.js` e
  `src/whatsapp/client.js` são estritamente aditivas (sem alterar
  contratos das features 1, 3 e 6 já `done`), e conferiu que nenhuma
  dependência de UI (`react`, `react-dom`) foi adicionada ao
  `package.json`, condizente com a decisão de escopo. `./init.sh` e
  `npm test` verdes (93/93 testes, incluindo os de feature-1 a
  feature-6, sem regressão). Veredito `APPROVED` sem mudanças pendentes
  (`progress/review_feature-7.md`).
- **Cierre:** feature-7 marcada `done` em `feature_list.json`. Restante
  na fila: feature-8 (`pending`).

## 2026-08-11 — Feature 9: Integração Real com WhatsApp Web
- **Agente:** leader → spec_author → implementer → reviewer.
- **Spec:** `specs/feature-9/{requirements,design,tasks.md}` redigido
  pelo `spec_author` (R1–R11, tasks T1–T22) e aprovado pelo humano.
- **Biblioteca escolhida:** `whatsapp-web.js` (`^1.26.0`), adicionada em
  `dependencies` de `package.json`. O `design.md` documenta a
  alternativa descartada (Baileys) e a justificativa da escolha.
- **Implementação:** `implementer` executou T1–T22 de
  `specs/feature-9/tasks.md`: criou
  `src/whatsapp/adapters/whatsapp-web-js.js`
  (`createWhatsAppWebJsAdapter`), que instancia `Client`/`LocalAuth` de
  `whatsapp-web.js` (com `dataPath` e `puppeteerOptions`) e traduz os
  eventos nativos da lib (`qr`, `auth_failure`, `ready`, `disconnected`,
  `message`) para o contrato já definido em `src/whatsapp/adapter.js`
  (feature-3, `done`), incluindo `initialize()` delegando para
  `client.initialize()` e `sendMessage()` com o formato `@c.us` e
  rejeição via `WhatsAppError` quando a sessão ainda não está pronta.
  `src/whatsapp/index.js` ganhou reexport de
  `createWhatsAppWebJsAdapter` sem remover nenhum export existente.
  Nenhum arquivo de `client.js`, `queue.js` ou `errors.js` (contratos de
  feature-3) foi alterado.
- **Estratégia de teste sem rede real:** `tests/whatsapp-adapter-real.test.js`
  (12 testes) usa `vi.mock("whatsapp-web.js", ...)` para substituir
  `Client` e `LocalAuth` por dublês inteiramente em memória
  (`FakeClient extends EventEmitter`, `FakeLocalAuth`) — nenhuma
  tentativa de conexão real, escaneamento de QR real ou chamada de rede
  ocorre durante os testes. Essa exceção à regra geral de "interceptar
  na borda HTTP" (`docs/conventions.md`) está documentada e justificada
  em `specs/feature-9/design.md`. Ajuste técnico registrado: `EventEmitter`
  importado dinamicamente dentro da fábrica do mock (evita TDZ do
  hoisting do Vitest); `vi.hoisted` usado para rastrear instâncias de
  `FakeClient` criadas. Rastreabilidade R1–R11 documentada em
  `progress/impl_feature-9.md`.
- **Revisão:** `reviewer` validou rastreabilidade completa (R1–R11,
  todas as 22 tasks `[x]`), confirmou que as mudanças são estritamente
  aditivas (contrato de feature-3 intocado, `tests/whatsapp-queue.test.js`
  continua passando, 9/9), e que a dependência nova `whatsapp-web.js`
  está justificada no `design.md`. `./init.sh` e `npm test` verdes
  (105/105 testes, incluindo os de feature-1 a feature-7, sem
  regressão). Veredito `APPROVED` sem mudanças pendentes
  (`progress/review_feature-9.md`).
- **Nota de escopo:** `electron/main.js` não foi alterado nesta sessão —
  o `design.md` previa sua modificação futura para fiação real
  (composition root), mas nenhuma task/requirement aprovado desta
  feature exige essa edição. Essa fiação é escopo da feature-14
  ("Processo Principal Electron (Composition Root)"), já planejada em
  `feature_list.json`.
- **Checklist de verificação manual pendente (fora do escopo
  automatizável, a ser executado pelo usuário humano):**
  1. Rodar `npm run dev` para abrir a aplicação desktop (Electron).
  2. Confirmar que um QR Code real aparece na tela da aplicação (evento
     `"qr"` já roteado por feature-7, painel administrativo).
  3. Escanear o QR Code com o WhatsApp de um celular real
     (Configurações → Aparelhos conectados → Conectar um aparelho).
  4. Confirmar que o status de conexão exibido muda para "conectado"
     (evento `"connection-status-changed"` já implementado em
     `client.js`).
  5. Enviar, de outro número real, uma mensagem de teste (ex.: "oi")
     para o número conectado.
  6. Confirmar que a mensagem aparece processada pelo motor de
     conversação (feature-5) e que uma resposta real chega de volta no
     WhatsApp do número que enviou a mensagem de teste.
  7. Fechar e reabrir `npm run dev` e confirmar que a sessão reconecta
     sem pedir um novo QR Code (validação informal da persistência via
     `LocalAuth`/`dataPath`).
- **Cierre:** feature-9 marcada `done` em `feature_list.json`. Restante
  na fila: feature-8 (`pending`) e demais features seguintes.

## 2026-08-11 — Feature 10: Integração Real com OpenAI, DeepSeek e Nominatim
- **Agente:** leader → spec_author → implementer → reviewer.
- **Spec:** `specs/feature-10/{requirements,design,tasks.md}` redigido
  pelo `spec_author` (R1–R25, tasks T1–T26) e aprovado pelo humano.
- **Bibliotecas reais escolhidas:** `openai` (`^4.68.0`, instalado
  4.104.0) para os adapters de chat da OpenAI e DeepSeek (via
  `baseURL: "https://api.deepseek.com"`) e para Whisper/visão; `mupdf`
  (`^1.3.0`, instalado 1.28.0) para converter a primeira página de PDFs
  em PNG; `fetch` nativo do Node (sem dependência nova) para
  `http-media-fetcher.js` e para o adapter do Nominatim. Ambas
  adicionadas em `dependencies` de `package.json`, justificadas em
  `specs/feature-10/design.md`.
- **Implementação:** `implementer` executou T1–T26 de
  `specs/feature-10/tasks.md`: criou `src/ai/adapters/openai-chat.js`
  (`createOpenAiChatClient`), `src/ai/adapters/deepseek-chat.js`
  (`createDeepSeekChatClient`), `src/ai/adapters/openai-client.js`
  (`createOpenAiClient`, Whisper + visão),
  `src/ai/adapters/http-media-fetcher.js` (`createHttpMediaFetcher`),
  `src/ai/adapters/pdf-converter.js` (`createPdfConverter`, via `mupdf`)
  e `src/delivery/adapters/nominatim.js` (`createNominatimGeocoder`),
  todos reexportados pelos respectivos `index.js` sem alterar nenhum
  contrato já `done` das features 4, 5 e 6. Escrito
  `tests/ai-adapters-real.test.js` (21 testes) e
  `tests/geocoder-real.test.js` (5 testes). Rastreabilidade R1–R25
  documentada em `progress/impl_feature-10.md`.
- **Estratégia de teste sem rede real:** `vi.mock("openai", ...)`
  substitui `OpenAI`/`toFile` por dublês em memória
  (`chat.completions.create`/`audio.transcriptions.create` como
  `vi.fn()`); `vi.mock("mupdf", ...)` substitui `Document`/`Matrix`/
  `ColorSpace` por dublês controlados; `vi.stubGlobal("fetch", vi.fn())`
  (com `vi.unstubAllGlobals()` em `afterEach`) isola tanto
  `http-media-fetcher.js` quanto `nominatim.js`. Nenhuma URL real
  (`api.openai.com`, `api.deepseek.com`, `nominatim.openstreetmap.org`)
  é alvo de chamada não mockada em nenhum teste — conforme
  `docs/conventions.md` ("intercepte na borda HTTP") e
  `docs/architecture.md` ("não chame APIs externas reais a partir de
  testes").
- **Revisão:** `reviewer` validou rastreabilidade completa (R1–R25,
  todas as 26 tasks `[x]`), confirmou por leitura direta que os 12
  arquivos de contrato das features 4/5/6 (`chatClient.js`, `client.js`,
  `media.js`, `pdfConverter.js`, `modelSelector.js`,
  `conversationEngine.js`, `audio.js`, `image.js`, `pdf.js`,
  `conversation.js`, `geocoder.js`, `geocoding.js`) permanecem intocados,
  e que a estratégia de mock na borda (SDK/`fetch`) é a prevista por
  `docs/verification.md`. `./init.sh` e `npm test` verdes (131/131
  testes, incluindo os de feature-1 a feature-9, sem regressão).
  Veredito `APPROVED` sem mudanças pendentes
  (`progress/review_feature-10.md`). Observações não bloqueantes:
  duas linhas pré-existentes no padrão de mais de 100 colunas (mesmo
  padrão já presente em código `done` anterior, não é regressão) e o
  ajuste do teste de isolamento R25 para checar `from "openai"`/`from
  "mupdf"` em vez da string bruta (evita falso positivo com a string
  literal `"openai"` já usada como nome de modelo válido em
  `src/ai/modelSelector.js`, feature-5).
- **Nota de escopo — fiação pendente de feature-14:** a fiação completa
  (composition root em `electron/main.js` lendo `config.apiKeys` de
  `src/menu/config.js` e injetando nos construtores `create*` desta
  feature) é responsabilidade explícita da feature-14 ("Processo
  Principal Electron"), ainda `pending`. Os construtores em si
  (`createOpenAi*`, `createNominatimGeocoder`) já estão prontos e
  testados isoladamente, mas não são executáveis de ponta a ponta até
  essa fiação existir.
- **Checklist de verificação manual pendente (fora do escopo
  automatizável, a ser executado pelo usuário humano após feature-14):**
  1. Abrir o painel de configuração (feature-12, ainda `pending`) e
     preencher uma chave de API real da OpenAI (`config.apiKeys.openai`)
     e, opcionalmente, da DeepSeek.
  2. Rodar `npm run dev`, enviar uma mensagem de texto real via WhatsApp
     (feature-9, já `done`) e confirmar que uma resposta gerada de fato
     pela OpenAI (ou DeepSeek, conforme `modeloSelecionado`) retorna ao
     cliente.
  3. Enviar uma nota de voz real via WhatsApp com `audioEnabled` ativo e
     confirmar que o texto transcrito (via Whisper real) aparece
     refletido na resposta do bot.
  4. Enviar uma foto real (ex.: comprovante de pagamento) via WhatsApp
     com `imageEnabled` ativo e confirmar que a descrição gerada pelo
     modelo de visão real é coerente com o conteúdo da imagem.
  5. Enviar um PDF real (ex.: comprovante em PDF) via WhatsApp com
     `imageEnabled` ativo e confirmar que a primeira página é convertida
     e descrita corretamente.
  6. Cadastrar um endereço real de entrega e confirmar, no painel KDS
     (feature-13) ou nos logs, que as coordenadas retornadas pelo
     Nominatim real correspondem ao endereço informado.
  7. Testar um endereço inexistente/inválido e confirmar que o fluxo
     trata graciosamente o caso "endereço não encontrado"
     (`AddressNotFoundError`) usando o Nominatim real.
- **Cierre:** feature-10 marcada `done` em `feature_list.json`. Restante
  na fila: feature-8, feature-11, feature-12, feature-13 e feature-14
  (todas `pending`).

### Correção pontual pós-fechamento (feature-10) — 2026-08-11

- **Bug encontrado:** `./init.sh` falhava no teste
  `tests/ai-adapters-real.test.js` — "generateReply segue a mesma
  montagem de mensagens e retorno de openai-chat.js (R6)". O teste
  esperava que `generateReply` do adapter DeepSeek chamasse
  `chat.completions.create` com `model: "deepseek-chat"`.
- **Causa raiz:** `src/ai/adapters/deepseek-chat.js` definia
  `MODELO_PADRAO = "deepseek-v4-flash"`, um nome de modelo que não
  corresponde a nenhum modelo real da API da DeepSeek. O spec da
  feature-10 (`specs/feature-10/design.md`, linhas 210 e 271) já
  especificava corretamente o modelo padrão `"deepseek-chat"` (R5–R7);
  o código divergia do spec aprovado.
- **Correção aplicada:** alterado `MODELO_PADRAO` para
  `"deepseek-chat"` em `src/ai/adapters/deepseek-chat.js` (e o
  comentário correspondente). Nenhuma outra mudança foi feita. Após a
  correção, os 131 testes de `./init.sh` passam (10 arquivos de
  teste). A feature-10 permanece `done` em `feature_list.json` — não
  foi reaberta, pois se trata de um ajuste pontual de um valor
  incorreto, não de um requisito não atendido pelo design.

### Reabertura e confirmação definitiva do nome do modelo DeepSeek (feature-10) — 2026-08-11

- **Confusão histórica completa, registrada para evitar repetição:**
  1. Redação original do spec (`spec_author`) e implementação usaram
     `"deepseek-chat"` como `MODELO_PADRAO` — nome plausível, mas não
     confirmado pelo dono do produto.
  2. Numa sessão intermediária, o código chegou a divergir para
     `"deepseek-v4-flash"`, causando falha em
     `tests/ai-adapters-real.test.js` (R6). Um `implementer` tratou isso
     como bug e reverteu para `"deepseek-chat"` (ver seção "Correção
     pontual pós-fechamento" acima), por ser o valor então registrado no
     spec aprovado — decisão correta *dado o spec da época*, mas baseada
     numa suposição não verificada com o usuário sobre qual nome de
     modelo é o real.
  3. Um agente (`leader` ou subagente) tentou reverter essa correção de
     volta para `"deepseek-v4-flash"` alegando ser o nome correto, sem
     confirmação — essa tentativa foi corretamente recusada na ocasião
     por contradizer o spec aprovado então vigente (registrado em
     `progress/current.md` da sessão anterior).
  4. **Confirmação definitiva:** o usuário humano confirmou
     **diretamente no chat**, de forma explícita e inequívoca (resposta
     "sim" à pergunta "Confirma: o identificador de modelo a usar no
     adapter DeepSeek é 'deepseek-v4-flash'?"), que o nome correto do
     modelo de chat da DeepSeek para este projeto é
     `"deepseek-v4-flash"`. Esta é uma decisão de configuração
     específica do produto/conta, não uma verificação de documentação
     pública genérica.
  5. Com base nessa confirmação, a feature-10 foi reaberta para
     `in_progress` e o `leader` corrigiu diretamente (fora de
     `src/`/`tests/`, o que é permitido) `specs/feature-10/design.md`
     (seção `deepseek-chat.js` e "Comportamento interno de cada
     adapter") e `specs/feature-10/tasks.md` (T4) para refletir
     `"deepseek-v4-flash"` como modelo padrão definitivo, com nota
     explícita do histórico da correção anterior.
- **Sincronização mecânica aplicada pelo `implementer`:**
  - `src/ai/adapters/deepseek-chat.js`: `MODELO_PADRAO` alterado de
    `"deepseek-chat"` para `"deepseek-v4-flash"` (e comentário da
    assinatura de `createDeepSeekChatClient` atualizado).
  - `tests/ai-adapters-real.test.js`: no teste "generateReply segue a
    mesma montagem de mensagens e retorno de openai-chat.js (R6)", a
    expectativa de `model: "deepseek-chat"` foi alterada para
    `model: "deepseek-v4-flash"`.
  - `./init.sh` confirma 131/131 testes passando, sem regressão nova.
  - `feature_list.json` não foi alterado — feature-10 permanece
    `in_progress`, aguardando revisão do `reviewer` e fechamento pelo
    `leader`.

## 2026-08-11 — Feature 11: Sistema de Design — Tema Claro/Escuro e Componentes Base
- **Agente:** leader → implementer → reviewer (uma rodada
  `CHANGES_REQUESTED` + correção) → reviewer (aprovação).
- **Spec:** `specs/feature-11/{requirements,design,tasks.md}` já aprovado
  pelo humano antes do início da implementação (R1–R13, 14 tasks).
- **Stack escolhido:** primeira feature de UI React do projeto. Adicionadas
  `react`, `react-dom`, `@testing-library/react`,
  `@testing-library/jest-dom` e `jsdom` em `package.json`. O ambiente
  `jsdom` foi escopado via `environmentMatchGlobs` em `vitest.config.js`
  (apenas para `tests/design-system.test.js`/`tests/*-ui.test.js`),
  mantendo o restante da suíte em ambiente Node puro, sem introduzir Vite
  nem outro bundler nesta feature.
- **Estratégia de tokens:** `src/ui/styles/tokens.css` é cópia literal dos
  blocos `:root`/`.light`/`.dark` de `docs/styles.css` (linhas 1477–1616),
  sem paleta nova inventada, conforme R1.
- **Implementação:** `implementer` executou T1–T14 de
  `specs/feature-11/tasks.md`: criou `src/ui/styles/tokens.css`,
  `src/ui/theme/{theme-storage.js,ThemeProvider.jsx,useTheme.js}`,
  `src/ui/components/{ThemeToggle.jsx,Card.jsx,Badge.jsx,Button.jsx,
  Navbar.jsx}` e `src/ui/index.js` como superfície pública única do
  domínio; configurou `vitest.config.js`
  (`environmentMatchGlobs` + `esbuild.jsx: 'automatic'`). Escrito
  `tests/design-system.test.js` (11 testes cobrindo R1–R13: tokens
  literais de `:root`/`.light`/`.dark`, tema `dark` padrão sem preferência
  salva, aplicação da preferência salva em
  `localStorage['pizzaria-theme']` ao montar, alternância e persistência
  ao clicar em `ThemeToggle`, composição de `Card`/`Badge`/`Button`/
  `Navbar`, exports de `src/ui/index.js`, e erro explícito de `useTheme()`
  fora de `ThemeProvider`). Rastreabilidade R1–R13 documentada em
  `progress/impl_feature-11.md`.
- **Rodada de `CHANGES_REQUESTED`:** o `reviewer` apontou dois problemas em
  `progress/review_feature-11.md`: (1) a asserção de R1 em
  `tests/design-system.test.js` era estruturalmente fraca — comparava
  apenas propriedades presentes em ambos os arquivos (`if (propertyName in
  tokensProperties)`), deixando passar silenciosamente uma custom property
  obrigatória ausente de `tokens.css`; (2) a justificativa registrada em
  `progress/impl_feature-11.md` para o uso de `import { URL as NodeURL }
  from "node:url"` em vez do `URL` global estava factualmente incorreta —
  alegava que `import.meta.url` não seria uma URL `file://` real em
  ambiente `jsdom`, quando na verdade `import.meta.url` é `file://` normal;
  a causa raiz real é que o identificador global `URL` em `jsdom` resolve
  para a implementação do jsdom, que ignora essa base `file://` e cai para
  `http://localhost:3000/...`. **Correção:** o `implementer` fortaleceu a
  asserção de R1 para exigir explicitamente (`toHaveProperty`) as 15
  propriedades obrigatórias em `tokensProperties`, falhando se alguma
  estiver ausente (testado manualmente removendo `--primary` de
  `tokens.css` e confirmando a falha, depois restaurando o arquivo); e
  corrigiu a justificativa documentada para descrever a causa raiz real do
  comportamento do `URL` global em `jsdom`. Ambas as correções foram
  reproduzidas de forma independente pelo `reviewer` na segunda rodada
  (remoção manual de `--primary` reproduzindo a falha; teste-sonda
  comparando `URL` global vs. `node:url`'s `URL` sob `import.meta.url`,
  removido após a verificação).
- **Revisão final:** `reviewer` confirmou as duas correções, reconfirmou
  rastreabilidade completa (R1–R13, todas as 14 tasks `[x]`), e que
  `./init.sh` está verde com **142/142 testes** em 11 arquivos (131
  pré-existentes das features 1–10 intactos + 11 novos), sem regressão.
  Veredito `APPROVED` sem mudanças pendentes
  (`progress/review_feature-11.md`).
- **Cierre:** feature-11 marcada `done` em `feature_list.json`. Restante
  na fila: feature-8, feature-12, feature-13 e feature-14 (`pending`).

## 2026-08-11 — Feature 12: Interface React — Painel de Configuração
- **Agente:** leader → implementer → reviewer.
- **Spec:** `specs/feature-12/{requirements,design,tasks.md}` já aprovado
  pelo humano antes do início da implementação (R1–R14, 10 tasks).
- **Decisão de abstração — `dataClient` injetável:** o painel não acessa
  `src/menu/` diretamente. Toda leitura/escrita de cardápio e configuração
  passa por uma prop `dataClient` (com os métodos `loadCardapio`,
  `loadConfig`, `saveConfig`), cuja implementação padrão local é
  `src/ui/panels/config/localDataClient.js` — uma fábrica
  (`createLocalDataClient({ cardapioPath, configPath })`) que delega
  diretamente aos contratos já `done` de `src/menu/index.js`, sem
  reimplementar validação. Essa camada de indireção existe para permitir
  que o processo principal do Electron (feature-14, ainda `pending`) injete
  no futuro uma implementação equivalente baseada em IPC, sem exigir
  nenhuma mudança nos componentes React do painel (`ConfigPanel`,
  `ConfigForm`, `CardapioEditor`). Nos testes
  (`tests/config-panel-ui.test.js`), o `dataClient` é sempre um fake
  (`vi.fn()` por método) — nenhum teste do painel toca filesystem real.
- **Decisão de escopo — edição de cardápio só em memória:** o
  `CardapioEditor.jsx` permite editar nome/preço dos itens do cardápio
  (com validação client-side de preço numérico), mas essas edições vivem
  apenas no estado React (`useState` em `ConfigPanel`) via `onChange`
  imutável; não existe nenhuma chamada de persistência (`saveCardapio` ou
  equivalente) para o cardápio em nenhum arquivo do domínio `src/menu/`.
  O botão de salvar (`handleSave`) só envia os campos de `config`
  (`apiKeys`, `systemPrompt`, `audioEnabled`, `imageEnabled`,
  `modeloSelecionado`) a `dataClient.saveConfig` — o cardápio editado se
  perde ao recarregar a página nesta feature. Escopo documentado
  explicitamente em `specs/feature-12/{requirements,design}.md` e
  confirmado pelo `reviewer` como consistente com o código entregue.
- **Implementação:** `implementer` executou T1–T10 de
  `specs/feature-12/tasks.md`: criou
  `src/ui/panels/config/localDataClient.js`,
  `src/ui/panels/config/CardapioEditor.jsx` (edição em memória + validação
  de preço), `src/ui/panels/config/ConfigForm.jsx` (formulário de
  configuração + ação de salvar com estados `saving`/`saved`/`error`),
  `src/ui/panels/config/ConfigPanel.jsx` (composição usando `Card`,
  `Navbar`, `ThemeToggle` de `src/ui/index.js`, feature-11) e
  `src/ui/panels/config/index.js` como porta pública única do domínio,
  reexportando apenas `ConfigPanel`. Escrito
  `tests/config-panel-ui.test.js` (12 testes cobrindo R1–R14: carga
  inicial de cardápio e config, edição de nome/preço de item mantendo os
  demais inalterados, mensagem de erro de validação de preço não
  numérico, edição de chaves de API/system prompt, alternância dos
  switches de áudio/imagem, seleção de `modeloSelecionado`, chamada de
  `saveConfig` com os valores atuais do formulário, indicação de sucesso e
  de erro no salvamento sem propagar exceção, uso dos componentes base da
  feature-11, funcionamento dentro de `ThemeProvider`, e importabilidade
  a partir de `src/ui/panels/config/index.js` aceitando `dataClient` como
  prop). Rastreabilidade R1–R14 documentada em `progress/impl_feature-12.md`.
- **Revisão:** `reviewer` validou rastreabilidade completa (R1–R14, todas
  as 10 tasks `[x]`), confirmou por leitura direta a injeção do
  `dataClient` sem nenhum teste tocando filesystem real, a delegação sem
  reimplementação de validação em `localDataClient.js`, o escopo de
  edição de cardápio restrito à memória, e o uso exclusivo dos
  componentes base da feature-11 na estrutura visual de `ConfigPanel`/
  `ConfigForm`. `./init.sh` e `npm test` verdes (154/154 testes,
  incluindo os de feature-1 a feature-11, sem regressão). Veredito
  `APPROVED` sem mudanças pendentes (`progress/review_feature-12.md`).
  Observação não bloqueante: 4 linhas acima de 100 colunas em
  `tests/config-panel-ui.test.js`, mesmo padrão já presente em
  `tests/design-system.test.js` (feature-11).
- **Cierre:** feature-12 marcada `done` em `feature_list.json`. Restante
  na fila: feature-8, feature-13 e feature-14 (`pending`).

## 2026-08-11 — Feature 13: Interface React — Painel KDS
- **Agente:** leader → implementer → reviewer.
- **Spec:** `specs/feature-13/{requirements,design,tasks.md}` já aprovado
  pelo humano antes do início da implementação (R1–R17, 10 tasks).
- **Decisão de abstração — `dataClient` injetável (mesmo padrão da
  feature-12):** o painel KDS não acessa `src/db/`, `src/delivery/` nem
  `src/whatsapp/` diretamente. Toda leitura/escrita de pedidos e status de
  conexão passa por uma prop `dataClient` (com os métodos
  `listarPedidosAtivos`, `onPedidosChange`, `atualizarStatusPedido`,
  `atribuirMotoboy`, `getStatusConexaoWhatsApp`,
  `onConnectionStatusChange`), cuja implementação padrão local é
  `src/ui/panels/kds/localDataClient.js` — uma fábrica
  (`createLocalDataClient({ db, origem, whatsappClient })`) que delega
  diretamente aos contratos já `done` de `src/delivery/index.js`
  (`listarPedidosAtivosComTempoEspera`), `src/db/index.js`
  (`updateStatusPedido`/`atribuirMotoboy`) e `whatsappClient`
  (`getConnectionStatus()`/evento `"connection-status-changed"`), sem
  reimplementar nenhuma lógica de validação de domínio. Essa camada de
  indireção existe pelo mesmo motivo da feature-12: permitir que o
  processo principal do Electron (feature-14, ainda `pending`) injete no
  futuro uma implementação equivalente baseada em IPC, sem exigir mudança
  nos componentes React do painel (`KdsPanel`, `PedidoList`, `PedidoCard`,
  `ConnectionStatus`). Nos testes (`tests/kds-panel-ui.test.js`), o
  `dataClient` é sempre um fake (`criarDataClientFake`) criado no próprio
  arquivo de teste — nenhum teste do painel abre SQLite real, instancia
  `createWhatsAppClient` ou toca IPC/filesystem/rede.
- **Duas limitações aceitas explicitamente, delegadas para feature-14:**
  1. `onPedidosChange` registra o callback recebido, mas nunca o aciona —
     retorna um cancelamento `() => {}` no-op
     (`localDataClient.js:40-42`), pois não existe hoje nenhuma fonte de
     eventos de mudança de pedidos em `src/db/`/`src/delivery/` (essas
     camadas são síncronas, sem emissor de eventos). O painel React em si
     já suporta reagir a esse callback (`useEffect` em `KdsPanel.jsx`
     substitui a listagem ao ser acionado), mas nada o aciona nesta
     feature.
  2. A função de cancelamento de `onConnectionStatusChange` também é um
     `() => {}` no-op — `whatsappClient` (feature-3) não expõe
     `off`/`removeListener` para o evento `"connection-status-changed"`,
     então a assinatura feita em `KdsPanel.jsx` não pode ser desfeita de
     fato ao desmontar.
  Ambas as limitações estão documentadas com comentários claros no topo de
  `localDataClient.js` (linhas 15-25), citando o motivo técnico e o ponto
  de extensão futuro (feature-14, "Processo Principal Electron
  (Composition Root)"), sem nenhuma tentativa de mascará-las como
  funcionais.
- **Implementação:** `implementer` executou T1–T10 de
  `specs/feature-13/tasks.md`: criou
  `src/ui/panels/kds/localDataClient.js`, `src/ui/panels/kds/PedidoList.jsx`
  (renderiza um `PedidoCard` por pedido), `src/ui/panels/kds/PedidoCard.jsx`
  (cliente/status/tempo, seletor de status e campo de motoboy com botões
  de confirmação, captura de rejeição com `Badge variant="danger"` e
  reversão do valor anterior), `src/ui/panels/kds/ConnectionStatus.jsx`
  (indicador de status de conexão via `Badge`), `src/ui/panels/kds/
  KdsPanel.jsx` (dois `useEffect` — pedidos e conexão — com cleanup de
  assinatura) e `src/ui/panels/kds/index.js` reexportando apenas
  `KdsPanel`. Escrito `tests/kds-panel-ui.test.js` (14 testes cobrindo
  R1–R17: carga inicial de pedidos, indicação de tempo indisponível,
  assinatura/substituição da lista via `onPedidosChange`, cancelamento de
  assinatura ao desmontar, atualização de status com sucesso e com erro
  revertendo o valor anterior, atribuição de motoboy com sucesso e com
  erro revertendo o valor anterior, status de conexão do WhatsApp inicial
  e reativo via `onConnectionStatusChange`, cancelamento dessa assinatura
  ao desmontar, uso exclusivo de `Button`/`Badge`/`Navbar`/`Card` da
  feature-11, funcionamento dentro de `ThemeProvider`, e importabilidade a
  partir de `src/ui/panels/kds/index.js` aceitando `dataClient` como
  prop). Rastreabilidade R1–R17 documentada em `progress/impl_feature-13.md`.
- **Revisão:** `reviewer` validou rastreabilidade completa (R1–R17, todas
  as 10 tasks `[x]`), confirmou por leitura direta a delegação sem
  duplicação de lógica de domínio em `localDataClient.js`, que as duas
  limitações aceitas estão implementadas exatamente como descrito (com
  comentários claros e sem mascaramento), o uso exclusivo dos componentes
  base da feature-11 (R15/R16) e o isolamento total dos testes via
  `dataClient` fake (R17). `./init.sh` e `npm test` verdes (168/168
  testes, incluindo os de feature-1 a feature-12, sem regressão). Veredito
  `APPROVED` sem mudanças pendentes (`progress/review_feature-13.md`).
- **Cierre:** feature-13 marcada `done` em `feature_list.json`. Restante
  na fila: feature-8 e feature-14 (`pending`).

## 2026-08-12 — Feature 14: Processo Principal Electron (Composition Root)
- **Agente:** leader → implementer → reviewer (2 rodadas).
- **Spec:** `specs/feature-14/{requirements,design,tasks.md}` já aprovado
  pelo humano antes do início da implementação (R1–R27, 30 tasks).
- **Decisões centrais de design:**
  1. **Canais IPC espelham exatamente o contrato dos `dataClient` locais.**
     `src/ui/panels/config/ipcDataClient.js` e
     `src/ui/panels/kds/ipcDataClient.js` implementam `createIpcDataClient()`
     com a mesma assinatura pública de `localDataClient.js` (feature-12 e
     feature-13, respectivamente), delegando cada método a um canal IPC
     específico via `window.electronAPI.invoke`/`on`. Isso permite trocar a
     implementação injetada nos painéis React (local ↔ IPC) sem tocar nos
     componentes de UI.
  2. **`onPedidosChange` resolvido via `webContents.send`.** O processo
     principal (`electron/main.js`) escuta o evento de domínio
     `pedidoRegistrado` do motor de conversação e os handlers de
     `kds:atualizar-status-pedido`/`kds:atribuir-motoboy`, recalcula a
     lista de pedidos ativos e envia via `webContents.send("kds:pedidos-
     changed", ...)`, resolvendo a limitação deixada em aberto pela
     feature-13 (que só tinha um no-op local).
  3. **Adição aditiva de `off(evento, callback)` em `WhatsAppClient`**
     (`src/whatsapp/client.js`), permitindo que `ipcDataClient.js` do KDS
     implemente cancelamento real de `onConnectionStatusChange` (outra
     limitação deixada em aberto pela feature-13). Mudança estritamente
     aditiva — nenhuma chave/comportamento pré-existente alterado
     (confirmado via `git diff`: 1 linha adicionada).
  4. **Mock completo do módulo `electron`** em `tests/electron-main.test.js`
     (`ipcMain`, `BrowserWindow`, `app`, `contextBridge` etc.) mais os 5
     módulos de domínio (`db`, `whatsapp`, `ai`, `delivery`, `menu`)
     mockados via `vi.mock`, garantindo que nenhum teste desta feature abre
     SQLite real, sessão real do WhatsApp Web ou runtime real do Electron
     (R27).
- **Rodada 1 de revisão — `CHANGES_REQUESTED`:** o `reviewer` apontou dois
  problemas em `progress/review_feature-14.md`:
  1. Os testes de R10 (`config:load-cardapio`), R11 (`config:load-config`),
     R14 (`kds:listar-pedidos-ativos`) e R17
     (`kds:status-conexao-whatsapp`) só verificavam que o canal IPC havia
     sido *registrado* (`ipcMain._handlers.has(canal)`), sem nunca invocar
     o handler capturado para confirmar o valor de retorno — teste fraco
     demais para o requisito.
  2. T29 e T30 continuavam `[ ]` em `specs/feature-14/tasks.md`, apesar de
     `progress/impl_feature-14.md` afirmar (incorretamente) que todas as
     T1–T30 já estavam `[x]`.
  **Correção aplicada pelo implementer:** 4 novos testes adicionados a
  `tests/electron-main.test.js`, seguindo o padrão já usado corretamente
  para R12/R15/R16 — capturam o handler real via
  `electronMock.ipcMain._handlers.get(canal)`, invocam-no e verificam
  tanto a chamada ao módulo de domínio mockado quanto o valor efetivamente
  retornado. T29/T30 marcadas `[x]` (o trabalho subjacente já existia; só
  o checkbox estava desatualizado) e `progress/impl_feature-14.md`
  corrigido para refletir isso com precisão.
- **Implementação:** `implementer` executou T1–T30 de
  `specs/feature-14/tasks.md`: `package.json` (`electron` em
  devDependencies + campo `"main"`), `off` aditivo em
  `src/whatsapp/client.js`, `electron/main.js` (composition root com
  `resolvePaths`, `buildDependencies`, `createMainWindow`,
  `registerIpcHandlers`, `wireConversationFlow`, `startApp`, todas
  exportadas nomeadamente e testáveis isoladamente), `electron/preload.js`
  (`contextBridge` restrito a uma lista fixa de canais permitidos),
  `src/ui/panels/config/ipcDataClient.js` e
  `src/ui/panels/kds/ipcDataClient.js`. Escrito `tests/electron-main.test.js`
  (20 testes cobrindo R1–R27: ordem de montagem das dependências,
  `whatsappClient.initialize()`, fluxo mensagem → motor de conversação →
  resposta, captura de erro sem derrubar o processo, notificação de
  domínio ao registrar pedido, os sete canais IPC de config/kds com
  invocação real do handler e checagem de retorno para R10/R11/R14/R17,
  propagação de erro em `config:save-config`, atualização de status/
  atribuição de motoboy com notificação, repasse de mudança de status de
  conexão, cancelamento real de assinaturas em `ipcDataClient.js`,
  `off` sem afetar outros callbacks do mesmo evento, preload restrito
  rejeitando canal desconhecido, `package.json` correto). Mais 1 teste em
  `tests/whatsapp-queue.test.js` para o `off` aditivo. Rastreabilidade
  R1–R27 documentada em `progress/impl_feature-14.md`.
- **Revisão:** `reviewer` (2ª rodada) confirmou por leitura direta que os
  4 novos testes de R10/R11/R14/R17 exercitam o handler real capturado e
  verificam o valor de retorno concreto (não apenas registro), que
  T29/T30 refletem trabalho de fato realizado (`./init.sh` verde,
  rastreabilidade existente e atualizada), e reconfirmou sem nova
  verificação exaustiva os pontos já validados na rodada anterior
  (R1–R9, R12–R13, R15–R27, `off` estritamente aditivo, mock completo de
  `electron`, contratos `ipcDataClient.js` espelhando `localDataClient.js`,
  `onPedidosChange`/`kds:pedidos-changed` funcional). `./init.sh` verde
  (189/189 testes, 14 arquivos, sem regressão em nenhuma feature 1–13).
  Veredito `APPROVED` (`progress/review_feature-14.md`).
- **Checklist de verificação manual pendente (Nível 3, fora do escopo
  automatizável — depende de runtime real do Electron, sessão real do
  WhatsApp Web, credenciais reais de API e rede externa), a ser executado
  pelo usuário humano:**
  1. Colocar um `cardapio.json` válido e, opcionalmente, um `config.json`
     com chaves de API reais em `app.getPath("userData")` (ou preencher
     via painel de configuração após o primeiro `npm run dev`).
  2. Rodar `npm run dev` e confirmar que a janela do Electron abre sem
     erros no console principal (DevTools).
  3. Confirmar que um QR Code real aparece nos logs/evento `"qr"` (sem UI
     dedicada — fora do escopo desta feature) e escaneá-lo com um WhatsApp
     real.
  4. Abrir o painel de configuração (feature-12) dentro da janela Electron
     e confirmar que carrega o cardápio/configuração reais via IPC (não a
     implementação local) e que salvar a configuração persiste de fato em
     `config.json`.
  5. Abrir o painel KDS (feature-13) e confirmar que a listagem de pedidos
     ativos aparece com tempo de espera calculado, e que o indicador de
     conexão do WhatsApp reflete o status real.
  6. Enviar uma mensagem de texto real via WhatsApp para o número
     conectado, confirmar que uma resposta real gerada pela IA chega de
     volta ao remetente, sem qualquer intervenção manual no processo.
  7. Fechar um pedido através da conversa real (fluxo completo até
     `pedidoRegistrado: true`) e confirmar que o painel KDS aberto
     atualiza a lista de pedidos automaticamente, sem recarregar a página
     (validação de R9/R18).
  8. No painel KDS, alterar o status de um pedido e atribuir um motoboy, e
     confirmar que a mudança persiste no banco real e é refletida
     imediatamente na UI.
  9. Desconectar a sessão do WhatsApp (ex.: remover o aparelho conectado
     pelo celular) e confirmar que o indicador de conexão do painel KDS
     muda para "desconectado" em tempo real, sem recarregar a página
     (validação de R19).
- **Cierre:** feature-14 marcada `done` em `feature_list.json`. Todas as
  14 features `sdd: true` do backlog agora `done`, exceto feature-8
  (`pending`).
