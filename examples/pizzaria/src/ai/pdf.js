// src/ai/pdf.js — descreve mensagens de PDF: baixa, converte a primeira
// página em imagem e reaproveita o fluxo de visão (aiClient.describeImage),
// respeitando o mesmo switch imageEnabled usado por describeImageMessage.
import { ImageDescriptionError, MediaDownloadError, PdfConversionError } from "./errors.js";

// Se config.imageEnabled não for true, retorna null sem chamar mediaFetcher,
// pdfConverter nem aiClient (PDF silenciosamente ignorado). Se true, baixa o
// PDF, converte a primeira página em imagem e retorna a descrição gerada
// pelo modelo de visão sobre a imagem resultante.
export async function describePdfMessage({ aiClient, mediaFetcher, pdfConverter, media, config }) {
  if (config?.imageEnabled !== true) {
    return null;
  }

  let pdf;
  try {
    pdf = await mediaFetcher.download(media);
  } catch (erroOriginal) {
    throw new MediaDownloadError("falha ao baixar o PDF", { cause: erroOriginal });
  }

  let imagem;
  try {
    imagem = await pdfConverter.convertFirstPageToImage(pdf);
  } catch (erroOriginal) {
    throw new PdfConversionError("falha ao converter a primeira página do PDF em imagem", {
      cause: erroOriginal,
    });
  }

  try {
    return await aiClient.describeImage(imagem);
  } catch (erroOriginal) {
    throw new ImageDescriptionError("falha ao descrever a imagem convertida do PDF", {
      cause: erroOriginal,
    });
  }
}
