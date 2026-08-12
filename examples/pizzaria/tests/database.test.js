import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DuplicatePhoneError,
  InvalidOrderStatusError,
  closeDatabase,
  findClienteByTelefone,
  insertCliente,
  insertPedido,
  openDatabase,
  resolveUserDataPath,
  upsertSessao,
} from "../src/db/index.js";

describe("Banco de dados", () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("cria o arquivo SQLite se não existir", () => {
    const path = join(dir, "app.sqlite");
    expect(existsSync(path)).toBe(false);

    const db = openDatabase(path);

    expect(existsSync(path)).toBe(true);
    closeDatabase(db);
  });

  it("reabre um banco existente sem apagar os dados já gravados", () => {
    const path = join(dir, "app.sqlite");
    const db1 = openDatabase(path);
    insertCliente(db1, { telefone: "11999990000", nome: "Ana" });
    closeDatabase(db1);

    const db2 = openDatabase(path);
    const cliente = findClienteByTelefone(db2, "11999990000");

    expect(cliente).not.toBeNull();
    expect(cliente.nome).toBe("Ana");
    closeDatabase(db2);
  });

  it("resolve o caminho do banco dentro do diretório de dados do usuário fora do Electron", () => {
    const path = resolveUserDataPath("app.sqlite");

    expect(path).toContain(".pizzaria-whatsapp-delivery-desktop");
    expect(path.endsWith("app.sqlite")).toBe(true);
  });

  it("cria as tabelas clientes, sessoes e pedidos na primeira abertura", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);

    const tabelas = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((linha) => linha.name);

    expect(tabelas).toEqual(expect.arrayContaining(["clientes", "sessoes", "pedidos"]));
    closeDatabase(db);
  });

  it("rejeita um telefone duplicado em clientes", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);
    insertCliente(db, { telefone: "11988887777", nome: "Beatriz" });

    expect(() => insertCliente(db, { telefone: "11988887777", nome: "Outro" })).toThrow(
      DuplicatePhoneError
    );

    const cliente = findClienteByTelefone(db, "11988887777");
    expect(cliente.nome).toBe("Beatriz");
    closeDatabase(db);
  });

  it("mantém apenas a sessão mais recente por cliente", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);
    const cliente = insertCliente(db, { telefone: "11977776666", nome: "Carlos" });

    upsertSessao(db, { clienteId: cliente.id, historico: JSON.stringify(["oi"]) });
    upsertSessao(db, { clienteId: cliente.id, historico: JSON.stringify(["oi", "quero pizza"]) });

    const linhas = db.prepare("SELECT * FROM sessoes WHERE cliente_id = ?").all(cliente.id);

    expect(linhas).toHaveLength(1);
    expect(JSON.parse(linhas[0].historico)).toEqual(["oi", "quero pizza"]);
    closeDatabase(db);
  });

  it("insere um pedido serializando os itens em JSON e relê a mesma estrutura", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);
    const cliente = insertCliente(db, { telefone: "11966665555", nome: "Duda" });
    const itens = [
      { nome: "Pizza Calabresa", quantidade: 1, preco: 45.9 },
      { nome: "Refrigerante", quantidade: 2, preco: 8.0 },
    ];

    const pedido = insertPedido(db, {
      clienteId: cliente.id,
      itens,
      status: "recebido",
      motoboy: null,
    });

    expect(JSON.parse(pedido.itens)).toEqual(itens);
    closeDatabase(db);
  });

  it("rejeita um pedido com status fora do enum permitido", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);
    const cliente = insertCliente(db, { telefone: "11955554444", nome: "Elis" });

    expect(() =>
      insertPedido(db, {
        clienteId: cliente.id,
        itens: [{ nome: "Pizza", quantidade: 1 }],
        status: "status_invalido",
      })
    ).toThrow(InvalidOrderStatusError);
    closeDatabase(db);
  });

  it("armazena corretamente o nome do motoboy em um pedido", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);
    const cliente = insertCliente(db, { telefone: "11944443333", nome: "Fábio" });

    const pedido = insertPedido(db, {
      clienteId: cliente.id,
      itens: [{ nome: "Pizza Marguerita", quantidade: 1 }],
      status: "saiu_para_entrega",
      motoboy: "João",
    });

    expect(pedido.motoboy).toBe("João");
    closeDatabase(db);
  });

  it("fecha a conexão de forma limpa sem lançar exceção", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);

    expect(() => closeDatabase(db)).not.toThrow();
  });

  it("insere um cliente sem endereço nem coordenadas, gravando esses campos como null", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);

    const cliente = insertCliente(db, { telefone: "11933332222", nome: "Gustavo" });

    expect(cliente.endereco).toBeNull();
    expect(cliente.latitude).toBeNull();
    expect(cliente.longitude).toBeNull();

    const releitura = findClienteByTelefone(db, "11933332222");
    expect(releitura.endereco).toBeNull();
    expect(releitura.latitude).toBeNull();
    expect(releitura.longitude).toBeNull();
    closeDatabase(db);
  });

  it("insere e relê um cliente com endereço e coordenadas de geolocalização", () => {
    const path = join(dir, "app.sqlite");
    const db = openDatabase(path);

    insertCliente(db, {
      telefone: "11922221111",
      nome: "Helena",
      endereco: "Rua das Flores, 123",
      latitude: -23.55052,
      longitude: -46.633308,
    });

    const releitura = findClienteByTelefone(db, "11922221111");

    expect(releitura.endereco).toBe("Rua das Flores, 123");
    expect(releitura.latitude).toBeCloseTo(-23.55052);
    expect(releitura.longitude).toBeCloseTo(-46.633308);
    closeDatabase(db);
  });
});
