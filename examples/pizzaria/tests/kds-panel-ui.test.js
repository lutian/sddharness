// tests/kds-panel-ui.test.js — testa a lógica de interação do painel KDS
// (feature-13) com um dataClient fake injetado, em jsdom (padrão
// `tests/*-ui.test.js` de vitest.config.js, feature-11). Nenhum teste toca
// SQLite real, src/whatsapp/* real ou IPC.
//
// Nota: este arquivo é `.js` (não `.jsx`), mesma decisão documentada em
// `tests/design-system.test.js` e `tests/config-panel-ui.test.js` — o
// projeto não instala `@vitejs/plugin-react`, então os elementos React são
// criados com `React.createElement` (`h`), sem sintaxe JSX.
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `@testing-library/jest-dom` (import direto) espera um `expect` global
// estilo Jest, indisponível aqui porque o projeto não ativa `test.globals`
// (mesma nota de tests/design-system.test.js e tests/config-panel-ui.test.js).
expect.extend(jestDomMatchers);

import { InvalidMotoboyError, InvalidStatusTransitionError } from "../src/db/errors.js";
import { ThemeProvider } from "../src/ui/index.js";
import { KdsPanel } from "../src/ui/panels/kds/index.js";

const PEDIDO_FIXTURE = {
  id: 1,
  clienteNome: "Alice",
  status: "recebido",
  motoboy: null,
  tempoEsperaMinutos: 12,
};

// Cria um dataClient fake (vi.fn() por método), sem tocar filesystem real,
// SQLite, src/whatsapp/* nem IPC — conforme specs/feature-13/design.md,
// Decisão 4.
function criarDataClientFake(overrides = {}) {
  return {
    listarPedidosAtivos: vi.fn().mockResolvedValue([{ ...PEDIDO_FIXTURE }]),
    atualizarStatusPedido: vi.fn().mockResolvedValue({ ...PEDIDO_FIXTURE, status: "em_preparo" }),
    atribuirMotoboy: vi.fn().mockResolvedValue({ ...PEDIDO_FIXTURE, motoboy: "Carlos" }),
    getStatusConexaoWhatsApp: vi.fn().mockResolvedValue("conectado"),
    onPedidosChange: vi.fn().mockReturnValue(vi.fn()),
    onConnectionStatusChange: vi.fn().mockReturnValue(vi.fn()),
    ...overrides,
  };
}

function renderPainel(dataClient) {
  return render(h(ThemeProvider, null, h(KdsPanel, { dataClient })));
}

describe("KdsPanel — listagem de pedidos ativos", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("chama listarPedidosAtivos() exatamente uma vez e renderiza os pedidos retornados", async () => {
    const dataClient = criarDataClientFake();

    const { container } = renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    expect(dataClient.listarPedidosAtivos).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".badge-default")).toHaveTextContent("recebido");
    expect(screen.getByText("12 min")).toBeInTheDocument();
  });

  it("exibe indicação de tempo indisponível quando tempoEsperaMinutos é null", async () => {
    const dataClient = criarDataClientFake({
      listarPedidosAtivos: vi
        .fn()
        .mockResolvedValue([{ ...PEDIDO_FIXTURE, tempoEsperaMinutos: null }]),
    });

    renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    expect(screen.getByText("Tempo de espera indisponível")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ min/)).not.toBeInTheDocument();
  });
});

describe("KdsPanel — atualizações de pedidos em tempo real", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("assina onPedidosChange uma vez e substitui a listagem ao acionar o callback recebido", async () => {
    const dataClient = criarDataClientFake();

    renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    expect(dataClient.onPedidosChange).toHaveBeenCalledTimes(1);
    const callback = dataClient.onPedidosChange.mock.calls[0][0];

    callback([{ ...PEDIDO_FIXTURE, id: 2, clienteNome: "Bruno", tempoEsperaMinutos: 5 }]);

    await waitFor(() => expect(screen.getByText("Bruno")).toBeInTheDocument());
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(dataClient.listarPedidosAtivos).toHaveBeenCalledTimes(1);
  });

  it("invoca a função de cancelamento de onPedidosChange ao desmontar", async () => {
    const cancelar = vi.fn();
    const dataClient = criarDataClientFake({
      onPedidosChange: vi.fn().mockReturnValue(cancelar),
    });

    const { unmount } = renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    unmount();

    expect(cancelar).toHaveBeenCalledTimes(1);
  });
});

