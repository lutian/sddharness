import { readFileSync } from "node:fs";
// Importa `URL` de `node:url` com um alias (`NodeURL`) porque, neste
// arquivo, o ambiente de teste é `jsdom` (environmentMatchGlobs em
// vitest.config.js). Confirmado experimentalmente: em jsdom, o
// identificador global `URL` resolve para a implementação do jsdom, que
// não usa `import.meta.url` (uma string `file://` válida) como base ao
// resolver um caminho relativo — ela cai para a URL padrão de documento
// do jsdom (`http://localhost:3000/...`). Isso ocorre mesmo importando
// `{ URL }` nomeado de `node:url` sem alias, então o alias é necessário
// para obter de fato o construtor `URL` do Node e resolver `file://`
// corretamente, como nos demais testes de integração do projeto
// (`tests/geocoder-real.test.js`, `tests/whatsapp-adapter-real.test.js`),
// que rodam em ambiente `node` e por isso não sofrem esse problema.
import { fileURLToPath, URL as NodeURL } from "node:url";

import * as jestDomMatchers from "@testing-library/jest-dom/matchers";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// `@testing-library/jest-dom` (import direto) espera um `expect` global
// estilo Jest, indisponível aqui porque o projeto não ativa
// `test.globals` (decisão consciente, ver specs/feature-11/design.md,
// Decisão 5 — nenhum `setupFiles` global para não afetar os testes de
// backend). `expect.extend` com os matchers importados isoladamente
// produz o mesmo resultado (`toBeInTheDocument`, `toHaveClass`, etc.)
// sem exigir um `expect` global.
expect.extend(jestDomMatchers);

import {
  Badge,
  Button,
  Card,
  Navbar,
  ThemeProvider,
  ThemeToggle,
  useTheme,
} from "../src/ui/index.js";

// Nota: este arquivo é `.js` (não `.jsx`), conforme exigido por R12/T12
// (`tests/design-system.test.js`), e o projeto não instala
// `@vitejs/plugin-react` (ver specs/feature-11/design.md, Decisão 5).
// Por isso os elementos React são criados com `React.createElement`
// (`h`), sem sintaxe JSX, evitando depender de um loader JSX para
// arquivos `.js` no pipeline de transformação do Vitest/esbuild.

const STYLES_CSS_PATH = fileURLToPath(new NodeURL("../docs/styles.css", import.meta.url));
const TOKENS_CSS_PATH = fileURLToPath(
  new NodeURL("../src/ui/styles/tokens.css", import.meta.url),
);

// Extrai as declarações `--propriedade: valor;` de dentro de um bloco CSS
// identificado por um seletor exato (ex.: ":root", ".light", ".dark").
function extractCustomProperties(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(`${escapedSelector}\\s*{([^}]*)}`, "m");
  const match = css.match(blockRegex);
  if (!match) {
    throw new Error(`Bloco ${selector} não encontrado`);
  }

  const properties = {};
  const propertyRegex = /(--[\w-]+)\s*:\s*([^;]+);?/g;
  let propertyMatch;
  while ((propertyMatch = propertyRegex.exec(match[1])) !== null) {
    properties[propertyMatch[1]] = propertyMatch[2].trim();
  }
  return properties;
}

// Custom properties exigidas explicitamente por R1 (mesmas listadas em
// specs/feature-11/requirements.md e design.md), verificadas para cada
// seletor onde se aplicam.
const PROPRIEDADES_OBRIGATORIAS = [
  "--background",
  "--foreground",
  "--card",
  "--primary",
  "--secondary",
  "--muted",
  "--accent",
  "--border",
  "--radius",
  "--gradient-primary",
  "--gradient-hero",
  "--gradient-card",
  "--gradient-button",
  "--shadow-glow",
  "--shadow-card",
];

describe("Sistema de design — tokens", () => {
  it("copia literalmente os valores de :root, .light e .dark de docs/styles.css", () => {
    const sourceCss = readFileSync(STYLES_CSS_PATH, "utf-8");
    const tokensCss = readFileSync(TOKENS_CSS_PATH, "utf-8");

    for (const selector of [":root", ".light", ".dark"]) {
      const sourceProperties = extractCustomProperties(sourceCss, selector);
      const tokensProperties = extractCustomProperties(tokensCss, selector);

      // Só exige em `tokensCss` as propriedades obrigatórias de R1 que de
      // fato existem em `docs/styles.css` para este seletor (ex.: `--radius`
      // só aparece em `:root`).
      for (const propertyName of PROPRIEDADES_OBRIGATORIAS) {
        if (!(propertyName in sourceProperties)) {
          continue;
        }

        expect(
          tokensProperties,
          `${selector} deve conter a propriedade obrigatória ${propertyName}`,
        ).toHaveProperty(propertyName);

        expect(tokensProperties[propertyName], `${selector} ${propertyName}`).toBe(
          sourceProperties[propertyName],
        );
      }
    }
  });
});

