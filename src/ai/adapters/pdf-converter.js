// src/ai/adapters/pdf-converter.js — adapter concreto que satisfaz o
// contrato PdfConverter (src/ai/pdfConverter.js) usando a biblioteca
// `mupdf` (WASM). Única fronteira do domínio src/ai/ que importa `mupdf` —
// ver "Estratégia de teste sem rede real" em specs/feature-10/design.md.
import { ColorSpace, Document, Matrix } from "mupdf";

const ESCALA_PADRAO = 2;

// Cria um adapter concreto de conversão de PDF em imagem via `mupdf`.
// options: { scale? } (scale, padrão 2 — fator de resolução do bitmap renderizado)
export function createPdfConverter(options = {}) {
  const { scale } = options;

  return {
    convertFirstPageToImage: async ({ buffer, mimeType }) => {
      let documento;
      try {
        documento = Document.openDocument(buffer, mimeType ?? "application/pdf");
      } catch (erro) {
        throw new Error(`createPdfConverter: falha ao abrir o PDF (${erro.message}).`);
      }

      if (typeof documento.countPages === "function" && documento.countPages() < 1) {
        throw new Error("createPdfConverter: o PDF não tem nenhuma página.");
      }

      let pagina;
      try {
        pagina = documento.loadPage(0);
      } catch (erro) {
        throw new Error(`createPdfConverter: falha ao carregar a primeira página (${erro.message}).`);
      }

      const fatorEscala = scale ?? ESCALA_PADRAO;
      const matriz = Matrix.scale(fatorEscala, fatorEscala);

      let pixmap;
      try {
        pixmap = pagina.toPixmap(matriz, ColorSpace.DeviceRGB);
      } catch (erro) {
        throw new Error(`createPdfConverter: falha ao renderizar a página (${erro.message}).`);
      }

      return { buffer: Buffer.from(pixmap.asPNG()), mimeType: "image/png" };
    },
  };
}
