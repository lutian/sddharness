# Implementação — feature-6: Geocodificação e Cálculo Dinâmico de Tempo de Espera

## Resumo

Implementado o domínio `src/delivery/` (geocodificação via adapter injetável
`geocoder`, cálculo de distância por Haversine e orquestração do tempo de
espera) e o acréscimo `contarPedidosAtivos(db)` em `src/db/pedidos.js`
(reexportado por `src/db/index.js`), exatamente conforme
`specs/feature-6/design.md`. Todas as T1–T18 de `specs/feature-6/tasks.md`
foram concluídas e marcadas `[x]`.

## Arquivos criados

- `src/delivery/errors.js` — `DeliveryError` e subtipos
  (`InvalidAddressError`, `AddressNotFoundError`, `GeocodingError`,
  `InvalidCoordinatesError`).
- `src/delivery/geocoder.js` — contrato JSDoc `GeocoderAdapter` (sem
  símbolos de runtime).
- `src/delivery/geocoding.js` — `geocodeEndereco(geocoder, endereco)`.
- `src/delivery/distance.js` — `calcularDistanciaKm(origem, destino)`
  (Haversine, função pura).
- `src/delivery/waitTime.js` — `calcularTempoEspera({ enderecoCliente,
  geocoder, origem, db })`.
- `src/delivery/index.js` — superfície pública do domínio.
- `tests/delivery-time.test.js` — 11 testes (Vitest).

## Arquivos alterados

- `src/db/pedidos.js` — `+ STATUS_DEMANDA_ATIVA` e `+
  contarPedidosAtivos(db)`.
- `src/db/index.js` — `+` import/reexport de `contarPedidosAtivos`.

Nenhum outro arquivo foi tocado (em particular `src/db/clientes.js` e
`src/menu/config.js` permanecem inalterados, conforme decisão de escopo do
`design.md`).

## Rastreabilidade R<n> → teste

| Requirement | Descrição resumida | Teste em `tests/delivery-time.test.js` |
|---|---|---|
| R1 | geocodeEndereco chama geocoder.geocode e retorna `{latitude, longitude}` | `describe("Geocodificação (geocodeEndereco)")` → `"retorna as coordenadas quando geocoder.geocode resolve um resultado válido"` |
| R2 | endereco vazio/null/undefined lança InvalidAddressError sem chamar geocoder | `"lança InvalidAddressError para endereço null/undefined/vazio, sem chamar geocoder.geocode"` |
| R3 | geocoder.geocode resolve null → AddressNotFoundError | `"lança AddressNotFoundError quando geocoder.geocode resolve null"` |
| R4 | geocoder.geocode rejeita → GeocodingError com `{cause}` | `"lança GeocodingError preservando a causa original quando geocoder.geocode rejeita"` |
| R5 | calcularDistanciaKm via Haversine | `describe("Cálculo de distância (calcularDistanciaKm)")` → `"retorna 0 quando origem e destino são a mesma coordenada"` e `"calcula a distância conhecida entre duas coordenadas reais (Sé x Paulista, ~4.2km)"` |
| R6 | InvalidCoordinatesError em calcularDistanciaKm com coordenadas inválidas | `"lança InvalidCoordinatesError quando origem/destino não têm latitude/longitude numéricos"` |
| R7 | contarPedidosAtivos conta apenas recebido/em_preparo | `describe("Contagem de demanda ativa (contarPedidosAtivos)")` → `"conta exclusivamente pedidos com status recebido ou em_preparo"` |
| R8 | contarPedidosAtivos exclui saiu_para_entrega/concluido/cancelado | mesmo teste acima (insere pedido com os 5 status e verifica contagem = 2) |
| R9 | calcularTempoEspera retorna objeto completo (latitude, longitude, distanciaKm, quantidadePedidosAtivos, tempoEsperaMinutos) | `describe("Cálculo de tempo de espera (calcularTempoEspera)")` → `"retorna latitude, longitude, distanciaKm, quantidadePedidosAtivos e tempoEsperaMinutos corretos"` |
| R10 | fórmula exata de tempoEsperaMinutos (15 + 5*ativos + deslocamento a 20km/h, arredondado) | mesmo teste acima (`tempoEsperado` calculado com a mesma fórmula e comparado com `toBe`) |
| R11 | InvalidCoordinatesError quando `origem` ausente/incompleta, sem chamar geocoder nem db | `"lança InvalidCoordinatesError quando origem é omitida/incompleta, sem chamar geocoder nem consultar o banco"` |
| R12 | propaga erro de geocodificação sem consultar contagem de pedidos ativos | `"propaga o erro de geocodificação e não consulta a contagem de pedidos ativos no banco"` (espião em `contarPedidosAtivos` via `vi.spyOn`) |
| R13 | pedido "saiu_para_entrega" excluído mesmo com outros "recebido"/"em_preparo" no mesmo cálculo | teste de R9/R10 acima insere 2 pedidos ativos + 1 "saiu_para_entrega" para o mesmo cliente e confirma `quantidadePedidosAtivos === 2`; reforçado também pelo teste de R7/R8 |

Todos os R1–R13 estão cobertos por pelo menos um teste concreto.

## Verificação

- `npx vitest run tests/delivery-time.test.js` → 11/11 testes passando.
- `./init.sh` → 6 arquivos de teste, **80/80 testes passando** (nenhuma
  feature 1–5 quebrada).

## Decisões de escopo respeitadas (sem desvio do spec)

- `src/db/clientes.js` não foi alterado; `updateCliente` continua sendo
  responsabilidade de quem orquestra o fluxo (fora deste escopo).
- `src/menu/config.js` não foi alterado; `origem` continua sendo recebida
  como parâmetro de entrada de `calcularTempoEspera`.
- Nenhuma chamada de rede real ao Nominatim: todo o domínio depende do
  adapter `geocoder` injetado, dublado nos testes.

## Bloqueios

Nenhum. Nenhuma inconsistência foi encontrada entre o spec e os contratos
já `done` de `src/db/schema.js`, `src/db/pedidos.js` e `src/db/clientes.js`
— todos os pontos antecipados no `requirements.md`/`design.md` se
confirmaram exatamente como documentado.
