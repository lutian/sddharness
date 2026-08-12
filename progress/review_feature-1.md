# Review — feature feature-1

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes

- R1: [x] coberto por `"cria o arquivo SQLite se não existir"` (tests/database.test.js:29)
- R2: [x] coberto por `"resolve o caminho do banco dentro do diretório de dados do usuário fora do Electron"` (tests/database.test.js:53)
- R3: [x] coberto por `"reabre um banco existente sem apagar os dados já gravados"` (tests/database.test.js:39)
- R4: [x] coberto por `"cria as tabelas clientes, sessoes e pedidos na primeira abertura"` (tests/database.test.js:60)
- R5: [x] coberto por `"rejeita um telefone duplicado em clientes"` (tests/database.test.js:73)
- R6: [x] coberto por `"cria as tabelas clientes, sessoes e pedidos na primeira abertura"` (tests/database.test.js:60)
- R7: [x] coberto por `"mantém apenas a sessão mais recente por cliente"` (tests/database.test.js:87)
- R8: [x] coberto por `"insere um pedido serializando os itens em JSON e relê a mesma estrutura"` (tests/database.test.js:102) e `"armazena corretamente o nome do motoboy em um pedido"` (tests/database.test.js:137)
- R9: [x] coberto por `"insere um pedido serializando os itens em JSON e relê a mesma estrutura"` (tests/database.test.js:102)
- R10: [x] coberto por `"rejeita um pedido com status fora do enum permitido"` (tests/database.test.js:122)
- R11: [x] coberto por `"fecha a conexão de forma limpa sem lançar exceção"` (tests/database.test.js:153)
- R12: [x] coberto por `"insere um cliente sem endereço nem coordenadas, gravando esses campos como null"` (tests/database.test.js:160)
- R13: [x] coberto por `"insere e relê um cliente com endereço e coordenadas de geolocalização"` (tests/database.test.js:177)

Todos os R1–R13 têm cobertura concreta. O mapa documentado em
`progress/impl_feature-1.md` confere com o que foi encontrado nos testes.

## Tasks completas

- T1: [x] `better-sqlite3` declarado como `dependency` em `package.json` (`"better-sqlite3": "^13.0.3"`).
- T2: [x] `src/db/errors.js` com `DatabaseError`, `DuplicatePhoneError`, `InvalidOrderStatusError`.
- T3: [x] `src/db/schema.js` com DDL das três tabelas e `ensureSchema(db)`.
- T4: [x] `src/db/index.js` com `resolveUserDataPath`, `openDatabase`, `closeDatabase`.
- T5: [x] `src/db/clientes.js` com `insertCliente`/`findClienteByTelefone` (e `findClienteById` extra), reexportadas em `index.js`.
- T6: [x] `src/db/sessoes.js` com `upsertSessao` via `ON CONFLICT`.
- T7: [x] `src/db/pedidos.js` com `insertPedido`, validação de enum e serialização JSON.
- T8: [x] Teste de criação de arquivo e reabertura sem perda de dados.
- T9: [x] Teste de `resolveUserDataPath` fora do Electron.
- T10: [x] Teste de criação das três tabelas e telefone duplicado.
- T11: [x] Teste de `upsertSessao` mantendo apenas uma linha por cliente.
- T12: [x] Testes de `insertPedido` (JSON, status inválido, motoboy).
- T13: [x] Teste de `closeDatabase` sem lançar exceção.
- T14: [x] Teste de `insertCliente` sem endereço/coordenadas → `null`.
- T15: [x] Teste de `insertCliente` com endereço/coordenadas → releitura exata.
- T16: [x] `npm test` e `./init.sh` executados verdes nesta revisão (12/12 testes); rastreabilidade documentada em `progress/impl_feature-1.md`.

Todas as 16 tasks de `specs/feature-1/tasks.md` estão marcadas `[x]`, sem
pendências.

## Revisão de código contra architecture.md e conventions.md

- **Camadas por domínio / `index.js` como única superfície pública**: `src/db/index.js`
  concentra `openDatabase`, `closeDatabase`, `resolveUserDataPath` e reexporta
  `insertCliente`, `findClienteById`, `findClienteByTelefone`, `upsertSessao`,
  `insertPedido` e as classes de erro. `clientes.js`, `sessoes.js`, `pedidos.js`,
  `schema.js` e `errors.js` são internos ao domínio e só são importados de
  dentro de `src/db/`. Nenhum outro diretório de `src/` foi tocado. Conforme
  `docs/architecture.md` §1.
