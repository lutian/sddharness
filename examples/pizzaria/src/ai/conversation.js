// src/ai/conversation.js — orquestração: decide o caminho multimodal a partir
// de media.tipo e injeta o texto extraído no fluxo da conversa.
import { UnsupportedMediaTypeError } from "./errors.js";
import { transcribeAudioMessage } from "./audio.js";
import { describeImageMessage } from "./image.js";
import { describePdfMessage } from "./pdf.js";

// Constrói uma nova mensagem com o texto extraído substituindo mensagem.texto,
// sem mutar o objeto original.
export function injectTextoExtraido(mensagem, textoExtraido) {
  return { ...mensagem, texto: textoExtraido };
}

// Orquestra o fluxo completo para uma mensagem { clienteId, texto, media }.
export async function processarMensagemMultimodal({
  mensagem,
  aiClient,
  mediaFetcher,
  pdfConverter,
  config,
}) {
  const media = mensagem.media;

  if (!media) {
    return mensagem;
  }

  if (media.tipo === "audio") {
    const textoTranscrito = await transcribeAudioMessage({ aiClient, mediaFetcher, media });
    return injectTextoExtraido(mensagem, textoTranscrito);
  }

  if (media.tipo === "imagem") {
    const textoDescritivo = await describeImageMessage({ aiClient, mediaFetcher, media, config });
    if (textoDescritivo === null) {
      return mensagem;
    }
    return injectTextoExtraido(mensagem, textoDescritivo);
  }

  if (media.tipo === "pdf") {
    const textoDescritivo = await describePdfMessage({
      aiClient,
      mediaFetcher,
      pdfConverter,
      media,
      config,
    });
    if (textoDescritivo === null) {
      return mensagem;
    }
    return injectTextoExtraido(mensagem, textoDescritivo);
  }

  throw new UnsupportedMediaTypeError(`tipo de mídia não suportado: "${media.tipo}"`);
}
