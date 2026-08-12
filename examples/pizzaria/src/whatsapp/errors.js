// src/whatsapp/errors.js — hierarquia de erros do domínio de conexão WhatsApp.

export class WhatsAppError extends Error {}

export class AuthenticationError extends WhatsAppError {}
