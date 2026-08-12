import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock da biblioteca externa `whatsapp-web.js` no nível mais baixo possível
// (o construtor `Client`/`LocalAuth`), sem abrir Chromium real nem depender
// de rede — ver "Estratégia de teste sem rede real" em specs/feature-9/design.md.
// `instanciasCriadas` guarda cada FakeClient construído, permitindo que os
// testes recuperem a instância usada internamente por cada adapter criado.
// `vi.hoisted` garante que o array já existe quando o factory do `vi.mock`
// (também hoisted) é executado durante a resolução dos imports abaixo.
const { instanciasCriadas } = vi.hoisted(() => ({ instanciasCriadas: [] }));

vi.mock("whatsapp-web.js", async () => {
  const { EventEmitter } = await import("node:events");

  class FakeClient extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.initialize = vi.fn(() => Promise.resolve());
      this.sendMessage = vi.fn(() => Promise.resolve({ id: "fake" }));
      instanciasCriadas.push(this);
    }
  }

  class FakeLocalAuth {
    constructor(options) {
      this.options = options;
    }
  }

  return { Client: FakeClient, LocalAuth: FakeLocalAuth };
});

import { createWhatsAppWebJsAdapter } from "../src/whatsapp/adapters/whatsapp-web-js.js";
import { WhatsAppError } from "../src/whatsapp/errors.js";

describe("Adapter concreto whatsapp-web.js", () => {
  afterEach(() => {
    instanciasCriadas.length = 0;
    vi.clearAllMocks();
  });

  // Cria um adapter e devolve tanto ele quanto o FakeClient usado
  // internamente (última instância criada pelo construtor mockado).
  function criarAdapter(options = { dataPath: "/tmp/sessao", puppeteerOptions: { headless: true } }) {
    const adapter = createWhatsAppWebJsAdapter(options);
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    return { adapter, fakeClient };
  }

  it("instancia Client com authStrategy (LocalAuth) construída com dataPath e puppeteer com puppeteerOptions", () => {
    const dataPath = "/tmp/sessao-teste";
    const puppeteerOptions = { headless: true };

    const { fakeClient } = criarAdapter({ dataPath, puppeteerOptions });

    expect(fakeClient.options.authStrategy).toBeInstanceOf(Object);
    expect(fakeClient.options.authStrategy.options).toEqual({ dataPath });
    expect(fakeClient.options.puppeteer).toBe(puppeteerOptions);
  });

  it("expõe apenas on/initialize/sendMessage, como documentado no contrato", () => {
    const { adapter } = criarAdapter();

    expect(typeof adapter.on).toBe("function");
    expect(typeof adapter.initialize).toBe("function");
    expect(typeof adapter.sendMessage).toBe("function");
  });

  it("emite 'qr' com a mesma string recebida do evento nativo da lib", () => {
    let capturado;
    const { adapter, fakeClient } = criarAdapter();
    adapter.on("qr", (qr) => (capturado = qr));

    fakeClient.emit("qr", "QR-STRING");

    expect(capturado).toBe("QR-STRING");
  });

  it("emite 'auth_failure' repassando o motivo, sem lançar exceção não tratada", () => {
    let capturado;
    const { adapter, fakeClient } = criarAdapter();
    adapter.on("auth_failure", (motivo) => (capturado = motivo));

    expect(() => fakeClient.emit("auth_failure", "motivo-x")).not.toThrow();

    expect(capturado).toBe("motivo-x");
  });

  it("emite 'ready' quando a lib emite seu evento nativo de sessão pronta", () => {
    let chamado = false;
    const { adapter, fakeClient } = criarAdapter();
    adapter.on("ready", () => (chamado = true));

    fakeClient.emit("ready");

    expect(chamado).toBe(true);
  });

  it("emite 'disconnected' quando a lib emite seu evento nativo de desconexão", () => {
    let chamado = false;
    const { adapter, fakeClient } = criarAdapter();
    adapter.on("disconnected", () => (chamado = true));

    fakeClient.emit("disconnected", "MOTIVO");

    expect(chamado).toBe(true);
  });

  it("traduz mensagem nativa recebida para {clienteId, texto} sem sufixo @c.us", () => {
    let capturado;
    const { adapter, fakeClient } = criarAdapter();
    adapter.on("message", (mensagem) => (capturado = mensagem));

    fakeClient.emit("message", { from: "5511999999999@c.us", body: "oi" });

    expect(capturado).toEqual({ clienteId: "5511999999999", texto: "oi" });
  });

  it("initialize() delega para client.initialize() da lib", async () => {
    const { adapter, fakeClient } = criarAdapter();

    await adapter.initialize();

    expect(fakeClient.initialize).toHaveBeenCalledOnce();
  });

  it("initialize() propaga rejeição levantada por client.initialize()", async () => {
    const { adapter, fakeClient } = criarAdapter();
    fakeClient.initialize.mockRejectedValueOnce(new Error("falha ao abrir navegador"));

    await expect(adapter.initialize()).rejects.toThrow("falha ao abrir navegador");
  });

  it("sendMessage delega para client.sendMessage com o chatId no formato @c.us após 'ready'", async () => {
    const { adapter, fakeClient } = criarAdapter();
    fakeClient.emit("ready");

    await adapter.sendMessage("5511999999999", "oi");

    expect(fakeClient.sendMessage).toHaveBeenCalledWith("5511999999999@c.us", "oi");
  });

  it("sendMessage rejeita com WhatsAppError e não chama a lib se a sessão ainda não estiver pronta", async () => {
    const { adapter, fakeClient } = criarAdapter();

    await expect(adapter.sendMessage("5511999999999", "oi")).rejects.toBeInstanceOf(
      WhatsAppError,
    );
    expect(fakeClient.sendMessage).not.toHaveBeenCalled();
  });

  it("nenhum arquivo de src/whatsapp/ fora do adapter concreto importa whatsapp-web.js", () => {
    const dir = fileURLToPath(new URL("../src/whatsapp/", import.meta.url));

    const clientFonte = readFileSync(join(dir, "client.js"), "utf8");
    const queueFonte = readFileSync(join(dir, "queue.js"), "utf8");
    const indexFonte = readFileSync(join(dir, "index.js"), "utf8")
      .split("\n")
      .filter((linha) => !linha.includes("./adapters/whatsapp-web-js.js"))
      .join("\n");

    expect(clientFonte).not.toContain("whatsapp-web.js");
    expect(queueFonte).not.toContain("whatsapp-web.js");
    expect(indexFonte).not.toContain("whatsapp-web.js");
  });
});
