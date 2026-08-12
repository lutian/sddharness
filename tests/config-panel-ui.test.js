// Nota: este arquivo é `.js` (não `.jsx`), mesma decisão documentada em
// `tests/design-system.test.js` (feature-11) — o projeto não instala
// `@vitejs/plugin-react`, então os elementos React são criados com
// `React.createElement` (`h`), sem sintaxe JSX, para não depender de um
// loader JSX específico para arquivos `.js`.
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `@testing-library/jest-dom` (import direto) espera um `expect` global
// estilo Jest, indisponível aqui porque o projeto não ativa `test.globals`
// (ver tests/design-system.test.js, mesma nota). `expect.extend` com os
// matchers importados isoladamente produz o mesmo resultado sem exigir um
// `expect` global.
expect.extend(jestDomMatchers);

import { InvalidConfigError } from "../src/menu/errors.js";
import { ThemeProvider } from "../src/ui/index.js";
import { ConfigPanel } from "../src/ui/panels/config/index.js";

const CARDAPIO_FIXTURE = {
  categorias: [
    {
      nome: "Pizzas",
      itens: [
        { nome: "Margherita", preco: 30 },
        { nome: "Calabresa", preco: 32 },
      ],
    },
    {
      nome: "Bebidas",
      itens: [{ nome: "Refrigerante", preco: 8 }],
    },
  ],
};

const CONFIG_FIXTURE = {
  apiKeys: { openai: "sk-openai-inicial", deepseek: "sk-deepseek-inicial" },
  systemPrompt: "Seja cordial e objetivo.",
  audioEnabled: false,
  imageEnabled: true,
  modeloSelecionado: "openai",
};

// Cria um dataClient fake (vi.fn() por método), sem tocar filesystem real
// nem IPC — conforme specs/feature-12/design.md, Decisão 4.
function criarDataClientFake(overrides = {}) {
  return {
    loadCardapio: vi.fn().mockResolvedValue(structuredClone(CARDAPIO_FIXTURE)),
    loadConfig: vi.fn().mockResolvedValue(structuredClone(CONFIG_FIXTURE)),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPainel(dataClient) {
  return render(h(ThemeProvider, null, h(ConfigPanel, { dataClient })));
}

describe("ConfigPanel — carregamento inicial", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("chama loadCardapio() e loadConfig() exatamente uma vez cada e renderiza os dados retornados", async () => {
    const dataClient = criarDataClientFake();

    renderPainel(dataClient);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Margherita")).toBeInTheDocument();
    });

    expect(dataClient.loadCardapio).toHaveBeenCalledTimes(1);
    expect(dataClient.loadConfig).toHaveBeenCalledTimes(1);

    // Cardápio (R2): categorias e itens com nome e preço.
    expect(screen.getByText("Pizzas")).toBeInTheDocument();
    expect(screen.getByText("Bebidas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Calabresa")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Refrigerante")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("32")).toBeInTheDocument();
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();

    // Configuração (R5): campos preenchidos com os valores retornados.
    expect(screen.getByLabelText("Chave de API OpenAI")).toHaveValue(
      CONFIG_FIXTURE.apiKeys.openai,
    );
    expect(screen.getByLabelText("Chave de API DeepSeek")).toHaveValue(
      CONFIG_FIXTURE.apiKeys.deepseek,
    );
    expect(screen.getByLabelText("System prompt")).toHaveValue(CONFIG_FIXTURE.systemPrompt);
    expect(screen.getByLabelText("Áudio habilitado")).not.toBeChecked();
    expect(screen.getByLabelText("Imagem habilitada")).toBeChecked();
    expect(screen.getByLabelText("Modelo de IA")).toHaveValue("openai");
  });
});

describe("ConfigPanel — edição do cardápio", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("reflete a edição de nome e preço de um item, mantendo os demais inalterados", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() => expect(screen.getByDisplayValue("Margherita")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("Margherita"), {
      target: { value: "Margherita Especial" },
    });
    fireEvent.change(screen.getByDisplayValue("30"), { target: { value: "35" } });

    expect(screen.getByDisplayValue("Margherita Especial")).toBeInTheDocument();
    expect(screen.getByDisplayValue("35")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Margherita")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("30")).not.toBeInTheDocument();

    // Demais itens/categorias permanecem inalterados.
    expect(screen.getByDisplayValue("Calabresa")).toBeInTheDocument();
    expect(screen.getByDisplayValue("32")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Refrigerante")).toBeInTheDocument();
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();
  });

  it("exibe uma mensagem de erro de validação ao digitar um preço não numérico", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() => expect(screen.getByDisplayValue("Margherita")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("30"), { target: { value: "trinta" } });

    expect(screen.getByDisplayValue("trinta")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Preço deve ser um número válido.");
  });
});

