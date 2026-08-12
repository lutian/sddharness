import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocka o módulo "electron" inteiro (R27): app, BrowserWindow, ipcMain,
// contextBridge, ipcRenderer, session — nenhuma chamada real ao runtime
// Electron ocorre durante esta suíte.
vi.mock("electron", () => {
  const ipcMainHandlers = new Map();
  return {
    app: {
      // Nunca resolve nos testes: neutraliza o efeito de topo
      // `app.whenReady().then(() => startApp())` (Decisão 7 do design.md).
      whenReady: vi.fn(() => new Promise(() => {})),
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

vi.mock("../src/db/index.js", () => ({
  openDatabase: vi.fn(() => ({ fakeDb: true })),
  updateStatusPedido: vi.fn(() => ({ id: 1, status: "em_preparo" })),
  atribuirMotoboy: vi.fn(() => ({ id: 1, motoboy: "Carlos" })),
}));

vi.mock("../src/whatsapp/index.js", () => ({
  createWhatsAppWebJsAdapter: vi.fn(() => ({ on: vi.fn(), initialize: vi.fn() })),
  createWhatsAppClient: vi.fn(() => {
    const handlers = {};
    return {
      on: vi.fn((evento, cb) => {
        handlers[evento] = cb;
      }),
      off: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getConnectionStatus: vi.fn(() => "conectado"),
      // Acesso de teste para disparar eventos manualmente.
      _handlers: handlers,
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

const electronMock = await import("electron");
const dbMock = await import("../src/db/index.js");
const whatsappMock = await import("../src/whatsapp/index.js");
const aiMock = await import("../src/ai/index.js");
const deliveryMock = await import("../src/delivery/index.js");
const menuMock = await import("../src/menu/index.js");

const mainModule = await import("../electron/main.js");

describe("electron/main.js — composition root", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electronMock.ipcMain._handlers.clear();
  });

  describe("buildDependencies", () => {
    it("monta db, config, cardápio, adapters de IA, geocoder e cliente WhatsApp na ordem esperada", () => {
      const deps = mainModule.buildDependencies({
        paths: {
          cardapioPath: "/tmp/cardapio.json",
          configPath: "/tmp/config.json",
          whatsappSessionPath: "/tmp/whatsapp-session",
        },
      });

      expect(dbMock.openDatabase).toHaveBeenCalledOnce();
      expect(menuMock.loadConfig).toHaveBeenCalledWith("/tmp/config.json");
      expect(menuMock.loadCardapio).toHaveBeenCalledWith("/tmp/cardapio.json");
      expect(aiMock.createOpenAiChatClient).toHaveBeenCalledWith({ apiKey: "sk-teste" });
      expect(aiMock.createDeepSeekChatClient).toHaveBeenCalledWith({ apiKey: "" });
      expect(aiMock.createOpenAiClient).toHaveBeenCalledOnce();
      expect(aiMock.createHttpMediaFetcher).toHaveBeenCalledOnce();
      expect(aiMock.createPdfConverter).toHaveBeenCalledOnce();
      expect(deliveryMock.createNominatimGeocoder).toHaveBeenCalledOnce();
      expect(whatsappMock.createWhatsAppWebJsAdapter).toHaveBeenCalledWith({
        dataPath: "/tmp/whatsapp-session",
      });
      expect(whatsappMock.createWhatsAppClient).toHaveBeenCalledOnce();

      expect(deps.db).toBeDefined();
      expect(deps.whatsappClient).toBeDefined();
    });
  });

  describe("startApp", () => {
    it("chama whatsappClient.initialize() após montar as dependências", async () => {
      const { deps } = await mainModule.startApp();

      expect(deps.whatsappClient.initialize).toHaveBeenCalledOnce();
    });
  });

  describe("wireConversationFlow — fluxo WhatsApp → IA → resposta", () => {
    it("uma mensagem processada aciona o motor de conversação e envia a resposta de volta ao cliente", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      aiMock.processarMensagemConversa.mockResolvedValue({
        resposta: "oi!",
        pedidoRegistrado: false,
      });

      mainModule.wireConversationFlow(deps);

      await deps.whatsappClient._handlers["message-processed"]({
        clienteId: "11999998888",
        texto: "quero uma pizza",
      });

      expect(aiMock.processarMensagemConversa).toHaveBeenCalledWith(
        expect.objectContaining({
          db: deps.db,
          clienteId: "11999998888",
          mensagemCliente: "quero uma pizza",
          adapters: deps.adapters,
          config: deps.config,
          cardapio: deps.cardapio,
        })
      );
      expect(deps.whatsappClient.sendMessage).toHaveBeenCalledWith("11999998888", "oi!");
    });

    it("um erro no motor de conversação é reportado via callback de erro, sem derrubar o processo", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const erroSimulado = new Error("falha ao gerar resposta");
      aiMock.processarMensagemConversa.mockRejectedValue(erroSimulado);

      const onError = vi.fn();
      mainModule.wireConversationFlow(deps, { onError });

      await expect(
        deps.whatsappClient._handlers["message-processed"]({
          clienteId: "11999998888",
          texto: "oi",
        })
      ).resolves.not.toThrow();

      expect(onError).toHaveBeenCalledWith(erroSimulado);
      expect(deps.whatsappClient.sendMessage).not.toHaveBeenCalled();
    });

    it("quando um pedido é registrado, o painel KDS é notificado da mudança via kds:pedidos-changed", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      const { notificarPedidosMudaram } = mainModule.registerIpcHandlers(deps, mainWindow);
      deps.onPedidosMudaram = notificarPedidosMudaram;

      aiMock.processarMensagemConversa.mockResolvedValue({
        resposta: "ok",
        pedidoRegistrado: true,
      });

      mainModule.wireConversationFlow(deps);

      deliveryMock.listarPedidosAtivosComTempoEspera.mockClear();

      await deps.whatsappClient._handlers["message-processed"]({
        clienteId: "11999998888",
        texto: "fechar pedido",
      });

      expect(deliveryMock.listarPedidosAtivosComTempoEspera).toHaveBeenCalledOnce();
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("kds:pedidos-changed", []);
    });
  });

  describe("registerIpcHandlers — canais IPC", () => {
    it("registra os sete canais IPC esperados", () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();

      mainModule.registerIpcHandlers(deps, mainWindow);

      const canaisEsperados = [
        "config:load-cardapio",
        "config:load-config",
        "config:save-config",
        "kds:listar-pedidos-ativos",
        "kds:atualizar-status-pedido",
        "kds:atribuir-motoboy",
        "kds:status-conexao-whatsapp",
      ];

      for (const canal of canaisEsperados) {
        expect(electronMock.ipcMain._handlers.has(canal)).toBe(true);
      }
    });

    it("o handler config:load-cardapio, quando invocado, retorna o resultado de loadCardapio(cardapioPath) (R10)", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "/tmp/cardapio.json", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      menuMock.loadCardapio.mockReturnValue({ categorias: [{ nome: "Pizzas" }] });

      const handler = electronMock.ipcMain._handlers.get("config:load-cardapio");
      const resultado = await handler({});

      expect(menuMock.loadCardapio).toHaveBeenCalledWith("/tmp/cardapio.json");
      expect(resultado).toEqual({ categorias: [{ nome: "Pizzas" }] });
    });

    it("o handler config:load-config, quando invocado, retorna o resultado de loadConfig(configPath) (R11)", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "/tmp/config.json", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      menuMock.loadConfig.mockReturnValue({ apiKeys: { openai: "sk-outra", deepseek: "" } });

      const handler = electronMock.ipcMain._handlers.get("config:load-config");
      const resultado = await handler({});

      expect(menuMock.loadConfig).toHaveBeenCalledWith("/tmp/config.json");
      expect(resultado).toEqual({ apiKeys: { openai: "sk-outra", deepseek: "" } });
    });

    it("o handler kds:listar-pedidos-ativos, quando invocado, retorna o resultado de listarPedidosAtivosComTempoEspera({ db, origem }) (R14)", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      const pedidosEsperados = [{ id: 1, status: "recebido" }];
      deliveryMock.listarPedidosAtivosComTempoEspera.mockClear();
      deliveryMock.listarPedidosAtivosComTempoEspera.mockReturnValue(pedidosEsperados);

      const handler = electronMock.ipcMain._handlers.get("kds:listar-pedidos-ativos");
      const resultado = await handler({});

      expect(deliveryMock.listarPedidosAtivosComTempoEspera).toHaveBeenCalledWith({
        db: deps.db,
        origem: deps.origem,
      });
      expect(resultado).toEqual(pedidosEsperados);
    });

    it("o handler kds:status-conexao-whatsapp, quando invocado, retorna o resultado de whatsappClient.getConnectionStatus() (R17)", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      deps.whatsappClient.getConnectionStatus.mockReturnValue("desconectado");

      const handler = electronMock.ipcMain._handlers.get("kds:status-conexao-whatsapp");
      const resultado = await handler({});

      expect(deps.whatsappClient.getConnectionStatus).toHaveBeenCalledOnce();
      expect(resultado).toBe("desconectado");
    });

    it("o handler kds:atualizar-status-pedido atualiza o status e notifica a mudança de pedidos", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      const handler = electronMock.ipcMain._handlers.get("kds:atualizar-status-pedido");
      const resultado = await handler({}, 1, "em_preparo");

      expect(dbMock.updateStatusPedido).toHaveBeenCalledWith(deps.db, 1, "em_preparo");
      expect(resultado).toEqual({ id: 1, status: "em_preparo" });
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        "kds:pedidos-changed",
        expect.any(Array)
      );
    });

    it("o handler kds:atribuir-motoboy atribui o motoboy e notifica a mudança de pedidos", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      const handler = electronMock.ipcMain._handlers.get("kds:atribuir-motoboy");
      const resultado = await handler({}, 1, "Carlos");

      expect(dbMock.atribuirMotoboy).toHaveBeenCalledWith(deps.db, 1, "Carlos");
      expect(resultado).toEqual({ id: 1, motoboy: "Carlos" });
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        "kds:pedidos-changed",
        expect.any(Array)
      );
    });

    it("uma mudança de status de conexão do WhatsApp é repassada ao painel KDS via kds:connection-status-changed", () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      deps.whatsappClient._handlers["connection-status-changed"]("desconectado");

      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        "kds:connection-status-changed",
        "desconectado"
      );
    });

    it("config:save-config propaga o erro de validação lançado por saveConfig sem engoli-lo", async () => {
      const deps = mainModule.buildDependencies({
        paths: { cardapioPath: "c", configPath: "cfg", whatsappSessionPath: "s" },
      });
      const mainWindow = mainModule.createMainWindow();
      mainModule.registerIpcHandlers(deps, mainWindow);

      const erroValidacao = new Error("configuração inválida");
      menuMock.saveConfig.mockImplementation(() => {
        throw erroValidacao;
      });

      const handler = electronMock.ipcMain._handlers.get("config:save-config");

      expect(() => handler({}, { systemPrompt: "x" })).toThrow(erroValidacao);
    });
  });

  describe("src/ui/panels/config/ipcDataClient.js", () => {
    it("delega loadCardapio/loadConfig/saveConfig aos canais IPC certos", async () => {
      const invoke = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("window", { electronAPI: { invoke } });

      const { createIpcDataClient } = await import(
        "../src/ui/panels/config/ipcDataClient.js"
      );
      const dataClient = createIpcDataClient();

      await dataClient.loadCardapio();
      expect(invoke).toHaveBeenCalledWith("config:load-cardapio");

      await dataClient.loadConfig();
      expect(invoke).toHaveBeenCalledWith("config:load-config");

      await dataClient.saveConfig({ systemPrompt: "x" });
      expect(invoke).toHaveBeenCalledWith("config:save-config", { systemPrompt: "x" });

      vi.unstubAllGlobals();
    });
  });

  describe("src/ui/panels/kds/ipcDataClient.js", () => {
    it("delega os métodos de leitura/escrita aos canais IPC certos e retorna cancelamento real em onPedidosChange/onConnectionStatusChange", async () => {
      const invoke = vi.fn().mockResolvedValue([]);
      const cancelarPedidos = vi.fn();
      const cancelarConexao = vi.fn();
      const on = vi
        .fn()
        .mockReturnValueOnce(cancelarPedidos)
        .mockReturnValueOnce(cancelarConexao);
      vi.stubGlobal("window", { electronAPI: { invoke, on } });

      const { createIpcDataClient } = await import("../src/ui/panels/kds/ipcDataClient.js");
      const dataClient = createIpcDataClient();

      await dataClient.listarPedidosAtivos();
      expect(invoke).toHaveBeenCalledWith("kds:listar-pedidos-ativos");

      await dataClient.atualizarStatusPedido(1, "em_preparo");
      expect(invoke).toHaveBeenCalledWith("kds:atualizar-status-pedido", 1, "em_preparo");

      await dataClient.atribuirMotoboy(1, "Carlos");
      expect(invoke).toHaveBeenCalledWith("kds:atribuir-motoboy", 1, "Carlos");

      await dataClient.getStatusConexaoWhatsApp();
      expect(invoke).toHaveBeenCalledWith("kds:status-conexao-whatsapp");

      const callbackPedidos = vi.fn();
      const cancelarRetornadoPedidos = dataClient.onPedidosChange(callbackPedidos);
      expect(on).toHaveBeenCalledWith("kds:pedidos-changed", callbackPedidos);
      expect(cancelarRetornadoPedidos).toBe(cancelarPedidos);
      cancelarRetornadoPedidos();
      expect(cancelarPedidos).toHaveBeenCalledOnce();

      const callbackConexao = vi.fn();
      const cancelarRetornadoConexao = dataClient.onConnectionStatusChange(callbackConexao);
      expect(on).toHaveBeenCalledWith("kds:connection-status-changed", callbackConexao);
      expect(cancelarRetornadoConexao).toBe(cancelarConexao);
      cancelarRetornadoConexao();
      expect(cancelarConexao).toHaveBeenCalledOnce();

      vi.unstubAllGlobals();
    });
  });

  describe("electron/preload.js — contextBridge restrito", () => {
    it("expõe apenas invoke/on e rejeita canais fora da lista permitida", async () => {
      await import("../electron/preload.js");

      expect(electronMock.contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        "electronAPI",
        expect.objectContaining({ invoke: expect.any(Function), on: expect.any(Function) })
      );

      const [, api] = electronMock.contextBridge.exposeInMainWorld.mock.calls[0];
      expect(Object.keys(api).sort()).toEqual(["invoke", "on"]);

      expect(() => api.invoke("canal:inventado")).toThrow(/não permitido/);
      expect(() => api.on("canal:inventado", () => {})).toThrow(/não permitido/);

      electronMock.ipcRenderer.invoke.mockClear();
      api.invoke("config:load-cardapio");
      expect(electronMock.ipcRenderer.invoke).toHaveBeenCalledWith("config:load-cardapio");
    });
  });

  describe("package.json — dependência electron e campo main", () => {
    it("declara electron como devDependency e o campo main aponta para electron/main.js", () => {
      const conteudo = readFileSync(
        new URL("../package.json", import.meta.url),
        "utf-8"
      );
      const pkg = JSON.parse(conteudo);

      expect(pkg.devDependencies.electron).toBeDefined();
      expect(pkg.main).toBe("electron/main.js");
    });
  });

  describe("Exportações do composition root", () => {
    it("as funções de composição são exportadas individualmente e chamáveis sem abrir uma janela Electron real", () => {
      expect(typeof mainModule.resolvePaths).toBe("function");
      expect(typeof mainModule.buildDependencies).toBe("function");
      expect(typeof mainModule.registerIpcHandlers).toBe("function");
      expect(typeof mainModule.wireConversationFlow).toBe("function");
      expect(typeof mainModule.createMainWindow).toBe("function");
      expect(typeof mainModule.startApp).toBe("function");
    });
  });
});

