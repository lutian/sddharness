// src/db/index.js — persistência SQLite: clientes, sessões, pedidos.
import { homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

import Database from "better-sqlite3";

const require = createRequire(import.meta.url);

import { ensureSchema } from "./schema.js";
import {
  insertCliente,
  findClienteById,
  findClienteByTelefone,
  updateCliente,
} from "./clientes.js";
import { upsertSessao, findSessaoByClienteId } from "./sessoes.js";
import {
  contarPedidosAtivos,
  insertPedido,
  updateStatusPedido,
  atribuirMotoboy,
  listPedidosAtivosComCliente,
} from "./pedidos.js";

export {
  DatabaseError,
  DuplicatePhoneError,
  InvalidOrderStatusError,
  OrderNotFoundError,
  InvalidStatusTransitionError,
  InvalidMotoboyError,
} from "./errors.js";

// Resolve o caminho do arquivo SQLite dentro da pasta de dados do usuário.
// Quando o processo Electron está disponível e `app` já está pronto, usa
// `app.getPath("userData")`. Fora do processo Electron (ex.: testes), usa um
// diretório determinístico dentro do home do usuário.
export function resolveUserDataPath(fileName = "app.sqlite") {
  try {
    const { app } = require("electron");
    if (app && app.isReady()) {
      return join(app.getPath("userData"), fileName);
    }
  } catch {
    // `electron` não está disponível (contexto de teste fora do Electron).
  }

  return join(homedir(), ".pizzaria-whatsapp-delivery-desktop", fileName);
}

// Abre (ou cria) o banco de dados e garante o schema. Se path for omitido,
// resolve o caminho via userData (Electron) ou resolveUserDataPath.
export function openDatabase(path) {
  const resolvedPath = path ?? resolveUserDataPath();
  const db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

// Fecha a conexão de forma limpa.
export function closeDatabase(db) {
  db.close();
}

export {
  insertCliente,
  findClienteById,
  findClienteByTelefone,
  updateCliente,
  upsertSessao,
  findSessaoByClienteId,
  insertPedido,
  contarPedidosAtivos,
  updateStatusPedido,
  atribuirMotoboy,
  listPedidosAtivosComCliente,
};
