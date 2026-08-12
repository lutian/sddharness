// src/ai/conversationEngine.js — orquestração completa do motor de
// conversação: seleciona o modelo, resolve/cria o cliente por telefone
// (obtendo o id interno), monta o contexto (system prompt + cardápio +
// histórico da sessão do id interno), aciona o adapter de chat e persiste
// os efeitos colaterais da conversa (sessão, cliente, pedido).
import {
  findClienteByTelefone,
  findSessaoByClienteId,
  insertCliente,
  insertPedido,
  updateCliente,
  upsertSessao,
} from "../db/index.js";

import { ChatCompletionError, IncompleteOrderDataError } from "./errors.js";
import { selectChatClient } from "./modelSelector.js";

// Processa uma mensagem de um cliente através do motor de conversação:
// seleciona o modelo (R1, R2, R3), resolve/cria o cliente por telefone
// antes de tocar em sessão (R4), monta o contexto (system prompt +
// cardápio + histórico), chama o adapter (R5-R9), persiste sessão/cliente
// (R8, R10, R11) e, quando aplicável, o pedido (R12-R14).
export async function processarMensagemConversa({
  db,
  clienteId, // telefone do cliente (formato de entrada externo, vindo do WhatsApp)
  mensagemCliente,
  adapters,
  config,
  cardapio,
}) {
  const client = selectChatClient(adapters, config);

  // R4 — resolve/cria o cliente por telefone antes de tocar em sessão,
  // obtendo o id interno usado em toda chamada subsequente a
  // findSessaoByClienteId/upsertSessao.
  let cliente = findClienteByTelefone(db, clienteId);
  if (!cliente) {
    cliente = insertCliente(db, { telefone: clienteId });
  }

  const sessaoExistente = findSessaoByClienteId(db, cliente.id);
  const historico = sessaoExistente ? JSON.parse(sessaoExistente.historico) : [];

  let respostaAdapter;
  try {
    respostaAdapter = await client.generateReply({
      systemPrompt: config.systemPrompt,
      cardapio,
      historico,
      mensagemCliente,
    });
  } catch (erroOriginal) {
    throw new ChatCompletionError(
      `Falha ao gerar resposta da conversa para o cliente "${clienteId}".`,
      { cause: erroOriginal }
    );
  }

  const novoHistorico = [
    ...historico,
    { autor: "cliente", texto: mensagemCliente },
    { autor: "assistente", texto: respostaAdapter.resposta },
  ];
  upsertSessao(db, { clienteId: cliente.id, historico: JSON.stringify(novoHistorico) });

  if (respostaAdapter.dadosCliente) {
    cliente = updateCliente(db, cliente.id, respostaAdapter.dadosCliente);
  }
  // se dadosCliente estiver ausente, `cliente` permanece o registro básico
  // resolvido em R4, sem nenhuma chamada a updateCliente (R11).

  let pedidoRegistrado = false;
  if (respostaAdapter.pedido?.fechado === true) {
    if (!cliente.nome || !cliente.endereco) {
      throw new IncompleteOrderDataError(
        `Não é possível fechar o pedido: cliente "${clienteId}" não possui nome e endereço preenchidos.`
      );
    }

    const payload = {
      lista: respostaAdapter.pedido.itens,
      formaPagamento: respostaAdapter.dadosCliente?.formaPagamento ?? null,
    };

    insertPedido(db, {
      clienteId: cliente.id,
      itens: payload,
      status: "recebido",
      motoboy: null,
    });
    pedidoRegistrado = true;
  }

  return {
    resposta: respostaAdapter.resposta,
    pedidoRegistrado,
    clienteId,
  };
}