- **Sem IO no renderer**: não há `src/ui/` nesta feature; `src/db/` é
  consumido apenas pelo processo `main` (ainda não integrado a
  `electron/main.js`, conforme escopo declarado em `design.md`). OK.
- **Dependência externa justificada**: `better-sqlite3` está declarada em
  `design.md` (seção "Dependência externa nova") com duas alternativas
  descartadas (`sqlite3` callback-based, `node:sqlite` experimental) e
  motivo de escolha (API síncrona alinhada ao princípio de
  "carregar → modificar → salvar" de `docs/architecture.md`). Conforme §3.
- **Erros explícitos com classes nomeadas**: `DatabaseError` como base,
  `DuplicatePhoneError` e `InvalidOrderStatusError` como subtipos
  concretos, capturando a violação `SQLITE_CONSTRAINT_UNIQUE` do driver e
  relançando o erro de domínio (`src/db/clientes.js:26-30`). Conforme
  `docs/conventions.md` "Tratamento de erros". `findClienteByTelefone`/
  `findClienteById` retornam `null` em vez de lançar, o que é
  explicitamente justificado no `design.md` como "não é erro de domínio,
  é resultado válido de busca" — coerente.
- **Nomenclatura**: arquivos em `kebab-case.js` (na prática nomes simples
  sem hífen, mas dentro do padrão), classes em `PascalCase`, funções em
  `camelCase`, sem violações encontradas.
- **Sem `console.log`/TODOs soltos**: busca em `src/db/` não retornou
  ocorrências.
- **Testes com diretório temporário real**: `tests/database.test.js` usa
  `fs.mkdtempSync(join(tmpdir(), "pizzaria-"))` em `beforeEach` e
  `rmSync` em `afterEach`, sem mocks de fs, conforme
  `docs/conventions.md` "Testes". Nomes de teste descritivos em
  português.
- **ESM**: `package.json` tem `"type": "module"`, todos os arquivos usam
  `import`/`export`.

Nenhuma violação de arquitetura ou convenções encontrada nos arquivos
revisados (`src/db/index.js`, `errors.js`, `schema.js`, `clientes.js`,
`sessoes.js`, `pedidos.js`, `tests/database.test.js`).

## Execução

```
./init.sh  → [OK] Ambiente pronto. Você pode começar a trabalhar. (12/12 testes)
npm test   → 12/12 testes passando
```

Ambos verdes nesta revisão.

## Checkpoints

- C1: [x] `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md` existem;
      `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md` existem;
      `./init.sh` termina com exit code 0.
- C2: [x] Apenas `feature-1` está em `in_progress`; demais `pending`. Nenhuma feature
      `done` ainda, então não há verificação adicional de testes associados a `done`.
      `progress/current.md` descreve a sessão ativa, sem lixo de sessões anteriores.
- C3: [x] `src/` contém apenas `src/db/`, domínio previsto em `docs/architecture.md`.
      `better-sqlite3` está justificada em `specs/feature-1/design.md`. Sem
      `console.log` soltos nem TODOs sem contexto em `src/db/`.
- C4: [x] `tests/database.test.js` cobre o único módulo público existente
      (`src/db/index.js`). Usa `fs.mkdtempSync` real. `npm test` mostra 12
      testes, todos verdes.
- C5: [x] Nenhum arquivo não rastreado suspeito (`*.tmp`, `node_modules/`,
      `*.sqlite`) fora do `.gitignore` — `git status` mostra apenas
      arquivos de código-fonte e specs legítimos como não rastreados
      (aguardando commit, não é problema de sessão). `progress/history.md`
      tem entradas de sessões anteriores; a entrada da sessão atual está em
      `progress/current.md` (ainda não movida para `history.md`, o que é
      esperado pois a feature ainda não foi fechada/`done`). A feature-1
      está corretamente refletida como `in_progress`.
- C6: [x] `specs/feature-1/` tem os 3 arquivos (`requirements.md`,
      `design.md`, `tasks.md`). `requirements.md` usa EARS estrito (padrões
      Evento/Ubíquo/Indesejado claramente identificados R1–R13). Feature
      ainda não está `done`, portanto a task "toda feature `done` com
      tasks `[x]`" não se aplica ainda — mas todas as 16 tasks já estão
      `[x]`, o que habilita a transição para `done`. Cada `R<n>` está
      coberto por teste concreto (ver seção de rastreabilidade acima).

## Observação final

A feature está pronta para transição `in_progress → done`. Não há
mudanças necessárias.
