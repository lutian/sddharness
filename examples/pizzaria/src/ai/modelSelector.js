// src/ai/modelSelector.js — seleção do adapter de chat (openai/deepseek) a
// partir de config.modeloSelecionado.
import { MissingApiKeyError } from "./errors.js";

const MODELOS_VALIDOS = ["openai", "deepseek"];

// Seleciona o adapter de chat a usar (openai por padrão) a partir de
// config.modeloSelecionado. Lança MissingApiKeyError se a apiKey do modelo
// escolhido estiver ausente/vazia.
export function selectChatClient(adapters, config) {
  const modelo = MODELOS_VALIDOS.includes(config?.modeloSelecionado)
    ? config.modeloSelecionado
    : "openai";

  const apiKey = config?.apiKeys?.[modelo];
  if (!apiKey) {
    throw new MissingApiKeyError(
      `Chave de API ausente para o modelo selecionado "${modelo}".`
    );
  }

  return adapters[modelo];
}
