# Review — feature feature-6

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes
- R1: [x] coberto por `"retorna as coordenadas quando geocoder.geocode resolve um resultado válido"` (`tests/delivery-time.test.js`)
- R2: [x] coberto por `"lança InvalidAddressError para endereço null/undefined/vazio, sem chamar geocoder.geocode"`
- R3: [x] coberto por `"lança AddressNotFoundError quando geocoder.geocode resolve null"`
- R4: [x] coberto por `"lança GeocodingError preservando a causa original quando geocoder.geocode rejeita"` (assert `erroCapturado.cause === erroOriginal`)
- R5: [x] coberto por `"retorna 0 quando origem e destino são a mesma coordenada"` e `"calcula a distância conhecida entre duas coordenadas reais (Sé x Paulista, ~4.2km)"`
- R6: [x] coberto por `"lança InvalidCoordinatesError quando origem/destino não têm latitude/longitude numéricos"`
- R7: [x] coberto por `"conta exclusivamente pedidos com status recebido ou em_preparo"` (insere pedido com os 5 status e confirma `contarPedidosAtivos(db) === 2`)
- R8: [x] coberto pelo mesmo teste acima (exclui explicitamente `saiu_para_entrega`/`concluido`/`cancelado` da contagem)
- R9: [x] coberto por `"retorna latitude, longitude, distanciaKm, quantidadePedidosAtivos e tempoEsperaMinutos corretos"`
- R10: [x] coberto pelo mesmo teste acima (`tempoEsperado = Math.round(15 + 2*5 + (distanciaEsperada/20)*60)` comparado via `toBe`)
- R11: [x] coberto por `"lança InvalidCoordinatesError quando origem é omitida/incompleta, sem chamar geocoder nem consultar o banco"`
- R12: [x] coberto por `"propaga o erro de geocodificação e não consulta a contagem de pedidos ativos no banco"` (espião `vi.spyOn(pedidosModule, "contarPedidosAtivos")` confirma que não é chamado)
- R13: [x] coberto pelo teste de R9/R10 (cliente com 2 pedidos ativos + 1 `saiu_para_entrega`, resultado `quantidadePedidosAtivos === 2`) e reforçado pelo teste de R7/R8

Todos os R1–R13 têm cobertura concreta e rastreável, batendo com a tabela declarada em `progress/impl_feature-6.md`.

## Tasks completas
- T1: [x] `src/delivery/errors.js` criado com `DeliveryError` + 4 subtipos, exatamente como especificado.
- T2: [x] `src/delivery/geocoder.js` só documenta o contrato `GeocoderAdapter` via JSDoc, `export {}`, sem importar cliente HTTP.
- T3: [x] `geocodeEndereco` em `src/delivery/geocoding.js` implementa validação → chamada → tradução de erro exatamente como descrito.
- T4: [x] `calcularDistanciaKm` em `src/delivery/distance.js`, Haversine com raio 6371km, função pura, valida coordenadas.
- T5: [x] `STATUS_DEMANDA_ATIVA` e `contarPedidosAtivos(db)` em `src/db/pedidos.js`, reexportado em `src/db/index.js`.
- T6: [x] `calcularTempoEspera` em `src/delivery/waitTime.js` segue exatamente a ordem de validação (origem → geocodificação → distância → contagem) e a fórmula documentada.
- T7: [x] `src/delivery/index.js` reexporta `geocodeEndereco`, `calcularDistanciaKm`, `calcularTempoEspera` e as 5 classes de erro.
- T8–T17: [x] Todos os testes descritos existem em `tests/delivery-time.test.js` e passam.
- T18: [x] `npm test`/`./init.sh` executados, tabela de rastreabilidade documentada em `progress/impl_feature-6.md`.

Todas as 18 tasks de `specs/feature-6/tasks.md` estão marcadas `[x]` e correspondem ao que foi de fato implementado — nenhuma divergência entre spec e código encontrada.

## Checkpoints
- C1: [x] Arnês completo (`AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`, os 3 docs); `./init.sh` termina com exit code 0.
- C2: [x] Apenas `feature-6` está `in_progress` em `feature_list.json`; todas as features `done` (1–5) têm testes associados e passam; `progress/current.md` não contém lixo de sessões anteriores (a verificar pelo leader antes de fechar, mas não é bloqueio desta revisão de código).
- C3: [x] `src/` contém somente os domínios previstos (`db`, `menu`, `whatsapp`, `ai`, `delivery`); nenhum `console.log` de debug em `src/delivery/` ou nas alterações de `src/db/pedidos.js`/`src/db/index.js`; nenhuma dependência nova adicionada (o design documenta explicitamente por que nenhuma é necessária).
- C4: [x] `tests/delivery-time.test.js` cobre todas as funções públicas do domínio; usa banco SQLite real via `mkdtempSync`/`openDatabase` (sem mock de fs); `npm test` mostra 80 testes, todos verdes.
- C5: [x] Nenhum arquivo temporário suspeito criado por esta feature; alterações concentradas em `src/delivery/`, `src/db/pedidos.js`, `src/db/index.js`, `tests/delivery-time.test.js`, `specs/feature-6/`, `progress/impl_feature-6.md` — escopo coerente com o `design.md`.
- C6: [x] `specs/feature-6/` tem os 3 arquivos (`requirements.md`, `design.md`, `tasks.md`); `requirements.md` usa EARS estrito (QUANDO/SE...ENTÃO/DEVE); todas as tasks `[x]`; todo `R<n>` coberto por teste concreto.

## Verificação de execução

- `./init.sh` executado: **80/80 testes passando** em 6 arquivos
  (`database.test.js` 12, `config-menu.test.js` 10, `whatsapp-queue.test.js` 9,
  `ai-multimodal.test.js` 19, `conversation-engine.test.js` 19,
  `delivery-time.test.js` 11) — bate exatamente com a contagem esperada
  (12+10+9+19+19+11=80).

## Verificação específica do domínio (R7/R8/R13)

`STATUS_DEMANDA_ATIVA = ["recebido", "em_preparo"]` em `src/db/pedidos.js`
(linha ~17) é um subconjunto explícito de `STATUS_PERMITIDOS` (mesmo
arquivo, linhas 5–11), sem lista paralela redigitada. `contarPedidosAtivos(db)`
usa `WHERE status IN (?, ?)` com os dois valores de `STATUS_DEMANDA_ATIVA`,
excluindo corretamente `saiu_para_entrega`, `concluido` e `cancelado`. O
teste `"conta exclusivamente pedidos com status recebido ou em_preparo"`
insere pedidos com os 5 status possíveis e confirma `contarPedidosAtivos(db) === 2`,
validando a exclusão de forma direta e concreta.

## Padrão de adapter injetável (reaproveitamento)

`src/delivery/geocoder.js` segue exatamente o mesmo padrão de
`src/ai/client.js` (contrato JSDoc, `export {}`, sem cliente HTTP
concreto importado). `geocodeEndereco`/`calcularTempoEspera` recebem o
`geocoder` por injeção de dependência e nunca fazem `fetch` para o
Nominatim, em conformidade com `docs/architecture.md` ("Não chame APIs
externas reais... a partir de testes") e `docs/conventions.md`
("interceptadas na borda HTTP... nunca se bate na API real a partir de
um teste").

## Mudanças necessárias (se aplicável)

Nenhuma. Feature aprovada sem ressalvas.
