import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeDatabase,
  insertCliente,
  insertPedido,
  openDatabase,
  updateStatusPedido,
  atribuirMotoboy,
  listPedidosAtivosComCliente,
  OrderNotFoundError,
  InvalidStatusTransitionError,
  InvalidMotoboyError,
} from "../src/db/index.js";
import {
  calcularDistanciaKm,
  calcularTempoEsperaPorDistanciaEFila,
  listarPedidosAtivosComTempoEspera,
  InvalidCoordinatesError,
} from "../src/delivery/index.js";
import { createWhatsAppClient } from "../src/whatsapp/index.js";

// Adapter dublê: um EventEmitter simples controlado pelo teste, no mesmo
// padrão de tests/whatsapp-queue.test.js (feature-3).
function criarAdapterDuble() {
  const emitter = new EventEmitter();
  return {
    on: (evento, callback) => emitter.on(evento, callback),
    initialize: () => {},
    sendMessage: () => {},
    emitirComoAdapter: (evento, payload) => emitter.emit(evento, payload),
  };
}

describe("Painel administrativo KDS — listagem de pedidos ativos", () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-admin-kds-"));
    db = openDatabase(join(dir, "app.sqlite"));
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(dir, { recursive: true, force: true });
  });

  it("retorna exatamente os pedidos com status recebido, em_preparo e saiu_para_entrega, ordenados por criado_em ascendente", () => {
    const cliente = insertCliente(db, { telefone: "11911110001", nome: "Alice" });
    const status = ["recebido", "em_preparo", "saiu_para_entrega", "concluido", "cancelado"];
    const idsInseridos = status.map(
      (s) =>
        insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: s })
          .id
    );

    const pedidosAtivos = listPedidosAtivosComCliente(db);

    expect(pedidosAtivos.map((p) => p.status).sort()).toEqual(
      ["em_preparo", "recebido", "saiu_para_entrega"].sort()
    );
    expect(pedidosAtivos.map((p) => p.id)).toEqual(
      idsInseridos.filter((_, i) => ["recebido", "em_preparo", "saiu_para_entrega"].includes(status[i]))
    );
  });

  it("retorna distanciaKm e tempoEsperaMinutos numéricos e consistentes com a fórmula documentada quando o cliente tem latitude/longitude gravadas", () => {
    const cliente = insertCliente(db, {
      telefone: "11911110002",
      nome: "Bruno",
      latitude: -23.5613,
      longitude: -46.6565,
    });
    insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: "recebido" });
    insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: "em_preparo" });

    const origem = { latitude: -23.5505, longitude: -46.6333 };

    const resultado = listarPedidosAtivosComTempoEspera({ db, origem });

    const distanciaEsperada = calcularDistanciaKm(origem, {
      latitude: -23.5613,
      longitude: -46.6565,
    });
    const tempoEsperado = calcularTempoEsperaPorDistanciaEFila(distanciaEsperada, 2);

    expect(resultado).toHaveLength(2);
    for (const pedido of resultado) {
      expect(pedido.distanciaKm).toBeCloseTo(distanciaEsperada, 5);
      expect(pedido.tempoEsperaMinutos).toBe(tempoEsperado);
    }
  });

  it("retorna distanciaKm e tempoEsperaMinutos como null quando o cliente não tem latitude/longitude gravadas, sem afetar os demais pedidos", () => {
    const clienteSemCoordenadas = insertCliente(db, { telefone: "11911110003", nome: "Carla" });
    const clienteComCoordenadas = insertCliente(db, {
      telefone: "11911110004",
      nome: "Diego",
      latitude: -23.5613,
      longitude: -46.6565,
    });
    insertPedido(db, {
      clienteId: clienteSemCoordenadas.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "recebido",
    });
    insertPedido(db, {
      clienteId: clienteComCoordenadas.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "recebido",
    });

    const origem = { latitude: -23.5505, longitude: -46.6333 };

    const resultado = listarPedidosAtivosComTempoEspera({ db, origem });

    const pedidoSemCoordenadas = resultado.find((p) => p.clienteId === clienteSemCoordenadas.id);
    const pedidoComCoordenadas = resultado.find((p) => p.clienteId === clienteComCoordenadas.id);

    expect(pedidoSemCoordenadas.distanciaKm).toBeNull();
    expect(pedidoSemCoordenadas.tempoEsperaMinutos).toBeNull();
    expect(pedidoComCoordenadas.distanciaKm).not.toBeNull();
    expect(pedidoComCoordenadas.tempoEsperaMinutos).not.toBeNull();
  });

  it("lança InvalidCoordinatesError quando origem é omitida ou não contém latitude/longitude numéricos", () => {
    const cliente = insertCliente(db, { telefone: "11911110005", nome: "Elisa" });
    insertPedido(db, { clienteId: cliente.id, itens: [{ nome: "Pizza", quantidade: 1 }], status: "recebido" });

    expect(() => listarPedidosAtivosComTempoEspera({ db })).toThrow(InvalidCoordinatesError);
    expect(() => listarPedidosAtivosComTempoEspera({ db, origem: {} })).toThrow(InvalidCoordinatesError);
  });
});

