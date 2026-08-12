# Design — feature-11: Sistema de Design — Tema Claro/Escuro e Componentes Base

## Contexto

Esta é a primeira feature de UI real do projeto. `package.json` hoje
(confirmado antes de escrever este spec) não tem nenhuma dependência de
React, testing-library ou bundler de frontend — só `vitest` como
dev-dependency e `better-sqlite3`/`mupdf`/`openai`/`whatsapp-web.js`
como dependências de backend. Esta feature introduz o mínimo necessário
para ter componentes React testáveis, sem ainda ligar nenhum app real
rodando na tela (isso é escopo de `feature-12`/`feature-13`/`feature-14`
— composition root e integração Electron).

## Arquivos a criar / tocar

```
src/ui/
├── index.js                        # NOVO — porta única de exportação do sistema de design
├── styles/
│   └── tokens.css                   # NOVO — cópia literal dos tokens de docs/styles.css
├── theme/
│   ├── ThemeProvider.jsx            # NOVO — contexto React de tema
│   ├── useTheme.js                  # NOVO — hook de consumo do contexto
│   └── theme-storage.js             # NOVO — leitura/escrita de localStorage
└── components/
    ├── Card.jsx                     # NOVO
    ├── Badge.jsx                    # NOVO
    ├── Button.jsx                   # NOVO
    ├── Navbar.jsx                   # NOVO
    └── ThemeToggle.jsx              # NOVO

package.json                         # MODIFICADO — novas dependencies/devDependencies (ver abaixo)
vitest.config.js                     # MODIFICADO — jsdom escopado só para testes de UI

tests/
└── design-system.test.js            # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo de `src/db/`, `src/menu/`, `src/whatsapp/`, `src/ai/`,
`src/delivery/` é tocado — esta feature é isolada em `src/ui/` (renderer,
`docs/architecture.md` princípio 2: "Sem IO no renderer" — nenhum
componente desta feature acessa disco/rede/IPC diretamente).

## Decisão 1 — Stack de frontend

**Escolha:** React + `@testing-library/react` + `@testing-library/jest-dom`
+ `jsdom` como `devDependency`, reaproveitando o `vitest` já presente no
projeto como test runner (nenhum novo test runner é introduzido).

Dependências novas em `package.json`:

- `dependencies`: `react`, `react-dom` (os componentes desta feature e
  das features 12/13 precisam de React em runtime, não só em teste).
- `devDependencies`: `@testing-library/react`, `@testing-library/jest-dom`,
  `jsdom`.

**Vite — decisão adiada, não instalada nesta feature.** O enunciado desta
feature pede para documentar a escolha de stack de bundler; a escolha de
projeto é **Vite** (bundler leve, padrão de fato para SPAs servidas por
um processo Electron local, sem necessidade de servidor Node próprio em
produção). Justificativa da escolha de Vite quando for necessária:

- Comparado a **Next.js** (alternativa descartada): Next.js embute
  roteamento server-side e um servidor Node próprio (`next start`) para
  SSR/ISR — recursos desnecessários aqui, já que a UI roda inteiramente
  dentro do processo `renderer` do Electron, servida localmente, sem
  necessidade de renderização no servidor nem de rotas HTTP dinâmicas.
  Adotar Next.js violaria `docs/architecture.md` princípio 3 ("não se
  adiciona uma dependência 'por via das dúvidas'") ao trazer um servidor
  HTTP completo para resolver um problema (empacotar alguns componentes
  React) que Vite resolve com uma configuração mínima.
- Comparado a Webpack/CRA (não avaliados em detalhe): Vite tem tempo de
  build/dev sensivelmente menor e configuração mínima, alinhado ao
  princípio de "stack mínimo justificado".

Entretanto, **esta feature não instala nem configura `vite`/
`@vitejs/plugin-react` em `package.json`** porque, no seu escopo atual,
nada consome um bundler: não há `index.html`, nem processo `main` do
Electron carregando essa UI (isso é o composition root de `feature-14`
e a app real de `feature-12`/`feature-13`). Instalar Vite agora seria
"por via das dúvidas" (`docs/architecture.md` princípio 3), sem nenhum
`acceptance` desta feature que o exija — os testes de
`tests/design-system.test.js` rodam via `vitest`, cujo motor interno já
usa Vite/esbuild para transformar JSX (ver Decisão 5), sem precisar de
`vite` como dependência declarada do projeto. A feature-12 (primeira a
efetivamente servir um app React bundlado) DEVE declarar e justificar
`vite`/`@vitejs/plugin-react` em seu próprio `design.md` quando chegar a
hora.

## Decisão 2 — Como os tokens de `docs/styles.css` chegam ao React

**Escolha: (a) cópia/adaptação literal para `src/ui/styles/tokens.css`,
importado globalmente.**

`src/ui/styles/tokens.css` contém, ipsis litteris, os blocos `:root`,
`.light` e `.dark` de `docs/styles.css` (linhas ~1477–1568) com todas as
custom properties HSL, gradientes (`--gradient-primary`,
`--gradient-hero`, `--gradient-card`, `--gradient-button`), sombras
(`--shadow-glow`, `--shadow-card`) e `--radius`, além do
`@import` da fonte `Space Grotesk` (linha 1 de `docs/styles.css`) e da
declaração `font-family: Space Grotesk, system-ui, sans-serif` aplicada
à raiz. Também inclui as classes utilitárias diretamente relevantes e já
usadas por essa paleta: `.glass-card`, `.gradient-text`,
`.gradient-button`, `.container`. Nenhuma outra seção de
`docs/styles.css` é copiada — em particular, ficam de fora: os blocos
`.lk-*` (SDK de vídeo/áudio LiveKit), `.driver-*` (lib de onboarding
Driver.js) e o extenso bloco de utilitários Tailwind gerado
(`.mt-4`, `.left-0`, etc.), que não são tokens de design e não têm
relação com esta feature.

`src/ui/index.js` importa `./styles/tokens.css` como *side effect*
(`import "./styles/tokens.css";`), garantindo que qualquer consumidor
que importe a porta única do sistema de design já recebe os tokens
carregados globalmente — sem exigir que cada feature (12, 13) repita o
import.

**Opção (b) descartada:** gerar um objeto JS de tokens a partir do CSS
(JS-in-CSS/CSS-in-JS) foi avaliada e descartada porque nenhum componente
desta feature precisa calcular ou interpolar valores de token em tempo
de execução via JavaScript — todos os componentes usam classes CSS que
referenciam `var(--token)` diretamente. Gerar um objeto JS duplicaria a
fonte da verdade (CSS e JS teriam que ser mantidos sincronizados
manualmente) sem nenhum requisito que o justifique agora.

## Decisão 3 — Mecanismo de alternância de tema

`docs/styles.css` já usa classes `.light`/`.dark` na raiz do documento.
Reaproveitamos esse padrão exatamente, via um contexto React:

```javascript
// src/ui/theme/theme-storage.js
export const THEME_STORAGE_KEY = "pizzaria-theme";
export function getStoredTheme() // -> "light" | "dark" | null
export function setStoredTheme(theme) // -> void (grava em localStorage)
```

```jsx
// src/ui/theme/ThemeProvider.jsx
export function ThemeProvider({ children, defaultTheme = "dark" })
// - Lê getStoredTheme() na montagem (useState inicializado de forma lazy).
// - SE não houver preferência salva, usa `defaultTheme` ("dark", R3).
// - Em um `useEffect`, aplica a classe do tema atual em
//   `document.documentElement.classList` (remove a classe oposta antes
//   de adicionar a atual, garantindo que nunca coexistam "light" e
//   "dark" simultaneamente).
// - Expõe { theme, setTheme, toggleTheme } via Context.Provider.
```

```javascript
// src/ui/theme/useTheme.js
export function useTheme() // -> { theme, setTheme, toggleTheme }
// SE chamado fora de <ThemeProvider>, o Context retorna o valor padrão
// `undefined` do `createContext()`; useTheme() detecta isso e lança
// `new Error("useTheme deve ser usado dentro de um ThemeProvider")` (R13).
```

`toggleTheme()` calcula o tema oposto ao atual, chama `setTheme(novo)` e
`setStoredTheme(novo)` (persistência, R5). `setTheme(tema)` exposto
diretamente também está disponível para uso futuro (ex.: um seletor
explícito de tema, fora do escopo binário de R5), mas não é exigido por
nenhum `R<n>` desta feature além do necessário para `toggleTheme`.

## Decisão 4 — Estrutura de pastas

```
src/ui/
├── index.js            # única porta pública (padrão já usado em src/db/, src/ai/, etc.)
├── styles/
│   └── tokens.css
├── theme/
│   ├── ThemeProvider.jsx
│   ├── useTheme.js
│   └── theme-storage.js
└── components/
    ├── Card.jsx
    ├── Badge.jsx
    ├── Button.jsx
    ├── Navbar.jsx
    └── ThemeToggle.jsx
