// src/whatsapp/adapter.js — contrato mínimo do adapter de biblioteca WhatsApp.
//
// Qualquer biblioteca concreta de automação do WhatsApp Web (ex.:
// `whatsapp-web.js`) deve ser envolvida por um adapter que satisfaça este
// contrato antes de ser injetada em `createWhatsAppClient`. `WhatsAppClient`
// nunca importa a biblioteca concreta diretamente — ver `design.md` de
// feature-3.
//
// @typedef {object} WhatsAppAdapter
// @property {(evento: string, callback: (payload: any) => void) => void} on
//   Assina um evento emitido pelo adapter. Eventos suportados:
//   - "qr": emitido com a string do QR Code de autenticação.
//   - "ready": emitido quando a sessão é autenticada com sucesso.
//   - "auth_failure": emitido quando a autenticação falha.
//   - "disconnected": emitido quando uma sessão previamente autenticada
//     ("ready") perde a conexão.
//   - "message": emitido com `{ clienteId, texto }` a cada mensagem recebida.
// @property {() => (void | Promise<void>)} initialize
//   Inicia a conexão real com o WhatsApp Web (ex.: abre o navegador headless).
// @property {(clienteId: string, texto: string) => (void | Promise<void>)} sendMessage
//   Envia uma mensagem de texto para o cliente identificado por `clienteId`.

export {};
