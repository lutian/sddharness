# Design — feature-7: Painel Administrativo KDS e Gestão de Pedidos

## Visão geral

Esta feature entrega a camada de dados/lógica que sustenta o painel KDS
(React, `src/ui/`, previsto em `docs/architecture.md`): listagem de
pedidos ativos com tempo de espera, atualização de status com validação
de transições, atribuição de motoboy e status de conexão do WhatsApp.
Nenhuma dessas funções faz IO de UI — todas vivem nos domínios já
existentes (`src/db/`, `src/delivery/`, `src/whatsapp/`), seguindo o
mesmo padrão de "função pública + adapter/injeção de dependência" já
aprovado em feature-3 (`src/whatsapp/adapter.js`), feature-4/5
(`src/ai/client.js`, `src/ai/chatClient.js`) e feature-6
(`src/delivery/geocoder.js`).

O componente React do painel (`src/ui/`) e os handlers IPC em
`electron/main.js` que o conectam a estas funções **não fazem parte
desta feature** — ver "Decisão de escopo" abaixo.

## Decisão de escopo central: entregar a camada de dados/lógica, não o componente React

### Alternativa escolhida

Implementar, nos domínios já existentes, as funções que um painel React
consumiria via IPC:

- `src/delivery/`: `listarPedidosAtivosComTempoEspera({ db, origem })`.
- `src/db/pedidos.js`: `updateStatusPedido(db, id, novoStatus)`,
  `atribuirMotoboy(db, id, motoboy)`, `listPedidosAtivosComCliente(db)`.
- `src/whatsapp/client.js`: rastreamento e exposição do status de conexão
  (`getConnectionStatus()` + evento `"connection-status-changed"`).

Todas testáveis com Vitest puro (banco SQLite real em diretório
temporário + dublês de `geocoder`/`adapter`, no mesmo padrão já usado em
`tests/delivery-time.test.js` e `tests/whatsapp-queue.test.js`), sem
nenhuma dependência de frontend nova.

