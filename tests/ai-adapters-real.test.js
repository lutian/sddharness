import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock do SDK `openai` no nível mais baixo possível (o construtor `OpenAI` e
// o helper `toFile`), sem nenhuma chamada de rede real — ver "Estratégia de
// teste sem rede real" em specs/feature-10/design.md. `instanciasCriadas`
// guarda cada FakeOpenAI construído, permitindo que os testes recuperem a
// instância usada internamente por cada adapter criado. `vi.hoisted` garante
// que o array já existe quando o factory do `vi.mock` (também hoisted) é
// executado durante a resolução dos imports abaixo.
const { instanciasCriadas } = vi.hoisted(() => ({ instanciasCriadas: [] }));

vi.mock("openai", () => {
  class FakeOpenAI {
    constructor(config) {
      this.config = config;
      this.chat = { completions: { create: vi.fn() } };
      this.audio = { transcriptions: { create: vi.fn() } };
      instanciasCriadas.push(this);
    }
  }

  return {
    OpenAI: FakeOpenAI,
    toFile: vi.fn(async (buffer, filename) => ({ buffer, filename })),
  };
});

// Mock da biblioteca `mupdf` no nível mais baixo possível (`Document`,
// `Matrix`, `ColorSpace`), sem renderizar PDF real nenhum. `vi.hoisted`
// garante que os dublês já existem quando o factory do `vi.mock` (também
// hoisted) é executado durante a resolução dos imports abaixo.
const { fakeDocument, fakePage, openDocumentMock } = vi.hoisted(() => {
  const fakePixmap = { asPNG: vi.fn(() => new Uint8Array([9, 9, 9])) };
  const fakePage = { toPixmap: vi.fn(() => fakePixmap) };
  const fakeDocument = { countPages: vi.fn(() => 1), loadPage: vi.fn(() => fakePage) };
  const openDocumentMock = vi.fn(() => fakeDocument);
  return { fakeDocument, fakePage, openDocumentMock };
});

vi.mock("mupdf", () => ({
  Document: { openDocument: openDocumentMock },
  Matrix: { scale: vi.fn((sx, sy) => [sx, 0, 0, sy, 0, 0]) },
  ColorSpace: { DeviceRGB: "DeviceRGB" },
}));

import { createDeepSeekChatClient } from "../src/ai/adapters/deepseek-chat.js";
import { createHttpMediaFetcher } from "../src/ai/adapters/http-media-fetcher.js";
import { createOpenAiChatClient } from "../src/ai/adapters/openai-chat.js";
import { createOpenAiClient } from "../src/ai/adapters/openai-client.js";
import { createPdfConverter } from "../src/ai/adapters/pdf-converter.js";

describe("Adapter concreto openai-chat.js", () => {
  afterEach(() => {
    instanciasCriadas.length = 0;
    vi.clearAllMocks();
  });

  const historico = [
    { autor: "cliente", texto: "oi" },
    { autor: "assistente", texto: "olá, tudo bem?" },
  ];

  it("instancia OpenAI com { apiKey } (R1)", () => {
    createOpenAiChatClient({ apiKey: "sk-teste" });

    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    expect(fakeClient.config).toEqual({ apiKey: "sk-teste" });
  });

  it("generateReply monta messages traduzindo o histórico e retorna o JSON parseado (R2)", async () => {
    const adapter = createOpenAiChatClient({ apiKey: "sk-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ resposta: "oi!" }) } }],
    });

    const resultado = await adapter.generateReply({
      systemPrompt: "Você é um atendente.",
      cardapio: { pizzas: [] },
      historico,
      mensagemCliente: "quero uma pizza",
    });

    expect(fakeClient.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: expect.stringContaining("Você é um atendente.") },
        { role: "user", content: "oi" },
        { role: "assistant", content: "olá, tudo bem?" },
        { role: "user", content: "quero uma pizza" },
      ],
      response_format: { type: "json_object" },
    });
    expect(resultado).toEqual({ resposta: "oi!" });
  });

  it("propaga a rejeição de chat.completions.create sem encapsulá-la (R3)", async () => {
    const adapter = createOpenAiChatClient({ apiKey: "sk-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.chat.completions.create.mockRejectedValue(new Error("rate limit"));

    await expect(
      adapter.generateReply({
        systemPrompt: "s",
        cardapio: {},
        historico: [],
        mensagemCliente: "oi",
      }),
    ).rejects.toThrow("rate limit");
  });

  it("lança erro descritivo quando a resposta não é JSON válido nem contém 'resposta' (R4)", async () => {
    const adapter = createOpenAiChatClient({ apiKey: "sk-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: "não é json" } }],
    });

    await expect(
      adapter.generateReply({
        systemPrompt: "s",
        cardapio: {},
        historico: [],
        mensagemCliente: "oi",
      }),
    ).rejects.toThrow();
  });

  it("lança de imediato sem instanciar chamada de rede quando apiKey está ausente (R24)", () => {
    expect(() => createOpenAiChatClient({})).toThrow();
    expect(instanciasCriadas).toHaveLength(0);
  });
});

