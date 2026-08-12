// src/ai/chatClient.js — contrato mínimo do adapter de chat/LLM injetável
// (OpenAI/DeepSeek) usado pelo motor de conversação.
//
// Qualquer integração concreta com a OpenAI, a DeepSeek (ou outro provedor
// compatível) deve ser envolvida por um adapter que satisfaça este contrato
// antes de ser injetada em `selectChatClient`/`processarMensagemConversa`.
// `src/ai/` nunca importa um SDK de LLM diretamente — ver `design.md` de
// feature-5.
//
// @typedef {object} ChatClientAdapter
// @property {(params: {
//   systemPrompt: string,
//   cardapio: object,
//   historico: Array<{ autor: "cliente" | "assistente", texto: string }>,
//   mensagemCliente: string,
// }) => Promise<{
//   resposta: string,
//   dadosCliente?: { nome?: string, endereco?: string, formaPagamento?: string },
//   pedido?: { itens: Array<{ nome: string, quantidade: number, preco: number }>, fechado: boolean },
// }>} generateReply
//   Gera a próxima resposta da conversa a partir do contexto completo
//   (system prompt, cardápio, histórico e mensagem atual do cliente),
//   podendo opcionalmente extrair dados do cliente e/ou fechar um pedido.

export {};
