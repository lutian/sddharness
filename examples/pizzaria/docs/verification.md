# Verificação — Como demonstrar que o trabalho funciona

> Regra de ouro: **o agente não diz "funciona", ele demonstra**.
> Toda feature termina com evidência executável, não com afirmações.

## Níveis de verificação

### Nível 1 — Testes unitários (obrigatório)

Toda função pública exportada por um `index.js` de domínio em `src/` tem
pelo menos um teste em `tests/` que:

1. Cobre o caminho feliz.
2. Cobre pelo menos um caminho de erro, se a função puder falhar.

Comando:
```bash
npm test
```

(equivalente a `vitest run` — ver `package.json`).

### Nível 2 — Teste de integração de módulo (obrigatório para features com IO)

Features que tocam SQLite, arquivos de configuração ou o cardápio são
verificadas exercitando o módulo real contra um recurso temporário, não
um mock:

```javascript
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../src/db/index.js";

const dir = mkdtempSync(join(tmpdir(), "pizzaria-"));
const db = openDatabase(join(dir, "app.sqlite"));
// ...asserções sobre o estado real do banco...
rmSync(dir, { recursive: true, force: true });
```

Integrações com APIs externas (OpenAI, Nominatim, WhatsApp Web) são
verificadas com um dublê na borda HTTP — nunca batendo no serviço real.

### Nível 3 — Smoke test manual (opcional, mas recomendado)

Antes de encerrar a sessão, execute um fluxo ponta a ponta em modo
desenvolvimento:

```bash
npm run dev
```

e verifique manualmente o fluxo afetado pela feature (ex.: abrir o app,
conferir que o arquivo SQLite aparece na pasta de dados do usuário).

### Nível 4 — Rastreabilidade de requirements (obrigatório para features com `"sdd": true`)

Cada `R<n>` de `specs/<name>/requirements.md` deve poder ser mapeado a
pelo menos um teste concreto em `tests/`. O reviewer rejeita se faltar
cobertura.

O implementer documenta o mapa em `progress/impl_<name>.md`:

```markdown
## Rastreabilidade
- R1 → `cria o arquivo SQLite se não existir`
- R2 → `rejeita um telefone duplicado em clientes`
- R3 → `mantém apenas a sessão mais recente por cliente`
```

## Antipadrões (não fazer)

- ❌ "Adicionei o módulo, deveria funcionar." → falta teste executável.
- ❌ Teste que só verifica que a função não lança exceção. → precisa
  conferir o resultado concreto (linhas inseridas, arquivo criado, etc.).
- ❌ Mock do sistema de arquivos. → use um diretório temporário real
  (`fs.mkdtempSync`).
- ❌ Chamar APIs externas reais (OpenAI, Nominatim, WhatsApp) em um
  teste. → intercepte na borda HTTP com um dublê.
- ❌ Marcar a feature como `done` sem passar `./init.sh`.

## Verificação final antes de fechar

```bash
./init.sh           # deve terminar com [OK] Ambiente pronto
```

Se `./init.sh` estiver vermelho, **não** marque nada como `done`. Anote o
bloqueio em `progress/current.md` com status `blocked` em
`feature_list.json`.
