# Tasks — feature-11: Sistema de Design — Tema Claro/Escuro e Componentes Base

- [x] T1 — Adicionar `react` e `react-dom` em `dependencies`, e
      `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` em
      `devDependencies` de `package.json` (`npm install`).
      Cobre: R1–R13 (pré-requisito de todas).

- [x] T2 — Criar `src/ui/styles/tokens.css` copiando literalmente de
      `docs/styles.css`: o `@import` da fonte Space Grotesk, os blocos
      `:root`, `.light` e `.dark` (custom properties `--background`,
      `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`,
      `--accent`, `--border`, `--radius`, `--gradient-primary`,
      `--gradient-hero`, `--gradient-card`, `--gradient-button`,
      `--shadow-glow`, `--shadow-card`), a declaração `font-family` do
      `body`, e as classes `.glass-card`, `.gradient-text`,
      `.gradient-button`, `.container` — sem alterar nenhum valor
      numérico/HSL e sem copiar seções não relacionadas (`.lk-*`,
      `.driver-*`, utilitários Tailwind).
      Cobre: R1.

- [x] T3 — Criar `src/ui/theme/theme-storage.js` com
      `THEME_STORAGE_KEY = "pizzaria-theme"`, `getStoredTheme()` (lê
      `localStorage`, retorna `"light"`, `"dark"` ou `null`) e
      `setStoredTheme(theme)` (grava em `localStorage`).
      Cobre: R3, R4, R5.

- [x] T4 — Criar `src/ui/theme/ThemeProvider.jsx` com o componente
      `ThemeProvider({ children, defaultTheme = "dark" })`: inicializa o
      estado do tema a partir de `getStoredTheme() ?? defaultTheme`,
      aplica a classe do tema atual em `document.documentElement`
      (removendo a classe oposta antes de adicionar a nova) em um
      `useEffect`, e expõe `{ theme, setTheme, toggleTheme }` via
      `React.Context`. `toggleTheme()` alterna entre `"light"`/`"dark"`,
      chama `setStoredTheme(novoTema)` e atualiza o estado.
      Cobre: R2, R3, R4, R5.

- [x] T5 — Criar `src/ui/theme/useTheme.js` com o hook `useTheme()` que
      consome o contexto de `ThemeProvider.jsx`; SE o contexto estiver
      `undefined` (chamado fora do Provider), lança
      `new Error("useTheme deve ser usado dentro de um ThemeProvider")`.
      Cobre: R13.

- [x] T6 — Criar `src/ui/components/ThemeToggle.jsx` com o componente
      `ThemeToggle(props)`: renderiza um elemento clicável (ex.:
      `<button>`) que, no `onClick`, chama `toggleTheme()` obtido via
      `useTheme()`.
      Cobre: R6.

- [x] T7 — Criar `src/ui/components/Card.jsx` com o componente
      `Card({ children, className })`: renderiza um `<div>` com classe
      base `"glass-card"` composta com `className` (quando fornecida),
      sem substituir a classe base, e renderiza `children` dentro dele.
      Cobre: R7.

- [x] T8 — Criar `src/ui/components/Badge.jsx` com o componente
      `Badge({ children, variant = "default", className })`: mapeia
      `variant` (`"default"`, `"success"`, `"warning"`, `"danger"`) para
      uma classe CSS derivada dos tokens de cor de `tokens.css`, e
      renderiza `children` dentro de um elemento com essa classe.
      Cobre: R8.

- [x] T9 — Criar `src/ui/components/Button.jsx` com o componente
      `Button({ children, variant = "primary", className, onClick,
      disabled, type, ...rest })`: mapeia `variant` (`"primary"`,
      `"secondary"`, `"ghost"`) para uma classe CSS derivada dos tokens,
      e repassa `onClick`, `disabled`, `type` (e demais props via
      `...rest`) para o `<button>` subjacente sem alterá-los.
      Cobre: R9.

- [x] T10 — Criar `src/ui/components/Navbar.jsx` com o componente
      `Navbar({ children, className })`: renderiza um `<nav>` contendo
      integralmente os `children` recebidos, na ordem recebida.
      Cobre: R10.

