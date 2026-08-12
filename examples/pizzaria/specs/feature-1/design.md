# Design — feature-1: Banco de Dados SQLite e Modelagem Inicial

## Arquivos a criar

```
src/db/
├── index.js       # superfície pública do domínio (única importável de fora)
├── errors.js       # DatabaseError e subtipos
├── schema.js        # DDL das tabelas (clientes, sessoes, pedidos) + PRAGMA
├── clientes.js       # queries internas: insertCliente, findClienteByTelefone, ...
├── sessoes.js         # queries internas: upsertSessao (remove anterior + insere nova)
└── pedidos.js          # queries internas: insertPedido (serializa itens em JSON)

tests/
└── database.test.js   # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo fora de `src/db/` é tocado nesta feature. Não se modifica
`electron/main.js` ainda (o registro de canais IPC que usam `src/db`
fica para uma feature posterior que o exija explicitamente).

## Dependência externa nova

- **Escolhida: `better-sqlite3`** (declarar em `package.json` como
  `dependency`, não `devDependency`).
  - Justificativa: API síncrona, o que se encaixa com o princípio de
    "carregar no início, modificar em memória/transação, salvar no
    final" de `docs/architecture.md`. Evita o aninhamento de callbacks
    ou promises para operações que neste domínio são inerentemente
    sequenciais (uma sessão de WhatsApp por vez). É a dependência SQLite
    de fato em projetos Electron por seu desempenho e estabilidade do
    binding nativo (binários pré-compilados para as plataformas alvo,
    incluindo Windows — relevante para feature-8).
  - **Alternativa descartada: `sqlite3` (pacote npm clássico, assíncrono
    com callbacks).** É descartada porque sua API baseada em callbacks
    obriga a envolver cada query em promises manualmente, contraria a
    convenção de `async/await` sem callbacks aninhados de
    `docs/conventions.md`, e não traz nenhuma vantagem aqui: não há
    necessidade de I/O não bloqueante no SQLite porque as operações são
    locais e rápidas, e o processo `main` do Electron já gerencia seu
    próprio loop de eventos para o restante do I/O (rede, WhatsApp).
  - **Alternativa descartada: `node:sqlite` (módulo experimental
    incluído no Node 22+).** É descartada porque o ambiente alvo fixa
    Node 20+ (`docs/architecture.md`) e o módulo ainda está marcado como
    experimental nas versões de Node suportadas; introduzir uma API
    instável da stdlib na camada de persistência central do app arrisca
    breaking changes sem benefício sobre `better-sqlite3`, que já é o
    padrão de fato e tem sua superfície pública congelada.

## Assinaturas novas (`src/db/index.js`)

```javascript
// Abre (ou cria) o banco de dados e garante o schema. Se path for
// omitido, resolve o caminho via userData (Electron) ou resolveUserDataPath.
export function openDatabase(path) // -> DatabaseHandle (instância better-sqlite3 encapsulada)

// Fecha a conexão de forma limpa.
export function closeDatabase(db) // -> void

// Insere um cliente novo. Lança DuplicatePhoneError se o telefone já existir.
// endereco, latitude e longitude são opcionais (undefined-safe: viram NULL
// se omitidos). Esta função NÃO geocodifica — apenas persiste os valores
// já resolvidos, se fornecidos (geocodificação é escopo de feature-6).
export function insertCliente(db, { telefone, nome, endereco, latitude, longitude })
// -> { id, telefone, nome, endereco, latitude, longitude, criado_em }

// Busca um cliente por telefone. Retorna null se não existir (não é um erro de domínio).
export function findClienteByTelefone(db, telefone)
// -> { id, telefone, nome, endereco, latitude, longitude, criado_em } | null

// Substitui a sessão ativa de um cliente por uma nova (remove a anterior).
export function upsertSessao(db, { clienteId, historico }) // -> { id, cliente_id, historico, atualizado_em }

