// src/ai/adapters/openai-chat.js — adapter concreto que satisfaz o contrato
// ChatClientAdapter (src/ai/chatClient.js) usando o SDK `openai` (chat
// completions, JSON mode). Única fronteira do domínio src/ai/ que importa o
// SDK `openai` para o chat com a OpenAI — ver "Estratégia de teste sem rede
// real" em specs/feature-10/design.md.
import { OpenAI } from "openai";

const MODELO_PADRAO = "gpt-5.4-mini";

// Traduz o histórico de conversa ({ autor: "cliente"|"assistente", texto })
// para o formato de mensagens de chat esperado pelo SDK (papéis "user"/"assistant").
function montarMensagens({ systemPrompt, cardapio, historico, mensagemCliente }) {
  return [
    { role: "system", content: `${systemPrompt}${JSON.stringify(cardapio)}` },
    ...historico.map((item) => ({
      role: item.autor === "cliente" ? "user" : "assistant",
      content: item.texto,
    })),
    { role: "user", content: mensagemCliente },
  ];
}

// Cria um adapter concreto conectado à API real da OpenAI.
// options: { apiKey, model? } (model, padrão "gpt-5.4-mini")
export function createOpenAiChatClient(options = {}) {
  const { apiKey, model } = options;

  if (!apiKey) {
    throw new Error("createOpenAiChatClient: options.apiKey é obrigatório.");
  }

  const client = new OpenAI({ apiKey });

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
          "createOpenAiChatClient: resposta do modelo não é um JSON válido.",
        );
      }

      if (typeof dados.resposta !== "string") {
        throw new Error(
          "createOpenAiChatClient: resposta do modelo não contém o campo 'resposta'.",
        );
      }

      return dados;
    },
  };
}

export { montarMensagens };
