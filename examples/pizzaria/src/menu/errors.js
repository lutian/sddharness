// src/menu/errors.js — hierarquia de erros do domínio de cardápio e configuração.

export class MenuError extends Error {}

export class MenuFileNotFoundError extends MenuError {}

export class InvalidMenuSchemaError extends MenuError {}

export class InvalidConfigError extends MenuError {}
