// src/ui/panels/config/localDataClient.js — implementação padrão de dataClient,
// delegando diretamente a src/menu/index.js (sem IPC). Útil para rodar o
// painel de configuração fora do Electron (ex.: harness de desenvolvimento
// local); a implementação baseada em IPC é escopo da feature-14 (ver
// specs/feature-12/design.md, Decisão 1).
import { loadCardapio, loadConfig, saveConfig } from "../../../menu/index.js";

// Cria um dataClient concreto para os caminhos de arquivo informados. Cada
// método é assíncrono (envolve a chamada síncrona correspondente em uma
// Promise) para que o contrato seja idêntico ao de um futuro ipcDataClient.
export function createLocalDataClient({ cardapioPath, configPath }) {
  return {
    async loadCardapio() {
      return loadCardapio(cardapioPath);
    },
    async loadConfig() {
      return loadConfig(configPath);
    },
    async saveConfig(config) {
      saveConfig(configPath, config);
    },
  };
}
