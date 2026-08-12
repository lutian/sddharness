// src/db/errors.js — hierarquia de erros do domínio de persistência SQLite.

export class DatabaseError extends Error {}

export class DuplicatePhoneError extends DatabaseError {}

export class InvalidOrderStatusError extends DatabaseError {}

export class OrderNotFoundError extends DatabaseError {}

export class InvalidStatusTransitionError extends DatabaseError {}

export class InvalidMotoboyError extends DatabaseError {}
