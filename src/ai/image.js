// src/ai/image.js — descreve mensagens de imagem via modelo de visão (aiClient),
// respeitando o switch imageEnabled.
import { ImageDescriptionError, MediaDownloadError } from "./errors.js";

// Se config.imageEnabled não for true, retorna null sem chamar mediaFetcher
// nem aiClient (imagem silenciosamente ignorada). Se true, baixa a imagem e
// retorna a descrição gerada pelo modelo de visão.
export async function describeImageMessage({ aiClient, mediaFetcher, media, config }) {
  if (config?.imageEnabled !== true) {
    return null;
  }

  let imagem;
  try {
    imagem = await mediaFetcher.download(media);
  } catch (erroOriginal) {
    throw new MediaDownloadError("falha ao baixar a imagem", { cause: erroOriginal });
  }

  try {
    return await aiClient.describeImage(imagem);
  } catch (erroOriginal) {
    throw new ImageDescriptionError("falha ao descrever a imagem", { cause: erroOriginal });
  }
}
