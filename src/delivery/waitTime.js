// src/delivery/waitTime.js — orquestra geocodificação + distância + demanda
// atual da cozinha na estimativa de tempo de espera.
import { contarPedidosAtivos } from "../db/pedidos.js";
import { calcularDistanciaKm } from "./distance.js";
import { InvalidCoordinatesError } from "./errors.js";
import { geocodeEndereco } from "./geocoding.js";

// Constantes da heurística de tempo de espera (documentadas em design.md,
// não configuráveis nesta feature): tempo base de preparo, peso por pedido
// ativo na fila e velocidade média de entrega.
const TEMPO_BASE_PREPARO_MINUTOS = 15;
const TEMPO_POR_PEDIDO_ATIVO_MINUTOS = 5;
const VELOCIDADE_MEDIA_ENTREGA_KM_H = 20;

// Combina tempo base de preparo + peso por pedido ativo na fila + tempo de
// deslocamento estimado em uma única estimativa de tempo de espera em
// minutos. Função pura, sem IO — extraída para ser reaproveitada por
// listarPedidosAtivosComTempoEspera (feature-7) sem repetir geocodificação
// nem duplicar a fórmula.
export function calcularTempoEsperaPorDistanciaEFila(distanciaKm, quantidadePedidosAtivos) {
  const tempoDeslocamentoMinutos = (distanciaKm / VELOCIDADE_MEDIA_ENTREGA_KM_H) * 60;
  return Math.round(
    TEMPO_BASE_PREPARO_MINUTOS +
      quantidadePedidosAtivos * TEMPO_POR_PEDIDO_ATIVO_MINUTOS +
      tempoDeslocamentoMinutos
  );
}

// Orquestra o cálculo completo: geocodifica o endereço do cliente, calcula a
// distância até `origem`, conta a demanda atual da cozinha e combina os três
// na estimativa de tempo de espera.
export async function calcularTempoEspera({ enderecoCliente, geocoder, origem, db }) {
  if (!origem || typeof origem.latitude !== "number" || typeof origem.longitude !== "number") {
    throw new InvalidCoordinatesError("coordenadas de origem inválidas ou ausentes");
  }

  const destino = await geocodeEndereco(geocoder, enderecoCliente);

  const distanciaKm = calcularDistanciaKm(origem, destino);

  const quantidadePedidosAtivos = contarPedidosAtivos(db);

  const tempoEsperaMinutos = calcularTempoEsperaPorDistanciaEFila(
    distanciaKm,
    quantidadePedidosAtivos
  );

  return {
    latitude: destino.latitude,
    longitude: destino.longitude,
    distanciaKm,
    quantidadePedidosAtivos,
    tempoEsperaMinutos,
  };
}
