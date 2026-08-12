// src/ai/media.js — contrato mínimo do adapter de download de mídia injetável.
//
// Qualquer origem concreta de mídia (ex.: download de anexos do WhatsApp
// Web, reaproveitando o adapter de `src/whatsapp/`) deve ser envolvida por
// um adapter que satisfaça este contrato. `src/ai/` nunca faz `fetch` para
// a rede diretamente — ver `design.md` de feature-4.
//
// @typedef {object} MediaFetcher
// @property {(media: { tipo: "audio"|"imagem"|"pdf", url?: string, id?: string }) =>
//   Promise<{ buffer: Buffer, mimeType: string }>} download
//   Baixa o conteúdo binário referenciado por `media`, retornando o buffer
//   e o mimeType detectado.

export {};
