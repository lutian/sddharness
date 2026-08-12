# Tasks — feature-6: Geocodificação e Cálculo Dinâmico de Tempo de Espera

- [x] T1 — Criar `src/delivery/errors.js` com `DeliveryError` (base) e os
      subtipos `InvalidAddressError`, `AddressNotFoundError`,
      `GeocodingError` e `InvalidCoordinatesError`.
      Cobre: R2, R3, R4, R6, R11.

- [x] T2 — Criar `src/delivery/geocoder.js` documentando (JSDoc) o
      contrato `GeocoderAdapter` (`geocode(endereco: string) ->
      Promise<{ latitude, longitude } | null>`), sem importar nenhum
      cliente HTTP concreto.
      Cobre: R1, R3, R4.

- [x] T3 — Criar `src/delivery/geocoding.js` com `geocodeEndereco(geocoder,
      endereco)`: lança `InvalidAddressError` se `endereco` for
      `null`/`undefined`/string vazia após `trim()` (sem chamar
      `geocoder.geocode`); chama `geocoder.geocode(endereco)`; lança
      `AddressNotFoundError` se resolver `null`; lança `GeocodingError`
      com `{ cause }` se rejeitar; retorna `{ latitude, longitude }` em
      caso de sucesso.
      Cobre: R1, R2, R3, R4.

- [x] T4 — Criar `src/delivery/distance.js` com `calcularDistanciaKm(origem,
      destino)`: valida que `origem`/`destino` são objetos com
      `latitude`/`longitude` numéricos (lançando `InvalidCoordinatesError`
      caso contrário) e calcula a distância via fórmula de Haversine
      (raio da Terra = 6371 km), função pura sem IO.
      Cobre: R5, R6.

- [x] T5 — Estender `src/db/pedidos.js` com a constante
      `STATUS_DEMANDA_ATIVA = ["recebido", "em_preparo"]` e a função
      `contarPedidosAtivos(db)`, que retorna a contagem de pedidos com
      `status` nesse conjunto (excluindo implicitamente
      `"saiu_para_entrega"`, `"concluido"` e `"cancelado"`). Reexportar
      `contarPedidosAtivos` em `src/db/index.js`.
      Cobre: R7, R8, R13.

- [x] T6 — Criar `src/delivery/waitTime.js` com `calcularTempoEspera({
      enderecoCliente, geocoder, origem, db })`: valida `origem` primeiro
      (lançando `InvalidCoordinatesError` sem chamar `geocoder`/`db` se
      inválida ou ausente); chama `geocodeEndereco(geocoder,
      enderecoCliente)` propagando qualquer erro de geocodificação sem
      consultar `contarPedidosAtivos`; calcula `distanciaKm` via
      `calcularDistanciaKm(origem, destino)`; obtém
      `quantidadePedidosAtivos` via `contarPedidosAtivos(db)`; calcula
      `tempoEsperaMinutos` como `Math.round(15 + quantidadePedidosAtivos *
      5 + (distanciaKm / 20) * 60)`; retorna `{ latitude, longitude,
      distanciaKm, quantidadePedidosAtivos, tempoEsperaMinutos }`.
      Cobre: R9, R10, R11, R12.

- [x] T7 — Criar `src/delivery/index.js` reexportando `geocodeEndereco`,
      `calcularDistanciaKm`, `calcularTempoEspera` e as classes de
      `src/delivery/errors.js`.
      Cobre: R1–R13 (superfície pública).

- [x] T8 — Escrever em `tests/delivery-time.test.js` (Vitest, dublê
      simples de `geocoder` — objeto com `geocode` `async` controlado
      pelo teste, sem rede real): teste que confirma que, com um
      `endereco` válido e `geocoder.geocode` resolvendo `{ latitude,
      longitude }`, `geocodeEndereco` retorna essas coordenadas.
      Cobre: R1.

- [x] T9 — Adicionar em `tests/delivery-time.test.js`: teste que confirma
      que `geocodeEndereco(geocoder, "")` (e `null`/`undefined`) lança
      `InvalidAddressError` sem chamar `geocoder.geocode`.
      Cobre: R2.

- [x] T10 — Adicionar em `tests/delivery-time.test.js`: teste em que
      `geocoder.geocode` resolve `null`, confirmando que `geocodeEndereco`
      lança `AddressNotFoundError`.
      Cobre: R3.

- [x] T11 — Adicionar em `tests/delivery-time.test.js`: teste em que
      `geocoder.geocode` rejeita com um erro, confirmando que
      `geocodeEndereco` lança `GeocodingError` com `cause` igual ao erro
      original.
      Cobre: R4.

- [x] T12 — Adicionar em `tests/delivery-time.test.js`: teste que confirma
      que `calcularDistanciaKm(origem, destino)`, com dois pares de
      coordenadas conhecidos (ex.: mesma coordenada -> distância 0; duas
      coordenadas com distância real conhecida, calculada previamente com
      a mesma fórmula), retorna o valor esperado dentro de uma margem de
      tolerância pequena (ex.: 0.01 km).
      Cobre: R5.

- [x] T13 — Adicionar em `tests/delivery-time.test.js`: teste que confirma
      que `calcularDistanciaKm` lança `InvalidCoordinatesError` quando
      `origem`/`destino` não têm `latitude`/`longitude` numéricos (ex.:
      `undefined`, string, objeto vazio).
      Cobre: R6.

- [x] T14 — Adicionar em `tests/delivery-time.test.js`: usando um banco
      SQLite real em diretório temporário (`openDatabase`/
      `fs.mkdtempSync`, como já feito em `tests/database.test.js` e
      `tests/conversation-engine.test.js`), inserir pedidos com os cinco
      status possíveis (`recebido`, `em_preparo`, `saiu_para_entrega`,
      `concluido`, `cancelado`) e confirmar que `contarPedidosAtivos(db)`
      retorna exatamente a contagem de pedidos com status `recebido` ou
      `em_preparo`.
      Cobre: R7, R8, R13.

- [x] T15 — Adicionar em `tests/delivery-time.test.js`: teste de
      integração de `calcularTempoEspera` com um dublê de `geocoder` e um
      banco de teste populado com uma quantidade conhecida de pedidos
      ativos, confirmando que o objeto retornado contém `latitude`,
      `longitude`, `distanciaKm`, `quantidadePedidosAtivos` e
      `tempoEsperaMinutos`, e que `tempoEsperaMinutos` corresponde
      exatamente à fórmula documentada em `design.md` para os valores de
      entrada do teste.
      Cobre: R9, R10.

- [x] T16 — Adicionar em `tests/delivery-time.test.js`: teste que confirma
      que `calcularTempoEspera` lança `InvalidCoordinatesError` quando
      `origem` é omitida ou incompleta, e que nem `geocoder.geocode` nem
      `contarPedidosAtivos` são chamados nesse caso (ex.: usando um dublê
      de `geocoder` com um espião/contador de chamadas).
      Cobre: R11.

- [x] T17 — Adicionar em `tests/delivery-time.test.js`: teste em que
      `geocoder.geocode` rejeita (ou resolve `null`), confirmando que
      `calcularTempoEspera` propaga o mesmo erro (`GeocodingError`/
      `AddressNotFoundError`) e que a contagem de pedidos ativos no banco
      não é consultada nesse caso.
      Cobre: R12.

- [x] T18 — Executar `npm test` e `./init.sh`; documentar a tabela de
      rastreabilidade R1–R13 → nome do teste em
      `progress/impl_feature-6.md`.
      Cobre: R1–R13 (verificação final).
