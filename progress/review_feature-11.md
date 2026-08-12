# Review — feature feature-11

**Veredito:** APPROVED

Esta é a segunda rodada de revisão. A primeira (CHANGES_REQUESTED) apontou
dois problemas: (1) a asserção de R1 em `tests/design-system.test.js` era
estruturalmente fraca (ignorava silenciosamente propriedades ausentes em
`tokens.css`), e (2) a justificativa sobre `import.meta.url`/jsdom em
`progress/impl_feature-11.md` estava factualmente incorreta. Ambos foram
verificados nesta rodada e estão corrigidos.

## Verificação da correção 1 — asserção de R1 fortalecida

Em `tests/design-system.test.js:104-117`, o teste agora chama
`expect(tokensProperties, ...).toHaveProperty(propertyName)` **antes** de
comparar o valor, para cada uma das 15 `PROPRIEDADES_OBRIGATORIAS`
(linhas 74-90) que existam em `docs/styles.css` para o seletor em questão.
Isso faz com que uma propriedade ausente em `tokens.css` reprove o teste em
vez de ser silenciosamente pulada, corrigindo o antipadrão relatado
anteriormente.

**Reprodução manual (nesta revisão):**
1. Removida a linha `--primary: 270 91% 65%;` do bloco `:root` de
   `src/ui/styles/tokens.css`.
2. `npx vitest run tests/design-system.test.js` → **falhou** com
   `":root deve conter a propriedade obrigatória --primary: expected {...} to
   have property "--primary""` (10 dos 11 testes continuaram passando, só o
   de R1 falhou, como esperado).
3. Arquivo restaurado a partir de um backup; `git status --porcelain
   src/ui/styles/tokens.css` mostra apenas `?? src/ui/styles/tokens.css`
   (arquivo novo, não rastreado, como já era antes da alteração de teste) —
   nenhum resíduo de diff.
4. `npx vitest run tests/design-system.test.js` novamente → 11/11 passando.

Confirmado: a correção resolve de fato o problema 1.

## Verificação da correção 2 — justificativa de `import.meta.url`/`URL`

A nova justificativa (comentário em `tests/design-system.test.js:2-13` e
seção 4 de `progress/impl_feature-11.md`) afirma que `import.meta.url` **é**
uma URL `file://` válida em `jsdom`, mas que o identificador global `URL`
em ambiente `jsdom` resolve para a implementação do jsdom, que ignora essa
base `file://` e cai para `http://localhost:3000/...` — por isso o código
usa `import { URL as NodeURL } from "node:url"` (com alias) em vez do `URL`
global.

**Reprodução independente (nesta revisão):** criei um teste-sonda
`tests/zzz-probe-ui.test.js` (nome compatível com o padrão
`tests/*-ui.test.js` de `vitest.config.js`, portanto executado em `jsdom`)
comparando `new URL(...)` (global) com `new NodeURL(...)` (de `node:url`)
usando o mesmo `import.meta.url`:

- `import.meta.url` = `file:///.../tests/zzz-probe-ui.test.js` (uma URL
  `file://` real, confirmando que a causa raiz não é `import.meta.url` em
  si).
- `new URL("../docs/styles.css", import.meta.url).href` (global, em jsdom)
  = `http://localhost:3000/docs/styles.css` — **não resolve para `file://`**.
- `new NodeURL("../docs/styles.css", import.meta.url).href` (de `node:url`)
  = `file:///.../docs/styles.css` — resolve corretamente.

O arquivo-sonda foi removido após o teste; `git status --porcelain tests/`
não mostra resíduos.

A justificativa revisada é tecnicamente coerente e foi verificada de forma
independente. Confirmado: a correção resolve o problema 2.

## Rastreabilidade requirements ↔ testes

Reconfirmado sem alterações em relação à rodada anterior — R1-R13 todos
cobertos por pelo menos um teste concreto em `tests/design-system.test.js`,
agora com a asserção de R1 corrigida.

- R1: [x] `"copia literalmente os valores de :root, .light e .dark de docs/styles.css"` — agora exige presença + valor literal de cada propriedade obrigatória.
- R2: [x] `"aplica o tema 'dark' por padrão quando não há preferência salva"`
- R3: [x] mesmo teste acima
- R4: [x] `"aplica a preferência salva em localStorage['pizzaria-theme'] ao montar"`
- R5: [x] `"alterna o tema e persiste a nova preferência ao clicar em ThemeToggle"`
- R6: [x] `"chama toggleTheme() exatamente uma vez por clique"`
- R7: [x] `"Card compõe a classe base 'glass-card' com uma className extra"`
- R8: [x] `"Badge aplica a classe correspondente a cada variant"`
- R9: [x] `"Button repassa onClick, disabled e type sem alterá-los"`
- R10: [x] `"Navbar renderiza todos os children dentro de um elemento <nav>"`
- R11: [x] `"exporta ThemeProvider, useTheme, Card, Badge, Button, Navbar e ThemeToggle de src/ui/index.js"`
- R12: [x] verificado via `./init.sh` (11 arquivos, `environmentMatchGlobs`)
- R13: [x] `"lança um erro explícito quando useTheme() é chamado fora de ThemeProvider"`

## Tasks completas

- T1–T14: [x] todas marcadas `[x]` em `specs/feature-11/tasks.md` (14/14,
  confirmado por `grep -c '\[x\]'`), sem tasks pendentes.

## Checkpoints (CHECKPOINTS.md)

- C1: [x] `./init.sh` termina com exit code 0; 4 arquivos base e 3 docs
  presentes.
- C2: [x] apenas `feature-11` em `in_progress` em `feature_list.json`.
- C3: [x] `src/ui/` segue a estrutura de `docs/architecture.md`; sem
  `console.log`; dependências novas justificadas em `design.md` (Decisão 1).
- C4: [x] `./init.sh` reporta **142/142 testes** em **11 arquivos**, todos
  verdes, sem regressão nas features 1-10 (131 testes pré-existentes
  intactos) nem nos demais 10 testes de feature-11.
- C5: [x] nenhum arquivo temporário suspeito remanescente (probes de
  verificação desta revisão foram removidos, confirmado via `git status
  --porcelain`).
- C6: [x] `specs/feature-11/` tem os 3 arquivos; `requirements.md` em EARS
  estrito; todas as tasks `[x]`; todos os R1-R13 cobertos por teste
  concreto, incluindo agora R1 de forma robusta (falha se uma propriedade
  obrigatória estiver ausente).

## Conclusão

Os dois problemas apontados na rodada anterior foram corrigidos de forma
verificável:

1. O teste de R1 agora falha explicitamente quando uma propriedade
   obrigatória está ausente de `tokens.css` (reproduzido nesta revisão
   removendo `--primary` e confirmando a falha, depois restaurando o
   arquivo sem resíduo).
2. A justificativa sobre `URL`/`import.meta.url`/jsdom em
   `progress/impl_feature-11.md` foi corrigida e é tecnicamente precisa
   (reproduzida de forma independente nesta revisão: o `URL` global em
   jsdom resolve para `http://localhost:3000/...` em vez de `file://`,
   enquanto `node:url`'s `URL` resolve corretamente).

Nenhum outro ponto da rodada anterior (rastreabilidade R1-R13, tasks
T1-T14, valores literais de tokens batendo com `docs/styles.css`) sofreu
regressão. `./init.sh` está verde com 142/142 testes.

A feature-11 está aprovada.
