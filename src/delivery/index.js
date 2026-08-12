// src/delivery/index.js — geocodificação Nominatim + cálculo de tempo de
// espera (superfície pública única do domínio; o restante dos arquivos
// deste diretório é interno).
export { geocodeEndereco } from "./geocoding.js";
export { calcularDistanciaKm } from "./distance.js";
export { calcularTempoEspera, calcularTempoEsperaPorDistanciaEFila } from "./waitTime.js";
export { listarPedidosAtivosComTempoEspera } from "./painelPedidos.js";
export {
  DeliveryError,
  InvalidAddressError,
  AddressNotFoundError,
  GeocodingError,
  InvalidCoordinatesError,
} from "./errors.js";
export { createNominatimGeocoder } from "./adapters/nominatim.js";
