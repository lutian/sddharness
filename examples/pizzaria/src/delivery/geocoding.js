// src/delivery/geocoding.js — traduz endereço textual em coordenadas via um
// GeocoderAdapter injetado (ver geocoder.js).
import {
  AddressNotFoundError,
  GeocodingError,
  InvalidAddressError,
} from "./errors.js";

// Valida `endereco`, chama geocoder.geocode(endereco) e traduz o
// resultado/erro em coordenadas ou em uma exceção de domínio.
export async function geocodeEndereco(geocoder, endereco) {
  if (!endereco || endereco.trim() === "") {
    throw new InvalidAddressError("endereço não pode ser vazio");
  }

  let resultado;
  try {
    resultado = await geocoder.geocode(endereco);
  } catch (erroOriginal) {
    throw new GeocodingError("falha ao geocodificar o endereço", { cause: erroOriginal });
  }

  if (resultado === null) {
    throw new AddressNotFoundError(`endereço não encontrado: "${endereco}"`);
  }

  return { latitude: resultado.latitude, longitude: resultado.longitude };
}
