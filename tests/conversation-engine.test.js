import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ChatCompletionError,
  IncompleteOrderDataError,
  MissingApiKeyError,
  processarMensagemConversa,
} from "../src/ai/index.js";
import {
  closeDatabase,
  findClienteByTelefone,
  findSessaoByClienteId,
  insertCliente,
  openDatabase,
  upsertSessao,
} from "../src/db/index.js";

// Dublê simples de adapter de chat: função `async` controlada pelo teste,
// sem rede real (ver design.md de feature-5).
function criarChatAdapterDuble({ resposta = "resposta padrão", dadosCliente, pedido } = {}) {
  const chamadas = [];
  return {
    chamadas,
    generateReply: async (params) => {
      chamadas.push(params);
      return { resposta, dadosCliente, pedido };
    },
  };
}

function criarChatAdapterDubleComFalha(erro) {
  return {
    generateReply: async () => {
      throw erro;
    },
  };
}

function criarConfigBase(overrides = {}) {
  return {
    apiKeys: { openai: "sk-openai-fake", deepseek: "sk-deepseek-fake" },
    systemPrompt: "Você é o atendente virtual de uma pizzaria.",
    audioEnabled: false,
    imageEnabled: false,
    modeloSelecionado: "openai",
    ...overrides,
  };
}

const CARDAPIO_FAKE = {
  categorias: [{ nome: "Pizzas", itens: [{ nome: "Calabresa", preco: 42.5 }] }],
};

