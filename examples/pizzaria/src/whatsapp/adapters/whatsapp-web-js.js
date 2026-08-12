// src/whatsapp/adapters/whatsapp-web-js.js — adapter concreto que satisfaz o
// contrato de WhatsAppAdapter (src/whatsapp/adapter.js) usando a biblioteca
// whatsapp-web.js. Única fronteira do domínio src/whatsapp/ que importa a
// biblioteca real (R11) — nenhum outro arquivo do domínio deve importá-la.
import { EventEmitter } from "node:events";

// `whatsapp-web.js` é um módulo CommonJS. Em runtime ESM real do Node, o
// loader não consegue inferir com segurança quais propriedades do
// `module.exports` viram named exports — por isso importamos o default
// export inteiro e desestruturamos `Client`/`LocalAuth` a partir dele,
// conforme sugerido pela própria mensagem de erro do Node nesse cenário.
import whatsappWebJs from "whatsapp-web.js";

const { Client, LocalAuth } = whatsappWebJs;

import { WhatsAppError } from "../errors.js";

const SUFIXO_CHAT_ID = "@c.us";

// Cria um adapter concreto conectado a uma sessão real do WhatsApp Web.
// options: { dataPath, puppeteerOptions }
// - dataPath: diretório de sessão persistente (LocalAuth).
// - puppeteerOptions: repassado ao Puppeteer subjacente (ex.: { headless: true }).
export function createWhatsAppWebJsAdapter({ dataPath, puppeteerOptions } = {}) {
  const emitter = new EventEmitter();

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath }),
    puppeteer: puppeteerOptions,
  });

  // Flag interna de sessão pronta: true entre "ready" e "disconnected" (R10).
  let pronta = false;

  client.on("qr", (qr) => emitter.emit("qr", qr));

  client.on("auth_failure", (motivo) => emitter.emit("auth_failure", motivo));

  client.on("ready", () => {
    pronta = true;
    emitter.emit("ready");
  });

  client.on("disconnected", (motivo) => {
    pronta = false;
    emitter.emit("disconnected", motivo);
  });

  client.on("message", (mensagemNativa) => {
    const clienteId = mensagemNativa.from.replace(SUFIXO_CHAT_ID, "");
    emitter.emit("message", { clienteId, texto: mensagemNativa.body });
  });

  return {
    on: (evento, callback) => emitter.on(evento, callback),
    initialize: () => client.initialize(),
    sendMessage: (clienteId, texto) => {
      if (!pronta) {
        return Promise.reject(
          new WhatsAppError("Sessão do WhatsApp ainda não está pronta."),
        );
      }

      const chatId = clienteId.endsWith(SUFIXO_CHAT_ID)
        ? clienteId
        : `${clienteId}${SUFIXO_CHAT_ID}`;

      return client.sendMessage(chatId, texto);
    },
  };
}