describe("Adapter concreto deepseek-chat.js", () => {
  afterEach(() => {
    instanciasCriadas.length = 0;
    vi.clearAllMocks();
  });

  const historico = [{ autor: "cliente", texto: "oi" }];

  it("instancia OpenAI com { apiKey, baseURL: 'https://api.deepseek.com' } (R5)", () => {
    createDeepSeekChatClient({ apiKey: "ds-teste" });

    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    expect(fakeClient.config).toEqual({
      apiKey: "ds-teste",
      baseURL: "https://api.deepseek.com",
    });
  });

  it("generateReply segue a mesma montagem de mensagens e retorno de openai-chat.js (R6)", async () => {
    const adapter = createDeepSeekChatClient({ apiKey: "ds-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ resposta: "opa" }) } }],
    });

    const resultado = await adapter.generateReply({
      systemPrompt: "s",
      cardapio: {},
      historico,
      mensagemCliente: "oi",
    });

    expect(fakeClient.chat.completions.create).toHaveBeenCalledWith({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "s{}" },
        { role: "user", content: "oi" },
        { role: "user", content: "oi" },
      ],
      response_format: { type: "json_object" },
    });
    expect(resultado).toEqual({ resposta: "opa" });
  });

  it("propaga a rejeição do SDK sem encapsulá-la (R7)", async () => {
    const adapter = createDeepSeekChatClient({ apiKey: "ds-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.chat.completions.create.mockRejectedValue(new Error("falha"));

    await expect(
      adapter.generateReply({
        systemPrompt: "s",
        cardapio: {},
        historico: [],
        mensagemCliente: "oi",
      }),
    ).rejects.toThrow("falha");
  });

  it("lança de imediato sem instanciar chamada de rede quando apiKey está ausente (R24)", () => {
    expect(() => createDeepSeekChatClient({})).toThrow();
    expect(instanciasCriadas).toHaveLength(0);
  });
});

