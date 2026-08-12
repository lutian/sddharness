# Design — feature-14: Processo Principal Electron (Composition Root)

## Contexto

Todas as peças já existem e já são `done`: banco (feature-1), WhatsApp real
(feature-3/9), IA/geocoding reais (feature-4/5/6/10), UIs React
(feature-11/12/13). Nenhuma delas conhece as outras — cada domínio expõe
apenas seu `index.js` e recebe dependências por injeção (`openDatabase`,
`createWhatsAppClient(adapter, { db })`, `processarMensagemConversa({ db,
adapters, config, cardapio, ... })`, `dataClient` das UIs). Esta feature é
o único lugar do repositório que conhece todos os domínios ao mesmo tempo
e os liga — por isso vive fora de `src/`, em `electron/`, conforme
`docs/architecture.md` ("`electron/main.js` — inicialização do app, janela,
registro de canais IPC").

## Arquivos a criar / tocar

```
electron/
├── main.js                          # NOVO — composition root (ver abaixo)
└── preload.js                        # NOVO — contextBridge, API restrita (R24)

src/ui/panels/config/
└── ipcDataClient.js                  # NOVO — dataClient real via IPC (R13)

src/ui/panels/kds/
└── ipcDataClient.js                  # NOVO — dataClient real via IPC (R20, R21)

src/whatsapp/
└── client.js                         # MODIFICADO (aditivo) — adiciona `off` (R22, R23)

package.json                          # MODIFICADO — devDependency `electron`, campo `"main"` (R25)

tests/
└── electron-main.test.js             # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum outro arquivo de `src/db/`, `src/menu/`, `src/ai/`, `src/delivery/`,
`src/whatsapp/queue.js`, `src/whatsapp/adapter.js`,
`src/whatsapp/adapters/whatsapp-web-js.js`, `src/whatsapp/errors.js`, ou
dos componentes React (`ConfigPanel.jsx`, `KdsPanel.jsx` e seus
subcomponentes) é alterado — os contratos já aprovados nas features 1 a 13
permanecem intocados; esta feature apenas os instancia e liga.

## Decisão 1 — Dependência `electron` real

`package.json` já tinha um script órfão `"dev": "electron ."` mas nenhuma
dependência `electron` declarada e nenhum campo `"main"`. Esta feature
adiciona:

```json
"devDependencies": {
  "electron": "^33.0.0"
}
```

e

```json
"main": "electron/main.js"
```

**Por que `devDependency`, não `dependency`:** o binário do Electron
(~200MB, contém um Chromium/Node empacotados) nunca é instalado como
dependência de runtime de um app Electron empacotado — o instalador final
(`feature-8`, `electron-builder`/`electron-forge`) baixa/empacota o
binário do Electron separadamente como parte do processo de build, não via
`npm install` em produção. Esta é a convenção padrão do ecossistema
Electron (documentada no próprio guia oficial "Application Distribution").
`npm run dev` (`electron .`) usa o binário instalado localmente via
`devDependencies` durante o desenvolvimento.

### Alternativa descartada: declarar `electron` em `dependencies`

Descartada porque infla o pacote publicado/instalado por `npm install` em
todo ambiente (incluindo CI, que só roda testes Vitest em Node puro, nunca
abre o Electron de verdade) sem nenhum benefício — nenhum código de
produção desta aplicação faz `require("electron")` fora de
`electron/main.js`/`electron/preload.js` e do fallback opcional já
existente em `src/db/index.js` (`resolveUserDataPath`, que já usa
`try/catch` em torno de `require("electron")`, tolerando a ausência do
pacote fora do processo Electron — comportamento preservado, ver Decisão
5).

## Decisão 2 — Estrutura do composition root (`electron/main.js`)

`electron/main.js` é dividido em funções puras/compostas, exportadas
nomeadamente, para que `tests/electron-main.test.js` possa invocá-las
individualmente sem depender do ciclo de vida real do app Electron (R26):

```javascript
// electron/main.js
import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";

import { openDatabase, updateStatusPedido, atribuirMotoboy } from "../src/db/index.js";
import {
  createWhatsAppWebJsAdapter,
  createWhatsAppClient,
} from "../src/whatsapp/index.js";
import {
  createOpenAiChatClient,
  createDeepSeekChatClient,
  createOpenAiClient,
  createHttpMediaFetcher,
  createPdfConverter,
  processarMensagemConversa,
} from "../src/ai/index.js";
import {
  createNominatimGeocoder,
  listarPedidosAtivosComTempoEspera,
} from "../src/delivery/index.js";
import { loadCardapio, loadConfig, saveConfig } from "../src/menu/index.js";

// Coordenadas fixas da pizzaria (origem para cálculo de distância/tempo de
// espera). Ver "Fora do escopo" — tornar isso configurável via painel é
// responsabilidade de uma feature futura.
const ORIGEM_PADRAO = { latitude: -23.5505, longitude: -46.6333 };

export function resolvePaths() {
  const userDataPath = app.getPath("userData");
  return {
    cardapioPath: join(userDataPath, "cardapio.json"),
    configPath: join(userDataPath, "config.json"),
    whatsappSessionPath: join(userDataPath, "whatsapp-session"),
  };
}

export function buildDependencies({ paths } = {}) {
  const resolvedPaths = paths ?? resolvePaths();
  const db = openDatabase();
  const config = loadConfig(resolvedPaths.configPath);
  const cardapio = loadCardapio(resolvedPaths.cardapioPath);

  const adapters = {
    openai: createOpenAiChatClient({ apiKey: config.apiKeys.openai }),
    deepseek: createDeepSeekChatClient({ apiKey: config.apiKeys.deepseek }),
  };
  const aiClient = createOpenAiClient({ apiKey: config.apiKeys.openai });
  const mediaFetcher = createHttpMediaFetcher();
  const pdfConverter = createPdfConverter();
  const geocoder = createNominatimGeocoder();

  const whatsappAdapter = createWhatsAppWebJsAdapter({
    dataPath: resolvedPaths.whatsappSessionPath,
  });
  const whatsappClient = createWhatsAppClient(whatsappAdapter, { db });

  return {
    db, config, cardapio, paths: resolvedPaths,
    adapters, aiClient, mediaFetcher, pdfConverter, geocoder,
    whatsappClient, origem: ORIGEM_PADRAO,
  };
}

export function registerIpcHandlers(deps, mainWindow) {
  const notificarPedidosMudaram = () => {
    const pedidos = listarPedidosAtivosComTempoEspera({ db: deps.db, origem: deps.origem });
    mainWindow.webContents.send("kds:pedidos-changed", pedidos);
  };

  ipcMain.handle("config:load-cardapio", () => loadCardapio(deps.paths.cardapioPath));
  ipcMain.handle("config:load-config", () => loadConfig(deps.paths.configPath));
  ipcMain.handle("config:save-config", (_event, config) =>
    saveConfig(deps.paths.configPath, config)
  );

  ipcMain.handle("kds:listar-pedidos-ativos", () =>
    listarPedidosAtivosComTempoEspera({ db: deps.db, origem: deps.origem })
  );
  ipcMain.handle("kds:atualizar-status-pedido", (_event, id, novoStatus) => {
    const pedido = updateStatusPedido(deps.db, id, novoStatus);
    notificarPedidosMudaram();
    return pedido;
  });
  ipcMain.handle("kds:atribuir-motoboy", (_event, id, motoboy) => {
    const pedido = atribuirMotoboy(deps.db, id, motoboy);
    notificarPedidosMudaram();
    return pedido;
  });
  ipcMain.handle("kds:status-conexao-whatsapp", () => deps.whatsappClient.getConnectionStatus());

  deps.whatsappClient.on("connection-status-changed", (status) => {
    mainWindow.webContents.send("kds:connection-status-changed", status);
  });

  return { notificarPedidosMudaram };
}

export function wireConversationFlow(deps, { onError } = {}) {
  const reportarErro = onError ?? (() => {});

  deps.whatsappClient.on("message-processed", async ({ clienteId, texto }) => {
    try {
      const resultado = await processarMensagemConversa({
        db: deps.db,
        clienteId,
        mensagemCliente: texto,
        adapters: deps.adapters,
        config: deps.config,
        cardapio: deps.cardapio,
      });

      await deps.whatsappClient.sendMessage(clienteId, resultado.resposta);

      if (resultado.pedidoRegistrado) {
        deps.onPedidosMudaram?.();
      }
    } catch (erro) {
      reportarErro(erro);
    }
  });
}

export function createMainWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: { preload: join(import.meta.dirname, "preload.js") },
  });
  return mainWindow;
}