- [x] T11 — Criar `src/ui/index.js` reexportando `ThemeProvider`,
      `useTheme`, `Card`, `Badge`, `Button`, `Navbar`, `ThemeToggle`, e
      importando `./styles/tokens.css` como efeito colateral.
      Cobre: R11.

- [x] T12 — Atualizar `vitest.config.js`: adicionar `environmentMatchGlobs`
      mapeando `tests/design-system.test.js` e `tests/*-ui.test.js` para
      o ambiente `jsdom`, mantendo `environment: 'node'` como padrão
      global; adicionar `esbuild: { jsx: 'automatic', jsxImportSource:
      'react' }` para transformar JSX sem exigir `@vitejs/plugin-react`.
      Cobre: R12.

- [x] T13 — Criar `tests/design-system.test.js` (Vitest +
      `@testing-library/react`, com `import "@testing-library/jest-dom"`
      no topo) contendo, no mínimo, os seguintes casos:
      - Copiar/derivar os valores de token de `docs/styles.css` (ex.:
        via leitura do arquivo-fonte com `fs.readFileSync` e uma
        expressão regular simples para extrair os blocos `:root`,
        `.light`, `.dark`) e comparar com os valores presentes em
        `src/ui/styles/tokens.css`, verificando igualdade literal.
        Cobre: R1.
      - Renderizar `<ThemeProvider><ThemeToggle /></ThemeProvider>` sem
        preferência salva em `localStorage` (limpo em `beforeEach`) e
        verificar que `document.documentElement` recebe a classe
        `"dark"`.
        Cobre: R2, R3.
      - Pré-popular `localStorage["pizzaria-theme"] = "light"` antes de
        renderizar `ThemeProvider` e verificar que `document.documentElement`
        recebe a classe `"light"` (e não `"dark"`).
        Cobre: R4.
      - Renderizar `<ThemeProvider><ThemeToggle /></ThemeProvider>`,
        disparar um clique em `ThemeToggle` (`fireEvent.click` ou
        `userEvent.click`) e verificar que a classe do elemento raiz
        alterna e que `localStorage["pizzaria-theme"]` é atualizado com
        o novo valor.
        Cobre: R5, R6.
      - Renderizar `Card` com `children` e uma `className` extra, e
        verificar (via `toHaveClass`) que o elemento resultante tem
        tanto `"glass-card"` quanto a classe extra.
        Cobre: R7.
      - Renderizar `Badge` com cada `variant` válida e verificar que a
        classe correspondente é aplicada.
        Cobre: R8.
      - Renderizar `Button` com `variant="secondary"`, `onClick`,
        `disabled` e `type="submit"`, e verificar que o `<button>`
        renderizado recebe exatamente essas props/atributos.
        Cobre: R9.
      - Renderizar `Navbar` com múltiplos `children` (ex.: um logo, um
        link e um `ThemeToggle`) e verificar que todos aparecem no DOM
        dentro de um elemento `<nav>`.
        Cobre: R10.
      - Importar `ThemeProvider`, `useTheme`, `Card`, `Badge`, `Button`,
        `Navbar`, `ThemeToggle` exclusivamente de `src/ui/index.js` (não
        de caminhos internos) e verificar que todos estão definidos.
        Cobre: R11.
      - Renderizar um componente de teste que chama `useTheme()` **sem**
        estar dentro de `ThemeProvider` e verificar que o render lança
        (ex.: via um `ErrorBoundary` de teste ou `expect(() =>
        render(...)).toThrow(...)`).
        Cobre: R13.
      Cobre: R1–R11, R13 (implementação de teste).

- [x] T14 — Executar `npm test` e `./init.sh`, confirmando que
      `tests/design-system.test.js` roda em `jsdom` (T12) e que todos os
      testes das features 1–10 continuam passando em `node` sem
      alteração de resultado; documentar a tabela de rastreabilidade
      R1–R13 → nome do teste em `progress/impl_feature-11.md` (a cargo
      do implementer, não deste spec).
      Cobre: R1–R13 (verificação final).
