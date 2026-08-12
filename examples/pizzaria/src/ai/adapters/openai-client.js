// src/ai/adapters/openai-client.js — adapter concreto que satisfaz o
// contrato AiClientAdapter (src/ai/client.js) usando o SDK `openai`
// (Whisper para transcrição de áudio, modelo de visão para descrição de
// imagem). Única fronteira do domínio src/ai/ que importa o SDK `openai`
// para esses dois usos — ver "Estratégia de teste sem rede real" em
// specs/feature-10/design.md.
import { OpenAI, toFile } from "openai";

const MODELO_TRANSCRICAO_PADRAO = "whisper-1";
const MODELO_VISAO_PADRAO = "gpt-5.4-mini";

// Cria um adapter concreto conectado à API real da OpenAI (Whisper + visão).
// options: { apiKey, transcriptionModel?, visionModel? }
export function createOpenAiClient(options = {}) {
  const { apiKey, transcriptionModel, visionModel } = options;

  if (!apiKey) {
    throw new Error("createOpenAiClient: options.apiKey é obrigatório.");
  }

  const client = new OpenAI({ apiKey });

  return {
    transcribeAudio: async ({ buffer, filename, mimeType }) => {
      const resposta = await client.audio.transcriptions.create({
        model: transcriptionModel ?? MODELO_TRANSCRICAO_PADRAO,
        file: await toFile(buffer, filename, { type: mimeType }),
      });

      return resposta.text;
    },
    describeImage: async ({ buffer, mimeType }) => {
      const resposta = await client.chat.completions.create({
        model: visionModel ?? MODELO_VISAO_PADRAO,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` },
              },
            ],
          },
        ],
      });

      return resposta.choices[0].message.content;
    },
  };
}
