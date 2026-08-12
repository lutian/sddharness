// src/ai/audio.js — transcreve mensagens de áudio via Whisper (aiClient).
import { AudioTranscriptionError, MediaDownloadError } from "./errors.js";

const EXTENSAO_POR_MIME_TYPE = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
};

// Mapeia mimeType conhecido para um filename com extensão compatível com a
// Whisper API. Não recodifica o áudio (ver "Alternativa descartada 2" em
// design.md de feature-4): a Whisper API já aceita diretamente os formatos
// típicos de nota de voz do WhatsApp (ex.: ogg/opus).
function _prepareAudioFile(buffer, mimeType) {
  const tipoBase = mimeType?.split(";")[0]?.trim();
  const extensao = EXTENSAO_POR_MIME_TYPE[tipoBase] ?? "ogg";

  return { buffer, filename: `audio.${extensao}`, mimeType };
}

// Baixa, prepara e transcreve uma mensagem de áudio via aiClient.transcribeAudio.
export async function transcribeAudioMessage({ aiClient, mediaFetcher, media }) {
  let midia;
  try {
    midia = await mediaFetcher.download(media);
  } catch (erroOriginal) {
    throw new MediaDownloadError("falha ao baixar o áudio", { cause: erroOriginal });
  }

  const audioFile = _prepareAudioFile(midia.buffer, midia.mimeType);

  try {
    return await aiClient.transcribeAudio(audioFile);
  } catch (erroOriginal) {
    throw new AudioTranscriptionError("falha ao transcrever o áudio", { cause: erroOriginal });
  }
}
