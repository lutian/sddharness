// src/db/sessoes.js — queries internas da tabela `sessoes`.

// Substitui a sessão ativa de um cliente por uma nova. O UNIQUE em
// `sessoes.cliente_id` torna a regra "só a sessão mais recente" impossível
// de violar em nível de schema; o ON CONFLICT resolve a substituição em uma
// única sentença transacional, evitando condição de corrida.
export function upsertSessao(db, { clienteId, historico }) {
  const stmt = db.prepare(`
    INSERT INTO sessoes (cliente_id, historico, atualizado_em)
    VALUES (@clienteId, @historico, datetime('now'))
    ON CONFLICT(cliente_id) DO UPDATE SET
      historico = excluded.historico,
      atualizado_em = excluded.atualizado_em
  `);

  stmt.run({ clienteId, historico });

  return db.prepare("SELECT * FROM sessoes WHERE cliente_id = ?").get(clienteId);
}

// Busca a sessão ativa de um cliente, filtrando estritamente por
// `cliente_id`. Retorna null se não houver sessão salva (não é erro de
// domínio) — leitura simétrica a `upsertSessao`.
export function findSessaoByClienteId(db, clienteId) {
  const row = db.prepare("SELECT * FROM sessoes WHERE cliente_id = ?").get(clienteId);
  return row ?? null;
}
