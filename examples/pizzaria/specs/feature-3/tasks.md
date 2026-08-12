# Tasks — feature-3: Conexão WhatsApp e Fila de Mensagens Sequencial

- [x] T1 — Criar `src/whatsapp/errors.js` com `WhatsAppError` e
      `AuthenticationError`.
      Cobre: R3.

- [x] T2 — Criar `src/whatsapp/adapter.js` documentando (JSDoc) o
      contrato mínimo de adapter (`on(evento, callback)`,
      `initialize()`, `sendMessage(clienteId, texto)`; eventos `"qr"`,
      `"ready"`, `"auth_failure"`, `"message"`).
      Cobre: R1.

- [x] T3 — Criar `src/whatsapp/queue.js` com `createMessageQueue({
      minDelayMs, maxDelayMs, processFn })`: fila FIFO em memória
      (array), `enqueue(mensagem)` que adiciona ao fim e dispara o loop
      de processamento se ele ainda não estiver ativo (flag
      `_processing`), loop `while`/`await` que processa um item por vez,
      captura exceções de `processFn` emitindo evento `"error"` sem
      interromper o loop, e aguarda um delay aleatório entre
      `minDelayMs` e `maxDelayMs` entre itens consecutivos.
      Cobre: R4, R5, R6, R7.

- [x] T4 — Adicionar `findSessaoByClienteId(db, clienteId)` em
      `src/db/sessoes.js` (leitura simétrica ao `upsertSessao`
      existente, filtrando estritamente por `cliente_id`; retorna
      `null` se não houver sessão) e reexportar de `src/db/index.js`.
      Cobre: R8, R9, R10.

- [x] T5 — Criar `src/whatsapp/client.js` com `createWhatsAppClient(
      adapter, { db, minDelayMs, maxDelayMs })`: inscreve-se nos
      eventos do `adapter` (`"qr"`, `"auth_failure"`, `"message"`),
      repassa `"qr"` para o evento público `"qr"`; em `"auth_failure"`,
      emite evento de erro com `AuthenticationError`; em `"message"`,
      enfileira a mensagem em uma `MessageQueue` interna cujo
      `processFn` busca a sessão do `clienteId` via
      `findSessaoByClienteId` (histórico vazio se ausente) e emite
      `"message-processed"` com `{ clienteId, texto, historico }`.
      Cobre: R1, R2, R3, R8, R9, R10, R11.

- [x] T6 — Criar `src/whatsapp/index.js` reexportando
      `createWhatsAppClient`, `createMessageQueue` e as classes de
      `src/whatsapp/errors.js`, como superfície pública única do
      domínio.
      Cobre: R1, R4.

- [x] T7 — Escrever em `tests/whatsapp-queue.test.js` (Vitest): teste
      que cria um adapter dublê (`EventEmitter` simples controlado pelo
      teste), dispara `"qr"` com uma string de QR Code e verifica que o
      `WhatsAppClient` repassa exatamente essa string no evento público
      `"qr"`.
      Cobre: R2.

- [x] T8 — Adicionar em `tests/whatsapp-queue.test.js`: teste que
      dispara `"auth_failure"` no adapter dublê e verifica que o
      `WhatsAppClient` emite um evento de erro contendo uma instância
      de `AuthenticationError`, sem lançar exceção não tratada nem
      encerrar o cliente.
      Cobre: R3.

- [x] T9 — Adicionar em `tests/whatsapp-queue.test.js`: teste de
      `MessageQueue` isolada (`createMessageQueue`) que enfileira três
      mensagens de uma vez e verifica, via `processFn` instrumentado,
      que elas são processadas exatamente na ordem em que foram
      enfileiradas e nunca duas simultaneamente (ex.: usando uma flag
      "em processamento" dentro do `processFn` de teste que falha se
      for chamado enquanto já está `true`).
      Cobre: R4, R5.

- [x] T10 — Adicionar em `tests/whatsapp-queue.test.js`: teste que
      configura `minDelayMs`/`maxDelayMs` baixos (ex.: `5`/`10` ms) e
      mede, com `Date.now()` ou `performance.now()`, que existe um
      intervalo mensurável (>= `minDelayMs`, com tolerância) entre o
      término do processamento de um item e o início do processamento
      do item seguinte.
      Cobre: R6.

- [x] T11 — Adicionar em `tests/whatsapp-queue.test.js`: teste em que
      `processFn` lança uma exceção para o primeiro item enfileirado e
      verifica que (a) o evento `"error"` da fila é emitido com essa
      exceção e (b) o segundo e o terceiro itens enfileirados ainda são
      processados normalmente, na ordem correta.
      Cobre: R7.

- [x] T12 — Adicionar em `tests/whatsapp-queue.test.js` (usando
      `openDatabase` de `src/db/index.js` sobre um arquivo temporário
      real via `fs.mkdtempSync(os.tmpdir())`, limpo em `afterEach`):
      teste que cria um cliente e uma sessão prévia via `upsertSessao`,
      dispara uma mensagem `"message"` no adapter dublê para esse
      `clienteId` e verifica, no evento `"message-processed"`, que
      `historico` corresponde exatamente ao salvo previamente.
      Cobre: R8.

- [x] T13 — Adicionar em `tests/whatsapp-queue.test.js`: teste que
      dispara uma mensagem `"message"` para um `clienteId` sem nenhuma
      sessão prévia em `sessoes` e verifica que o evento
      `"message-processed"` reporta histórico vazio/nulo, sem lançar
      exceção.
      Cobre: R9.

- [x] T14 — Adicionar em `tests/whatsapp-queue.test.js`: teste que cria
      duas sessões prévias distintas (`clienteA`, `clienteB`) com
      históricos diferentes, dispara mensagens para ambos e verifica
      que cada evento `"message-processed"` reporta apenas o histórico
      do seu próprio `clienteId`, nunca o do outro.
      Cobre: R10.

- [x] T15 — Adicionar em `tests/whatsapp-queue.test.js`: teste que
      intercala mensagens de dois `clienteId` distintos na fila (ex.:
      A1, B1, A2, B2) e verifica que a ordem de processamento observada
      preserva tanto a ordem FIFO global quanto a ordem relativa das
      mensagens de cada cliente individualmente.
      Cobre: R11.

- [x] T16 — Executar `npm test` e `./init.sh`; documentar a tabela de
      rastreabilidade R1–R11 → nome do teste em
      `progress/impl_feature-3.md` (a cargo do implementer, não deste
      spec).
      Cobre: R1–R11 (verificação final).
