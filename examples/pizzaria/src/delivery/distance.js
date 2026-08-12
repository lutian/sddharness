// src/delivery/distance.js — distância geodésica entre dois pontos (fórmula
// de Haversine). Função pura, sem IO.
import { InvalidCoordinatesError } from "./errors.js";

const RAIO_TERRA_KM = 6371;

function _toRad(graus) {
  return (graus * Math.PI) / 180;
}

function _validarCoordenadas(ponto) {
  if (
    !ponto ||
    typeof ponto.latitude !== "number" ||
    typeof ponto.longitude !== "number"
  ) {
    throw new InvalidCoordinatesError(
      "coordenadas inválidas: esperado objeto com latitude e longitude numéricos"
    );
  }
}

// Distância em quilômetros entre `origem` e `destino`, via fórmula de
// Haversine (raio da Terra = 6371 km).
export function calcularDistanciaKm(origem, destino) {
  _validarCoordenadas(origem);
  _validarCoordenadas(destino);

  const dLat = _toRad(destino.latitude - origem.latitude);
  const dLon = _toRad(destino.longitude - origem.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(_toRad(origem.latitude)) * Math.cos(_toRad(destino.latitude)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return RAIO_TERRA_KM * c;
}
