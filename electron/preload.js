// electron/preload.js — bridge de contexto isolado (contextIsolation: true):
// expõe apenas uma API restrita (`invoke`/`on`) ao renderer, nunca o
// `ipcRenderer` bruto, validando cada canal contra uma lista fixa conhecida
// (R24) — princípio de menor privilégio (docs/architecture.md, princípio 5).
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