// Insere um pedido; serializa `itens` (array) em JSON. Lança InvalidOrderStatusError
// se `status` não pertencer ao enum permitido.
export function insertPedido(db, { clienteId, itens, status, motoboy }) // -> pedido
```

## Exceções (`src/db/errors.js`)

```javascript
export class DatabaseError extends Error {}
export class DuplicatePhoneError extends DatabaseError {}
export class InvalidOrderStatusError extends DatabaseError {}
```

Seguindo `docs/conventions.md`: uma classe base por módulo
(`DatabaseError`) e subtipos concretos. Nenhum erro deste domínio é
representado retornando `null`/`undefined` silenciosamente (exceto
`findClienteByTelefone`, cujo "não encontrado" é um resultado válido de
uma busca, não uma falha).

## Schema (`src/db/schema.js`)

```sql
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefone TEXT NOT NULL UNIQUE,
  nome TEXT,
  endereco TEXT,
  latitude REAL,
  longitude REAL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL UNIQUE REFERENCES clientes(id),
  historico TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  itens TEXT NOT NULL,
  status TEXT NOT NULL,
  motoboy TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Nota de design para R12/R13 (endereço e coordenadas em `clientes`):
`endereco`, `latitude` e `longitude` são colunas anuláveis (sem `NOT NULL`)
porque o cliente pode ser cadastrado apenas com telefone e nome, antes de
qualquer confirmação de endereço. `insertCliente` passa `null` para o
`better-sqlite3` quando esses campos vêm `undefined` do chamador (o driver
não aceita `undefined` diretamente como parâmetro de bind, então
`insertCliente` normaliza `undefined -> null` antes do `INSERT`). Esta
feature não chama nenhuma API de geocodificação; `latitude`/`longitude`
só são preenchidas quando o chamador já as fornece prontas — a conversão
de `endereco` em coordenadas via Nominatim é responsabilidade de
feature-6 (`src/delivery/`), que reutilizará `insertCliente`/uma futura
`updateClienteEndereco` para persistir o resultado.

Nota de design para R7 (manter apenas a sessão mais recente por
cliente): o `UNIQUE` em `sessoes.cliente_id` torna a regra de negócio
impossível de violar em nível de schema. `upsertSessao` implementa a
substituição com `INSERT ... ON CONFLICT(cliente_id) DO UPDATE SET
historico = excluded.historico, atualizado_em = excluded.atualizado_em`
dentro de uma única sentença SQL (transacional por natureza no
`better-sqlite3`), evitando uma condição de corrida entre remover e
inserir.

## Resolução do caminho de dados do usuário (R2)

`src/db/index.js` não importa `electron` diretamente no caminho feliz de
teste (os testes rodam fora do processo Electron). Em vez disso:

```javascript
export function resolveUserDataPath(fileName = "app.sqlite") {
  // Se o módulo `electron` estiver disponível e `app` estiver pronto, usa
  // app.getPath("userData"). Caso contrário (contexto de teste / Node puro),
  // usa um diretório determinístico dentro do home do usuário.
}
```

Isso evita acoplar o teste de `src/db` à inicialização do Electron, em
linha com "sem IO no renderer" e com a prática de testar o módulo real
contra um diretório temporário (`docs/verification.md`, Nível 2). Os
testes de R1/R3/R4/R6/R7 passam um `path` explícito dentro de
`fs.mkdtempSync(os.tmpdir())`; o teste de R2 pode verificar apenas a
lógica de `resolveUserDataPath` de forma isolada (sem exigir o Electron
rodando), injetando variáveis de ambiente ou conferindo o fallback.

## Alternativa de estrutura descartada

Considerou-se expor `insertCliente`, `upsertSessao`, `insertPedido`,
etc. diretamente como métodos de uma classe `Database` em vez de funções
soltas que recebem `db` como primeiro argumento. É descartada porque
`docs/conventions.md` não usa um padrão de classes para os domínios de
`src/` (só para erros), e as funções puras que recebem a conexão são
mais fáceis de testar de forma isolada e consistentes com o restante do
projeto (ver exemplo `openDatabase(path)` em `docs/conventions.md`).
