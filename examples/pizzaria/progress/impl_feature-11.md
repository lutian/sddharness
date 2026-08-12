# Implementação — feature-11: Sistema de Design — Tema Claro/Escuro e Componentes Base

## Resumo

Todas as 14 tasks de `specs/feature-11/tasks.md` foram executadas.
`./init.sh` passa 100%: **142 testes em 11 arquivos** (131 testes
pré-existentes das features 1–10, intactos, + 11 testes novos em
`tests/design-system.test.js`).

## Arquivos criados

- `src/ui/index.js`
- `src/ui/styles/tokens.css`
- `src/ui/theme/theme-storage.js`
- `src/ui/theme/ThemeProvider.jsx`
- `src/ui/theme/useTheme.js`
- `src/ui/components/ThemeToggle.jsx`
- `src/ui/components/Card.jsx`
- `src/ui/components/Badge.jsx`
- `src/ui/components/Button.jsx`
- `src/ui/components/Navbar.jsx`
- `tests/design-system.test.js`

## Arquivos alterados

- `package.json` — `dependencies`: `react`, `react-dom`;
  `devDependencies`: `@testing-library/react`,
  `@testing-library/jest-dom`, `jsdom` (T1).
- `vitest.config.js` — `environmentMatchGlobs` (jsdom só para
  `tests/design-system.test.js` e `tests/*-ui.test.js`, `node` como
  padrão) + `esbuild.jsx: 'automatic'`/`jsxImportSource: 'react'` para
  transformar os arquivos `.jsx` sem `@vitejs/plugin-react` (T12).
- `specs/feature-11/tasks.md` — T1–T14 marcadas `[x]`.

## Rastreabilidade R<n> → teste

| Requirement | Teste em `tests/design-system.test.js` |
|---|---|
| R1 | `describe("Sistema de design — tokens")` › `"copia literalmente os valores de :root, .light e .dark de docs/styles.css"` — compara, propriedade a propriedade, os valores extraídos via regex de `docs/styles.css` com os de `src/ui/styles/tokens.css`. |
| R2 | `describe("... tema claro/escuro")` › `"aplica o tema 'dark' por padrão quando não há preferência salva"` — verifica que `document.documentElement` recebe exatamente uma classe (`dark`, não `light`). |
| R3 | Mesmo teste acima (`localStorage` limpo em `beforeEach`, tema padrão `dark` aplicado). |
| R4 | `"aplica a preferência salva em localStorage['pizzaria-theme'] ao montar"` — pré-popula `localStorage["pizzaria-theme"] = "light"` e verifica que `light` (não `dark`) é aplicado. |
| R5 | `"alterna o tema e persiste a nova preferência ao clicar em ThemeToggle"` — clique alterna a classe do elemento raiz e atualiza `localStorage["pizzaria-theme"]`, nos dois sentidos (dark→light→dark). |
| R6 | `"chama toggleTheme() exatamente uma vez por clique"` — conta chamadas de `toggleTheme()` via uma sonda de clique, garante exatamente 1 por clique. |
| R7 | `describe("... componentes base")` › `"Card compõe a classe base 'glass-card' com uma className extra"` — `toHaveClass("glass-card")` e `toHaveClass("extra")` simultaneamente. |
| R8 | `"Badge aplica a classe correspondente a cada variant"` — itera `default`/`success`/`warning`/`danger` e verifica a classe CSS de cada uma. |
| R9 | `"Button repassa onClick, disabled e type sem alterá-los"` — verifica `type="submit"`, `disabled` e a classe de variante no `<button>` renderizado. |
| R10 | `"Navbar renderiza todos os children dentro de um elemento <nav>"` — verifica que `<nav>` contém logo, link e `ThemeToggle`, todos os children recebidos. |
| R11 | `"exporta ThemeProvider, useTheme, Card, Badge, Button, Navbar e ThemeToggle de src/ui/index.js"` — todos os imports vêm exclusivamente de `../src/ui/index.js`, nenhum de caminho interno. |
| R12 | Verificado por `./init.sh`: `tests/design-system.test.js` roda em `jsdom` (usa `document`/`localStorage`, que não existem em `node`) enquanto os 10 arquivos de teste das features 1–10 continuam rodando em `node` sem alteração de resultado (131 testes intactos). Configuração em `vitest.config.js` (`environmentMatchGlobs`). |
| R13 | `"lança um erro explícito quando useTheme() é chamado fora de ThemeProvider"` — `expect(() => render(...)).toThrow("useTheme deve ser usado dentro de um ThemeProvider")`. |

