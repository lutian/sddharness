// src/menu/config.js — leitura e persistência atômica de configurações globais.
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

import { InvalidConfigError } from "./errors.js";

const SYSTEM_PROMPT_PADRAO =
  "Você é o atendente virtual de uma pizzaria. Seja cordial, objetivo e siga o cardápio " +
  "cadastrado para apresentar os itens e fechar pedidos.";

// Retorna a configuração padrão. Nunca lê nem escreve no disco.
export function getDefaultConfig() {
  return {
    apiKeys: { openai: "", deepseek: "" },
    systemPrompt: SYSTEM_PROMPT_PADRAO,
    audioEnabled: false,
    imageEnabled: false,
    modeloSelecionado: "openai",
  };
}

// Lê a configuração em path. Se o arquivo não existir, retorna a configuração
// padrão sem criar arquivo. Se existir, faz merge raso com o padrão: campos
// ausentes no arquivo assumem o valor padrão, campos presentes prevalecem.
export function loadConfig(path) {
  const padrao = getDefaultConfig();

  if (!existsSync(path)) {
    return padrao;
  }

  const conteudo = readFileSync(path, "utf-8");
  const salvo = JSON.parse(conteudo);

  return {
    apiKeys: {
      openai: salvo.apiKeys?.openai ?? padrao.apiKeys.openai,
      deepseek: salvo.apiKeys?.deepseek ?? padrao.apiKeys.deepseek,
    },
    systemPrompt: salvo.systemPrompt ?? padrao.systemPrompt,
    audioEnabled: salvo.audioEnabled ?? padrao.audioEnabled,
    imageEnabled: salvo.imageEnabled ?? padrao.imageEnabled,
    modeloSelecionado: salvo.modeloSelecionado ?? padrao.modeloSelecionado,
  };
}

const MODELOS_PERMITIDOS = ["openai", "deepseek"];

function _validarConfig(config) {
  if (typeof config.systemPrompt !== "string") {
    throw new InvalidConfigError("\"systemPrompt\" deve ser uma string.");
  }

  if (typeof config.audioEnabled !== "boolean") {
    throw new InvalidConfigError("\"audioEnabled\" deve ser um booleano.");
  }

  if (typeof config.imageEnabled !== "boolean") {
    throw new InvalidConfigError("\"imageEnabled\" deve ser um booleano.");
  }

  if (!MODELOS_PERMITIDOS.includes(config.modeloSelecionado)) {
    throw new InvalidConfigError(
      `"modeloSelecionado" deve ser um dos valores: ${MODELOS_PERMITIDOS.join(", ")}.`
    );
  }
}

// Valida e persiste config em path de forma atômica (arquivo temporário +
// fs.renameSync). Aplica chmod 0o600 quando alguma API key estiver
// preenchida, silenciando falhas de chmod em plataformas onde não há efeito
// (ex.: Windows, resolvido pelo instalador de feature-8).
export function saveConfig(path, config) {
  _validarConfig(config);

  const caminhoTemporario = `${path}.tmp-${process.pid}`;
  writeFileSync(caminhoTemporario, JSON.stringify(config, null, 2), "utf-8");
  renameSync(caminhoTemporario, path);

  const temApiKeyPreenchida =
    Boolean(config.apiKeys?.openai) || Boolean(config.apiKeys?.deepseek);

  if (temApiKeyPreenchida) {
    try {
      chmodSync(path, 0o600);
    } catch {
      // Plataforma sem suporte a chmod (ex.: Windows); não interrompe o fluxo.
    }
  }
}
