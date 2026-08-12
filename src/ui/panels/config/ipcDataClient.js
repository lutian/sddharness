// src/ui/panels/config/ipcDataClient.js — implementação de dataClient
// baseada em IPC real (feature-14), espelhando exatamente o mesmo contrato
// de src/ui/panels/config/localDataClient.js já consumido por ConfigPanel.jsx
// (feature-12), trocando a chamada direta a src/menu/index.js por
// window.electronAPI.invoke (exposto pelo preload, electron/preload.js).
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
