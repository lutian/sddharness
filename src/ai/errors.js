// src/ai/errors.js — hierarquia de erros do domínio de processamento multimodal.

export class AiError extends Error {}

export class MediaDownloadError extends AiError {}

export class AudioTranscriptionError extends AiError {}

export class ImageDescriptionError extends AiError {}

export class UnsupportedMediaTypeError extends AiError {}

export class PdfConversionError extends AiError {}

export class MissingApiKeyError extends AiError {}

export class ChatCompletionError extends AiError {}

export class IncompleteOrderDataError extends AiError {}
