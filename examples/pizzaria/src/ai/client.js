// src/ai/client.js — contrato mínimo do adapter de IA (Whisper + Visão) injetável.
//
// Qualquer integração concreta com a OpenAI (ou outro provedor compatível)
// deve ser envolvida por um adapter que satisfaça este contrato antes de ser
// injetada em `transcribeAudioMessage`, `describeImageMessage`,
// `describePdfMessage` e `processarMensagemMultimodal`. `src/ai/` nunca
// importa o SDK `openai` diretamente — ver `design.md` de feature-4.
//
// @typedef {object} AiClientAdapter
// @property {(audio: { buffer: Buffer, filename: string, mimeType: string }) =>
//   Promise<string>} transcribeAudio
//   Transcreve um arquivo de áudio via Whisper, retornando o texto reconhecido.
// @property {(imagem: { buffer: Buffer, mimeType: string }) =>
//   Promise<string>} describeImage
//   Descreve o conteúdo de uma imagem via modelo de visão, retornando o
//   texto descritivo.

export {};
