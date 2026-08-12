import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeDatabase, insertCliente, insertPedido, openDatabase } from "../src/db/index.js";
import * as pedidosModule from "../src/db/pedidos.js";
import { contarPedidosAtivos } from "../src/db/pedidos.js";
import {
  AddressNotFoundError,
  GeocodingError,
  InvalidAddressError,
  InvalidCoordinatesError,
  calcularDistanciaKm,
  calcularTempoEspera,
  geocodeEndereco,
} from "../src/delivery/index.js";

describe("Geocodificação (geocodeEndereco)", () => {
  it("retorna as coordenadas quando geocoder.geocode resolve um resultado válido", async () => {
    const geocoder = { geocode: vi.fn().mockResolvedValue({ latitude: -23.5505, longitude: -46.6333 }) };

    const resultado = await geocodeEndereco(geocoder, "Av. Paulista, 1000");

    expect(geocoder.geocode).toHaveBeenCalledWith("Av. Paulista, 1000");
    expect(resultado).toEqual({ latitude: -23.5505, longitude: -46.6333 });
  });

  it("lança InvalidAddressError para endereço null/undefined/vazio, sem chamar geocoder.geocode", async () => {
    const geocoder = { geocode: vi.fn() };

    await expect(geocodeEndereco(geocoder, "")).rejects.toThrow(InvalidAddressError);
    await expect(geocodeEndereco(geocoder, "   ")).rejects.toThrow(InvalidAddressError);
    await expect(geocodeEndereco(geocoder, null)).rejects.toThrow(InvalidAddressError);
    await expect(geocodeEndereco(geocoder, undefined)).rejects.toThrow(InvalidAddressError);

    expect(geocoder.geocode).not.toHaveBeenCalled();
  });

  it("lança AddressNotFoundError quando geocoder.geocode resolve null", async () => {
    const geocoder = { geocode: vi.fn().mockResolvedValue(null) };

    await expect(geocodeEndereco(geocoder, "Endereço inexistente, 0")).rejects.toThrow(
      AddressNotFoundError
    );
  });

  it("lança GeocodingError preservando a causa original quando geocoder.geocode rejeita", async () => {
    const erroOriginal = new Error("timeout de rede");
    const geocoder = { geocode: vi.fn().mockRejectedValue(erroOriginal) };

    let erroCapturado;
    try {
      await geocodeEndereco(geocoder, "Rua Teste, 1");
    } catch (erro) {
      erroCapturado = erro;
    }

    expect(erroCapturado).toBeInstanceOf(GeocodingError);
    expect(erroCapturado.cause).toBe(erroOriginal);
  });
});

describe("Cálculo de distância (calcularDistanciaKm)", () => {
  it("retorna 0 quando origem e destino são a mesma coordenada", () => {
    const ponto = { latitude: -23.5505, longitude: -46.6333 };

    expect(calcularDistanciaKm(ponto, ponto)).toBeCloseTo(0, 2);
  });

  it("calcula a distância conhecida entre duas coordenadas reais (Sé x Paulista, ~4.2km)", () => {
    const se = { latitude: -23.5505, longitude: -46.6333 };
    const paulista = { latitude: -23.5613, longitude: -46.6565 };

    const distancia = calcularDistanciaKm(se, paulista);

    expect(distancia).toBeGreaterThan(2);
    expect(distancia).toBeLessThan(4);
  });

  it("lança InvalidCoordinatesError quando origem/destino não têm latitude/longitude numéricos", () => {
    const valido = { latitude: -23.5505, longitude: -46.6333 };

    expect(() => calcularDistanciaKm(undefined, valido)).toThrow(InvalidCoordinatesError);
    expect(() => calcularDistanciaKm(valido, "não é objeto")).toThrow(InvalidCoordinatesError);
    expect(() => calcularDistanciaKm({}, valido)).toThrow(InvalidCoordinatesError);
  });
});

describe("Contagem de demanda ativa (contarPedidosAtivos)", () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-delivery-"));
    db = openDatabase(join(dir, "app.sqlite"));
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(dir, { recursive: true, force: true });
  });

  it("conta exclusivamente pedidos com status recebido ou em_preparo", () => {
    const cliente = insertCliente(db, { telefone: "11911112222", nome: "Ivo" });
    const status = ["recebido", "em_preparo", "saiu_para_entrega", "concluido", "cancelado"];

    for (const s of status) {
      insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: s });
    }

    expect(contarPedidosAtivos(db)).toBe(2);
  });
});

describe("Cálculo de tempo de espera (calcularTempoEspera)", () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-delivery-"));
    db = openDatabase(join(dir, "app.sqlite"));
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(dir, { recursive: true, force: true });
  });

  it("retorna latitude, longitude, distanciaKm, quantidadePedidosAtivos e tempoEsperaMinutos corretos", async () => {
    const cliente = insertCliente(db, { telefone: "11900001111", nome: "Julia" });
    insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: "recebido" });
    insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: "em_preparo" });
    insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "saiu_para_entrega",
    });

    const origem = { latitude: -23.5505, longitude: -46.6333 };
    const destinoGeocodificado = { latitude: -23.5613, longitude: -46.6565 };
    const geocoder = { geocode: vi.fn().mockResolvedValue(destinoGeocodificado) };

    const resultado = await calcularTempoEspera({
      enderecoCliente: "Av. Paulista, 1000",
      geocoder,
      origem,
      db,
    });

    const distanciaEsperada = calcularDistanciaKm(origem, destinoGeocodificado);
    const tempoEsperado = Math.round(15 + 2 * 5 + (distanciaEsperada / 20) * 60);

    expect(resultado.latitude).toBe(destinoGeocodificado.latitude);
    expect(resultado.longitude).toBe(destinoGeocodificado.longitude);
    expect(resultado.distanciaKm).toBeCloseTo(distanciaEsperada, 5);
    expect(resultado.quantidadePedidosAtivos).toBe(2);
    expect(resultado.tempoEsperaMinutos).toBe(tempoEsperado);
  });

  it("lança InvalidCoordinatesError quando origem é omitida/incompleta, sem chamar geocoder nem consultar o banco", async () => {
    const geocoder = { geocode: vi.fn() };
    const cliente = insertCliente(db, { telefone: "11900002222", nome: "Kaique" });
    insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: "recebido" });

    await expect(
      calcularTempoEspera({ enderecoCliente: "Rua Teste, 1", geocoder, origem: undefined, db })
    ).rejects.toThrow(InvalidCoordinatesError);

    await expect(
      calcularTempoEspera({
        enderecoCliente: "Rua Teste, 1",
        geocoder,
        origem: { latitude: -23.5505 },
        db,
      })
    ).rejects.toThrow(InvalidCoordinatesError);

    expect(geocoder.geocode).not.toHaveBeenCalled();
  });

  it("propaga o erro de geocodificação e não consulta a contagem de pedidos ativos no banco", async () => {
    const origem = { latitude: -23.5505, longitude: -46.6333 };
    const geocoder = { geocode: vi.fn().mockResolvedValue(null) };
    const cliente = insertCliente(db, { telefone: "11900003333", nome: "Laura" });
    insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: "recebido" });
    const espiao = vi.spyOn(pedidosModule, "contarPedidosAtivos");

    await expect(
      calcularTempoEspera({ enderecoCliente: "Endereço inexistente, 0", geocoder, origem, db })
    ).rejects.toThrow(AddressNotFoundError);

    expect(espiao).not.toHaveBeenCalled();
    espiao.mockRestore();
  });
});
