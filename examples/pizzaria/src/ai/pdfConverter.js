// src/ai/pdfConverter.js — contrato mínimo do adapter de conversão PDF→imagem
// injetável.
//
// Qualquer biblioteca concreta de renderização de PDF (candidatas: `pdf-to-img`,
// `pdfjs-dist` com `canvas`, ou `pdftoppm` do `poppler-utils`) deve ser
// envolvida por um adapter que satisfaça este contrato antes de ser injetada
// em `describePdfMessage`. `src/ai/` nunca importa uma biblioteca de
// renderização de PDF diretamente — ver `design.md` de feature-4.
//
// @typedef {object} PdfConverter
// @property {(pdf: { buffer: Buffer, mimeType: string }) =>
//   Promise<{ buffer: Buffer, mimeType: string }>} convertFirstPageToImage
//   Converte a primeira página de um PDF em imagem, retornando o buffer e o
//   mimeType da imagem resultante.

export {};
