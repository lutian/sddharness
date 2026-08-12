// src/ui/panels/kds/localDataClient.js — implementação padrão de dataClient,
// delegando diretamente a src/delivery/index.js, src/db/index.js e ao
// `whatsappClient` (feature-3/9) injetados. Útil para rodar o painel KDS
// fora do Electron (ex.: harness de desenvolvimento local); a implementação
// baseada em IPC é escopo da feature-14 (ver specs/feature-13/design.md,
// Decisão 1).
import { listarPedidosAtivosComTempoEspera } from "../../../delivery/index.js";
import { updateStatusPedido, atribuirMotoboy } from "../../../db/index.js";

// Cria um dataClient concreto a partir de `db`, `origem` (coordenadas da
// pizzaria) e `whatsappClient` informados. Cada método de leitura/escrita é
// assíncrono (envolve a chamada síncrona correspondente em uma Promise) para
// que o contrato seja idêntico ao de um futuro ipcDataClient.
//
// Limitação documentada (specs/feature-13/design.md, Decisão 1):
// `onPedidosChange` registra o `callback` mas não o aciona sozinho — não há
// hoje, em src/db/* nem src/delivery/*, uma fonte de eventos para mudanças
// na tabela `pedidos`. Dar "tempo real" de fato a essa assinatura (polling
// ou push) é responsabilidade de `feature-14`. Sua função de cancelamento é
// um no-op.
//
// Limitação documentada adicional: a função de cancelamento retornada por
// `onConnectionStatusChange` também é um no-op, porque `createWhatsAppClient`
// (feature-3/9) expõe apenas `on(evento, callback)`, sem `off`/`removeListener`
// público.
export function createLocalDataClient({ db, origem, whatsappClient }) {
  return {
    async listarPedidosAtivos() {
      return listarPedidosAtivosComTempoEspera({ db, origem });
    },
    async atualizarStatusPedido(id, novoStatus) {
      return updateStatusPedido(db, id, novoStatus);
    },
    async atribuirMotoboy(id, motoboy) {
      return atribuirMotoboy(db, id, motoboy);
    },
    async getStatusConexaoWhatsApp() {
      return whatsappClient.getConnectionStatus();
    },
    onPedidosChange(_callback) {
      return () => {};
    },
    onConnectionStatusChange(callback) {
      whatsappClient.on("connection-status-changed", callback);
      return () => {};
    },
  };
}
