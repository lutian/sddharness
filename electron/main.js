// electron/main.js — composition root do processo principal: monta as
// dependências reais de todos os domínios (feature-1 a feature-13), registra
// os canais IPC consumidos pelas UIs e liga o fluxo de mensagens do WhatsApp
// ao motor de conversação. Único arquivo do repositório que conhece todos os
// domínios ao mesmo tempo (docs/architecture.md, princípio 1).
import { join } from "node:path";

import { app, BrowserWindow, ipcMain } from "electron";

import { openDatabase, updateStatusPedido, atribuirMotoboy } from "../src/db/index.js";
import { createWhatsAppWebJsAdapter, createWhatsAppClient } from "../src/whatsapp/index.js";
import {
  createOpenAiChatClient,
  createDeepSeekChatClient,
  createOpenAiClient,
  createHttpMediaFetcher,
  createPdfConverter,
  processarMensagemConversa,
} from "../src/ai/index.js";
import { createNominatimGeocoder, listarPedidosAtivosComTempoEspera } from "../src/delivery/index.js";
import { loadCardapio, loadConfig, saveConfig } from "../src/menu/index.js";

// Coordenadas fixas da pizzaria (origem para cálculo de distância/tempo de
// espera). Tornar isso configurável via painel é responsabilidade de uma
// feature futura (ver design.md, "Fora do escopo").
const ORIGEM_PADRAO = { latitude: -23.5505, longitude: -46.6333 };

// Resolve os caminhos de arquivos/sessão dentro da pasta de dados do
// usuário (`app.getPath("userData")`), único ponto do composition root que
// decide onde cada arquivo persistente vive.
export function resolvePaths() {
  const userDataPath = app.getPath("userData");
  return {
    cardapioPath: join(userDataPath, "cardapio.json"),
    configPath: join(userDataPath, "config.json"),
    whatsappSessionPath: join(userDataPath, "whatsapp-session"),
  };
}

// Monta todas as dependências reais dos domínios (R1-R4): banco, adapters de
// IA, geocoder e cliente WhatsApp, injetando cada um conforme o contrato já
// aprovado do respectivo domínio.
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
    db,
    config,
    cardapio,
    paths: resolvedPaths,
    adapters,
    aiClient,
    mediaFetcher,
    pdfConverter,
    geocoder,
    whatsappClient,
    origem: ORIGEM_PADRAO,
  };
}

// Cria a janela principal, apontando o preload restrito (electron/preload.js).
export function createMainWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: { preload: join(import.meta.dirname, "preload.js") },
  });
  return mainWindow;
}

// Registra os sete canais IPC consumidos pelos painéis de configuração e KDS
// (R10-R17), a notificação de domínio "pedidos mudaram" (R18) e o repasse de
// mudança de status de conexão do WhatsApp (R19).
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

// Liga o fluxo de mensagens real: WhatsApp → fila FIFO (já dentro de
// whatsappClient) → motor de conversação → resposta enviada de volta ao
// cliente real (R6-R9). Erros são capturados e reportados via `onError`, sem
// deixar nenhuma rejeição de Promise não tratada (R8).
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

// Orquestra a inicialização completa do processo principal (R5, R26):
// monta as dependências, cria a janela, registra os canais IPC, liga o
// fluxo de conversação e inicia a conexão real com o WhatsApp Web.
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