describe("Sistema de design — tema claro/escuro", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("aplica o tema 'dark' por padrão quando não há preferência salva", () => {
    render(h(ThemeProvider, null, h(ThemeToggle)));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("aplica a preferência salva em localStorage['pizzaria-theme'] ao montar", () => {
    window.localStorage.setItem("pizzaria-theme", "light");

    render(h(ThemeProvider, null, h(ThemeToggle)));

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("alterna o tema e persiste a nova preferência ao clicar em ThemeToggle", () => {
    render(h(ThemeProvider, null, h(ThemeToggle)));

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("pizzaria-theme")).toBe("light");

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("pizzaria-theme")).toBe("dark");
  });

  it("chama toggleTheme() exatamente uma vez por clique", () => {
    let chamadas = 0;

    function Sonda() {
      const { toggleTheme } = useTheme();
      return h(
        "button",
        {
          type: "button",
          onClick: () => {
            chamadas += 1;
            toggleTheme();
          },
        },
        "sonda",
      );
    }

    render(h(ThemeProvider, null, h(Sonda)));

    fireEvent.click(screen.getByText("sonda"));

    expect(chamadas).toBe(1);
  });

  it("lança um erro explícito quando useTheme() é chamado fora de ThemeProvider", () => {
    function ComponenteSemProvider() {
      useTheme();
      return null;
    }

    expect(() => render(h(ComponenteSemProvider))).toThrow(
      "useTheme deve ser usado dentro de um ThemeProvider",
    );
  });
});

describe("Sistema de design — componentes base", () => {
  afterEach(() => {
    cleanup();
  });

  it("Card compõe a classe base 'glass-card' com uma className extra", () => {
    const { container } = render(h(Card, { className: "extra" }, "conteúdo"));
    const card = container.firstChild;

    expect(card).toHaveClass("glass-card");
    expect(card).toHaveClass("extra");
    expect(card).toHaveTextContent("conteúdo");
  });

  it("Badge aplica a classe correspondente a cada variant", () => {
    const variantes = {
      default: "badge-default",
      success: "badge-success",
      warning: "badge-warning",
      danger: "badge-danger",
    };

    for (const [variant, classeEsperada] of Object.entries(variantes)) {
      const { container, unmount } = render(h(Badge, { variant }, "rótulo"));
      expect(container.firstChild).toHaveClass(classeEsperada);
      unmount();
    }
  });

  it("Button repassa onClick, disabled e type sem alterá-los", () => {
    const aoClicar = () => {};

    render(
      h(
        Button,
        { variant: "secondary", onClick: aoClicar, disabled: true, type: "submit" },
        "salvar",
      ),
    );

    const botao = screen.getByRole("button", { name: "salvar" });
    expect(botao).toHaveAttribute("type", "submit");
    expect(botao).toBeDisabled();
    expect(botao).toHaveClass("btn-secondary");
  });

  it("Navbar renderiza todos os children dentro de um elemento <nav>", () => {
    render(
      h(
        Navbar,
        null,
        h("span", null, "logo"),
        h("a", { href: "/pedidos" }, "pedidos"),
        h(ThemeProvider, null, h(ThemeToggle)),
      ),
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toContainElement(screen.getByText("logo"));
    expect(nav).toContainElement(screen.getByText("pedidos"));
    expect(nav).toContainElement(screen.getByRole("button"));
  });

  it("exporta ThemeProvider, useTheme, Card, Badge, Button, Navbar e ThemeToggle de src/ui/index.js", () => {
    expect(ThemeProvider).toBeDefined();
    expect(useTheme).toBeDefined();
    expect(Card).toBeDefined();
    expect(Badge).toBeDefined();
    expect(Button).toBeDefined();
    expect(Navbar).toBeDefined();
    expect(ThemeToggle).toBeDefined();
  });
});
