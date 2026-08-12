// src/db/pedidos.js — queries internas da tabela `pedidos`.

import {
  InvalidOrderStatusError,
  InvalidStatusTransitionError,
  InvalidMotoboyError,
  OrderNotFoundError,
} from "./errors.js";

const STATUS_PERMITIDOS = [
  "recebido",
  "em_preparo",
  "saiu_para_entrega",
  "concluido",
  "cancelado",
];

// Status considerados "demanda atual da cozinha": pedidos ainda não
// despachados para entrega nem finalizados. Subconjunto explícito de
// STATUS_PERMITIDOS, excluindo implicitamente "saiu_para_entrega",
// "concluido" e "cancelado".
const STATUS_DEMANDA_ATIVA = ["recebido", "em_preparo"];

// Status considerados "ativos" para efeito de listagem no painel KDS:
// diferente de STATUS_DEMANDA_ATIVA (que só conta demanda da cozinha,
// feature-6), inclui também "saiu_para_entrega".
const STATUS_PEDIDO_ATIVO_PAINEL = ["recebido", "em_preparo", "saiu_para_entrega"];

// Transições de status permitidas (ver specs/feature-7/design.md,
// "Transições de status permitidas"). Chave: status atual. Valor: lista de
// novoStatus aceitos.
const TRANSICOES_PERMITIDAS = {
  recebido: ["em_preparo", "cancelado"],
  em_preparo: ["saiu_para_entrega", "cancelado"],
  saiu_para_entrega: ["concluido"],
  concluido: [],
  cancelado: [],
};

// Insere um pedido; serializa `itens` (array) em JSON. Lança
// InvalidOrderStatusError se `status` não pertencer ao enum permitido.
export function insertPedido(db, { clienteId, itens, status, motoboy }) {
  if (!STATUS_PERMITIDOS.includes(status)) {
    throw new InvalidOrderStatusError(
      `Status de pedido inválido: "${status}". Valores permitidos: ${STATUS_PERMITIDOS.join(", ")}.`
    );
  }

  const stmt = db.prepare(`
    INSERT INTO pedidos (cliente_id, itens, status, motoboy)
    VALUES (@clienteId, @itens, @status, @motoboy)
  `);

  const info = stmt.run({
    clienteId,
    itens: JSON.stringify(itens),
    status,
    motoboy: motoboy ?? null,
  });

  return db.prepare("SELECT * FROM pedidos WHERE id = ?").get(info.lastInsertRowid);
}

// Conta quantos pedidos estão, no momento da chamada, com status "recebido"
// ou "em_preparo" — exclui explicitamente "saiu_para_entrega", "concluido" e
// "cancelado" da demanda atual da cozinha.
export function contarPedidosAtivos(db) {
  const placeholders = STATUS_DEMANDA_ATIVA.map(() => "?").join(", ");
  const row = db
    .prepare(`SELECT COUNT(*) AS total FROM pedidos WHERE status IN (${placeholders})`)
    .get(...STATUS_DEMANDA_ATIVA);
  return row.total;
}

// Busca um pedido por id, ou lança OrderNotFoundError se não existir.
function _buscarPedidoOuFalhar(db, id) {
  const pedido = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
  if (!pedido) {
    throw new OrderNotFoundError(`Pedido com id "${id}" não encontrado.`);
  }
  return pedido;
}

// Atualiza o status de um pedido existente, validando a transição (R6, R7,
// R8, R9). Lança OrderNotFoundError se `id` não existir; InvalidOrderStatusError
// se `novoStatus` não pertencer a STATUS_PERMITIDOS; InvalidStatusTransitionError
// se a transição não for permitida a partir do status atual, sem alterar o banco.
export function updateStatusPedido(db, id, novoStatus) {
  const pedidoAtual = _buscarPedidoOuFalhar(db, id);

  if (!STATUS_PERMITIDOS.includes(novoStatus)) {
    throw new InvalidOrderStatusError(
      `Status de pedido inválido: "${novoStatus}". Valores permitidos: ${STATUS_PERMITIDOS.join(", ")}.`
    );
  }

  const transicoesPermitidas = TRANSICOES_PERMITIDAS[pedidoAtual.status] ?? [];
  if (!transicoesPermitidas.includes(novoStatus)) {
    throw new InvalidStatusTransitionError(
      `Transição de status inválida: "${pedidoAtual.status}" → "${novoStatus}".`
    );
  }

  db.prepare("UPDATE pedidos SET status = ? WHERE id = ?").run(novoStatus, id);

  return db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
}

// Atribui o motoboy a um pedido existente (R9, R10, R11). Lança
// OrderNotFoundError se `id` não existir; InvalidMotoboyError se `motoboy`
// for null/undefined/string vazia após trim(), sem alterar o banco.
export function atribuirMotoboy(db, id, motoboy) {
  _buscarPedidoOuFalhar(db, id);

  const motoboyNormalizado = typeof motoboy === "string" ? motoboy.trim() : motoboy;
  if (!motoboyNormalizado) {
    throw new InvalidMotoboyError("Nome do motoboy é obrigatório e não pode ser vazio.");
  }

  db.prepare("UPDATE pedidos SET motoboy = ? WHERE id = ?").run(motoboyNormalizado, id);

  return db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
}

// Lista pedidos com status em STATUS_PEDIDO_ATIVO_PAINEL (R1, R2), ordenados
// por criado_em ascendente, cada um já com os dados do cliente via JOIN —
// sem cálculo de tempo de espera (isso é responsabilidade de src/delivery).
export function listPedidosAtivosComCliente(db) {
  const placeholders = STATUS_PEDIDO_ATIVO_PAINEL.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
      SELECT
        pedidos.id AS id,
        pedidos.cliente_id AS clienteId,
        pedidos.itens AS itens,
        pedidos.status AS status,
        pedidos.motoboy AS motoboy,
        pedidos.criado_em AS criadoEm,
        clientes.nome AS clienteNome,
        clientes.telefone AS clienteTelefone,
        clientes.endereco AS clienteEndereco,
        clientes.latitude AS clienteLatitude,
        clientes.longitude AS clienteLongitude
      FROM pedidos
      JOIN clientes ON clientes.id = pedidos.cliente_id
      WHERE pedidos.status IN (${placeholders})
      ORDER BY pedidos.criado_em ASC
    `
    )
    .all(...STATUS_PEDIDO_ATIVO_PAINEL);

  return rows;
}
