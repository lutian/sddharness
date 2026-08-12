# Design — feature-6: Geocodificação e Cálculo Dinâmico de Tempo de Espera

## Visão geral

Esta feature entrega o domínio `src/delivery/` já previsto em
`docs/architecture.md` ("geocodificação Nominatim + cálculo de tempo de
espera"). Assim como `src/ai/` (feature-4, feature-5) e `src/whatsapp/`
(feature-3), nenhuma chamada de rede real acontece dentro de
`src/delivery/`: a integração com o Nominatim fica atrás de um adapter
injetável, seguindo exatamente o mesmo padrão já aprovado em
`src/ai/client.js`/`src/ai/media.js` e `src/whatsapp/adapter.js`.

Não é uma feature de UI nem de integração ponta a ponta: a fiação entre
esta feature e o fluxo de conversa (quando de fato geocodificar o
endereço coletado por `processarMensagemConversa`, feature-5) ou o painel
KDS (quando exibir `tempoEsperaMinutos`, feature-7) fica para as
respectivas features de integração, fora deste escopo — o mesmo raciocínio
já registrado em `specs/feature-4/design.md` e `specs/feature-5/design.md`
para não antecipar wiring que nenhum `acceptance` desta feature exige.

## Arquivos a criar

```
src/delivery/
├── index.js         # superfície pública do domínio (única importável de fora)
├── errors.js         # DeliveryError e subtipos
├── geocoder.js         # contrato (JSDoc) do adapter de geocodificação Nominatim injetável
├── geocoding.js          # geocodeEndereco: valida entrada + chama geocoder + traduz erros
├── distance.js              # calcularDistanciaKm: fórmula de Haversine (função pura)
└── waitTime.js                 # calcularTempoEspera: orquestra geocodificação + distância + fila

tests/
└── delivery-time.test.js   # (será escrito pelo implementer, NÃO por este agente)
```

## Arquivo a alterar

```
src/db/
├── pedidos.js        # ALTERADO — + contarPedidosAtivos(db)
└── index.js            # ALTERADO — reexporta contarPedidosAtivos
```

Nenhum outro arquivo fora de `src/delivery/` e `src/db/pedidos.js`/
`src/db/index.js` é tocado nesta feature. Em particular:

- `src/db/clientes.js` (feature-5, `done`) **não** é alterado.
  `updateCliente(db, id, { latitude, longitude, ... })` já existe e já
  aceita `latitude`/`longitude` — é exatamente o mecanismo antecipado na
  nota de design de feature-1 e formalizado em `specs/feature-5/design.md`
  ("será reaproveitada por feature-6... para gravar latitude/longitude").
  Persistir o resultado da geocodificação no cliente é responsabilidade de
  quem orquestra o fluxo (fora do escopo desta feature, que entrega a
  função pura de geocodificação); esta feature não chama `updateCliente`
  internamente, para não decidir por conta própria quando um cliente deve
  ter suas coordenadas sobrescritas.
- `src/menu/config.js` (feature-2/feature-5, `done`) **não** é alterado.
  Não existe hoje nenhum campo de configuração para as coordenadas de
  origem (endereço do restaurante). Em vez de introduzir esse campo aqui
  — o que exigiria decidir formato de validação, valor padrão e UI de
  edição, nada disso pedido pelo `acceptance` desta feature — a função
  pública de cálculo de tempo de espera recebe `origem: { latitude,
  longitude }` como parâmetro de entrada (ver "Assinaturas novas"
  abaixo), no mesmo espírito de `config` já ser recebido como argumento
  por `describeImageMessage`/`processarMensagemConversa` em vez de lido
  diretamente do disco. A decisão de onde essas coordenadas moram
  (`src/menu/config.js`, um novo campo de cadastro, ou uma constante) fica
  para a feature que efetivamente liga o cálculo ao fluxo de ponta a
  ponta.

## Decisão técnica central: isolar o Nominatim atrás de um adapter injetável (`geocoder`)

### Alternativa escolhida

`src/delivery/` nunca faz `fetch` para `nominatim.openstreetmap.org`
diretamente. Em vez disso, as funções públicas recebem, por injeção de
dependência, um colaborador `geocoder` que satisfaz o contrato documentado
em `src/delivery/geocoder.js`:

```javascript
// @typedef {object} GeocoderAdapter
// @property {(endereco: string) => Promise<{ latitude: number, longitude: number } | null>} geocode
//   Geocodifica um endereço textual. Retorna `null` quando o Nominatim não
//   encontra nenhum resultado para o endereço informado (não é um erro de
//   rede — é uma resposta válida "sem resultado").
```

`src/delivery/geocoding.js` e `src/delivery/waitTime.js` só conhecem esse
contrato — nunca importam um cliente HTTP concreto nem montam a URL da API
do Nominatim (`https://nominatim.openstreetmap.org/search?...`). Um
adapter concreto que efetivamente chame a API HTTP do Nominatim (via
`fetch` nativo do Node 20+, respeitando a política de uso da API — um
`User-Agent` identificável e limite de 1 requisição/segundo, exigidos pelo
termos de uso do Nominatim) fica para a feature que liga os adapters
concretos de ponta a ponta, fora deste escopo — mesma política já aplicada
ao SDK `openai` em `specs/feature-4/design.md` (Alternativa descartada 1)
e ao `chatClient` em `specs/feature-5/design.md`.

**Justificativa:** reaplica o padrão já aprovado três vezes neste projeto
(`src/whatsapp/adapter.js`, feature-3; `src/ai/client.js`+`src/ai/media.js`,
feature-4; `src/ai/chatClient.js`, feature-5). Permite que
`tests/delivery-time.test.js` exercite a lógica real de domínio (validação
de endereço, tradução de erros, fórmula de distância, fórmula de tempo de
espera, filtro de status) com um dublê determinístico de `geocoder`
(função `async` que resolve/rejeita valores fixos), sem rede, sem
credenciais, sem depender da disponibilidade real da API pública do
Nominatim — em linha com `docs/conventions.md` ("as chamadas de rede são
interceptadas na borda... nunca se bate na API real a partir de um
teste") e `docs/architecture.md` ("Não chame APIs externas reais... a
partir de testes").

### Alternativa descartada 1 — Importar um cliente HTTP (`fetch`/`axios`) e chamar o Nominatim diretamente em `src/delivery/`, usando um mock de `fetch` global nos testes

Descartada pelas mesmas razões já documentadas em `specs/feature-4/design.md`
(Alternativa descartada 1) e `specs/feature-5/design.md` (Alternativa
descartada 1): (1) mockar `fetch` globalmente tende a testar a suposição
do autor sobre o formato de resposta do Nominatim, não o comportamento
real do domínio (validação, tradução de erro, cálculo); (2) acoplaria
`src/delivery/` a uma implementação HTTP concreta, tornando o domínio
impossível de testar de forma isolada e determinística; (3) adiar a
escolha do cliente HTTP concreto, do tratamento de rate limit (1
req/s exigido pelo Nominatim) e do parsing exato da resposta JSON da API
para a feature de integração real mantém esta feature restrita ao que o
`acceptance` pede: geocodificar (contrato), calcular distância e calcular
tempo de espera considerando a fila.

### Alternativa descartada 2 — Calcular distância de rota real (ruas) via um serviço de roteamento (ex.: OSRM) em vez de distância em linha reta (Haversine)

Cogitou-se calcular a distância real de deslocamento (seguindo ruas) em
vez da distância geodésica direta. Descartada porque: (1) o `acceptance`
pede apenas "a distância calculada", sem exigir roteamento real; (2)
roteamento real exigiria uma segunda dependência de rede externa
(serviço OSRM/Google Directions), além do Nominatim, não justificada por
nenhum `acceptance` desta feature (`docs/architecture.md`, princípio 3:
"não se adiciona uma dependência por via das dúvidas"); (3) a fórmula de
Haversine é determinística, testável sem rede e suficiente como heurística
de estimativa de tempo de espera — se no futuro a precisão do roteamento
real se mostrar necessária, isso é reavaliado em uma feature dedicada, com
sua própria dependência justificada, exatamente como o projeto já fez para
`ffmpeg` em `specs/feature-4/design.md` (Alternativa descartada 2).

### Alternativa descartada 3 — Adicionar uma coluna `pedidos_ativos_cache` ou view SQL em vez de uma função de contagem simples

Cogitou-se pré-computar/cachear a contagem de pedidos ativos (ex.: coluna
derivada, trigger, ou `VIEW` SQL) em vez de uma consulta `COUNT(*)`
simples a cada cálculo. Descartada porque: (1) a tabela `pedidos`
(feature-1, `done`) não tem volume que justifique cache — um `COUNT(*)`
com `WHERE status IN (...)` é O(n) sobre uma tabela local SQLite pequena,
sem custo de rede; (2) qualquer mecanismo de cache introduziria uma nova
classe de bug (cache desatualizado após mudança de status de um pedido,
ex.: quando o administrador marca "saiu para entrega" na feature-7) sem
necessidade real; (3) mantém `contarPedidosAtivos(db)` uma consulta direta
e sempre consistente com o estado atual da tabela, seguindo o princípio de
`docs/architecture.md` de não introduzir complexidade sem uma feature
concreta que a exija.

## Assinaturas novas

### `src/db/pedidos.js` (alterado)

```javascript
// Status considerados "demanda atual da cozinha": pedidos ainda não
// despachados para entrega nem finalizados. Mantido como constante interna
// junto de STATUS_PERMITIDOS, já existente neste arquivo.
const STATUS_DEMANDA_ATIVA = ["recebido", "em_preparo"];

// Conta quantos pedidos estão, no momento da chamada, com status
// "recebido" ou "em_preparo" — exclui explicitamente "saiu_para_entrega",
// "concluido" e "cancelado" (R7, R8).
export function contarPedidosAtivos(db)
// -> number (inteiro >= 0)
```

### `src/delivery/geocoder.js`
Apenas o contrato JSDoc (`GeocoderAdapter`), sem exportar símbolos de
runtime (`export {}`), no mesmo padrão de `src/ai/client.js`.

### `src/delivery/errors.js`

```javascript
export class DeliveryError extends Error {}
export class InvalidAddressError extends DeliveryError {}
export class AddressNotFoundError extends DeliveryError {}
export class GeocodingError extends DeliveryError {}
export class InvalidCoordinatesError extends DeliveryError {}
```

Seguindo `docs/conventions.md`: uma classe base por módulo (`DeliveryError`)
e subtipos concretos. `GeocodingError` recebe a causa original (`{ cause:
erroOriginal }`), no mesmo padrão de `AudioTranscriptionError`/
`ChatCompletionError` em `src/ai/errors.js`.

### `src/delivery/geocoding.js`

```javascript
// Valida `endereco`, chama geocoder.geocode(endereco) e traduz o
// resultado/erro:
// - endereco vazio/null/undefined -> InvalidAddressError, sem chamar geocoder.
// - geocoder.geocode resolve null -> AddressNotFoundError.
// - geocoder.geocode rejeita -> GeocodingError com { cause }.
// - geocoder.geocode resolve { latitude, longitude } -> retorna esse objeto.
export async function geocodeEndereco(geocoder, endereco)
// -> Promise<{ latitude: number, longitude: number }>
```

### `src/delivery/distance.js`

```javascript
// Distância em quilômetros entre dois pontos, via fórmula de Haversine
// (raio da Terra = 6371 km). Função pura, sem IO.
export function calcularDistanciaKm(origem, destino)
// origem, destino: { latitude: number, longitude: number }
// -> number (km)
// Lança InvalidCoordinatesError se origem/destino não tiverem
// latitude/longitude numéricos.
```

### `src/delivery/waitTime.js`

```javascript
// Constantes da heurística de tempo de espera (documentadas, não
// configuráveis nesta feature — ver "Fórmula do tempo de espera" abaixo).
const TEMPO_BASE_PREPARO_MINUTOS = 15;
const TEMPO_POR_PEDIDO_ATIVO_MINUTOS = 5;
const VELOCIDADE_MEDIA_ENTREGA_KM_H = 20;

// Orquestra o cálculo completo: geocodifica o endereço do cliente,
// calcula a distância até `origem`, conta a demanda atual da cozinha e
// combina os três na estimativa de tempo de espera.
export async function calcularTempoEspera({ enderecoCliente, geocoder, origem, db })
// -> Promise<{
//      latitude: number,
//      longitude: number,
//      distanciaKm: number,
//      quantidadePedidosAtivos: number,
//      tempoEsperaMinutos: number,
//    }>
// Lança InvalidCoordinatesError se `origem` for inválida (antes de tocar
// em geocoder/db — R11). Propaga InvalidAddressError/AddressNotFoundError/
// GeocodingError se a geocodificação falhar, sem consultar o banco (R12).
```

### `src/delivery/index.js`

Reexporta `geocodeEndereco`, `calcularDistanciaKm`, `calcularTempoEspera`
e as classes de `errors.js` — a única superfície importável de fora de
`src/delivery/`, seguindo o mesmo padrão de `src/ai/index.js`/
`src/db/index.js`.

## Fórmula do tempo de espera (R9, R10)

```javascript
// src/delivery/waitTime.js
export async function calcularTempoEspera({ enderecoCliente, geocoder, origem, db }) {
  if (!origem || typeof origem.latitude !== "number" || typeof origem.longitude !== "number") {
    throw new InvalidCoordinatesError("coordenadas de origem inválidas ou ausentes"); // R11
  }

  const destino = await geocodeEndereco(geocoder, enderecoCliente); // R1–R4, R12

  const distanciaKm = calcularDistanciaKm(origem, destino); // R5, R6

  const quantidadePedidosAtivos = contarPedidosAtivos(db); // R7, R8, R13

  const tempoDeslocamentoMinutos = (distanciaKm / VELOCIDADE_MEDIA_ENTREGA_KM_H) * 60;
  const tempoEsperaMinutos = Math.round(
    TEMPO_BASE_PREPARO_MINUTOS +
      quantidadePedidosAtivos * TEMPO_POR_PEDIDO_ATIVO_MINUTOS +
      tempoDeslocamentoMinutos
  );

  return {
    latitude: destino.latitude,
    longitude: destino.longitude,
    distanciaKm,
    quantidadePedidosAtivos,
    tempoEsperaMinutos,
  };
}
```

A heurística (tempo base de 15 min + 5 min por pedido ativo na fila +
tempo de deslocamento a 20 km/h) é documentada aqui como constantes
nomeadas em vez de valores mágicos espalhados pelo código, e é
determinística e testável sem depender de nenhum valor real de mercado —
o `acceptance` pede "calculado com base na base de pedidos pendentes e na
distância", sem prescrever os pesos exatos; se o operador (humano) tiver
uma heurística de negócio diferente em mente, isso é uma mudança de
constantes, não de estrutura, e pode ser ajustado nesta mesma feature
antes da aprovação ou em uma revisão posterior, mantendo o mesmo formato
`R9`/`R10`.

## Fórmula da distância (R5, R6)

```javascript
// src/delivery/distance.js
const RAIO_TERRA_KM = 6371;

function _toRad(graus) {
  return (graus * Math.PI) / 180;
}

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
```

## Contagem de demanda ativa (R7, R8, R13)

```javascript
// src/db/pedidos.js (acréscimo)
export function contarPedidosAtivos(db) {
  const placeholders = STATUS_DEMANDA_ATIVA.map(() => "?").join(", ");
  const row = db
    .prepare(`SELECT COUNT(*) AS total FROM pedidos WHERE status IN (${placeholders})`)
    .get(...STATUS_DEMANDA_ATIVA);
  return row.total;
}
```

Reaproveita a mesma tabela `pedidos` e o mesmo enum de status já validado
por `insertPedido` (`STATUS_PERMITIDOS`, feature-1) — `STATUS_DEMANDA_ATIVA`
é um subconjunto explícito desse enum, não uma lista paralela
redigitada: `["recebido", "em_preparo"]`, deixando implicitamente
excluídos `"saiu_para_entrega"`, `"concluido"` e `"cancelado"`.

## Alternativa de estrutura descartada

Considerou-se colocar toda a lógica (geocodificação, distância, fórmula de
tempo de espera) em um único arquivo `src/delivery/index.js`, sem os
arquivos `geocoder.js`/`geocoding.js`/`distance.js`/`waitTime.js`
separados. Descartada pelo mesmo motivo já registrado em
`specs/feature-4/design.md` e `specs/feature-5/design.md`:
`docs/conventions.md` prescreve manter "os detalhes de IO/lógica em
arquivos internos separados dentro do mesmo domínio"; separar o contrato
do adapter (`geocoder.js`), a tradução de geocodificação (`geocoding.js`,
testável isoladamente para R1–R4), o cálculo puro de distância
(`distance.js`, testável isoladamente para R5, R6, sem nenhum dublê) e a
orquestração completa (`waitTime.js`) segue o padrão já usado em
`src/ai/` (`client.js`/`audio.js`/`image.js`/`conversation.js`) e
`src/db/` (`clientes.js`/`sessoes.js`/`pedidos.js`).
