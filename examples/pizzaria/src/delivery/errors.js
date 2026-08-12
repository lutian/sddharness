// src/delivery/errors.js — hierarquia de erros do domínio de geocodificação
// e cálculo de tempo de espera.

export class DeliveryError extends Error {}

export class InvalidAddressError extends DeliveryError {}

export class AddressNotFoundError extends DeliveryError {}

export class GeocodingError extends DeliveryError {}

export class InvalidCoordinatesError extends DeliveryError {}
