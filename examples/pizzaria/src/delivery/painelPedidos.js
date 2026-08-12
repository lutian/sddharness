// src/delivery/painelPedidos.js — listagem de pedidos ativos do painel KDS
// já com tempo de espera calculado a partir de coordenadas já persistidas
// do cliente (sem geocodificação nova a cada atualização — ver
// specs/feature-7/design.md, "Alternativa descartada 2").
import { listPedidosAtivosComCliente, contarPedidosAtivos } from "../db/pedidos.js";

import { calcularDistanciaKm } from "./distance.js";
import { calcularTempoEsperaPorDistanciaEFila } from "./waitTime.js";
import { InvalidCoordinatesError } from "./errors.js";

// Lista os pedidos ativos do painel (R1, R2) já com distanciaKm e
// tempoEsperaMinutos calculados a partir das coordenadas já persistidas do
// cliente — sem chamar nenhum geocoder (R3). Pedidos cujo cliente não tem
// latitude/longitude gravadas recebem distanciaKm/tempoEsperaMinutos iguais
// a null (R4). Lança InvalidCoordinatesError se `origem` for
// inválida/ausente, sem consultar o banco (R5).
export function listarPedidosAtivosComTempoEspera({ db, origem }) {
  if (!origem || typeof origem.latitude !== "number" || typeof origem.longitude !== "number") {
    throw new InvalidCoordinatesError("coordenadas de origem inválidas ou ausentes");
  }

  const pedidos = listPedidosAtivosComCliente(db);
  const quantidadePedidosAtivos = contarPedidosAtivos(db);

  return pedidos.map((pedido) => {
    if (typeof pedido.clienteLatitude !== "number" || typeof pedido.clienteLongitude !== "number") {
      return { ...pedido, distanciaKm: null, tempoEsperaMinutos: null };
    }

    const distanciaKm = calcularDistanciaKm(origem, {
      latitude: pedido.clienteLatitude,
      longitude: pedido.clienteLongitude,
    });
    const tempoEsperaMinutos = calcularTempoEsperaPorDistanciaEFila(
      distanciaKm,
      quantidadePedidosAtivos
    );

    return { ...pedido, distanciaKm, tempoEsperaMinutos };
  });
}
