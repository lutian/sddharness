# Tasks — feature-1: Banco de Dados SQLite e Modelagem Inicial

- [x] T1 — Adicionar `better-sqlite3` como `dependency` em `package.json`
      e atualizar `package-lock.json` (`npm install better-sqlite3`).
      Cobre: R1, R2, R3, R4, R6, R8.

- [x] T2 — Criar `src/db/errors.js` com `DatabaseError`,
      `DuplicatePhoneError`, `InvalidOrderStatusError`.
      Cobre: R5, R10.

- [x] T3 — Criar `src/db/schema.js` com o DDL de `clientes` (incluindo as
      colunas anuláveis `endereco`, `latitude`, `longitude`), `sessoes`
      (com `UNIQUE(cliente_id)`) e `pedidos`, e uma função interna
      `ensureSchema(db)` que executa o DDL com `IF NOT EXISTS`.
      Cobre: R3, R4, R6, R8.

- [x] T4 — Criar `src/db/index.js` com `resolveUserDataPath(fileName)` e
      `openDatabase(path)` (usa `resolveUserDataPath` quando `path` é
      omitido, invoca `ensureSchema`, retorna a conexão aberta) e
      `closeDatabase(db)`.
      Cobre: R1, R2, R3, R11.

- [x] T5 — Criar `src/db/clientes.js` com `insertCliente` (captura a
      violação `UNIQUE` do SQLite e relança `DuplicatePhoneError`;
      normaliza `endereco`/`latitude`/`longitude` ausentes para `null`
      antes do `INSERT`) e `findClienteByTelefone` (retorna também
      `endereco`, `latitude` e `longitude`); reexportar ambas de
      `src/db/index.js`.
      Cobre: R4, R5, R12, R13.

- [x] T6 — Criar `src/db/sessoes.js` com `upsertSessao` usando
      `INSERT ... ON CONFLICT(cliente_id) DO UPDATE`; reexportar de
      `src/db/index.js`.
      Cobre: R6, R7.

- [x] T7 — Criar `src/db/pedidos.js` com `insertPedido` (valida `status`
      contra o enum permitido antes de inserir, lança
      `InvalidOrderStatusError` se não coincidir; serializa `itens` com
      `JSON.stringify`); reexportar de `src/db/index.js`.
      Cobre: R8, R9, R10.

- [x] T8 — Escrever `tests/database.test.js` (Vitest, diretório
      temporário real via `fs.mkdtempSync(os.tmpdir())`, limpeza em
      `afterEach`): teste de criação do arquivo SQLite em `path`
      explícito e reabertura sem perda de dados.
      Cobre: R1, R3.

- [x] T9 — Adicionar em `tests/database.test.js`: teste de
      `resolveUserDataPath` (fallback fora do Electron) — não exige
      iniciar o app Electron completo.
      Cobre: R2.

- [x] T10 — Adicionar em `tests/database.test.js`: testes de criação
      das três tabelas (inspeção de `sqlite_master` ou inserção
      bem-sucedida de uma linha mínima válida em cada uma) e teste de
      telefone duplicado lançando `DuplicatePhoneError`.
      Cobre: R4, R5, R6, R8.

- [x] T11 — Adicionar em `tests/database.test.js`: teste que chama
      `upsertSessao` duas vezes para o mesmo `cliente_id` com
      históricos distintos e verifica que sobra apenas uma linha em
      `sessoes` com o histórico mais recente.
      Cobre: R7.

- [x] T12 — Adicionar em `tests/database.test.js`: teste de
      `insertPedido` que insere um array de itens e relê a linha,
      conferindo `JSON.parse(linha.itens)` igual ao array original;
      teste de `status` inválido lançando `InvalidOrderStatusError`;
      teste de `motoboy` armazenado corretamente.
      Cobre: R8, R9, R10.

- [x] T13 — Adicionar em `tests/database.test.js`: teste de
      `closeDatabase` sobre uma conexão válida sem lançar exceção.
      Cobre: R11.

- [x] T14 — Adicionar em `tests/database.test.js`: teste que chama
      `insertCliente` sem `endereco`/`latitude`/`longitude` e confere
      que o registro é inserido com sucesso e esses campos retornam
      `null` na releitura.
      Cobre: R12.

- [x] T15 — Adicionar em `tests/database.test.js`: teste que chama
      `insertCliente` informando `endereco`, `latitude` e `longitude`
      e confere, via `findClienteByTelefone`, que os três valores são
      lidos de volta exatamente como inseridos.
      Cobre: R13.

- [x] T16 — Executar `npm test` e `./init.sh`; documentar a tabela de
      rastreabilidade R1–R13 → nome do teste em
      `progress/impl_feature-1.md` (a cargo do implementer, não deste
      spec).
      Cobre: R1–R13 (verificação final).
