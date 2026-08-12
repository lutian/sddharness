// src/db/clientes.js — queries internas da tabela `clientes`.

import { DuplicatePhoneError } from "./errors.js";

// Insere um cliente novo. Lança DuplicatePhoneError se o telefone já existir.
// endereco, latitude e longitude são opcionais: quando vierem `undefined`,
// são normalizados para `null` antes do INSERT (better-sqlite3 não aceita
// `undefined` como parâmetro de bind). Esta função não geocodifica.
export function insertCliente(db, { telefone, nome, endereco, latitude, longitude }) {
  const stmt = db.prepare(`
    INSERT INTO clientes (telefone, nome, endereco, latitude, longitude)
    VALUES (@telefone, @nome, @endereco, @latitude, @longitude)
  `);

  const params = {
    telefone,
    nome: nome ?? null,
    endereco: endereco ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };

  let info;
  try {
    info = stmt.run(params);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new DuplicatePhoneError(`Já existe um cliente com o telefone "${telefone}".`);
    }
    throw error;
  }

  return findClienteById(db, info.lastInsertRowid);
}

// Busca um cliente por id. Retorna null se não existir.
export function findClienteById(db, id) {
  const row = db.prepare("SELECT * FROM clientes WHERE id = ?").get(id);
  return row ?? null;
}

// Busca um cliente por telefone. Retorna null se não existir (não é erro de domínio).
export function findClienteByTelefone(db, telefone) {
  const row = db.prepare("SELECT * FROM clientes WHERE telefone = ?").get(telefone);
  return row ?? null;
}

// Atualiza parcialmente um cliente existente: só altera as colunas cujo
// valor foi informado (`undefined` preserva o valor já salvo), via
// COALESCE por campo. Retorna o cliente atualizado.
export function updateCliente(db, id, { nome, endereco, latitude, longitude } = {}) {
  const stmt = db.prepare(`
    UPDATE clientes SET
      nome = COALESCE(@nome, nome),
      endereco = COALESCE(@endereco, endereco),
      latitude = COALESCE(@latitude, latitude),
      longitude = COALESCE(@longitude, longitude)
    WHERE id = @id
  `);

  stmt.run({
    id,
    nome: nome ?? null,
    endereco: endereco ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  });

  return findClienteById(db, id);
}
