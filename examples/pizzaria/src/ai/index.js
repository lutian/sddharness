// src/ai/index.js — orquestração OpenAI/DeepSeek, Whisper, visão (superfície
// pública única do domínio; o restante dos arquivos deste diretório é interno).
export { transcribeAudioMessage } from "./audio.js";
export { describeImageMessage } from "./image.js";
export { describePdfMessage } from "./pdf.js";
export { injectTextoExtraido, processarMensagemMultimodal } from "./conversation.js";
export { selectChatClient } from "./modelSelector.js";
export { processarMensagemConversa } from "./conversationEngine.js";
export {
  AiError,
  AudioTranscriptionError,
  ChatCompletionError,
  ImageDescriptionError,
  IncompleteOrderDataError,
  MediaDownloadError,
  MissingApiKeyError,
  PdfConversionError,
  UnsupportedMediaTypeError,
} from "./errors.js";
export { createOpenAiChatClient } from "./adapters/openai-chat.js";
export { createDeepSeekChatClient } from "./adapters/deepseek-chat.js";
export { createOpenAiClient } from "./adapters/openai-client.js";
export { createHttpMediaFetcher } from "./adapters/http-media-fetcher.js";
export { createPdfConverter } from "./adapters/pdf-converter.js";