Todos os R1–R13 estão cobertos por pelo menos um teste concreto.

## Desvios/decisões de implementação dentro do escopo do spec

Estes pontos não estavam detalhados byte-a-byte no `design.md`, mas
foram resolvidos de forma consistente com as decisões já registradas
no spec (sem inventar requirements novos, sem adicionar dependências
não previstas):

1. **JSX em `tests/design-system.test.js`:** o `design.md` (Decisão 5)
   previa transformar JSX via `esbuild.jsx: 'automatic'`. Na prática,
   o plugin `vite:esbuild` usado internamente pelo Vitest exclui
   arquivos `.js` da transformação JSX por padrão (só transforma
   `.jsx`/`.tsx`/`.ts` nativamente) — forçar esse comportamento via
   `esbuild.include`/`loader` não funcionou de forma confiável no
   pipeline de testes do Vitest 2.1.9 usado neste projeto. Solução:
   `tests/design-system.test.js` permanece `.js` (conforme R12/T12
   exige) e usa `React.createElement` diretamente (importado como `h`)
   em vez de sintaxe JSX, evitando depender de um loader JSX para
   arquivos `.js`. Os componentes de produção continuam em `.jsx` e
   são transformados normalmente pelo esbuild (extensão já coberta
   pelo comportamento padrão do Vitest). Nenhuma dependência nova foi
   adicionada para resolver isso.
2. **Matchers de `@testing-library/jest-dom`:** o `design.md` citava
   `import "@testing-library/jest-dom"` no topo do arquivo de teste.
   A versão instalada (`6.5.0`) espera um `expect` global estilo Jest
   para se auto-registrar, indisponível porque o projeto
   conscientemente não ativa `test.globals` (decisão do próprio
   `design.md`, para não afetar os testes de backend). Solução:
   `import * as jestDomMatchers from "@testing-library/jest-dom/matchers"`
   + `expect.extend(jestDomMatchers)` usando o `expect` de `vitest` —
   mesmo resultado funcional (`toHaveClass`, `toBeDisabled`, etc.),
   sem `setupFiles` global, sem dependência nova.
3. **Classes CSS de variante (`Badge`/`Button`):** o `design.md` não
   detalhava nomes de classe nem cores específicas por variante. Foram
   adicionadas em `tokens.css` as classes `.badge-default`/
   `.badge-success`/`.badge-warning`/`.badge-danger` e
   `.btn-primary`/`.btn-secondary`/`.btn-ghost`, todas derivadas
   exclusivamente dos tokens já existentes (`--primary`, `--secondary`,
   `--muted`, `--accent`, `--foreground`, `--border`,
   `--gradient-button`), sem introduzir nenhum valor HSL novo — em
   linha com R1 ("sem paleta nova inventada") e R8/R9.
4. **`URL` global em ambiente `jsdom` (correção pós-review — ver
   `progress/review_feature-11.md`):** `import.meta.url`, ao contrário
   do que constava numa versão anterior deste documento, **é** uma URL
   `file://` real e válida também em ambiente `jsdom` neste projeto
   (confirmado experimentalmente). A causa raiz real do problema
   original é outra: em ambiente `jsdom`, o identificador global `URL`
   passa a apontar para a implementação do jsdom (não a do Node), e
   essa implementação **não** resolve corretamente um caminho relativo
   contra uma base `file://` — ela cai silenciosamente para a URL
   padrão de documento do jsdom (`http://localhost:3000/...`),
   descartando o `file://` de `import.meta.url`. Isso foi reproduzido
   isoladamente com `new URL("../docs/styles.css", import.meta.url)`
   dentro de um teste rodando em `jsdom`, inclusive importando `{ URL }`
   nomeado de `node:url` sem alias (o identificador `URL` continua
   sendo resolvido para a versão do jsdom nesse pipeline). A solução
   final usa `fileURLToPath(new NodeURL(...))`, importando `URL` de
   `node:url` **com alias** (`import { URL as NodeURL } from
   "node:url"`), o que evita esse comportamento e resolve
   `docs/styles.css`/`tokens.css` corretamente — alinhando com o padrão
   já usado nos demais testes de integração do projeto
   (`tests/geocoder-real.test.js`, `tests/whatsapp-adapter-real.test.js`,
   `tests/ai-adapters-real.test.js`), que rodam em ambiente `node` (sem
   esse problema) e usam `fileURLToPath(new URL(...), import.meta.url)`.

