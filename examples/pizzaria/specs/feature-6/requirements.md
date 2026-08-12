# Requirements — feature-6: Geocodificação e Cálculo Dinâmico de Tempo de Espera

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/delivery-time.test.js`. Mapeamento aos 4 `acceptance` originais de
> `feature_list.json` ao final do documento.

## Contexto verificado antes da redação

- `src/db/schema.js` (feature-1, `done`): a tabela `clientes` já tem
  `latitude REAL` e `longitude REAL`; a tabela `pedidos` já tem `status
  TEXT NOT NULL`.
- `src/db/pedidos.js` (feature-1, `done`): o enum `STATUS_PERMITIDOS` já
  inclui `"recebido"`, `"em_preparo"`, `"saiu_para_entrega"`,
  `"concluido"` e `"cancelado"`. O status "saiu para entrega" **já
  existe** — esta feature não precisa criá-lo, apenas excluí-lo (e aos
  status finais `"concluido"`/`"cancelado"`) da contagem de demanda atual
  da cozinha.
- `src/db/clientes.js` (feature-5, `done`): `updateCliente(db, id, {
  nome, endereco, latitude, longitude })` já existe e já é o mecanismo
  previsto (ver nota em `specs/feature-5/design.md`) para persistir o
  resultado de uma geocodificação em `clientes.latitude`/`longitude`.
  Esta feature reaproveita `updateCliente` sem alterá-lo.
- Não existe hoje, em `src/db/pedidos.js`, nenhuma função de consulta de
  pedidos por status; esta feature precisa de uma (ver `design.md`).
- Não existe hoje nenhuma configuração de coordenadas de origem
  (endereço/latitude/longitude do restaurante). Esta feature recebe essas
  coordenadas como parâmetro de entrada da função pública (ver
  `design.md`), sem tocar em `src/menu/config.js`.

## R1
QUANDO a função pública de geocodificação é chamada com um `endereco` não
vazio, o sistema DEVE chamar `geocoder.geocode(endereco)` (adapter
injetado) e, se o resultado não for `null`, retornar um objeto contendo
`latitude` e `longitude` numéricos.

## R2
SE `endereco` for `null`, `undefined` ou uma string vazia (após `trim()`)
ENTÃO a função pública de geocodificação DEVE lançar `InvalidAddressError`
e NÃO DEVE chamar `geocoder.geocode`.

## R3
SE `geocoder.geocode(endereco)` resolver com `null` (endereço não
encontrado pelo Nominatim) ENTÃO o sistema DEVE lançar
`AddressNotFoundError` e NÃO DEVE retornar coordenadas.

## R4
SE a chamada a `geocoder.geocode(endereco)` rejeitar (erro de rede, timeout
ou resposta inválida) ENTÃO o sistema DEVE lançar `GeocodingError`
preservando a causa original em `{ cause }`.

## R5
O sistema DEVE calcular a distância em quilômetros entre duas coordenadas
geográficas (`origem` e `destino`, cada uma `{ latitude, longitude }`)
usando a fórmula de Haversine, através de uma função pura
`calcularDistanciaKm(origem, destino)`.

## R6
SE `origem` ou `destino` (passados a `calcularDistanciaKm`) não forem
objetos com `latitude` e `longitude` numéricos ENTÃO o sistema DEVE lançar
`InvalidCoordinatesError`.

## R7
QUANDO a contagem de demanda atual da cozinha é executada, o sistema DEVE
contar exclusivamente os pedidos cujo `status` seja `"recebido"` ou
`"em_preparo"`.

## R8
O sistema NÃO DEVE incluir, na contagem de demanda atual da cozinha,
pedidos cujo `status` seja `"saiu_para_entrega"`, `"concluido"` ou
`"cancelado"`.

## R9
QUANDO a função pública de cálculo de tempo de espera é chamada com um
`enderecoCliente` válido, um `geocoder` que resolve coordenadas válidas, e
uma `origem` (coordenadas do restaurante) válida, o sistema DEVE retornar
um objeto contendo `latitude`, `longitude` (coordenadas geocodificadas do
cliente), `distanciaKm`, `quantidadePedidosAtivos` e `tempoEsperaMinutos`.

## R10
O sistema DEVE calcular `tempoEsperaMinutos` como a soma de: (a) um tempo
base fixo de preparo; (b) o produto entre `quantidadePedidosAtivos` (R7,
R8) e um peso fixo de minutos por pedido ativo na fila; e (c) o tempo de
deslocamento estimado, obtido dividindo `distanciaKm` (R5) por uma
velocidade média fixa de entrega e convertendo o resultado para minutos —
arredondado ao número inteiro mais próximo.

## R11
SE `origem` não for fornecida ou não contiver `latitude`/`longitude`
numéricos ENTÃO a função pública de cálculo de tempo de espera DEVE lançar
`InvalidCoordinatesError` e NÃO DEVE chamar `geocoder.geocode` nem
consultar o banco de pedidos.

## R12
SE a geocodificação do `enderecoCliente` falhar (`InvalidAddressError`,
`AddressNotFoundError` ou `GeocodingError`) ENTÃO a função pública de
cálculo de tempo de espera DEVE propagar o mesmo erro lançado pela etapa
de geocodificação e NÃO DEVE consultar a contagem de pedidos ativos no
banco.

## R13
QUANDO um pedido com `status` igual a `"saiu_para_entrega"` existe no
banco no momento do cálculo, o sistema DEVE excluí-lo de
`quantidadePedidosAtivos` mesmo que outros pedidos do mesmo cliente ou de
outros clientes estejam com `status` igual a `"recebido"` ou
`"em_preparo"`.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                    | Coberto por            |
|--------------------------------------------------------------------------------------------------------------------------------|---------------------------|
| O endereço textual do cliente é geocodificado utilizando a API do Nominatim.                                                    | R1, R2, R3, R4            |
| O tempo de espera é calculado com base na base de pedidos pendentes e na distância calculada.                                    | R5, R6, R7, R9, R10, R11, R12 |
| Pedidos marcados como saídos para entrega pelo administrador são excluídos do cálculo da demanda atual da cozinha.                | R7, R8, R13               |
| tests/delivery-time.test.js valida o cálculo de geolocalização e o peso da fila de pedidos.                                      | R1–R13 (implementação de teste) |