describe("Adapter concreto openai-client.js (Whisper + Visão)", () => {
  afterEach(() => {
    instanciasCriadas.length = 0;
    vi.clearAllMocks();
  });

  it("instancia OpenAI com { apiKey } (R8)", () => {
    createOpenAiClient({ apiKey: "sk-teste" });

    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    expect(fakeClient.config).toEqual({ apiKey: "sk-teste" });
  });

  it("transcribeAudio chama audio.transcriptions.create com o modelo whisper-1 e retorna o texto (R9)", async () => {
    const adapter = createOpenAiClient({ apiKey: "sk-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.audio.transcriptions.create.mockResolvedValue({ text: "oi, tudo bem" });

    const texto = await adapter.transcribeAudio({
      buffer: Buffer.from("audio"),
      filename: "a.ogg",
      mimeType: "audio/ogg",
    });

    expect(fakeClient.audio.transcriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "whisper-1" }),
    );
    expect(texto).toBe("oi, tudo bem");
  });

  it("describeImage chama chat.completions.create com image_url em formato data: e retorna o texto (R10)", async () => {
    const adapter = createOpenAiClient({ apiKey: "sk-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: "uma pizza de calabresa" } }],
    });

    const buffer = Buffer.from([1, 2, 3]);
    const descricao = await adapter.describeImage({ buffer, mimeType: "image/png" });

    expect(fakeClient.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${buffer.toString("base64")}` },
            },
          ],
        },
      ],
    });
    expect(descricao).toBe("uma pizza de calabresa");
  });

  it("propaga a rejeição de audio.transcriptions.create/chat.completions.create sem encapsular (R11)", async () => {
    const adapter = createOpenAiClient({ apiKey: "sk-teste" });
    const fakeClient = instanciasCriadas[instanciasCriadas.length - 1];
    fakeClient.audio.transcriptions.create.mockRejectedValue(new Error("falha whisper"));
    fakeClient.chat.completions.create.mockRejectedValue(new Error("falha visão"));

    await expect(
      adapter.transcribeAudio({ buffer: Buffer.from("a"), filename: "a.ogg", mimeType: "audio/ogg" }),
    ).rejects.toThrow("falha whisper");
    await expect(
      adapter.describeImage({ buffer: Buffer.from("a"), mimeType: "image/png" }),
    ).rejects.toThrow("falha visão");
  });

  it("lança de imediato sem instanciar chamada de rede quando apiKey está ausente (R24)", () => {
    expect(() => createOpenAiClient({})).toThrow();
    expect(instanciasCriadas).toHaveLength(0);
  });
});

describe("Adapter concreto http-media-fetcher.js", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("download baixa a mídia via fetch e retorna { buffer, mimeType } a partir do Content-Type (R13)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "audio/ogg"]]),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createHttpMediaFetcher();
    const resultado = await adapter.download({ tipo: "audio", url: "http://x/a.ogg" });

    expect(fetchMock).toHaveBeenCalledWith("http://x/a.ogg");
    expect(resultado).toEqual({ buffer: Buffer.from([1, 2, 3]), mimeType: "audio/ogg" });
  });

  it("download lança erro descritivo quando a resposta HTTP não é ok (R14)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createHttpMediaFetcher();

    await expect(adapter.download({ tipo: "audio", url: "http://x/a.ogg" })).rejects.toThrow();
  });

  it("download lança erro sem chamar fetch quando media.url está ausente (R15)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createHttpMediaFetcher();

    await expect(adapter.download({ tipo: "audio" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Adapter concreto pdf-converter.js", () => {
  afterEach(() => {
    vi.clearAllMocks();
    fakeDocument.countPages.mockReturnValue(1);
    fakeDocument.loadPage.mockReturnValue(fakePage);
    openDocumentMock.mockReturnValue(fakeDocument);
  });

  it("convertFirstPageToImage carrega o documento via mupdf, renderiza a página 0 e retorna PNG (R16, R17)", async () => {
    const adapter = createPdfConverter();

    const buffer = Buffer.from("%PDF-1.4");
    const resultado = await adapter.convertFirstPageToImage({
      buffer,
      mimeType: "application/pdf",
    });

    expect(openDocumentMock).toHaveBeenCalledWith(buffer, "application/pdf");
    expect(fakeDocument.loadPage).toHaveBeenCalledWith(0);
    expect(resultado).toEqual({ buffer: Buffer.from([9, 9, 9]), mimeType: "image/png" });
  });

  it("lança erro descritivo quando o PDF não tem nenhuma página (R18)", async () => {
    fakeDocument.countPages.mockReturnValue(0);
    const adapter = createPdfConverter();

    await expect(
      adapter.convertFirstPageToImage({ buffer: Buffer.from("x"), mimeType: "application/pdf" }),
    ).rejects.toThrow();
  });

  it("lança erro descritivo quando a abertura do documento falha (R18)", async () => {
    openDocumentMock.mockImplementation(() => {
      throw new Error("PDF corrompido");
    });
    const adapter = createPdfConverter();

    await expect(
      adapter.convertFirstPageToImage({ buffer: Buffer.from("x"), mimeType: "application/pdf" }),
    ).rejects.toThrow();
  });
});

describe("Isolamento das bibliotecas concretas (R25)", () => {
  it("nenhum arquivo de src/ai/ fora de adapters/ importa 'openai'/'mupdf' nem chama fetch diretamente", () => {
    const dir = fileURLToPath(new URL("../src/ai/", import.meta.url));

    const arquivos = [
      "chatClient.js",
      "client.js",
      "media.js",
      "pdfConverter.js",
      "modelSelector.js",
      "conversationEngine.js",
      "audio.js",
      "image.js",
      "pdf.js",
      "conversation.js",
    ];

    for (const arquivo of arquivos) {
      const fonte = readFileSync(`${dir}${arquivo}`, "utf8");
      expect(fonte, `${arquivo} não deve importar 'openai'`).not.toContain('from "openai"');
      expect(fonte, `${arquivo} não deve importar 'mupdf'`).not.toContain('from "mupdf"');
      expect(fonte, `${arquivo} não deve chamar fetch(`).not.toContain("fetch(");
    }
  });
});