describe("Painel administrativo KDS — atualização de status de pedido", () => {
  let dir;
  let db;
  let cliente;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-admin-kds-status-"));
    db = openDatabase(join(dir, "app.sqlite"));
    cliente = insertCliente(db, { telefone: "11922220001", nome: "Fabio" });
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(dir, { recursive: true, force: true });
  });

  it("atualiza o status seguindo o fluxo recebido → em_preparo → saiu_para_entrega → concluido", () => {
    const pedido = insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "recebido",
    });

    const atualizadoEmPreparo = updateStatusPedido(db, pedido.id, "em_preparo");
    expect(atualizadoEmPreparo.status).toBe("em_preparo");

    const atualizadoSaiuParaEntrega = updateStatusPedido(db, pedido.id, "saiu_para_entrega");
    expect(atualizadoSaiuParaEntrega.status).toBe("saiu_para_entrega");

    const atualizadoConcluido = updateStatusPedido(db, pedido.id, "concluido");
    expect(atualizadoConcluido.status).toBe("concluido");
  });

  it("lança InvalidStatusTransitionError ao tentar pular etapas (recebido → concluido) e não altera o status gravado", () => {
    const pedido = insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "recebido",
    });

    expect(() => updateStatusPedido(db, pedido.id, "concluido")).toThrow(InvalidStatusTransitionError);

    const pedidoNoBanco = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(pedido.id);
    expect(pedidoNoBanco.status).toBe("recebido");
  });

  it("lança InvalidStatusTransitionError ao tentar transicionar a partir de um estado final (concluido ou cancelado)", () => {
    const pedidoConcluido = insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "concluido",
    });
    const pedidoCancelado = insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "cancelado",
    });

    expect(() => updateStatusPedido(db, pedidoConcluido.id, "em_preparo")).toThrow(
      InvalidStatusTransitionError
    );
    expect(() => updateStatusPedido(db, pedidoCancelado.id, "em_preparo")).toThrow(
      InvalidStatusTransitionError
    );
  });

  it("lança OrderNotFoundError ao atualizar status ou atribuir motoboy em um pedido inexistente", () => {
    const idInexistente = 999999;

    expect(() => updateStatusPedido(db, idInexistente, "em_preparo")).toThrow(OrderNotFoundError);
    expect(() => atribuirMotoboy(db, idInexistente, "João")).toThrow(OrderNotFoundError);
  });
});

describe("Painel administrativo KDS — atribuição de motoboy", () => {
  let dir;
  let db;
  let cliente;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-admin-kds-motoboy-"));
    db = openDatabase(join(dir, "app.sqlite"));
    cliente = insertCliente(db, { telefone: "11933330001", nome: "Gustavo" });
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(dir, { recursive: true, force: true });
  });

  it("grava o nome do motoboy no pedido, tanto no valor retornado quanto ao reconsultar o banco", () => {
    const pedido = insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "recebido",
    });

    const atualizado = atribuirMotoboy(db, pedido.id, "Carlos Silva");
    expect(atualizado.motoboy).toBe("Carlos Silva");

    const pedidoNoBanco = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(pedido.id);
    expect(pedidoNoBanco.motoboy).toBe("Carlos Silva");
  });

  it("lança InvalidMotoboyError para motoboy vazio, só espaços, ou null, sem alterar o campo gravado", () => {
    const pedido = insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza", quantidade: 1 }],
      status: "recebido",
      motoboy: "Motoboy Original",
    });

    expect(() => atribuirMotoboy(db, pedido.id, "")).toThrow(InvalidMotoboyError);
    expect(() => atribuirMotoboy(db, pedido.id, "   ")).toThrow(InvalidMotoboyError);
    expect(() => atribuirMotoboy(db, pedido.id, null)).toThrow(InvalidMotoboyError);

    const pedidoNoBanco = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(pedido.id);
    expect(pedidoNoBanco.motoboy).toBe("Motoboy Original");
  });
});

describe("Painel administrativo KDS — status de conexão do WhatsApp", () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-admin-kds-conexao-"));
    db = openDatabase(join(dir, "app.sqlite"));
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(dir, { recursive: true, force: true });
  });

  it("retorna 'desconectado' inicialmente, 'conectado' após 'ready' e volta a 'desconectado' após 'disconnected'", () => {
    const adapter = criarAdapterDuble();
    const client = createWhatsAppClient(adapter, { db });

    expect(client.getConnectionStatus()).toBe("desconectado");

    adapter.emitirComoAdapter("ready");
    expect(client.getConnectionStatus()).toBe("conectado");

    adapter.emitirComoAdapter("disconnected");
    expect(client.getConnectionStatus()).toBe("desconectado");
  });

  it("emite o evento público 'connection-status-changed' com 'conectado' em 'ready' e 'desconectado' em 'disconnected'", () => {
    const adapter = criarAdapterDuble();
    const client = createWhatsAppClient(adapter, { db });

    const statusRecebidos = [];
    client.on("connection-status-changed", (status) => statusRecebidos.push(status));

    adapter.emitirComoAdapter("ready");
    adapter.emitirComoAdapter("disconnected");

    expect(statusRecebidos).toEqual(["conectado", "desconectado"]);
  });

  it("mantém 'desconectado' após 'auth_failure' quando 'ready' nunca foi emitido", () => {
    const adapter = criarAdapterDuble();
    const client = createWhatsAppClient(adapter, { db });
    client.on("error", () => {}); // evita exceção não tratada do EventEmitter no evento "error"

    adapter.emitirComoAdapter("auth_failure", "sessão expirada");

    expect(client.getConnectionStatus()).toBe("desconectado");
  });
});
