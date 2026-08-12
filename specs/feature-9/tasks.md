# Tasks — feature-9: Integração Real com WhatsApp Web

- [x] T1 — Adicionar `whatsapp-web.js` em `dependencies` de
      `package.json` (`npm install whatsapp-web.js`).
      Cobre: R1.

- [x] T2 — Criar `src/whatsapp/adapters/whatsapp-web-js.js` com
      `createWhatsAppWebJsAdapter({ dataPath, puppeteerOptions })`:
      instancia `new Client({ authStrategy: new LocalAuth({ dataPath }),
      puppeteer: puppeteerOptions })` de `whatsapp-web.js` (import
      nomeado `{ Client, LocalAuth }`), mantém um `EventEmitter` interno
      (`node:events`) e expõe apenas `on(evento, callback)`,
      `initialize()`, `sendMessage(clienteId, texto)`, satisfazendo
      integralmente o contrato de `src/whatsapp/adapter.js`.
      Cobre: R1, R2.

- [x] T3 — Em `whatsapp-web-js.js`, assinar `client.on("qr", ...)` da
      lib e reemitir `"qr"` com a mesma string recebida, sem alteração.
      Cobre: R3.

- [x] T4 — Em `whatsapp-web-js.js`, assinar `client.on("auth_failure",
      ...)` da lib e reemitir `"auth_failure"` repassando o motivo
      recebido, sem lançar exceção não tratada.
      Cobre: R4.

- [x] T5 — Em `whatsapp-web-js.js`, assinar `client.on("ready", ...)` da
      lib, marcar a flag interna de sessão pronta como `true` e reemitir
      `"ready"`.
      Cobre: R5.

- [x] T6 — Em `whatsapp-web-js.js`, assinar `client.on("disconnected",
      ...)` da lib, marcar a flag interna de sessão pronta como `false`
      e reemitir `"disconnected"`.
      Cobre: R6.

- [x] T7 — Em `whatsapp-web-js.js`, assinar `client.on("message", ...)`
      da lib, extrair `clienteId` de `mensagemNativa.from` (removendo o
      sufixo `@c.us`) e `texto` de `mensagemNativa.body`, e reemitir
      `"message"` com `{ clienteId, texto }`.
      Cobre: R7.

- [x] T8 — Implementar `initialize()` delegando a `client.initialize()`
      da lib e propagando (não engolindo) qualquer rejeição/erro
      síncrono levantado por ela.
      Cobre: R8.

- [x] T9 — Implementar `sendMessage(clienteId, texto)`: SE a flag interna
      de sessão pronta for `false`, rejeitar imediatamente com
      `new WhatsAppError(...)` sem chamar a lib (R10); CASO CONTRÁRIO,
      resolver `clienteId` para `` `${clienteId}@c.us` `` (quando ainda
      não tiver o sufixo) e delegar a `client.sendMessage(chatId,
      texto)`, retornando a Promise resultante (R9).
      Cobre: R9, R10.

- [x] T10 — Atualizar `src/whatsapp/index.js` para reexportar
      `createWhatsAppWebJsAdapter` de
      `./adapters/whatsapp-web-js.js`, junto aos exports já existentes,
      sem remover nenhum export atual.
      Cobre: R1.

- [x] T11 — Confirmar (revisão manual do implementer, sem alterar
      `client.js`/`queue.js`/`errors.js`) que nenhum arquivo de
      `src/whatsapp/` fora de `adapters/whatsapp-web-js.js` importa
      `whatsapp-web.js` direta ou indiretamente.
      Cobre: R11.

- [x] T12 — Criar `tests/whatsapp-adapter-real.test.js` (Vitest) com
      `vi.mock("whatsapp-web.js", ...)` no topo do arquivo, substituindo
      `Client` (por uma `FakeClient extends EventEmitter` com
      `initialize()`/`sendMessage()` espiáveis via `vi.fn`/`vi.spyOn`) e
      `LocalAuth` (dublê simples). Adicionar teste que verifica que
      `createWhatsAppWebJsAdapter({ dataPath, puppeteerOptions })`
      instancia `Client` com `authStrategy` sendo uma instância de
      `LocalAuth` construída com `{ dataPath }` e `puppeteer:
      puppeteerOptions`.
      Cobre: R1, R2.

- [x] T13 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      dispara `fakeClient.emit("qr", "QR-STRING")` e verifica que o
      adapter emite `"qr"` com exatamente `"QR-STRING"`.
      Cobre: R3.

- [x] T14 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      dispara `fakeClient.emit("auth_failure", "motivo-x")` e verifica
      que o adapter emite `"auth_failure"` com `"motivo-x"`, sem lançar
      exceção não tratada no processo de teste.
      Cobre: R4.

- [x] T15 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      dispara `fakeClient.emit("ready")` e verifica que o adapter emite
      `"ready"`.
      Cobre: R5.

- [x] T16 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      dispara `fakeClient.emit("disconnected", "MOTIVO")` e verifica que
      o adapter emite `"disconnected"`.
      Cobre: R6.

- [x] T17 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      dispara `fakeClient.emit("message", { from: "5511999999999@c.us",
      body: "oi" })` e verifica que o adapter emite `"message"` com
      `{ clienteId: "5511999999999", texto: "oi" }`.
      Cobre: R7.

- [x] T18 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      chama `adapter.initialize()` e verifica que `fakeClient.initialize`
      foi chamado; outro teste em que `fakeClient.initialize` (via
      `vi.fn().mockRejectedValue(...)`) rejeita, verificando que
      `adapter.initialize()` propaga essa rejeição.
      Cobre: R8.

- [x] T19 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      emite `"ready"` no `fakeClient`, chama
      `adapter.sendMessage("5511999999999", "oi")` e verifica que
      `fakeClient.sendMessage` foi chamado com
      `("5511999999999@c.us", "oi")`.
      Cobre: R9.

- [x] T20 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      chama `adapter.sendMessage("5511999999999", "oi")` **sem** emitir
      `"ready"` antes, e verifica que a Promise retornada rejeita com uma
      instância de `WhatsAppError` e que `fakeClient.sendMessage` NÃO foi
      chamado.
      Cobre: R10.

- [x] T21 — Adicionar em `tests/whatsapp-adapter-real.test.js`: teste que
      lê via `fs.readFileSync` o conteúdo-fonte de
      `src/whatsapp/client.js`, `src/whatsapp/queue.js` e
      `src/whatsapp/index.js` (excluindo a linha de reexport do próprio
      `index.js` que referencia `./adapters/whatsapp-web-js.js`) e
      verifica que a string literal `"whatsapp-web.js"` não aparece
      nesses três arquivos.
      Cobre: R11.

- [x] T22 — Executar `npm test` e `./init.sh` (garantindo que
      `tests/whatsapp-queue.test.js`, de feature-3, continua passando sem
      nenhuma alteração); documentar a tabela de rastreabilidade
      R1–R11 → nome do teste em `progress/impl_feature-9.md` (a cargo do
      implementer, não deste spec).
      Cobre: R1–R11 (verificação final).
