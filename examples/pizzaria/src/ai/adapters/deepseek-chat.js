// src/ai/adapters/deepseek-chat.js — adapter concreto que satisfaz o
// contrato ChatClientAdapter (src/ai/chatClient.js) usando o SDK `openai`
// apontado para a API compatível da DeepSeek (baseURL customizada). Única
// fronteira do domínio src/ai/ que importa o SDK `openai` para o chat com a
// DeepSeek — ver "Estratégia de teste sem rede real" em
// specs/feature-10/design.md.
import { OpenAI } from "openai";

import { montarMensagens } from "./openai-chat.js";

const MODELO_PADRAO = "deepseek-v4-flash";
const BASE_URL_DEEPSEEK = "https://api.deepseek.com";

// Cria um adapter concreto conectado à API real da DeepSeek (compatível com
// o formato de requisição/resposta da OpenAI).
// options: { apiKey, model? } (model, padrão "deepseek-v4-flash")
export function createDeepSeekChatClient(options = {}) {
  const { apiKey, model } = options;

  if (!apiKey) {
    throw new Error("createDeepSeekChatClient: options.apiKey é obrigatório.");
  }

  const client = new OpenAI({ apiKey, baseURL: BASE_URL_DEEPSEEK });

  return {
    generateReply: async (params) => {
      const resposta = await client.chat.completions.create({
        model: model ?? MODELO_PADRAO,
        messages: montarMensagens(params),
        response_format: { type: "json_object" },
      });

      const conteudo = resposta.choices[0].message.content;
      let dados;
      try {
        dados = JSON.parse(conteudo);
      } catch {
        throw new Error(
          "createDeepSeekChatClient: resposta do modelo não é um JSON válido.",
        );
      }

      if (typeof dados.resposta !== "string") {
        throw new Error(
          "createDeepSeekChatClient: resposta do modelo não contém o campo 'resposta'.",
        );
      }

      return dados;
    },
  };
}
