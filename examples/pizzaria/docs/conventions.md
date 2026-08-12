# Convenções de código

> Homogeneidade extrema. A IA prevê melhor quando o repositório se parece
> consigo mesmo em todos os lugares.

## Estilo JavaScript

- **Runtime:** Node.js 20+, módulos ES (`import`/`export`), `package.json`
  com `"type": "module"`.
- **Formatação:** 2 espaços de indentação. Linhas com no máximo 100
  caracteres.
- **Imports:** pacotes do npm primeiro, depois locais (caminhos
  relativos). Um import por linha, exceto desestruturação curta
  (`import { a, b } from "..."`).
- **Strings:** aspas duplas `"..."` para literais simples; template
  literals (`` `...` ``) para interpolação. Nada de concatenação com `+`.
- **Async:** `async`/`await` sempre. Nada de callbacks aninhados nem
  `.then()` encadeado, exceto na borda de uma biblioteca que exija.

## Nomes

| Tipo                     | Convenção          | Exemplo                  |
|---------------------------|---------------------|----------------------------|
| Arquivos de módulo        | `kebab-case.js`     | `whatsapp-queue.js`       |
| Componentes React         | `PascalCase.jsx`    | `OrderCard.jsx`            |
| Classes                   | `PascalCase`        | `DatabaseError`            |
| Funções / variáveis       | `camelCase`         | `loadMenu`                 |
| Constantes                 | `UPPER_SNAKE`       | `DEFAULT_DB_PATH`          |
| Privadas (módulo)         | prefixo `_`         | `_atomicWrite`             |

## Estrutura de um domínio em `src/`

Cada domínio (`src/db/`, `src/menu/`, …) expõe sua superfície pública em
um único `index.js`:

```javascript
// src/db/index.js — persistência SQLite: clientes, sessões, pedidos.
import Database from "better-sqlite3";

import { DatabaseError } from "./errors.js";

export function openDatabase(path) { /* ... */ }
```

Os detalhes internos (queries, mapeamentos) ficam em outros arquivos do
mesmo diretório e não são importados de fora do domínio.

## Testes

- Um arquivo de teste por módulo público: `tests/<domínio>.test.js`
  (ex.: `tests/database.test.js` para `src/db/`).
- Estrutura Vitest: `describe("<Domínio>", () => { it("...", () => {}) })`.
- Cada teste usa um diretório temporário real
  (`fs.mkdtempSync(os.tmpdir())`) e o limpa em `afterEach`. Nada de mocks
  do sistema de arquivos.
- As chamadas de rede (OpenAI, Nominatim, WhatsApp Web) são interceptadas
  na borda HTTP (ex.: com um dublê de `fetch` ou do cliente concreto).
  Nunca se bate na API real a partir de um teste.
- Nomes de teste descritivos, em português: `"cria o arquivo SQLite se
  não existir"`.

## Tratamento de erros

Exceções de domínio, uma classe base por módulo e subtipos concretos:

```javascript
export class DatabaseError extends Error {}
export class ClientNotFoundError extends DatabaseError {}
```

Os processos de borda (handlers IPC em `electron/main.js`, integrações
externas) capturam as exceções de domínio e as traduzem em uma resposta
segura para quem chamou. Nunca se propaga um stack trace cru para a UI.

## Comentários

Por padrão **não** se escrevem. Só são permitidos quando explicam um
*porquê* não óbvio (ex.: workaround documentado, invariante sutil,
decisão de segurança). Os nomes devem fazer o resto do trabalho.