describe("KdsPanel — mudança de status de pedido", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("chama atualizarStatusPedido com id e novoStatus, refletindo o status retornado", async () => {
    const dataClient = criarDataClientFake();

    const { container } = renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Novo status do pedido 1"), {
      target: { value: "em_preparo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar status" }));

    await waitFor(() => expect(dataClient.atualizarStatusPedido).toHaveBeenCalledTimes(1));
    expect(dataClient.atualizarStatusPedido).toHaveBeenCalledWith(1, "em_preparo");

    await waitFor(() =>
      expect(container.querySelector(".badge-default")).toHaveTextContent("em_preparo"),
    );
  });

  it("captura a rejeição de atualizarStatusPedido, exibe o erro e mantém o status anterior", async () => {
    const dataClient = criarDataClientFake({
      atualizarStatusPedido: vi
        .fn()
        .mockRejectedValue(new InvalidStatusTransitionError("Transição de status inválida.")),
    });

    const { container } = renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Novo status do pedido 1"), {
      target: { value: "concluido" },
    });

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar status" }));
    }).not.toThrow();

    await waitFor(() =>
      expect(screen.getByText("Transição de status inválida.")).toBeInTheDocument(),
    );
    expect(container.querySelector(".badge-default")).toHaveTextContent("recebido");
  });
});

describe("KdsPanel — atribuição de motoboy", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("chama atribuirMotoboy com id e motoboy digitado, refletindo o motoboy retornado", async () => {
    const dataClient = criarDataClientFake();

    renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Motoboy do pedido 1"), {
      target: { value: "Carlos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar motoboy" }));

    await waitFor(() => expect(dataClient.atribuirMotoboy).toHaveBeenCalledTimes(1));
    expect(dataClient.atribuirMotoboy).toHaveBeenCalledWith(1, "Carlos");

    await waitFor(() => expect(screen.getByLabelText("Motoboy do pedido 1")).toHaveValue("Carlos"));
  });

  it("captura a rejeição de atribuirMotoboy, exibe o erro e mantém o motoboy anterior", async () => {
    const dataClient = criarDataClientFake({
      atribuirMotoboy: vi
        .fn()
        .mockRejectedValue(new InvalidMotoboyError("Nome do motoboy é obrigatório.")),
    });

    renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Motoboy do pedido 1"), {
      target: { value: "   " },
    });

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar motoboy" }));
    }).not.toThrow();

    await waitFor(() =>
      expect(screen.getByText("Nome do motoboy é obrigatório.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Motoboy do pedido 1")).toHaveValue("");
  });
});

describe("KdsPanel — status de conexão do WhatsApp", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("chama getStatusConexaoWhatsApp() e exibe o status retornado", async () => {
    const dataClient = criarDataClientFake({
      getStatusConexaoWhatsApp: vi.fn().mockResolvedValue("conectado"),
    });

    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByText("WhatsApp conectado")).toBeInTheDocument(),
    );
    expect(dataClient.getStatusConexaoWhatsApp).toHaveBeenCalledTimes(1);
  });

  it("assina onConnectionStatusChange uma vez e atualiza o indicador ao acionar o callback", async () => {
    const dataClient = criarDataClientFake();

    renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByText("WhatsApp conectado")).toBeInTheDocument(),
    );

    expect(dataClient.onConnectionStatusChange).toHaveBeenCalledTimes(1);
    const callback = dataClient.onConnectionStatusChange.mock.calls[0][0];

    callback("desconectado");

    await waitFor(() =>
      expect(screen.getByText("WhatsApp desconectado")).toBeInTheDocument(),
    );
  });

  it("invoca a função de cancelamento de onConnectionStatusChange ao desmontar", async () => {
    const cancelar = vi.fn();
    const dataClient = criarDataClientFake({
      onConnectionStatusChange: vi.fn().mockReturnValue(cancelar),
    });

    const { unmount } = renderPainel(dataClient);

    await waitFor(() =>
      expect(screen.getByText("WhatsApp conectado")).toBeInTheDocument(),
    );

    unmount();

    expect(cancelar).toHaveBeenCalledTimes(1);
  });
});

describe("KdsPanel — composição com o sistema de design (feature-11)", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("usa Button, Badge, Navbar e Card de src/ui/index.js para sua estrutura visual", async () => {
    const dataClient = criarDataClientFake();
    const { container } = renderPainel(dataClient);

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    expect(
      screen.getByRole("button", { name: "Confirmar status" }),
    ).toHaveClass("btn-primary");
    expect(
      screen.getByRole("button", { name: "Confirmar motoboy" }),
    ).toHaveClass("btn-primary");
    expect(container.querySelector(".badge-success")).not.toBeNull();
    expect(container.querySelectorAll(".glass-card").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".navbar")).not.toBeNull();
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

describe("KdsPanel — porta pública e contrato de dataClient", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("é importável a partir de src/ui/panels/kds/index.js e aceita dataClient como prop", async () => {
    expect(KdsPanel).toBeDefined();

    const dataClient = criarDataClientFake();
    renderPainel(dataClient);

    await waitFor(() => expect(dataClient.listarPedidosAtivos).toHaveBeenCalledTimes(1));
  });
});