describe("Motor de conversação com OpenAI e DeepSeek", () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-conversation-"));
    db = openDatabase(join(dir, "app.sqlite"));
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(dir, { recursive: true, force: true });
  });

  it("usa adapters.openai por padrão quando modeloSelecionado está ausente ou é \"openai\"", async () => {
    const openai = criarChatAdapterDuble({ resposta: "olá do openai" });
    const deepseek = criarChatAdapterDuble({ resposta: "olá do deepseek" });
    const config = criarConfigBase();
    delete config.modeloSelecionado;

    const resultado = await processarMensagemConversa({
      db,
      clienteId: "11999990000",
      mensagemCliente: "oi",
      adapters: { openai, deepseek },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(openai.chamadas).toHaveLength(1);
    expect(deepseek.chamadas).toHaveLength(0);
    expect(resultado.resposta).toBe("olá do openai");
  });

  it("usa adapters.deepseek quando modeloSelecionado é \"deepseek\"", async () => {
    const openai = criarChatAdapterDuble({ resposta: "olá do openai" });
    const deepseek = criarChatAdapterDuble({ resposta: "olá do deepseek" });
    const config = criarConfigBase({ modeloSelecionado: "deepseek" });

    const resultado = await processarMensagemConversa({
      db,
      clienteId: "11999990000",
      mensagemCliente: "oi",
      adapters: { openai, deepseek },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(deepseek.chamadas).toHaveLength(1);
    expect(openai.chamadas).toHaveLength(0);
    expect(resultado.resposta).toBe("olá do deepseek");
  });

  it("lança MissingApiKeyError e não chama nenhum adapter quando a apiKey do modelo selecionado está vazia", async () => {
    const openai = criarChatAdapterDuble();
    const deepseek = criarChatAdapterDuble();
    const config = criarConfigBase({ apiKeys: { openai: "", deepseek: "sk-deepseek-fake" } });

    await expect(
      processarMensagemConversa({
        db,
        clienteId: "11999990000",
        mensagemCliente: "oi",
        adapters: { openai, deepseek },
        config,
        cardapio: CARDAPIO_FAKE,
      })
    ).rejects.toThrow(MissingApiKeyError);

    expect(openai.chamadas).toHaveLength(0);
    expect(deepseek.chamadas).toHaveLength(0);
  });

  it("resolve/cria um cliente básico por telefone (R4) mesmo quando a resposta do adapter não contém dadosCliente", async () => {
    const clienteId = "11999990000";
    const openai = criarChatAdapterDuble();
    const config = criarConfigBase();

    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "oi",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    const cliente = findClienteByTelefone(db, clienteId);
    expect(cliente).not.toBeNull();
    expect(cliente.telefone).toBe(clienteId);
  });

  it("reaproveita o cliente já cadastrado ao resolver por telefone (R4), sem criar duplicata", async () => {
    const clienteId = "11999990000";
    const clientePrevio = insertCliente(db, { telefone: clienteId, nome: "Ana" });
    const openai = criarChatAdapterDuble();
    const config = criarConfigBase();

    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "oi",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    const cliente = findClienteByTelefone(db, clienteId);
    expect(cliente.id).toBe(clientePrevio.id);
    expect(cliente.nome).toBe("Ana");
  });

  it("chama generateReply com systemPrompt e cardapio exatamente iguais aos recebidos", async () => {
    const openai = criarChatAdapterDuble();
    const config = criarConfigBase({ systemPrompt: "Prompt exclusivo de teste" });

    await processarMensagemConversa({
      db,
      clienteId: "11999990000",
      mensagemCliente: "oi",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(openai.chamadas[0].systemPrompt).toBe("Prompt exclusivo de teste");
    expect(openai.chamadas[0].cardapio).toEqual(CARDAPIO_FAKE);
  });

  it("inclui o histórico decodificado da sessão salva quando ela existe para o clienteId", async () => {
    const clienteId = "11999990000";
    const historicoSalvo = [
      { autor: "cliente", texto: "oi" },
      { autor: "assistente", texto: "olá, bem-vindo!" },
    ];
    // resolve/cria o cliente por telefone (como o próprio motor faria em
    // R4) para obter o id interno exigido pela FK de sessoes.cliente_id.
    const clientePrevio = insertCliente(db, { telefone: clienteId });
    upsertSessao(db, { clienteId: clientePrevio.id, historico: JSON.stringify(historicoSalvo) });

    const openai = criarChatAdapterDuble();
    const config = criarConfigBase();

    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "quero uma pizza",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(openai.chamadas[0].historico).toEqual(historicoSalvo);
  });

  it("chama generateReply com historico vazio quando não existe sessão salva para o clienteId", async () => {
    const openai = criarChatAdapterDuble();
    const config = criarConfigBase();

    await processarMensagemConversa({
      db,
      clienteId: "11988887777",
      mensagemCliente: "oi",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(openai.chamadas[0].historico).toEqual([]);
  });

  it("persiste o histórico atualizado com a mensagem do cliente e a resposta do assistente, preservando mensagens anteriores", async () => {
    const clienteId = "11999990000";
    const config = criarConfigBase();

    const openai1 = criarChatAdapterDuble({ resposta: "olá, bem-vindo!" });
    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "oi",
      adapters: { openai: openai1, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    const openai2 = criarChatAdapterDuble({ resposta: "temos calabresa e margherita" });
    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "quais sabores vocês têm?",
      adapters: { openai: openai2, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    // a sessão agora é indexada pelo id interno do cliente (R4): resolve o
    // cliente por telefone antes de consultar a sessão persistida.
    const clientePersistido = findClienteByTelefone(db, clienteId);
    const sessao = findSessaoByClienteId(db, clientePersistido.id);
    const historicoPersistido = JSON.parse(sessao.historico);

    expect(historicoPersistido).toEqual([
      { autor: "cliente", texto: "oi" },
      { autor: "assistente", texto: "olá, bem-vindo!" },
      { autor: "cliente", texto: "quais sabores vocês têm?" },
      { autor: "assistente", texto: "temos calabresa e margherita" },
    ]);
  });

  it("lança ChatCompletionError com a causa original e não persiste sessão nem pedido quando generateReply falha", async () => {
    const clienteId = "11999990000";
    const erroOriginal = new Error("timeout de rede");
    const openai = criarChatAdapterDubleComFalha(erroOriginal);
    const config = criarConfigBase();

    await expect(
      processarMensagemConversa({
        db,
        clienteId,
        mensagemCliente: "oi",
        adapters: { openai, deepseek: criarChatAdapterDuble() },
        config,
        cardapio: CARDAPIO_FAKE,
      })
    ).rejects.toThrow(ChatCompletionError);

    try {
      await processarMensagemConversa({
        db,
        clienteId,
        mensagemCliente: "oi",
        adapters: { openai, deepseek: criarChatAdapterDuble() },
        config,
        cardapio: CARDAPIO_FAKE,
      });
    } catch (erro) {
      expect(erro.cause).toBe(erroOriginal);
    }

    // R4: a resolução/criação do cliente básico acontece antes da chamada
    // a generateReply, logo um registro básico (telefone apenas) já existe
    // mesmo quando generateReply falha — isso não constitui persistência
    // de sessão nem de pedido.
    const clienteBasico = findClienteByTelefone(db, clienteId);
    expect(clienteBasico).not.toBeNull();
    expect(clienteBasico.nome).toBeNull();
    expect(clienteBasico.endereco).toBeNull();
    expect(findSessaoByClienteId(db, clienteBasico.id)).toBeNull();
  });

  it("cria um novo cliente quando dadosCliente é informado e o clienteId é inédito", async () => {
    const clienteId = "11999990000";
    const openai = criarChatAdapterDuble({
      dadosCliente: { nome: "Ana", endereco: "Rua das Flores, 10" },
    });
    const config = criarConfigBase();

    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "meu nome é Ana e meu endereço é Rua das Flores, 10",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    const cliente = findClienteByTelefone(db, clienteId);
    expect(cliente).not.toBeNull();
    expect(cliente.nome).toBe("Ana");
    expect(cliente.endereco).toBe("Rua das Flores, 10");
  });

  it("atualiza apenas os campos informados de um cliente já existente, preservando os demais", async () => {
    const clienteId = "11999990000";
    insertCliente(db, { telefone: clienteId, nome: "Ana" });

    const openai = criarChatAdapterDuble({ dadosCliente: { endereco: "Rua Nova, 20" } });
    const config = criarConfigBase();

    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "meu endereço é Rua Nova, 20",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    const cliente = findClienteByTelefone(db, clienteId);
    expect(cliente.nome).toBe("Ana");
    expect(cliente.endereco).toBe("Rua Nova, 20");
  });

  it("não altera nome/endereco do cliente quando dadosCliente está ausente (apenas o registro básico de R4 é criado)", async () => {
    const clienteId = "11999990000";
    const openai = criarChatAdapterDuble();
    const config = criarConfigBase();

    await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "oi",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    const cliente = findClienteByTelefone(db, clienteId);
    expect(cliente).not.toBeNull();
    expect(cliente.nome).toBeNull();
    expect(cliente.endereco).toBeNull();
  });

  it("insere um pedido com status \"recebido\" e itens estruturados quando pedido.fechado é true", async () => {
    const clienteId = "11999990000";
    const itens = [{ nome: "Calabresa", quantidade: 2, preco: 42.5 }];
    const openai = criarChatAdapterDuble({
      dadosCliente: { nome: "Ana", endereco: "Rua das Flores, 10", formaPagamento: "pix" },
      pedido: { itens, fechado: true },
    });
    const config = criarConfigBase();

    const resultado = await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "fechar pedido",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(resultado.pedidoRegistrado).toBe(true);

    const cliente = findClienteByTelefone(db, clienteId);
    const pedido = db.prepare("SELECT * FROM pedidos WHERE cliente_id = ?").get(cliente.id);

    expect(pedido).toBeDefined();
    expect(pedido.status).toBe("recebido");
    expect(JSON.parse(pedido.itens)).toEqual({ lista: itens, formaPagamento: "pix" });
  });

  it("não insere pedido quando pedido.fechado é false", async () => {
    const clienteId = "11999990000";
    insertCliente(db, { telefone: clienteId, nome: "Ana" });
    const openai = criarChatAdapterDuble({
      pedido: { itens: [{ nome: "Calabresa", quantidade: 1, preco: 42.5 }], fechado: false },
    });
    const config = criarConfigBase();

    const resultado = await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "ainda estou decidindo",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(resultado.pedidoRegistrado).toBe(false);
    const cliente = findClienteByTelefone(db, clienteId);
    const pedido = db.prepare("SELECT * FROM pedidos WHERE cliente_id = ?").get(cliente.id);
    expect(pedido).toBeUndefined();
  });

  it("não insere pedido quando a resposta do adapter não contém o campo pedido", async () => {
    const clienteId = "11999990000";
    insertCliente(db, { telefone: clienteId, nome: "Ana" });
    const openai = criarChatAdapterDuble();
    const config = criarConfigBase();

    const resultado = await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "oi",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(resultado.pedidoRegistrado).toBe(false);
    const cliente = findClienteByTelefone(db, clienteId);
    const pedido = db.prepare("SELECT * FROM pedidos WHERE cliente_id = ?").get(cliente.id);
    expect(pedido).toBeUndefined();
  });

  it("lança IncompleteOrderDataError e não insere pedido quando pedido.fechado é true sem cliente resolvido", async () => {
    const clienteId = "11999990000";
    const openai = criarChatAdapterDuble({
      pedido: { itens: [{ nome: "Calabresa", quantidade: 1, preco: 42.5 }], fechado: true },
    });
    const config = criarConfigBase();

    await expect(
      processarMensagemConversa({
        db,
        clienteId,
        mensagemCliente: "fechar pedido",
        adapters: { openai, deepseek: criarChatAdapterDuble() },
        config,
        cardapio: CARDAPIO_FAKE,
      })
    ).rejects.toThrow(IncompleteOrderDataError);

    const totalPedidos = db.prepare("SELECT COUNT(*) AS total FROM pedidos").get().total;
    expect(totalPedidos).toBe(0);
  });

  it("retorna resposta, pedidoRegistrado e clienteId corretos em um fluxo de sucesso com fechamento de pedido", async () => {
    const clienteId = "11999990000";
    const openai = criarChatAdapterDuble({
      resposta: "pedido fechado, obrigado!",
      dadosCliente: { nome: "Ana", endereco: "Rua das Flores, 10", formaPagamento: "pix" },
      pedido: { itens: [{ nome: "Calabresa", quantidade: 1, preco: 42.5 }], fechado: true },
    });
    const config = criarConfigBase();

    const resultado = await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "fechar pedido",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(resultado).toEqual({
      resposta: "pedido fechado, obrigado!",
      pedidoRegistrado: true,
      clienteId,
    });
  });

  it("retorna resposta, pedidoRegistrado e clienteId corretos em um fluxo de sucesso sem fechamento de pedido", async () => {
    const clienteId = "11988887777";
    const openai = criarChatAdapterDuble({ resposta: "temos calabresa e margherita" });
    const config = criarConfigBase();

    const resultado = await processarMensagemConversa({
      db,
      clienteId,
      mensagemCliente: "quais sabores vocês têm?",
      adapters: { openai, deepseek: criarChatAdapterDuble() },
      config,
      cardapio: CARDAPIO_FAKE,
    });

    expect(resultado).toEqual({
      resposta: "temos calabresa e margherita",
      pedidoRegistrado: false,
      clienteId,
    });
  });
});
