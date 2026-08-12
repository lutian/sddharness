// src/whatsapp/client.js — WhatsAppClient: orquestra adapter + fila + sessão.
import { EventEmitter } from "node:events";

import { findSessaoByClienteId } from "../db/index.js";

import { createMessageQueue } from "./queue.js";
import { AuthenticationError } from "./errors.js";

// Cria o cliente WhatsApp de alto nível a partir de um `adapter` injetado
// (contrato em `adapter.js`). Não conecta nada real por si só — quem chama
// decide quando iniciar (`client.initialize()`, delegado ao adapter).
//
// Eventos públicos emitidos por `WhatsAppClient`:
// - "qr": repassa a string de QR Code recebida do adapter.
// - "error": repassa erros de domínio (ex.: AuthenticationError).
// - "message-processed": emitido após uma mensagem ser processada pela
//   fila interna, com `{ clienteId, texto, historico }`.
// - "connection-status-changed": emitido com `"conectado"` ou
//   `"desconectado"` a cada mudança de status de conexão (feature-7).
export function createWhatsAppClient(adapter, { db, minDelayMs = 1000, maxDelayMs = 3000 } = {}) {
  const emitter = new EventEmitter();

  // Estado interno de conexão, não exposto diretamente — só via
  // getConnectionStatus() e o evento "connection-status-changed".
  // Inicial: "desconectado" (R12).
  let connectionStatus = "desconectado";

  const queue = createMessageQueue({
    minDelayMs,
    maxDelayMs,
    processFn: async ({ clienteId, texto }) => {
      const sessao = findSessaoByClienteId(db, clienteId);
      const historico = sessao ? sessao.historico : null;
      const resultado = { clienteId, texto, historico };
      emitter.emit("message-processed", resultado);
      return resultado;
    },
  });

  queue.on("error", (error) => emitter.emit("error", error));

  adapter.on("qr", (qr) => emitter.emit("qr", qr));

  adapter.on("auth_failure", (motivo) => {
    emitter.emit("error", new AuthenticationError(motivo ?? "Falha de autenticação do WhatsApp."));
  });

  adapter.on("message", (mensagem) => queue.enqueue(mensagem));

  adapter.on("ready", () => {
    connectionStatus = "conectado";
    emitter.emit("connection-status-changed", connectionStatus);
  });

  adapter.on("disconnected", () => {
    connectionStatus = "desconectado";
    emitter.emit("connection-status-changed", connectionStatus);
  });

  return {
    on: (evento, callback) => emitter.on(evento, callback),
    off: (evento, callback) => emitter.off(evento, callback),
    initialize: () => adapter.initialize(),
    sendMessage: (clienteId, texto) => adapter.sendMessage(clienteId, texto),
    getConnectionStatus: () => connectionStatus,
  };
}
