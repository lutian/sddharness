# Tasks — feature-14: Processo Principal Electron (Composition Root)

> O `implementer` marca `[x]` cada task ao completá-la. Nenhuma task desta
> lista modifica `src/db/pedidos.js`, `src/ai/conversationEngine.js`,
> `src/menu/*`, `src/delivery/geocoding.js`/`painelPedidos.js`,
> `src/whatsapp/queue.js`/`adapter.js`/`adapters/whatsapp-web-js.js`, nem
> `ConfigPanel.jsx`/`KdsPanel.jsx` e seus subcomponentes.

## Dependências e empacotamento

- [x] T1 — Adicionar `"electron"` em `devDependencies` e o campo `"main":
      "electron/main.js"` em `package.json`. Cobre: R25.

## `src/whatsapp/client.js` (mudança aditiva mínima)

- [x] T2 — Adicionar `off: (evento, callback) => emitter.off(evento,
      callback)` ao objeto retornado por `createWhatsAppClient`, sem
      alterar nenhuma outra chave/comportamento existente. Cobre: R22.
- [x] T3 — Adicionar teste em `tests/whatsapp-queue.test.js` (ou em um
      novo bloco `describe` no mesmo arquivo) `"remove um listener
      registrado via off sem afetar outros listeners do mesmo evento"`,
      registrando dois callbacks em `"connection-status-changed"`,
      removendo um via `off` e verificando que só o outro é chamado na
      emissão seguinte. Cobre: R23.

## `electron/main.js` — composition root

- [x] T4 — Criar `electron/main.js` com `resolvePaths()` (cardápio,
      config, sessão do WhatsApp dentro de `app.getPath("userData")`).
      Cobre: R1 (pré-requisito).
- [x] T5 — Implementar `buildDependencies()`: `openDatabase()`,
      `loadConfig`/`loadCardapio`, os cinco adapters de IA
      (`createOpenAiChatClient`, `createDeepSeekChatClient`,
      `createOpenAiClient`, `createHttpMediaFetcher`, `createPdfConverter`),
      `createNominatimGeocoder`, `createWhatsAppWebJsAdapter` +
      `createWhatsAppClient`. Cobre: R1, R2, R3, R4.
- [x] T6 — Implementar `createMainWindow()` (instancia `BrowserWindow` com
      `webPreferences.preload` apontando para `electron/preload.js`).
      Cobre: pré-requisito de R18/R19 (janela para `webContents.send`).
- [x] T7 — Implementar `registerIpcHandlers(deps, mainWindow)` com os sete
      canais `"config:load-cardapio"`, `"config:load-config"`,
      `"config:save-config"`, `"kds:listar-pedidos-ativos"`,
      `"kds:atualizar-status-pedido"`, `"kds:atribuir-motoboy"`,
      `"kds:status-conexao-whatsapp"`, e a função interna
      `notificarPedidosMudaram` que publica em `"kds:pedidos-changed"`.
      Cobre: R10, R11, R12, R14, R15, R16, R17, R18.
- [x] T8 — Dentro de `registerIpcHandlers`, assinar
      `whatsappClient.on("connection-status-changed", ...)` e repassar via
      `mainWindow.webContents.send("kds:connection-status-changed", status)`.
      Cobre: R19.
- [x] T9 — Implementar `wireConversationFlow(deps, { onError })`: assina
      `"message-processed"`, chama `processarMensagemConversa`, em seguida
      `whatsappClient.sendMessage`, aciona `deps.onPedidosMudaram()` quando
      `pedidoRegistrado === true`, e captura/reporta erros via `onError`
      sem deixar rejeição não tratada. Cobre: R6, R7, R8, R9.
- [x] T10 — Implementar `startApp()` orquestrando T5–T9 (nessa ordem) e
      chamando `whatsappClient.initialize()` ao final; adicionar
      `app.whenReady().then(() => startApp())` no topo do módulo. Cobre:
      R5, R26.

## `electron/preload.js`

- [x] T11 — Criar `electron/preload.js` com `contextBridge.exposeInMainWorld(
      "electronAPI", { invoke, on })`, validando `canal` contra as listas
      `CANAIS_PERMITIDOS`/`CANAIS_DE_EVENTO_PERMITIDOS` antes de encaminhar
      a `ipcRenderer`, e retornando uma função de cancelamento real em
      `on` (`ipcRenderer.removeListener`). Cobre: R24.

## `ipcDataClient.js` das duas UIs

- [x] T12 — Criar `src/ui/panels/config/ipcDataClient.js` com
      `createIpcDataClient()` implementando `loadCardapio`/`loadConfig`/
      `saveConfig` via `window.electronAPI.invoke` nos três canais
      `"config:*"` de T7, sem alterar `ConfigPanel.jsx`. Cobre: R13.
- [x] T13 — Criar `src/ui/panels/kds/ipcDataClient.js` com
      `createIpcDataClient()` implementando `listarPedidosAtivos`/
      `atualizarStatusPedido`/`atribuirMotoboy`/`getStatusConexaoWhatsApp`
      via `window.electronAPI.invoke` e `onPedidosChange`/
      `onConnectionStatusChange` via `window.electronAPI.on`, retornando a
      função de cancelamento real recebida de `window.electronAPI.on`, sem
      alterar `KdsPanel.jsx`. Cobre: R20, R21.