describe("ConfigPanel — edição de configuração", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("reflete a edição das chaves de API e do system prompt", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByLabelText("Chave de API OpenAI")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Chave de API OpenAI"), {
      target: { value: "nova-chave-openai" },
    });
    fireEvent.change(screen.getByLabelText("Chave de API DeepSeek"), {
      target: { value: "nova-chave-deepseek" },
    });
    fireEvent.change(screen.getByLabelText("System prompt"), {
      target: { value: "Novo prompt de sistema." },
    });

    expect(screen.getByLabelText("Chave de API OpenAI")).toHaveValue("nova-chave-openai");
    expect(screen.getByLabelText("Chave de API DeepSeek")).toHaveValue("nova-chave-deepseek");
    expect(screen.getByLabelText("System prompt")).toHaveValue("Novo prompt de sistema.");
  });

  it("inverte o estado dos switches de áudio e imagem ao alternar", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByLabelText("Áudio habilitado")).toBeInTheDocument(),
    );

    expect(screen.getByLabelText("Áudio habilitado")).not.toBeChecked();
    expect(screen.getByLabelText("Imagem habilitada")).toBeChecked();

    fireEvent.click(screen.getByLabelText("Áudio habilitado"));
    fireEvent.click(screen.getByLabelText("Imagem habilitada"));

    expect(screen.getByLabelText("Áudio habilitado")).toBeChecked();
    expect(screen.getByLabelText("Imagem habilitada")).not.toBeChecked();
  });

  it("atualiza modeloSelecionado ao selecionar um modelo diferente", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() => expect(screen.getByLabelText("Modelo de IA")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Modelo de IA"), {
      target: { value: "deepseek" },
    });

    expect(screen.getByLabelText("Modelo de IA")).toHaveValue("deepseek");
  });
});

describe("ConfigPanel — salvamento de configuração", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("chama dataClient.saveConfig() exatamente uma vez com os valores atuais do formulário", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByLabelText("Chave de API OpenAI")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Chave de API OpenAI"), {
      target: { value: "chave-final-openai" },
    });
    fireEvent.click(screen.getByLabelText("Áudio habilitado"));
    fireEvent.change(screen.getByLabelText("Modelo de IA"), {
      target: { value: "deepseek" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));

    await waitFor(() => expect(dataClient.saveConfig).toHaveBeenCalledTimes(1));

    expect(dataClient.saveConfig).toHaveBeenCalledWith({
      apiKeys: { openai: "chave-final-openai", deepseek: CONFIG_FIXTURE.apiKeys.deepseek },
      systemPrompt: CONFIG_FIXTURE.systemPrompt,
      audioEnabled: true,
      imageEnabled: CONFIG_FIXTURE.imageEnabled,
      modeloSelecionado: "deepseek",
    });
  });

  it("exibe indicação de sucesso e nenhum erro quando saveConfig resolve", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar configurações" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));

    await waitFor(() =>
      expect(screen.getByText("Configurações salvas com sucesso.")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });

  it("captura a rejeição de saveConfig, exibe a mensagem de erro e não propaga exceção", async () => {
    const dataClient = criarDataClientFake({
      saveConfig: vi.fn().mockRejectedValue(new InvalidConfigError("Configuração inválida.")),
    });
    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar configurações" })).toBeInTheDocument(),
    );

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));
    }).not.toThrow();

    await waitFor(() => expect(screen.getByText("Configuração inválida.")).toBeInTheDocument());
    expect(
      screen.queryByText("Configurações salvas com sucesso."),
    ).not.toBeInTheDocument();
  });
});

describe("ConfigPanel — composição com o sistema de design (feature-11)", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("usa Button, Badge, Navbar e Card de src/ui/index.js para sua estrutura visual", async () => {
    const dataClient = criarDataClientFake();
    const { container } = renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar configurações" })).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("button", { name: "Salvar configurações" }),
    ).toHaveClass("btn-primary");
    expect(container.querySelectorAll(".glass-card").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".navbar")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));

    await waitFor(() => {
      expect(container.querySelector(".badge-success")).not.toBeNull();
    });
  });

  it("funciona dentro de um ThemeProvider: ThemeToggle alterna o tema do painel", async () => {
    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByLabelText("Alternar tema claro/escuro")).toBeInTheDocument(),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByLabelText("Alternar tema claro/escuro"));

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("ConfigPanel — porta pública e contrato de dataClient", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("é importável a partir de src/ui/panels/config/index.js e aceita dataClient como prop", async () => {
    expect(ConfigPanel).toBeDefined();

    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() => expect(dataClient.loadCardapio).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(dataClient.loadConfig).toHaveBeenCalledTimes(1));
  });
});
