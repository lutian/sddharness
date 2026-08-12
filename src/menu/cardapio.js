// src/menu/cardapio.js — leitura e validação de cardapio.json.
import { existsSync, readFileSync } from "node:fs";

import { InvalidMenuSchemaError, MenuFileNotFoundError } from "./errors.js";

function _isItemValido(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.nome === "string" &&
    item.nome.trim().length > 0 &&
    typeof item.preco === "number" &&
    Number.isFinite(item.preco)
  );
}

function _validarCardapio(cardapio) {
  if (cardapio === null || typeof cardapio !== "object" || !Array.isArray(cardapio.categorias)) {
    throw new InvalidMenuSchemaError("Cardápio inválido: campo \"categorias\" deve ser um array.");
  }

  for (const categoria of cardapio.categorias) {
    if (categoria === null || typeof categoria !== "object" || !Array.isArray(categoria.itens)) {
      throw new InvalidMenuSchemaError("Cardápio inválido: cada categoria deve ter um array de itens.");
    }

    for (const item of categoria.itens) {
      if (!_isItemValido(item)) {
        throw new InvalidMenuSchemaError(
          "Cardápio inválido: cada item deve ter \"nome\" (string não vazia) e \"preco\" (número finito)."
        );
      }
    }
  }
}

// Lê e valida o arquivo de cardápio em path. Lança MenuFileNotFoundError se o
// arquivo não existir e InvalidMenuSchemaError se o conteúdo não for JSON
// válido ou não seguir o schema esperado (sem retorno parcial).
export function loadCardapio(path) {
  if (!existsSync(path)) {
    throw new MenuFileNotFoundError(`Arquivo de cardápio não encontrado: ${path}`);
  }

  const conteudo = readFileSync(path, "utf-8");

  let cardapio;
  try {
    cardapio = JSON.parse(conteudo);
  } catch {
    throw new InvalidMenuSchemaError(`Conteúdo de ${path} não é um JSON válido.`);
  }

  _validarCardapio(cardapio);

  return cardapio;
}