## Testes de `electron/main.js` (isolando o runtime Electron real)

- [x] T14 — Criar `tests/electron-main.test.js` com `vi.mock("electron",
      ...)` (dublês de `app`, `BrowserWindow`, `ipcMain`, `contextBridge`,
      `ipcRenderer`, `session`) e `vi.mock` para `src/db/index.js`,
      `src/whatsapp/index.js`, `src/ai/index.js`, `src/delivery/index.js`,
      `src/menu/index.js`, garantindo que `app.whenReady()` mockado nunca
      resolve sozinho (efeito de topo neutralizado nos testes). Cobre: R27
      (pré-requisito de todos os testes abaixo).
- [x] T15 — Adicionar teste `"buildDependencies monta db, config,
      cardápio, adapters de IA, geocoder e cliente WhatsApp na ordem
      esperada"`, verificando a sequência de chamadas aos dublês. Cobre:
      R1, R2, R3, R4.
- [x] T16 — Adicionar teste `"startApp chama whatsappClient.initialize()
      após montar as dependências"`. Cobre: R5.
- [x] T17 — Adicionar teste `"uma mensagem processada aciona o motor de
      conversação e envia a resposta de volta ao cliente"`, disparando
      manualmente o handler de `"message-processed"` e verificando a
      chamada a `processarMensagemConversa` e a
      `whatsappClient.sendMessage`. Cobre: R6, R7.
- [x] T18 — Adicionar teste `"um erro no motor de conversação é reportado
      via callback de erro, sem derrubar o processo"`, configurando
      `processarMensagemConversa` para rejeitar. Cobre: R8.
- [x] T19 — Adicionar teste `"quando um pedido é registrado, o painel KDS
      é notificado da mudança via kds:pedidos-changed"`, configurando
      `processarMensagemConversa` para resolver com `pedidoRegistrado:
      true` e verificando `mainWindow.webContents.send`. Cobre: R9, R18.
- [x] T20 — Adicionar teste `"registerIpcHandlers registra os sete canais
      IPC esperados"`, verificando cada chamada a `ipcMain.handle` com o
      nome de canal certo. Cobre: R10, R11, R12, R14, R15, R16, R17.
- [x] T21 — Adicionar teste `"o handler kds:atualizar-status-pedido
      atualiza o status e notifica a mudança de pedidos"` e
      `"o handler kds:atribuir-motoboy atribui o motoboy e notifica a
      mudança de pedidos"`, invocando os handlers capturados diretamente.
      Cobre: R15, R16, R18.
- [x] T22 — Adicionar teste `"uma mudança de status de conexão do WhatsApp
      é repassada ao painel KDS via kds:connection-status-changed"`,
      disparando o listener capturado em `whatsappClient.on`. Cobre: R19.
- [x] T23 — Adicionar teste `"config:save-config propaga o erro de
      validação lançado por saveConfig sem engoli-lo"`, configurando
      `saveConfig` mockado para lançar e verificando a rejeição do
      handler. Cobre: R12.
- [x] T24 — Adicionar teste `"o ipcDataClient do painel de configuração
      delega loadCardapio/loadConfig/saveConfig aos canais IPC certos"`,
      stubando `window.electronAPI`. Cobre: R13.
- [x] T25 — Adicionar teste `"o ipcDataClient do painel KDS delega os
      métodos de leitura/escrita aos canais IPC certos e retorna
      cancelamento real em onPedidosChange/onConnectionStatusChange"`,
      stubando `window.electronAPI` (incluindo o retorno de
      `removeListener` de `on`) e verificando que a função de cancelamento
      devolvida é de fato a recebida de `window.electronAPI.on`. Cobre:
      R20, R21.
- [x] T26 — Adicionar teste `"preload expõe apenas invoke/on e rejeita
      canais fora da lista permitida"`, verificando
      `contextBridge.exposeInMainWorld` e o comportamento de `invoke`/`on`
      para um canal inventado. Cobre: R24.
- [x] T27 — Adicionar teste `"package.json declara electron como
      devDependency e o campo main aponta para electron/main.js"`, lendo
      `package.json` via `fs.readFileSync`. Cobre: R25.
- [x] T28 — Adicionar teste `"as funções de composição são exportadas
      individualmente e chamáveis sem abrir uma janela Electron real"`
      (asserção de que `resolvePaths`, `buildDependencies`,
      `registerIpcHandlers`, `wireConversationFlow`, `createMainWindow`,
      `startApp` são funções exportadas de `electron/main.js`). Cobre:
      R26.

## Fechamento

- [x] T29 — Rodar `./init.sh` e confirmar 100% dos testes verdes,
      incluindo os de feature-1 a feature-13 (sem regressão, em especial
      `tests/whatsapp-queue.test.js` e
      `tests/whatsapp-adapter-real.test.js` após a mudança aditiva de T2).
      Cobre: R1–R27 (verificação de conjunto).
- [x] T30 — Documentar a rastreabilidade R↔teste em
      `progress/impl_feature-14.md` e registrar o checklist de verificação
      manual (design.md, "Fora do escopo automatizável") como pendência
      explícita para o humano, antes de marcar a feature como `done`.
      Cobre: R1–R27 (documentação de rastreabilidade).
