// src/ui/panels/kds/ipcDataClient.js — implementação de dataClient baseada
// em IPC real (feature-14), espelhando exatamente o mesmo contrato de
// src/ui/panels/kds/localDataClient.js já consumido por KdsPanel.jsx
// (feature-13), trocando as chamadas diretas a src/db/index.js,
// src/delivery/index.js e whatsappClient por window.electronAPI.invoke/on
// (exposto pelo preload, electron/preload.js). Diferente da implementação
// local, onPedidosChange/onConnectionStatusChange retornam aqui uma função
// de cancelamento real (R21), pois window.electronAPI.on já devolve
// ipcRenderer.removeListener.
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