export async function startApp() {
  const deps = buildDependencies();
  const mainWindow = createMainWindow();
  const { notificarPedidosMudaram } = registerIpcHandlers(deps, mainWindow);
  deps.onPedidosMudaram = notificarPedidosMudaram;

  wireConversationFlow(deps, {
    onError: (erro) => mainWindow.webContents.send("app:error", { message: erro.message }),
  });

  await deps.whatsappClient.initialize();

  return { deps, mainWindow };
}

app.whenReady().then(() => startApp());
```

Cada função (`resolvePaths`, `buildDependencies`, `registerIpcHandlers`,
`wireConversationFlow`, `createMainWindow`, `startApp`) é exportada
nomeadamente e testável isoladamente injetando `deps`/`mainWindow` fakes
(R26). A chamada de topo `app.whenReady().then(() => startApp())` é segura
mesmo durante os testes porque `electron` inteiro é mockado (Decisão 6): o
`app.whenReady()` mockado resolve com dependências e IO de rede/disco todos
também mockados via `vi.mock` nos módulos de domínio — nenhuma chamada
real ocorre.

## Decisão 3 — Resolver a limitação de `onPedidosChange` (feature-13)

A limitação documentada em `specs/feature-13/design.md` (Decisão 1) é que
não existe, em `src/db/*` nem `src/delivery/*`, uma fonte de eventos para
mudanças na tabela `pedidos`. Em vez de adicionar um `EventEmitter` dentro
de `src/db/pedidos.js` ou de `src/ai/conversationEngine.js` (o que exigiria
alterar dois módulos de features já `done`, feature-1 e feature-5, com
risco de regressão em `tests/database.test.js` e
`tests/conversation-engine.test.js`), a fonte de eventos é criada
inteiramente dentro do composition root (`electron/main.js`), que já
observa **todos os três pontos de mutação de pedidos** existentes na
aplicação:

1. **Fluxo de fechamento de pedido via WhatsApp**
   (`wireConversationFlow`): `processarMensagemConversa` já retorna
   `{ pedidoRegistrado: boolean }` (contrato já testado em
   `tests/conversation-engine.test.js`, feature-5) — o composition root
   usa esse retorno diretamente como sinal, sem precisar que
   `conversationEngine.js` emita nada (R9).
2. **`"kds:atualizar-status-pedido"`** (`registerIpcHandlers`): dispara a
   notificação logo após `updateStatusPedido` retornar com sucesso (R15).
3. **`"kds:atribuir-motoboy"`** (`registerIpcHandlers`): dispara a
   notificação logo após `atribuirMotoboy` retornar com sucesso (R16).

Os três pontos convergem para a mesma função `notificarPedidosMudaram`
(R18), que recalcula a listagem via `listarPedidosAtivosComTempoEspera` e
publica no canal `"kds:pedidos-changed"` via `webContents.send` — o mesmo
canal que `src/ui/panels/kds/ipcDataClient.js` assina em `onPedidosChange`
(R20). Isso dá "tempo real" de fato à assinatura, resolvendo a limitação
sem tocar em nenhum arquivo de feature-1 ou feature-5.

### Alternativa descartada: emitir o evento de dentro de `conversationEngine.js`/`pedidos.js`

Cogitada porque o enunciado desta tarefa cita esse caminho como exemplo.
Descartada em favor da alternativa acima porque: (1) o composition root já
tem informação suficiente (`pedidoRegistrado`, retorno de
`updateStatusPedido`/`atribuirMotoboy`) para saber exatamente quando uma
notificação é necessária, sem precisar que os módulos de domínio conheçam
o conceito de "notificar a UI" — que é uma preocupação de apresentação/IPC,
não de domínio (`docs/architecture.md`, princípio 1: camadas por domínio);
(2) evita qualquer alteração em `src/db/pedidos.js` e
`src/ai/conversationEngine.js`, reduzindo a superfície de regressão em
features já `done` e testadas (`tests/database.test.js`,
`tests/conversation-engine.test.js`) a zero; (3) mantém o padrão já usado
em toda a base: os domínios internos permanecem burros e reutilizáveis,
e é a camada de composição (aqui, `electron/main.js`) que decide como/
quando reagir a seus resultados — o mesmo raciocínio já documentado nas
features 12/13 para o `dataClient`.

## Decisão 4 — Resolver a limitação de `off` em `WhatsAppClient` (feature-3)

`specs/feature-13/design.md` (Decisão 1) documentou que a função de
cancelamento retornada por `onConnectionStatusChange` na implementação
local é um no-op porque `createWhatsAppClient` (feature-3/9, `done`) expõe
apenas `on(evento, callback)`, sem `off`/`removeListener`.

`src/whatsapp/client.js` ganha uma única linha aditiva no objeto
retornado:

```javascript
return {
  on: (evento, callback) => emitter.on(evento, callback),
  off: (evento, callback) => emitter.off(evento, callback),   // NOVO (R22, R23)
  initialize: () => adapter.initialize(),
  sendMessage: (clienteId, texto) => adapter.sendMessage(clienteId, texto),
  getConnectionStatus: () => connectionStatus,
};
```

`emitter` já é um `EventEmitter` nativo do Node (`node:events`), que já
expõe `off` nativamente — não é necessário nenhum código adicional além de
reexpor o método. Nenhuma chave existente do objeto retornado é removida
ou alterada; `tests/whatsapp-queue.test.js` e
`tests/whatsapp-adapter-real.test.js` (features 3 e 9, já `done`) não
fazem nenhuma asserção sobre o conjunto exato de chaves do objeto retornado
(nenhum `toEqual`/`toStrictEqual` no objeto inteiro), portanto continuam
passando sem modificação — verificado por leitura de ambos os arquivos
antes desta decisão.

`src/ui/panels/kds/ipcDataClient.js` não chama `whatsappClient.off`
diretamente (ele vive no renderer, sem acesso a `whatsappClient`); é
`electron/main.js`/`registerIpcHandlers` quem assina
`"connection-status-changed"` uma única vez com `deps.whatsappClient.on`
para repassar via `webContents.send` (R19) — o cancelamento real que
importa para R21 é o do **listener IPC no lado do renderer**
(`ipcRenderer.on("kds:connection-status-changed", handler)` /
`ipcRenderer.removeListener(...)`), não o do `whatsappClient.on` interno
do main process (que vive durante toda a vida do processo `main`, não por
janela). Ainda assim, `off` é adicionado a `WhatsAppClient` porque o
enunciado desta feature exige essa mudança aditiva especificamente, e ela
mantém a API do domínio simétrica (`on`/`off`) para qualquer consumidor
futuro dentro do processo `main` (ex.: fechamento de uma segunda janela
que precise parar de escutar sem encerrar o processo inteiro).

## Decisão 5 — Canais IPC e `ipcDataClient.js` (espelhando os contratos já aprovados)

Nenhum contrato de `dataClient` é reinventado — os dois `ipcDataClient.js`
implementam exatamente as mesmas assinaturas já documentadas em
`specs/feature-12/design.md` e `specs/feature-13/design.md`, trocando a
implementação "local" por chamadas a `window.electronAPI` (exposto pelo
preload, Decisão 7):

```javascript
// src/ui/panels/config/ipcDataClient.js
export function createIpcDataClient() {
  return {
    async loadCardapio() {
      return window.electronAPI.invoke("config:load-cardapio");
    },
    async loadConfig() {
      return window.electronAPI.invoke("config:load-config");
    },
    async saveConfig(config) {
      return window.electronAPI.invoke("config:save-config", config);
    },
  };
}
```

```javascript
// src/ui/panels/kds/ipcDataClient.js
export function createIpcDataClient() {
  return {
    async listarPedidosAtivos() {
      return window.electronAPI.invoke("kds:listar-pedidos-ativos");
    },
    async atualizarStatusPedido(id, novoStatus) {
      return window.electronAPI.invoke("kds:atualizar-status-pedido", id, novoStatus);
    },
    async atribuirMotoboy(id, motoboy) {
      return window.electronAPI.invoke("kds:atribuir-motoboy", id, motoboy);
    },
    async getStatusConexaoWhatsApp() {
      return window.electronAPI.invoke("kds:status-conexao-whatsapp");
    },
    onPedidosChange(callback) {
      return window.electronAPI.on("kds:pedidos-changed", callback);
    },
    onConnectionStatusChange(callback) {
      return window.electronAPI.on("kds:connection-status-changed", callback);
    },
  };
}
```

`ConfigPanel.jsx` e `KdsPanel.jsx` não mudam nenhuma linha — apenas a raiz
do app (fora do escopo desta feature descrever em detalhe: um
`src/ui/main.jsx`/`renderer.js` mínimo que decide qual `dataClient`
injetar) passa a instanciar `createIpcDataClient()` em vez de
`createLocalDataClient(...)`, exatamente como as duas features previram.

## Decisão 6 — Preload e `contextBridge` (segurança)

`electron/preload.js` roda em um contexto isolado
(`contextIsolation: true`, padrão do Electron moderno) e expõe apenas uma
API restrita, nunca o `ipcRenderer` bruto:

```javascript
// electron/preload.js
import { contextBridge, ipcRenderer } from "electron";

const CANAIS_PERMITIDOS = [
  "config:load-cardapio",
  "config:load-config",
  "config:save-config",
  "kds:listar-pedidos-ativos",
  "kds:atualizar-status-pedido",
  "kds:atribuir-motoboy",
  "kds:status-conexao-whatsapp",
];

const CANAIS_DE_EVENTO_PERMITIDOS = [
  "kds:pedidos-changed",
  "kds:connection-status-changed",
  "app:error",
];

contextBridge.exposeInMainWorld("electronAPI", {
  invoke(canal, ...args) {
    if (!CANAIS_PERMITIDOS.includes(canal)) {
      throw new Error(`Canal IPC não permitido: "${canal}".`);
    }
    return ipcRenderer.invoke(canal, ...args);
  },
  on(canal, callback) {
    if (!CANAIS_DE_EVENTO_PERMITIDOS.includes(canal)) {
      throw new Error(`Canal IPC não permitido: "${canal}".`);
    }
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(canal, handler);
    return () => ipcRenderer.removeListener(canal, handler);
  },
});
```

Isso satisfaz R24: nenhum canal arbitrário é encaminhado a `ipcRenderer`, e
o renderer nunca recebe acesso direto a `ipcRenderer`/`require` (mitigação
padrão de RCE via renderer comprometido em apps Electron).

### Alternativa descartada: expor `ipcRenderer` inteiro via `contextBridge`

Cogitada por ser mais simples de implementar (`contextBridge.exposeInMainWorld("ipcRenderer", ipcRenderer)`).
Descartada porque exporia todos os canais IPC do processo — incluindo
canais internos do Electron e qualquer canal futuro — a qualquer script
que rode no renderer (inclusive um script malicioso injetado via uma
vulnerabilidade XSS improvável, mas não impossível, numa aplicação que
processa texto vindo de terceiros via WhatsApp e o exibe eventualmente em
UI). A lista de canais permitidos (`CANAIS_PERMITIDOS`) é o equivalente,
em IPC, ao princípio de menor privilégio já seguido em
`docs/architecture.md` (princípio 5, segredos fora da árvore de fontes).

## Decisão 7 — Estratégia de teste sem Electron real (decisão técnica central)

`tests/electron-main.test.js` **não pode** abrir uma janela Electron real
nem depender do runtime Electron rodando — `./init.sh` executa
`vitest run` em Node puro (`docs/architecture.md`, "Não chame APIs
externas reais... a partir de testes"; mesmo racional já registrado em
`specs/feature-9/design.md` e `specs/feature-10/design.md` para
bibliotecas/SDKs externos).

A estratégia adotada mocka o módulo `electron` inteiro no nível do módulo,
com `vi.mock("electron", ...)` no topo do arquivo de teste:

```javascript
vi.mock("electron", () => {
  const ipcMainHandlers = new Map();
  return {
    app: {
      whenReady: vi.fn(() => new Promise(() => {})), // nunca resolve nos testes
      getPath: vi.fn(() => "/tmp/fake-userdata"),
      isReady: vi.fn(() => true),
    },
    BrowserWindow: vi.fn().mockImplementation(() => ({
      webContents: { send: vi.fn() },
    })),
    ipcMain: {
      handle: vi.fn((canal, handler) => ipcMainHandlers.set(canal, handler)),
      _handlers: ipcMainHandlers,
    },
    contextBridge: { exposeInMainWorld: vi.fn() },
    ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
    session: {},
  };
});
```

Note que `app.whenReady()` retorna uma Promise que nunca resolve — isso
neutraliza o efeito colateral de topo (`app.whenReady().then(() =>
startApp())`) durante os testes, que em vez disso chamam `startApp()` (ou
as funções menores `buildDependencies`/`registerIpcHandlers`/
`wireConversationFlow`) diretamente e de forma controlada (R26, R27).

Adicionalmente, o teste mocka os cinco módulos de domínio para que nenhuma
chamada real a SQLite, WhatsApp Web, OpenAI/DeepSeek ou Nominatim ocorra:

```javascript
vi.mock("../src/db/index.js", () => ({
  openDatabase: vi.fn(() => ({ fakeDb: true })),
  updateStatusPedido: vi.fn(),
  atribuirMotoboy: vi.fn(),
}));
vi.mock("../src/whatsapp/index.js", () => ({
  createWhatsAppWebJsAdapter: vi.fn(() => ({ on: vi.fn(), initialize: vi.fn() })),
  createWhatsAppClient: vi.fn(() => {
    const handlers = {};
    return {
      on: vi.fn((evento, cb) => { handlers[evento] = cb; }),
      off: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getConnectionStatus: vi.fn(() => "conectado"),
      _handlers: handlers, // acesso de teste para disparar "message-processed" manualmente
    };
  }),
}));
vi.mock("../src/ai/index.js", () => ({
  createOpenAiChatClient: vi.fn(() => ({})),
  createDeepSeekChatClient: vi.fn(() => ({})),
  createOpenAiClient: vi.fn(() => ({})),
  createHttpMediaFetcher: vi.fn(() => ({})),
  createPdfConverter: vi.fn(() => ({})),
  processarMensagemConversa: vi.fn(),
}));
vi.mock("../src/delivery/index.js", () => ({
  createNominatimGeocoder: vi.fn(() => ({})),
  listarPedidosAtivosComTempoEspera: vi.fn(() => []),
}));
vi.mock("../src/menu/index.js", () => ({
  loadCardapio: vi.fn(() => ({ categorias: [] })),
  loadConfig: vi.fn(() => ({ apiKeys: { openai: "sk-teste", deepseek: "" } })),
  saveConfig: vi.fn(),
}));
```

Com esses dublês, os testes:

- Verificam que `buildDependencies()` chama, nessa ordem,
  `openDatabase()`, `loadConfig`, `loadCardapio`,
  `createOpenAiChatClient`/`createDeepSeekChatClient`/`createOpenAiClient`/
  `createHttpMediaFetcher`/`createPdfConverter`, `createNominatimGeocoder`,
  `createWhatsAppWebJsAdapter` e `createWhatsAppClient` (R1–R4).
- Verificam que `startApp()` chama `deps.whatsappClient.initialize()` (R5).
- Disparam manualmente `whatsappClient._handlers["message-processed"]({
  clienteId, texto })` (após `wireConversationFlow`), configuram
  `processarMensagemConversa.mockResolvedValue({ resposta: "oi!",
  pedidoRegistrado: false })` e verificam que
  `whatsappClient.sendMessage(clienteId, "oi!")` é chamado (R6, R7).
- Configuram `processarMensagemConversa.mockRejectedValue(new Error("falha"))`,
  disparam o handler e verificam que o `onError` informado a
  `wireConversationFlow` é chamado com esse erro, e que nenhuma rejeição
  não tratada escapa do teste (R8).
- Configuram `processarMensagemConversa.mockResolvedValue({ resposta: "ok",
  pedidoRegistrado: true })`, disparam o handler e verificam que
  `listarPedidosAtivosComTempoEspera` é chamado novamente e que
  `mainWindow.webContents.send("kds:pedidos-changed", ...)` é acionado
  (R9, R18).
- Verificam que `registerIpcHandlers` chama `ipcMain.handle` com cada um
  dos sete canais de R10–R17, na forma esperada (R10–R17).
- Invocam diretamente o handler registrado para `"kds:atualizar-status-pedido"`
  (via `ipcMain._handlers.get(...)`) e verificam que
  `updateStatusPedido` é chamado e que `"kds:pedidos-changed"` é
  publicado em seguida (R15, R18); o mesmo para `"kds:atribuir-motoboy"`
  (R16, R18).
- Verificam que, ao criar `registerIpcHandlers`, um listener é registrado
  em `whatsappClient.on("connection-status-changed", ...)`, e que
  disparar esse listener aciona `mainWindow.webContents.send(
  "kds:connection-status-changed", status)` (R19).
- Importam `createIpcDataClient` de
  `src/ui/panels/config/ipcDataClient.js` e de
  `src/ui/panels/kds/ipcDataClient.js` num ambiente com
  `window.electronAPI` stubado (`vi.stubGlobal` ou objeto global simples) e
  verificam que cada método delega ao canal certo (R13, R20).
- Verificam que a função de cancelamento retornada por
  `onPedidosChange`/`onConnectionStatusChange` do `ipcDataClient` do KDS
  chama `window.electronAPI.on(...)` de forma a retornar a função de
  `removeListener` (dublê `vi.fn()`), e que essa função é de fato
  invocada quando chamada (R21).
- Importam `createWhatsAppClient` de `src/whatsapp/client.js` (SEM mock —
  aqui é o próprio arquivo real sendo testado, com um adapter dublê local
  ao teste, no mesmo estilo já usado em `tests/whatsapp-queue.test.js`),
  registram dois callbacks distintos via `on("connection-status-changed",
  cb)`, chamam `off("connection-status-changed", cb1)` e verificam que só
  `cb2` é chamado na próxima emissão (R22, R23).
- Verificam, via leitura do preload mockado/importado, que
  `contextBridge.exposeInMainWorld` é chamado com `"electronAPI"` contendo
  apenas `invoke`/`on`, e que chamar `invoke`/`on` com um canal fora das
  listas `CANAIS_PERMITIDOS`/`CANAIS_DE_EVENTO_PERMITIDOS` lança em vez de
  chamar `ipcRenderer` (R24).
- Verificam, por leitura de `package.json`
  (`fs.readFileSync`/`JSON.parse` dentro do teste), que `"electron"`
  existe em `devDependencies` e que `"main"` é `"electron/main.js"` (R25).

## Exceções

Nenhuma classe de erro de domínio nova é necessária. O canal IPC de erro
(`"app:error"`) transporta apenas `{ message: erro.message }` — nunca o
stack trace cru (`docs/conventions.md`: "Nunca se propaga um stack trace
cru para a UI"); os handlers `ipcMain.handle` deixam o Electron serializar
a rejeição normalmente para o `invoke` correspondente no renderer (que já
captura `erro.message`, conforme `specs/feature-12/design.md`/
`specs/feature-13/design.md`).

## Fora do escopo desta feature

- **Coordenadas reais da pizzaria configuráveis pelo usuário.** `origem`
  é um valor fixo (`ORIGEM_PADRAO`) no composition root. `src/menu/config.js`
  (feature-2, `done`) não tem um campo `origem`; adicioná-lo exigiria
  alterar o schema/validação de `_validarConfig` numa feature já `done`
  sem que nenhum `acceptance` desta feature exija isso. Uma feature futura
  pode estender `config` com `origem` e trocar essa constante por
  `config.origem` sem impacto em nenhum `R<n>` desta feature.
- **Seed do `cardapio.json`/`config.json` em produção.** Esta feature
  resolve os caminhos (`resolvePaths`) e consome esses arquivos via
  `src/menu/index.js`, mas não cria um `cardapio.json` padrão no primeiro
  uso — isso é responsabilidade do instalador (`feature-8`, ainda
  `pending`) ou de uma etapa manual de desenvolvimento (`npm run dev`
  documentada no checklist manual abaixo).
- **Encaminhamento de mídia (áudio/imagem/PDF) no fluxo de mensagens.** O
  adapter real de WhatsApp (feature-9) traduz o evento nativo de mensagem
  para `{ clienteId, texto }` (sem `media`) — `processarMensagemMultimodal`
  (feature-4) não é acionado por esta feature porque não há hoje nenhuma
  fonte de `media` chegando pela fila. Ligar mídia ao fluxo real exigiria
  estender o contrato do adapter (fora do escopo aprovado de feature-9) e
  fica registrado aqui como ponto de extensão futuro, não coberto por
  nenhum `acceptance` desta feature (que menciona apenas texto).
  Consequentemente `aiClient`, `mediaFetcher` e `pdfConverter` são
  instanciados (R3) mas não são ligados a `wireConversationFlow` — ficam
  disponíveis em `deps` para uma feature futura conectar.
- **Exibição do QR Code de autenticação em uma UI real.** Nenhuma das
  features 11–13 (Sistema de Design, Painel de Configuração, Painel KDS)
  inclui um componente para exibir o QR Code; o evento `"qr"` de
  `whatsappClient` não é roteado a nenhum canal IPC por esta feature, por
  não haver nenhum `acceptance` desta feature nem consumidor de UI que o
  exija. Verificação manual do QR Code real (checklist abaixo) continua
  válida via logs/DevTools durante o desenvolvimento.
- **Empacotamento em instalador nativo.** Escopo de `feature-8`, ainda
  `pending`.

## Fora do escopo automatizável (verificação manual)

Os seguintes comportamentos dependem do runtime real do Electron, de uma
sessão real do WhatsApp Web, de credenciais reais de API e de rede externa
disponível, e **não são** cobertos por `tests/electron-main.test.js` nem
por `./init.sh`. Ficam registrados aqui como checklist de verificação
manual (Nível 3, `docs/verification.md`) a ser executado pelo usuário
humano após a aprovação e implementação desta feature:

1. Colocar um `cardapio.json` válido e, opcionalmente, um `config.json`
   com chaves de API reais em `app.getPath("userData")` (ou preencher via
   painel de configuração após o primeiro `npm run dev`).
2. Rodar `npm run dev` e confirmar que a janela do Electron abre sem
   erros no console principal (DevTools).
3. Confirmar que um QR Code real aparece nos logs/evento `"qr"` (sem UI
   dedicada, ver "Fora do escopo") e escaneá-lo com um WhatsApp real.
4. Abrir o painel de configuração (feature-12) dentro da janela Electron e
   confirmar que ele carrega o cardápio/configuração reais via IPC (não a
   implementação local) e que salvar a configuração persiste de fato em
   `config.json`.
5. Abrir o painel KDS (feature-13) e confirmar que a listagem de pedidos
   ativos aparece com tempo de espera calculado, e que o indicador de
   conexão do WhatsApp reflete o status real.
6. Enviar uma mensagem de texto real via WhatsApp para o número
   conectado, confirmar que uma resposta real gerada pela IA chega de
   volta ao remetente, sem qualquer intervenção manual no processo.
7. Fechar um pedido através da conversa real (fluxo completo até
   `pedidoRegistrado: true`) e confirmar que o painel KDS aberto atualiza
   a lista de pedidos automaticamente, sem recarregar a página (validação
   de R9/R18, a limitação de feature-13 resolvida de fato).
8. No painel KDS, alterar o status de um pedido e atribuir um motoboy, e
   confirmar que a mudança persiste no banco real e é refletida
   imediatamente na UI.
9. Desconectar a sessão do WhatsApp (ex.: remover o aparelho conectado
   pelo celular) e confirmar que o indicador de conexão do painel KDS
   muda para "desconectado" em tempo real, sem recarregar a página
   (validação de R19, a limitação de cancelamento no-op resolvida de
   fato).

Esse roteiro não gera nenhum artefato de teste automatizado — é
documentado aqui para que o humano saiba exatamente o que verificar antes
de considerar a aplicação "funcionando de fato" em produção, encerrando a
cadeia de features 1 a 14.
