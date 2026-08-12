// src/db/schema.js — DDL das tabelas clientes, sessoes e pedidos.

const CREATE_CLIENTES = `
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefone TEXT NOT NULL UNIQUE,
  nome TEXT,
  endereco TEXT,
  latitude REAL,
  longitude REAL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CREATE_SESSOES = `
CREATE TABLE IF NOT EXISTS sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL UNIQUE REFERENCES clientes(id),
  historico TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CREATE_PEDIDOS = `
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  itens TEXT NOT NULL,
  status TEXT NOT NULL,
  motoboy TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Garante que o schema completo exista no banco. Idempotente (IF NOT EXISTS).
export function ensureSchema(db) {
  db.exec(CREATE_CLIENTES);
  db.exec(CREATE_SESSOES);
  db.exec(CREATE_PEDIDOS);
}