describe("src/whatsapp/client.js — off (cancelamento real de listener)", () => {
  it("off(evento, callback) remove um listener registrado via on sem afetar outros callbacks do mesmo evento", async () => {
    // Importa o módulo real (sem mock) — WhatsAppClient real, com adapter
    // dublê local, no mesmo estilo de tests/whatsapp-queue.test.js.
    vi.doUnmock("../src/whatsapp/client.js");
    const { createWhatsAppClient: createWhatsAppClientReal } = await vi.importActual(
      "../src/whatsapp/client.js"
    );

    const emitter = new EventEmitter();
    const adapter = {
      on: (evento, callback) => emitter.on(evento, callback),
      initialize: () => {},
      sendMessage: () => {},
    };
    const db = { fakeDb: true };
    const client = createWhatsAppClientReal(adapter, { db });

    const chamadasCb1 = [];
    const chamadasCb2 = [];
    const cb1 = (status) => chamadasCb1.push(status);
    const cb2 = (status) => chamadasCb2.push(status);

    client.on("connection-status-changed", cb1);
    client.on("connection-status-changed", cb2);

    client.off("connection-status-changed", cb1);

    emitter.emit("ready");

    expect(chamadasCb1).toEqual([]);
    expect(chamadasCb2).toEqual(["conectado"]);
  });
});
