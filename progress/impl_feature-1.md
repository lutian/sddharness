# Implementação — feature-1: Banco de Dados SQLite e Modelagem Inicial

## Resumo

Todas as tasks T1–T16 de `specs/feature-1/tasks.md` foram executadas e
marcadas `[x]`. `npm test` e `./init.sh` terminam verdes (12/12 testes
passando).

## Arquivos criados/alterados

- `package.json` / `package-lock.json` — `better-sqlite3` adicionado como
  `dependency` (T1).
- `src/db/errors.js` — `DatabaseError`, `DuplicatePhoneError`,
  `InvalidOrderStatusError` (T2).
- `src/db/schema.js` — DDL de `clientes`, `sessoes`, `pedidos` e
  `ensureSchema(db)` (T3).
- `src/db/index.js` — superfície pública: `resolveUserDataPath`,
  `openDatabase`, `closeDatabase`, reexporta `insertCliente`,
  `findClienteById`, `findClienteByTelefone`, `upsertSessao`,
  `insertPedido` e as classes de erro (T4).
- `src/db/clientes.js` — `insertCliente`, `findClienteById`,
  `findClienteByTelefone` (T5).
- `src/db/sessoes.js` — `upsertSessao` via
  `INSERT ... ON CONFLICT(cliente_id) DO UPDATE` (T6).
- `src/db/pedidos.js` — `insertPedido` com validação de enum de `status`
  e serialização JSON de `itens` (T7).
- `tests/database.test.js` — 12 testes Vitest cobrindo R1–R13, com
  `fs.mkdtempSync(os.tmpdir())` real por teste e limpeza em `afterEach`
  (T8–T15).

## Rastreabilidade

- R1 → `"cria o arquivo SQLite se não existir"`
- R2 → `"resolve o caminho do banco dentro do diretório de dados do usuário fora do Electron"`
- R3 → `"reabre um banco existente sem apagar os dados já gravados"`
- R4 → `"cria as tabelas clientes, sessoes e pedidos na primeira abertura"`
- R5 → `"rejeita um telefone duplicado em clientes"`
- R6 → `"cria as tabelas clientes, sessoes e pedidos na primeira abertura"` e `"mantém apenas a sessão mais recente por cliente"`
- R7 → `"mantém apenas a sessão mais recente por cliente"`
- R8 → `"cria as tabelas clientes, sessoes e pedidos na primeira abertura"` e `"insere um pedido serializando os itens em JSON e relê a mesma estrutura"`
- R9 → `"insere um pedido serializando os itens em JSON e relê a mesma estrutura"`
- R10 → `"rejeita um pedido com status fora do enum permitido"`
- R11 → `"fecha a conexão de forma limpa sem lançar exceção"`
- R12 → `"insere um cliente sem endereço nem coordenadas, gravando esses campos como null"`
- R13 → `"insere e relê um cliente com endereço e coordenadas de geolocalização"`

Teste adicional (`"armazena corretamente o nome do motoboy em um pedido"`)
reforça o critério de aceitação original sobre o campo `motoboy` em
`pedidos` (parte de R8).

## Verificação

```
npm test    → 12/12 testes passando
./init.sh   → [OK] Ambiente pronto. Você pode começar a trabalhar.
```

## Observações de implementação

- `resolveUserDataPath` usa `createRequire` (via `node:module`) para
  tentar carregar `electron` de forma opcional/síncrona, mantendo
  `openDatabase` totalmente síncrono (alinhado à justificativa de
  `better-sqlite3` em `design.md`). Fora do processo Electron (todos os
  testes), cai no fallback determinístico em
  `~/.pizzaria-whatsapp-delivery-desktop/`.
- `insertCliente` normaliza `endereco`/`latitude`/`longitude` ausentes
  (`undefined`) para `null` antes do `INSERT`, conforme especificado em
  `design.md` (R12).
- Nenhuma dependência ou decisão de design nova foi introduzida além do
  que já constava em `specs/feature-1/design.md`.

## Status

Feature permanece em `in_progress` em `feature_list.json` — a mudança
para `done` cabe ao `implementer` somente após aprovação do `reviewer`,
conforme o protocolo.
