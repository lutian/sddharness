# Implementação — feature-3: Conexão WhatsApp e Fila de Mensagens Sequencial

## Arquivos criados/alterados

- `src/whatsapp/errors.js` — `WhatsAppError`, `AuthenticationError` (novo).
- `src/whatsapp/adapter.js` — contrato JSDoc do adapter injetável (novo).
- `src/whatsapp/queue.js` — `createMessageQueue`: fila FIFO em memória, loop
  `while`/`await` sequencial guardado por flag `_processing`, delay
  humanizado entre itens, eventos `"processed"`/`"error"` (novo).
- `src/whatsapp/client.js` — `createWhatsAppClient(adapter, options)`:
  orquestra adapter + `MessageQueue` interna + isolamento de sessão por
  `clienteId` (novo).
- `src/whatsapp/index.js` — superfície pública do domínio (novo).
- `src/db/sessoes.js` — `findSessaoByClienteId(db, clienteId)` adicionada
  (leitura simétrica a `upsertSessao`, retorna `null` se ausente).
- `src/db/index.js` — reexporta `findSessaoByClienteId`.
- `tests/whatsapp-queue.test.js` — 9 testes cobrindo R2–R11 (novo).
- `specs/feature-3/tasks.md` — todas as T1–T16 marcadas `[x]`.

## Execução

- `npx vitest run tests/whatsapp-queue.test.js` → 9/9 passam.
- `./init.sh` → ambiente OK, 31/31 testes passam em todo o repositório
  (`config-menu.test.js`, `database.test.js`, `whatsapp-queue.test.js`).

## Rastreabilidade R<n> → teste

| Requirement | Verificado por (descrição do teste em `tests/whatsapp-queue.test.js`) |
|---|---|
| R1 | Implementação: `createWhatsAppClient(adapter)` em `src/whatsapp/client.js`, exercitada por todos os testes de `WhatsAppClient` abaixo (sem importar biblioteca concreta). |
| R2 | "repassa exatamente a string de QR Code recebida do adapter para o evento público 'qr'" |
| R3 | "emite um evento de erro com AuthenticationError quando o adapter reporta falha de autenticação, sem lançar exceção não tratada" |
| R4 | "processa três mensagens enfileiradas de uma vez, exatamente na ordem de chegada e nunca duas simultaneamente" (enfileiramento) |
| R5 | "processa três mensagens enfileiradas de uma vez, exatamente na ordem de chegada e nunca duas simultaneamente" (flag `emProcessamento` falha se chamado concorrentemente) |
| R6 | "aguarda um intervalo mensurável (delay humanizado) entre o fim do processamento de um item e o início do seguinte" |
| R7 | "continua processando os itens seguintes quando processFn lança exceção no primeiro item, reportando o erro via evento 'error'" |
| R8 | "recupera o histórico salvo em `sessoes` para um clienteId com sessão prévia" |
| R9 | "trata um clienteId sem sessão prévia como histórico vazio, sem lançar exceção" |
| R10 | "isola o histórico entre dois clienteId distintos: cada mensagem processada reporta apenas o próprio histórico" |
| R11 | "preserva a ordem FIFO global e a ordem relativa por clienteId ao intercalar mensagens de dois clientes" |

## Observações

- Nenhum arquivo fora de `src/whatsapp/`, `src/db/sessoes.js`,
  `src/db/index.js` e `tests/whatsapp-queue.test.js` foi tocado, conforme
  `design.md` (a exceção em `src/db/sessoes.js`/`index.js` está justificada
  no próprio design como leitura simétrica ao `upsertSessao` existente).
- Nenhuma biblioteca concreta de automação do WhatsApp Web foi adicionada
  — a integração real fica para uma feature futura com um adapter
  concreto, conforme decisão registrada em `design.md`.
- Status da feature em `feature_list.json` permanece `in_progress`; a
  transição para `done` é responsabilidade do reviewer/leader após
  aprovação.
