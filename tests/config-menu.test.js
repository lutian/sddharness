import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  InvalidConfigError,
  InvalidMenuSchemaError,
  MenuFileNotFoundError,
  getDefaultConfig,
  loadCardapio,
  loadConfig,
  saveConfig,
} from "../src/menu/index.js";

describe("Cardápio e configurações globais", () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pizzaria-menu-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("loadCardapio", () => {
    it("lê um cardapio.json válido e retorna a estrutura de categorias e itens", () => {
      const path = join(dir, "cardapio.json");
      const cardapioOriginal = {
        categorias: [
          {
            nome: "Pizzas",
            itens: [
              { nome: "Margherita", preco: 45.9, descricao: "Molho, mussarela e manjericão" },
              { nome: "Calabresa", preco: 42.5 },
            ],
          },
        ],
      };
      writeFileSync(path, JSON.stringify(cardapioOriginal), "utf-8");

      const cardapio = loadCardapio(path);

      expect(cardapio).toEqual(cardapioOriginal);
    });

    it("lança InvalidMenuSchemaError quando um item não tem nome ou preco", () => {
      const path = join(dir, "cardapio.json");
      const cardapioInvalido = {
        categorias: [
          {
            nome: "Pizzas",
            itens: [{ preco: 45.9 }],
          },
        ],
      };
      writeFileSync(path, JSON.stringify(cardapioInvalido), "utf-8");

      expect(() => loadCardapio(path)).toThrow(InvalidMenuSchemaError);
    });

    it("lança MenuFileNotFoundError quando o arquivo não existe", () => {
      const path = join(dir, "nao-existe.json");

      expect(() => loadCardapio(path)).toThrow(MenuFileNotFoundError);
    });

    it("lança InvalidMenuSchemaError quando o conteúdo não é JSON válido", () => {
      const path = join(dir, "cardapio.json");
      writeFileSync(path, "{ isto não é json", "utf-8");

      expect(() => loadCardapio(path)).toThrow(InvalidMenuSchemaError);
    });
  });

  describe("loadConfig", () => {
    it("retorna a configuração padrão sem criar arquivo quando o path não existe", () => {
      const path = join(dir, "config.json");

      const config = loadConfig(path);

      expect(config).toEqual(getDefaultConfig());
      expect(existsSync(path)).toBe(false);
    });
  });

  describe("saveConfig", () => {
    it("persiste o arquivo de forma atômica, sem deixar restos de arquivo temporário", () => {
      const path = join(dir, "config.json");
      const config = { ...getDefaultConfig(), systemPrompt: "Prompt de teste" };

      saveConfig(path, config);

      const conteudo = readFileSync(path, "utf-8");
      expect(() => JSON.parse(conteudo)).not.toThrow();
      expect(JSON.parse(conteudo).systemPrompt).toBe("Prompt de teste");

      const arquivosTemporarios = readdirSync(dir).filter((nome) => nome.includes(".tmp-"));
      expect(arquivosTemporarios).toHaveLength(0);
    });

    it("grava e relê as chaves de API da OpenAI e DeepSeek com permissões restritas", () => {
      const path = join(dir, "config.json");
      const config = {
        ...getDefaultConfig(),
        apiKeys: { openai: "sk-openai-fake", deepseek: "sk-deepseek-fake" },
      };

      saveConfig(path, config);
      const relido = loadConfig(path);

      expect(relido.apiKeys.openai).toBe("sk-openai-fake");
      expect(relido.apiKeys.deepseek).toBe("sk-deepseek-fake");

      if (process.platform !== "win32") {
        const modo = statSync(path).mode & 0o777;
        expect(modo).toBe(0o600);
      }
    });

    it("reflete systemPrompt, audioEnabled e imageEnabled atualizados em uma releitura", () => {
      const path = join(dir, "config.json");
      saveConfig(path, getDefaultConfig());

      saveConfig(path, {
        ...getDefaultConfig(),
        systemPrompt: "Novo prompt de atendimento",
        audioEnabled: true,
        imageEnabled: true,
      });

      const relido = loadConfig(path);

      expect(relido.systemPrompt).toBe("Novo prompt de atendimento");
      expect(relido.audioEnabled).toBe(true);
      expect(relido.imageEnabled).toBe(true);
    });

    it("lança InvalidConfigError e não escreve arquivo quando systemPrompt não é string", () => {
      const path = join(dir, "config.json");
      const config = { ...getDefaultConfig(), systemPrompt: 123 };

      expect(() => saveConfig(path, config)).toThrow(InvalidConfigError);
      expect(existsSync(path)).toBe(false);
    });

    it("lança InvalidConfigError e não escreve arquivo quando audioEnabled/imageEnabled não são booleanos", () => {
      const path = join(dir, "config.json");
      const configAudioInvalido = { ...getDefaultConfig(), audioEnabled: "sim" };
      const configImagemInvalido = { ...getDefaultConfig(), imageEnabled: "nao" };

      expect(() => saveConfig(path, configAudioInvalido)).toThrow(InvalidConfigError);
      expect(() => saveConfig(path, configImagemInvalido)).toThrow(InvalidConfigError);
      expect(existsSync(path)).toBe(false);
    });
  });
});