```

`src/ui/index.js`:

```javascript
export { ThemeProvider } from "./theme/ThemeProvider.jsx";
export { useTheme } from "./theme/useTheme.js";
export { Card } from "./components/Card.jsx";
export { Badge } from "./components/Badge.jsx";
export { Button } from "./components/Button.jsx";
export { Navbar } from "./components/Navbar.jsx";
export { ThemeToggle } from "./components/ThemeToggle.jsx";
import "./styles/tokens.css";
```

As features 12 e 13 importam exclusivamente de `src/ui/index.js` (nunca
diretamente de `src/ui/components/*` ou `src/ui/theme/*`), preservando o
mesmo contrato de "domínio com `index.js` único" já usado em `src/db/`,
`src/menu/`, `src/whatsapp/`, `src/ai/`, `src/delivery/`
(`docs/conventions.md`).

## Decisão 5 — Estratégia de teste sem ambiente de navegador real

`tests/design-system.test.js` precisa montar componentes React de
verdade (`ThemeProvider`, `ThemeToggle`, `Card`, `Badge`, `Button`,
`Navbar`) e simular interações (clique no `ThemeToggle`), o que exige um
DOM — `jsdom` — e não pode rodar no ambiente `node` puro usado pelos
testes das features 1–10.

**Impacto nos testes já existentes:** nenhum, se o ambiente `jsdom` for
escopado **só** aos arquivos de teste de UI, via `environmentMatchGlobs`
do Vitest, em vez de trocar o `environment` global de `vitest.config.js`
(o que forçaria `jsdom` em todos os 9 arquivos de teste de backend já
`done`, adicionando overhead e risco de regressão sem necessidade):

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/design-system.test.js', 'jsdom'],
      ['tests/*-ui.test.js', 'jsdom'],
    ],
    include: ['tests/**/*.test.js'],
  },
});
```

O padrão `tests/*-ui.test.js` já cobre, de forma antecipada e sem
necessidade de nova alteração neste arquivo, os testes de UI previstos
em `feature-12` (`tests/config-panel-ui.test.js`) e `feature-13`
(`tests/kds-panel-ui.test.js`) — mas a introdução desses arquivos
concretos não é responsabilidade desta feature.

**Transformação de JSX sem plugin extra:** como `vite`/
`@vitejs/plugin-react` não são instalados nesta feature (Decisão 1), a
transformação de sintaxe JSX nos arquivos `.jsx` é configurada
diretamente via a opção `esbuild` do Vitest (que já usa esbuild
internamente, por depender de Vite como implementação, sem que o projeto
precise declarar `vite` em `package.json`):

```javascript
// vitest.config.js (trecho adicional)
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: { /* ... como acima ... */ },
});
```

Isso evita adicionar `@vitejs/plugin-react` como dependência só para
esta feature (alternativa descartada — ver abaixo), mantendo o stack
mínimo.

**Matchers de asserção:** `@testing-library/jest-dom` (ex.:
`toBeInTheDocument()`, `toHaveClass()`) é importado diretamente no topo
de `tests/design-system.test.js` (`import "@testing-library/jest-dom"`),
sem um `setupFiles` global em `vitest.config.js` — evitando qualquer
efeito colateral sobre os testes de backend em ambiente `node`.

### Alternativa descartada: `@vitejs/plugin-react`

Adicionar `@vitejs/plugin-react` ao `vitest.config.js` (via `plugins:
[react()]`) é a forma "padrão" de habilitar JSX + Fast Refresh em
projetos Vite. Foi descartada nesta feature porque Fast Refresh é um
recurso de desenvolvimento interativo (HMR) irrelevante para testes
automatizados via Vitest, e a opção nativa `esbuild.jsx: 'automatic'`
já resolve 100% da necessidade real (transformar JSX em chamadas
`React.createElement`/`jsx()`) sem dependência adicional. Quando
`feature-12` introduzir de fato o Vite como bundler de desenvolvimento
(com HMR), reavaliar a adição do plugin fica a cargo do `design.md`
daquela feature.

## Exceções

Nenhuma classe de erro de domínio nova é necessária. R13 usa `Error`
nativo do JavaScript (não uma classe de erro de domínio como
`DatabaseError`), porque é um erro de uso indevido de API React
(hook chamado fora do Provider), não uma falha de domínio de negócio —
segue o mesmo padrão que bibliotecas React consagradas (ex.: React
Router) usam para esse tipo de erro de programação.

## Fora do escopo desta feature

- Nenhum `index.html`/ponto de entrada Vite é criado — isso é
  responsabilidade de `feature-12`/`feature-13` (primeiras a servir um
  app real) e `feature-14` (composition root Electron).
- Nenhuma integração com IPC, `src/menu/`, `src/delivery/` etc. — os
  componentes desta feature são puramente apresentacionais, sem acesso a
  dados reais (`docs/architecture.md` princípio 2).
- Nenhum teste visual/pixel (screenshot, Chromatic, Percy) — fora do
  escopo, conforme o próprio `acceptance` original desta feature.
