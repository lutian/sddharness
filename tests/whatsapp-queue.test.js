import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeDatabase, insertCliente, openDatabase, upsertSessao } from "../src/db/index.js";
import { AuthenticationError, createMessageQueue, createWhatsAppClient } from "../src/whatsapp/index.js";

// Adapter dublê: um EventEmitter simples controlado pelo teste, que dispara
// "qr", "auth_failure" e "message" manualmente, sem depender de rede,
// navegador ou WhatsApp real (ver design.md de feature-3).
function criarAdapterDuble() {
  const emitter = new EventEmitter();
  return {
    on: (evento, callback) => emitter.on(evento, callback),
    initialize: () => {},
    sendMessage: () => {},
    emitirComoAdapter: (evento, payload) => emitter.emit(evento, payload),
  };
}

describe("Conexão WhatsApp e fila de mensagens", () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-whatsapp-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("WhatsAppClient — QR Code e autenticação", () => {
    it("repassa exatamente a string de QR Code recebida do adapter para o evento público 'qr'", () => {
      const adapter = criarAdapterDuble();
      const db = openDatabase(join(dir, "app.sqlite"));
      const client = createWhatsAppClient(adapter, { db });

      let qrRecebido = null;
      client.on("qr", (qr) => {
        qrRecebido = qr;
      });

      adapter.emitirComoAdapter("qr", "QR_CODE_STRING_DE_TESTE");

      expect(qrRecebido).toBe("QR_CODE_STRING_DE_TESTE");
      closeDatabase(db);
    });

    it("emite um evento de erro com AuthenticationError quando o adapter reporta falha de autenticação, sem lançar exceção não tratada", () => {
      const adapter = criarAdapterDuble();
      const db = openDatabase(join(dir, "app.sqlite"));
      const client = createWhatsAppClient(adapter, { db });

      let erroRecebido = null;
      client.on("error", (error) => {
        erroRecebido = error;
      });

      expect(() => adapter.emitirComoAdapter("auth_failure", "sessão expirada")).not.toThrow();

      expect(erroRecebido).toBeInstanceOf(AuthenticationError);
      closeDatabase(db);
    });
  });

  describe("MessageQueue — FIFO sequencial", () => {
    it("processa três mensagens enfileiradas de uma vez, exatamente na ordem de chegada e nunca duas simultaneamente", async () => {
      const ordemProcessada = [];
      let emProcessamento = false;

      const queue = createMessageQueue({
        minDelayMs: 1,
        maxDelayMs: 2,
        processFn: async (mensagem) => {
          if (emProcessamento) {
            throw new Error("processamento concorrente detectado");
          }
          emProcessamento = true;
          await new Promise((resolve) => setTimeout(resolve, 5));
          ordemProcessada.push(mensagem);
          emProcessamento = false;
        },
      });

      queue.enqueue("m1");
      queue.enqueue("m2");
      queue.enqueue("m3");

      await esperarAte(() => ordemProcessada.length === 3);

      expect(ordemProcessada).toEqual(["m1", "m2", "m3"]);
    });

    it("aguarda um intervalo mensurável (delay humanizado) entre o fim do processamento de um item e o início do seguinte", async () => {
      const marcas = [];

      const queue = createMessageQueue({
        minDelayMs: 20,
        maxDelayMs: 30,
        processFn: async (mensagem) => {
          marcas.push({ mensagem, inicio: performance.now() });
        },
      });

      queue.enqueue("a");
      queue.enqueue("b");

      await esperarAte(() => marcas.length === 2);

      const intervalo = marcas[1].inicio - marcas[0].inicio;
      expect(intervalo).toBeGreaterThanOrEqual(15);
    });

    it("continua processando os itens seguintes quando processFn lança exceção no primeiro item, reportando o erro via evento 'error'", async () => {
      const processados = [];
      const errosRecebidos = [];

      const queue = createMessageQueue({
        minDelayMs: 1,
        maxDelayMs: 2,
        processFn: async (mensagem) => {
          if (mensagem === "falha") {
            throw new Error("erro de processamento simulado");
          }
          processados.push(mensagem);
        },
      });

      queue.on("error", (error) => errosRecebidos.push(error));

      queue.enqueue("falha");
      queue.enqueue("m2");
      queue.enqueue("m3");

      await esperarAte(() => processados.length === 2);

      expect(errosRecebidos).toHaveLength(1);
      expect(errosRecebidos[0].message).toBe("erro de processamento simulado");
      expect(processados).toEqual(["m2", "m3"]);
    });
  });

  describe("Isolamento de sessão por clienteId", () => {
    it("recupera o histórico salvo em `sessoes` para um clienteId com sessão prévia", async () => {
      const db = openDatabase(join(dir, "app.sqlite"));
      const cliente = insertCliente(db, { telefone: "11911112222", nome: "Ivo" });
      upsertSessao(db, {
        clienteId: cliente.id,
        historico: JSON.stringify(["oi", "quero uma pizza"]),
      });

      const adapter = criarAdapterDuble();
      const client = createWhatsAppClient(adapter, { db, minDelayMs: 1, maxDelayMs: 2 });

      const processadas = [];
      client.on("message-processed", (resultado) => processadas.push(resultado));

      adapter.emitirComoAdapter("message", { clienteId: cliente.id, texto: "oi de novo" });

      await esperarAte(() => processadas.length === 1);

      expect(JSON.parse(processadas[0].historico)).toEqual(["oi", "quero uma pizza"]);
      closeDatabase(db);
    });

    it("trata um clienteId sem sessão prévia como histórico vazio, sem lançar exceção", async () => {
      const db = openDatabase(join(dir, "app.sqlite"));
      const cliente = insertCliente(db, { telefone: "11922223333", nome: "Julia" });

      const adapter = criarAdapterDuble();
      const client = createWhatsAppClient(adapter, { db, minDelayMs: 1, maxDelayMs: 2 });

      const processadas = [];
      client.on("message-processed", (resultado) => processadas.push(resultado));

      expect(() =>
        adapter.emitirComoAdapter("message", { clienteId: cliente.id, texto: "oi" })
      ).not.toThrow();

      await esperarAte(() => processadas.length === 1);

      expect(processadas[0].historico).toBeNull();
      closeDatabase(db);
    });

    it("isola o histórico entre dois clienteId distintos: cada mensagem processada reporta apenas o próprio histórico", async () => {
      const db = openDatabase(join(dir, "app.sqlite"));
      const clienteA = insertCliente(db, { telefone: "11933334444", nome: "Clara" });
      const clienteB = insertCliente(db, { telefone: "11944445555", nome: "Bruno" });

      upsertSessao(db, { clienteId: clienteA.id, historico: JSON.stringify(["histórico de A"]) });
      upsertSessao(db, { clienteId: clienteB.id, historico: JSON.stringify(["histórico de B"]) });

      const adapter = criarAdapterDuble();
      const client = createWhatsAppClient(adapter, { db, minDelayMs: 1, maxDelayMs: 2 });

      const processadas = [];
      client.on("message-processed", (resultado) => processadas.push(resultado));

      adapter.emitirComoAdapter("message", { clienteId: clienteA.id, texto: "msg A" });
      adapter.emitirComoAdapter("message", { clienteId: clienteB.id, texto: "msg B" });

      await esperarAte(() => processadas.length === 2);

      const processadaA = processadas.find((p) => p.clienteId === clienteA.id);
      const processadaB = processadas.find((p) => p.clienteId === clienteB.id);

      expect(JSON.parse(processadaA.historico)).toEqual(["histórico de A"]);
      expect(JSON.parse(processadaB.historico)).toEqual(["histórico de B"]);
      closeDatabase(db);
    });

    it("preserva a ordem FIFO global e a ordem relativa por clienteId ao intercalar mensagens de dois clientes", async () => {
      const db = openDatabase(join(dir, "app.sqlite"));
      const clienteA = insertCliente(db, { telefone: "11955556666", nome: "André" });
      const clienteB = insertCliente(db, { telefone: "11966667777", nome: "Beto" });

      const adapter = criarAdapterDuble();
      const client = createWhatsAppClient(adapter, { db, minDelayMs: 1, maxDelayMs: 2 });

      const ordem = [];
      client.on("message-processed", (resultado) => {
        ordem.push(`${resultado.clienteId === clienteA.id ? "A" : "B"}:${resultado.texto}`);
      });

      adapter.emitirComoAdapter("message", { clienteId: clienteA.id, texto: "1" });
      adapter.emitirComoAdapter("message", { clienteId: clienteB.id, texto: "1" });
      adapter.emitirComoAdapter("message", { clienteId: clienteA.id, texto: "2" });
      adapter.emitirComoAdapter("message", { clienteId: clienteB.id, texto: "2" });

      await esperarAte(() => ordem.length === 4);

      expect(ordem).toEqual(["A:1", "B:1", "A:2", "B:2"]);
      closeDatabase(db);
    });
  });
});

// Aguarda até que `condicao()` seja verdadeira, verificando periodicamente.
// Usado no lugar de fake timers para respeitar o comportamento real de
// `setTimeout` da fila (ver design.md, R6).
async function esperarAte(condicao, timeoutMs = 2000) {
  const inicio = Date.now();
  while (!condicao()) {
    if (Date.now() - inicio > timeoutMs) {
      throw new Error("Tempo excedido aguardando condição na fila.");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
