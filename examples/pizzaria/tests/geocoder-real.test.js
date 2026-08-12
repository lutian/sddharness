import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createNominatimGeocoder } from "../src/delivery/adapters/nominatim.js";

describe("Adapter concreto nominatim.js", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("geocode chama fetch com q/format=json/limit=1 e User-Agent, retornando { latitude, longitude } (R19, R20, R21)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ lat: "-23.55", lon: "-46.63" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createNominatimGeocoder();
    const resultado = await adapter.geocode("Av. Paulista, 1000");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("q=Av.%20Paulista%2C%201000");
    expect(url).toContain("format=json");
    expect(url).toContain("limit=1");
    expect(init.headers["User-Agent"]).toBeTruthy();
    expect(resultado).toEqual({ latitude: -23.55, longitude: -46.63 });
  });

  it("geocode retorna null quando o Nominatim não encontra nenhum resultado (R22)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createNominatimGeocoder();
    const resultado = await adapter.geocode("endereço inexistente");

    expect(resultado).toBeNull();
  });

  it("geocode rejeita quando a resposta HTTP não é ok (R23)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createNominatimGeocoder();

    await expect(adapter.geocode("qualquer endereço")).rejects.toThrow();
  });

  it("geocode rejeita quando o fetch falha por erro de rede (R23)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("DNS falhou"));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createNominatimGeocoder();

    await expect(adapter.geocode("qualquer endereço")).rejects.toThrow("DNS falhou");
  });
});

describe("Isolamento das bibliotecas concretas (R25)", () => {
  it("src/delivery/geocoder.js e geocoding.js não importam 'fetch(' diretamente nem 'openai'/'mupdf'", () => {
    const dir = fileURLToPath(new URL("../src/delivery/", import.meta.url));

    for (const arquivo of ["geocoder.js", "geocoding.js"]) {
      const fonte = readFileSync(`${dir}${arquivo}`, "utf8");
      expect(fonte, `${arquivo} não deve chamar fetch(`).not.toContain("fetch(");
      expect(fonte, `${arquivo} não deve importar 'openai'`).not.toContain('from "openai"');
      expect(fonte, `${arquivo} não deve importar 'mupdf'`).not.toContain('from "mupdf"');
    }
  });
});