Nenhum desses pontos altera requirements, adiciona dependências fora
das já declaradas em `design.md`/T1, nem contraria qualquer decisão
registrada no spec — são detalhes de implementação necessários para
fazer o pipeline de teste (Decisão 5 do `design.md`) funcionar de
fato com as versões concretas instaladas.

## Verificação final

```
./init.sh
...
 Test Files  11 passed (11)
      Tests  142 passed (142)
[OK]    Todos os testes passam
[OK]    Ambiente pronto. Você pode começar a trabalhar.
```

## Correções pós-review (CHANGES_REQUESTED)

Ver `progress/review_feature-11.md` para o relatório completo do
reviewer. Duas correções foram aplicadas em `tests/design-system.test.js`:

### 1. Asserção de R1 fortalecida

O teste `"copia literalmente os valores de :root, .light e .dark de
docs/styles.css"` comparava apenas as propriedades que existiam em
**ambos** os arquivos (`if (propertyName in tokensProperties)`), o que
permitia que uma custom property obrigatória totalmente ausente de
`tokens.css` passasse despercebida. Corrigido para exigir
explicitamente, via `expect(...).toHaveProperty(...)`, que cada uma das
15 propriedades obrigatórias de R1 (`--background`, `--foreground`,
`--card`, `--primary`, `--secondary`, `--muted`, `--accent`,
`--border`, `--radius`, `--gradient-primary`, `--gradient-hero`,
`--gradient-card`, `--gradient-button`, `--shadow-glow`,
`--shadow-card`) esteja presente em `tokensProperties` — para cada
seletor onde a propriedade existe em `docs/styles.css` — falhando
explicitamente se estiver ausente, além de continuar comparando o
valor literal.

**Teste manual de regressão (executado e revertido nesta sessão):**
removida temporariamente a linha `--primary: 270 91% 65%;` do bloco
`:root` de `src/ui/styles/tokens.css` e rodado
`npx vitest run tests/design-system.test.js` → o teste de R1 **falhou**
explicitamente com a mensagem `":root deve conter a propriedade
obrigatória --primary: expected {...} to have property "--primary""`
(os outros 10 testes do arquivo continuaram passando). Arquivo
restaurado em seguida via cópia do backup; `git diff --stat
src/ui/styles/tokens.css` confirmou zero alteração residual. Rodado
`npx vitest run tests/design-system.test.js` novamente → 11/11 testes
passando. `./init.sh` completo → 142/142 testes passando.

### 2. Justificativa de `import.meta.url`/`URL` corrigida

A justificativa original ("o Vitest, em modo jsdom, não expõe
`import.meta.url` como uma URL `file://` real") estava **factualmente
incorreta**, como o reviewer comprovou. Investigação nesta sessão
confirmou o oposto: `import.meta.url` é, sim, uma URL `file://` válida
em `jsdom`. A causa raiz real é que o identificador global `URL` em
ambiente `jsdom` resolve para a implementação do jsdom (não a do
Node), que não usa `file://` como base ao resolver caminhos relativos.
A correção troca `path.join(process.cwd(), ...)` por
`fileURLToPath(new NodeURL(...))`, importando `URL` de `node:url` com
alias (necessário — importar `{ URL }` sem alias ainda resolve para a
versão do jsdom nesse pipeline de teste), alinhando o padrão com
`tests/geocoder-real.test.js` e `tests/whatsapp-adapter-real.test.js`.
Ver comentário atualizado no item 4 da seção "Desvios/decisões de
implementação" acima.

### Verificação final pós-correção

```
./init.sh
...
 Test Files  11 passed (11)
      Tests  142 passed (142)
[OK]    Todos os testes passam
[OK]    Ambiente pronto. Você pode começar a trabalhar.
```