**Justificativa:** `package.json` (raiz) não declara `react`,
`react-dom` nem nenhuma biblioteca de testing-library/jsdom — nenhuma
feature anterior (1–6, todas `done`) introduziu essas dependências, e
todas foram validadas com Vitest em ambiente Node puro, sem DOM. O único
requisito de teste concreto do `acceptance` desta feature
(`tests/admin-kds.test.js` valida "as operações de atualização de
status de pedidos e atribuição de motoboy") descreve lógica de
dados/domínio, não renderização de componente. `docs/architecture.md`
já reserva `src/ui/` como *renderer process* Electron que "fala
exclusivamente por IPC" — construir esse renderer é, por definição, uma
integração de ponta a ponta com `electron/main.js`, que ainda não existe
neste repositório (nenhuma feature anterior criou `electron/main.js`).
Entregar apenas a camada de dados mantém o mesmo raciocínio já registrado
em `specs/feature-4/design.md` e `specs/feature-6/design.md`: não
antecipar wiring que nenhum `acceptance` verificável desta feature exige.

### Alternativa descartada 1 — Construir o componente React do painel KDS agora (`src/ui/`), com `react`/`react-dom` e uma biblioteca de teste de componentes (ex.: `@testing-library/react` + `jsdom`)

Descartada porque: (1) exigiria adicionar pelo menos três dependências
novas (`react`, `react-dom`, uma lib de teste de DOM) não presentes em
`package.json` e não justificadas por nenhum `acceptance` verificável —
o único acceptance testável (`tests/admin-kds.test.js`) descreve lógica
de status/motoboy, não renderização (`docs/architecture.md`, princípio
3: "não se adiciona uma dependência por via das dúvidas"); (2) o painel
React depende de handlers IPC em `electron/main.js`, que nenhuma feature
anterior criou — construir a UI antes do backend estar completo (e antes
de `electron/main.js` existir) inverteria a ordem natural de
dependências e obrigaria esta feature a inventar contratos IPC não
pedidos por nenhum `acceptance`; (3) o harness de verificação deste
projeto (`docs/verification.md`) roda Vitest sobre `src/`/`tests/` — sem
um ambiente de DOM configurado, qualquer teste de componente React seria,
na prática, não executável pelo pipeline atual. A construção da UI real
(`src/ui/`, componentes `.jsx`, IPC) fica para uma feature futura
dedicada, que poderá então justificar e introduzir as dependências de
frontend necessárias.

### Alternativa descartada 2 — Re-geocodificar o endereço de cada pedido a cada atualização da listagem, reaproveitando `calcularTempoEspera` (feature-6) diretamente, sem uma nova função

Cogitou-se chamar `calcularTempoEspera({ enderecoCliente, geocoder,
origem, db })` para cada pedido ativo, a cada atualização do painel.
Descartada porque: (1) o painel é recarregado continuamente ("tempo
real") — geocodificar de novo a cada atualização, para um endereço que
já foi geocodificado e persistido em `clientes.latitude`/`longitude` por
um fluxo anterior (feature-5 extrai o endereço; a geocodificação e
persistência ficam a cargo de quem orquestra o fluxo, ver
`specs/feature-6/design.md`), geraria chamadas de rede redundantes ao
Nominatim, violando o limite de 1 requisição/segundo documentado em
`specs/feature-6/design.md`; (2) a fórmula de tempo de espera em si
(tempo base + peso por pedido ativo + tempo de deslocamento) não depende
de geocodificar de novo — depende apenas de coordenadas já conhecidas.
Em vez disso, esta feature extrai a fórmula pura de
`src/delivery/waitTime.js` para uma função reaproveitável
(`calcularTempoEsperaPorDistanciaEFila`, ver "Assinaturas novas") e a
nova função de listagem usa diretamente `clientes.latitude`/`longitude`
já persistidas + `calcularDistanciaKm` + `contarPedidosAtivos`, sem
tocar no `geocoder`.

## Arquivos a alterar

```
src/db/
├── errors.js          # ALTERADO — + OrderNotFoundError, InvalidStatusTransitionError,
│                       #            InvalidMotoboyError
├── pedidos.js          # ALTERADO — + STATUS_PEDIDO_ATIVO_PAINEL, TRANSICOES_PERMITIDAS,
│                       #            updateStatusPedido, atribuirMotoboy,
│                       #            listPedidosAtivosComCliente
└── index.js             # ALTERADO — reexporta as três novas funções + as três novas
                        #            classes de erro

src/delivery/
├── waitTime.js          # ALTERADO — extrai calcularTempoEsperaPorDistanciaEFila
│                        #            (função pura) e exporta-a; calcularTempoEspera
│                        #            passa a chamá-la internamente (sem mudar seu
│                        #            comportamento público, feature-6 permanece intacta)
└── index.js              # ALTERADO — reexporta calcularTempoEsperaPorDistanciaEFila e
                         #            listarPedidosAtivosComTempoEspera

src/whatsapp/
├── adapter.js            # ALTERADO — contrato JSDoc ganha o evento "disconnected"
└── client.js              # ALTERADO — rastreia status de conexão + getConnectionStatus()
                          #            + evento "connection-status-changed"
```

## Arquivo a criar

```
src/delivery/
└── painelPedidos.js       # listarPedidosAtivosComTempoEspera({ db, origem })

tests/
└── admin-kds.test.js      # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum outro arquivo é tocado nesta feature. Em particular, `src/ui/` e
`electron/main.js` **não são criados nem alterados** — ver "Decisão de
escopo central" acima.

## Transições de status permitidas (decisão de design nova)

Não existe, em nenhuma feature anterior (`done`) ou spec aprovado, uma
regra formal de transições de status de pedido. `STATUS_PERMITIDOS`
(feature-1) apenas enumera os cinco valores válidos, sem ordenar um
fluxo. Esta feature define essa regra, como uma máquina de estados
simples derivada do próprio fluxo de negócio descrito no `acceptance`
("Em Preparo, Saiu para Entrega, Concluído") e nos status já existentes:

```
recebido ──► em_preparo ──► saiu_para_entrega ──► concluido
    │             │
    └──► cancelado ◄──┘
```

- `recebido` → `em_preparo` ou `cancelado`.
- `em_preparo` → `saiu_para_entrega` ou `cancelado`.
- `saiu_para_entrega` → `concluido`.
- `concluido` e `cancelado` são estados finais: nenhuma transição a
  partir deles é permitida.

**Justificativa:** o `acceptance` desta feature descreve textualmente o
fluxo linear "Em Preparo → Saiu para Entrega → Concluído" operado pelo
administrador. `"cancelado"` já existe em `STATUS_PERMITIDOS` desde
feature-1 mas nenhuma feature anterior definiu quando ele pode ser
aplicado; permitir o cancelamento apenas enquanto o pedido ainda não
saiu para entrega (`recebido`/`em_preparo`) é a leitura mais
conservadora e evita o caso ambíguo de "cancelar" um pedido que o
motoboy já está entregando. Se esta regra não refletir a intenção real
do operador (ex.: permitir cancelar também depois de "saiu para
entrega"), é uma mudança pontual na tabela `TRANSICOES_PERMITIDAS` — a
ser esclarecida por um humano antes da aprovação deste spec, se
necessário.

## Assinaturas novas

### `src/db/errors.js` (alterado)

```javascript
export class DatabaseError extends Error {}
export class DuplicatePhoneError extends DatabaseError {}
export class InvalidOrderStatusError extends DatabaseError {}
export class OrderNotFoundError extends DatabaseError {}
export class InvalidStatusTransitionError extends DatabaseError {}
export class InvalidMotoboyError extends DatabaseError {}
```

Seguindo `docs/conventions.md`: mesma classe base já existente
(`DatabaseError`), três subtipos concretos novos.

### `src/db/pedidos.js` (alterado)

```javascript
// Subconjunto de STATUS_PERMITIDOS considerado "ativo" para efeito de
// listagem no painel: inclui "saiu_para_entrega" (diferente de
// STATUS_DEMANDA_ATIVA, que só conta demanda da cozinha — feature-6).
const STATUS_PEDIDO_ATIVO_PAINEL = ["recebido", "em_preparo", "saiu_para_entrega"];

// Transições de status permitidas (ver design.md, "Transições de status
// permitidas"). Chave: status atual. Valor: lista de novoStatus aceitos.
const TRANSICOES_PERMITIDAS = {
  recebido: ["em_preparo", "cancelado"],
  em_preparo: ["saiu_para_entrega", "cancelado"],
  saiu_para_entrega: ["concluido"],
  concluido: [],
  cancelado: [],
};

// Atualiza o status de um pedido existente, validando a transição.
// Lança OrderNotFoundError se `id` não existir; InvalidOrderStatusError
// se `novoStatus` não pertencer a STATUS_PERMITIDOS; InvalidStatusTransitionError
// se a transição não for permitida a partir do status atual (R7, R8).
export function updateStatusPedido(db, id, novoStatus)
// -> pedido atualizado (mesma forma de SELECT * FROM pedidos WHERE id = ?)

// Atribui o motoboy a um pedido existente. Lança OrderNotFoundError se
// `id` não existir; InvalidMotoboyError se `motoboy` for null/undefined/
// string vazia após trim() (R11).
export function atribuirMotoboy(db, id, motoboy)
// -> pedido atualizado

// Lista pedidos com status em STATUS_PEDIDO_ATIVO_PAINEL, ordenados por
// criado_em ascendente, cada um já com os dados do cliente (nome,
// telefone, endereco, latitude, longitude) via JOIN — sem cálculo de
// tempo de espera (isso é responsabilidade de src/delivery, R1, R2).
export function listPedidosAtivosComCliente(db)
// -> Array<{ id, clienteId, itens, status, motoboy, criadoEm,
//            clienteNome, clienteTelefone, clienteEndereco,
//            clienteLatitude, clienteLongitude }>
```

### `src/delivery/waitTime.js` (alterado)

```javascript
// Combina tempo base de preparo + peso por pedido ativo na fila + tempo
// de deslocamento estimado em uma única estimativa de tempo de espera em
// minutos. Função pura, sem IO — extraída de calcularTempoEspera para
// ser reaproveitada por listarPedidosAtivosComTempoEspera (feature-7)
// sem repetir geocodificação nem duplicar a fórmula (R3).
export function calcularTempoEsperaPorDistanciaEFila(distanciaKm, quantidadePedidosAtivos)
// -> number (minutos, inteiro, Math.round)

// calcularTempoEspera (assinatura e comportamento público inalterados,
// feature-6) passa a delegar o cálculo final a
// calcularTempoEsperaPorDistanciaEFila internamente.
export async function calcularTempoEspera({ enderecoCliente, geocoder, origem, db })
```

### `src/delivery/painelPedidos.js` (novo)

```javascript
// Lista os pedidos ativos do painel (R1, R2) já com distanciaKm e
// tempoEsperaMinutos calculados a partir das coordenadas já persistidas
// do cliente — sem chamar nenhum geocoder (R3). Pedidos cujo cliente não
// tem latitude/longitude gravadas recebem distanciaKm/tempoEsperaMinutos
// iguais a null (R4). Lança InvalidCoordinatesError se `origem` for
// inválida/ausente, sem consultar o banco (R5).
export function listarPedidosAtivosComTempoEspera({ db, origem })
// -> Array<{ id, clienteId, itens, status, motoboy, criadoEm,
//            clienteNome, clienteTelefone, clienteEndereco,
//            distanciaKm: number | null,
//            tempoEsperaMinutos: number | null }>
```

Implementação (orquestração, sem lógica nova além da já existente):

```javascript
// src/delivery/painelPedidos.js
import { listPedidosAtivosComCliente, contarPedidosAtivos } from "../db/pedidos.js";
import { calcularDistanciaKm } from "./distance.js";
import { calcularTempoEsperaPorDistanciaEFila } from "./waitTime.js";
import { InvalidCoordinatesError } from "./errors.js";

export function listarPedidosAtivosComTempoEspera({ db, origem }) {
  if (!origem || typeof origem.latitude !== "number" || typeof origem.longitude !== "number") {
    throw new InvalidCoordinatesError("coordenadas de origem inválidas ou ausentes"); // R5
  }

  const pedidos = listPedidosAtivosComCliente(db); // R1, R2
  const quantidadePedidosAtivos = contarPedidosAtivos(db);

  return pedidos.map((pedido) => {
    if (typeof pedido.clienteLatitude !== "number" || typeof pedido.clienteLongitude !== "number") {
      return { ...pedido, distanciaKm: null, tempoEsperaMinutos: null }; // R4
    }

    const distanciaKm = calcularDistanciaKm(origem, {
      latitude: pedido.clienteLatitude,
      longitude: pedido.clienteLongitude,
    });
    const tempoEsperaMinutos = calcularTempoEsperaPorDistanciaEFila(
      distanciaKm,
      quantidadePedidosAtivos
    ); // R3

    return { ...pedido, distanciaKm, tempoEsperaMinutos };
  });
}
```

### `src/whatsapp/adapter.js` (alterado)

Contrato JSDoc ganha um evento novo:

```javascript
// - "disconnected": emitido quando uma sessão previamente autenticada
//   ("ready") perde a conexão.
```

Nenhum símbolo de runtime é adicionado — o arquivo continua `export {}`.

### `src/whatsapp/client.js` (alterado)

```javascript
// Estado interno de conexão, não exposto diretamente — só via
// getConnectionStatus() e o evento "connection-status-changed".
// Inicial: "desconectado" (R12).
let connectionStatus = "desconectado";

adapter.on("ready", () => {
  connectionStatus = "conectado";
  emitter.emit("connection-status-changed", connectionStatus); // R13
});

adapter.on("disconnected", () => {
  connectionStatus = "desconectado";
  emitter.emit("connection-status-changed", connectionStatus); // R14
});

// (objeto retornado por createWhatsAppClient ganha:)
getConnectionStatus: () => connectionStatus, // R12
```

`adapter.on("auth_failure", ...)` já existente não precisa de mudança:
como `connectionStatus` só é promovido a `"conectado"` em `"ready"`,
uma falha de autenticação antes disso mantém `"desconectado"` (R12) sem
nenhum código adicional.

## Alternativa de estrutura descartada

Cogitou-se colocar `listarPedidosAtivosComTempoEspera` dentro de
`src/db/pedidos.js`, já que ela consome `listPedidosAtivosComCliente` e
`contarPedidosAtivos` (ambas do mesmo arquivo). Descartada porque
misturaria IO de banco com a fórmula de tempo de espera (que pertence
ao domínio `src/delivery/`, feature-6) no mesmo módulo, violando
`docs/architecture.md` ("Não misture IO com lógica de domínio dentro de
um mesmo módulo interno"). Mantendo a função em `src/delivery/`,
`src/db/pedidos.js` continua responsável só por persistência (queries),
e `src/delivery/` continua responsável só pelo cálculo de tempo de
espera — mesma separação já usada em `calcularTempoEspera` (feature-6),
que importa `contarPedidosAtivos` de `src/db/pedidos.js` em vez de
duplicar a query.
