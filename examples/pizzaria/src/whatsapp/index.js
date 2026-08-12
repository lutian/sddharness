// src/whatsapp/index.js — cliente WhatsApp Web + fila FIFO de mensagens.
export { createWhatsAppClient } from "./client.js";
export { createMessageQueue } from "./queue.js";
export { WhatsAppError, AuthenticationError } from "./errors.js";
export { createWhatsAppWebJsAdapter } from "./adapters/whatsapp-web-js.js";
