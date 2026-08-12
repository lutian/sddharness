# Tasks — feature-7: Painel Administrativo KDS e Gestão de Pedidos

- [x] T1 — Estender `src/db/errors.js` com `OrderNotFoundError`,
      `InvalidStatusTransitionError` e `InvalidMotoboyError` (subtipos de
      `DatabaseError`, já existente).
      Cobre: R8, R9, R11.

- [x] T2 — Estender `src/db/pedidos.js` com a constante
      `STATUS_PEDIDO_ATIVO_PAINEL = ["recebido", "em_preparo",
      "saiu_para_entrega"]` e a constante `TRANSICOES_PERMITIDAS`
      (mapa status atual → lista de `novoStatus` aceitos, conforme
      `design.md`, "Transições de status permitidas").
      Cobre: R7.

- [x] T3 — Adicionar `updateStatusPedido(db, id, novoStatus)` em
      `src/db/pedidos.js`: lança `OrderNotFoundError` se o pedido não
      existir; lança `InvalidOrderStatusError` (reaproveitada, feature-1)
      se `novoStatus` não pertencer a `STATUS_PERMITIDOS`; lança
      `InvalidStatusTransitionError` se `novoStatus` não estiver na lista
      de `TRANSICOES_PERMITIDAS[statusAtual]`, sem alterar o banco; caso
      contrário, atualiza `status` e retorna o pedido atualizado.
      Cobre: R6, R7, R8, R9.

- [x] T4 — Adicionar `atribuirMotoboy(db, id, motoboy)` em
      `src/db/pedidos.js`: lança `OrderNotFoundError` se o pedido não
      existir; lança `InvalidMotoboyError` se `motoboy` for
      `null`/`undefined`/string vazia após `trim()`, sem alterar o
      banco; caso contrário, grava `motoboy` e retorna o pedido
      atualizado.
      Cobre: R9, R10, R11.

- [x] T5 — Adicionar `listPedidosAtivosComCliente(db)` em
      `src/db/pedidos.js`: `SELECT` com `JOIN` de `pedidos` e `clientes`
      filtrando `status IN STATUS_PEDIDO_ATIVO_PAINEL`, ordenado por
      `pedidos.criado_em ASC`, retornando `id`, `clienteId`, `itens`
      (mantido como string JSON), `status`, `motoboy`, `criadoEm`,
      `clienteNome`, `clienteTelefone`, `clienteEndereco`,
      `clienteLatitude`, `clienteLongitude`.
      Cobre: R1, R2.

- [x] T6 — Reexportar em `src/db/index.js`: `updateStatusPedido`,
      `atribuirMotoboy`, `listPedidosAtivosComCliente`,
      `OrderNotFoundError`, `InvalidStatusTransitionError`,
      `InvalidMotoboyError`.
      Cobre: R6, R7, R8, R9, R10, R11.

- [x] T7 — Extrair, em `src/delivery/waitTime.js`, a função pura
      `calcularTempoEsperaPorDistanciaEFila(distanciaKm,
      quantidadePedidosAtivos)` a partir da fórmula já existente em
      `calcularTempoEspera` (tempo base de preparo + peso por pedido
      ativo + tempo de deslocamento, `Math.round`); fazer
      `calcularTempoEspera` delegar a ela internamente, sem alterar sua
      assinatura nem seu comportamento público (feature-6 permanece
      intacta — não editar `tests/delivery-time.test.js`).
      Cobre: R3.

- [x] T8 — Criar `src/delivery/painelPedidos.js` com
      `listarPedidosAtivosComTempoEspera({ db, origem })` conforme
      implementação de referência em `design.md`: valida `origem`
      (lançando `InvalidCoordinatesError` sem consultar o banco se
      inválida/ausente); chama `listPedidosAtivosComCliente(db)` e
      `contarPedidosAtivos(db)`; para cada pedido, se o cliente tiver
      `clienteLatitude`/`clienteLongitude` numéricos, calcula
      `distanciaKm` via `calcularDistanciaKm` e `tempoEsperaMinutos` via
      `calcularTempoEsperaPorDistanciaEFila`; caso contrário, define
      ambos como `null` sem lançar erro e sem interromper os demais
      pedidos.
      Cobre: R1, R2, R3, R4, R5.

- [x] T9 — Reexportar em `src/delivery/index.js`:
      `calcularTempoEsperaPorDistanciaEFila` e
      `listarPedidosAtivosComTempoEspera`.
      Cobre: R1–R5.

- [x] T10 — Estender o contrato JSDoc de `src/whatsapp/adapter.js` com o
      evento `"disconnected"` ("emitido quando uma sessão previamente
      autenticada perde a conexão"), sem adicionar símbolos de runtime.
      Cobre: R14.

- [x] T11 — Estender `src/whatsapp/client.js`: adicionar estado interno
      `connectionStatus` (inicial `"desconectado"`); assinar
      `adapter.on("ready", ...)` promovendo `connectionStatus` para
      `"conectado"` e emitindo `"connection-status-changed"` com esse
      valor; assinar `adapter.on("disconnected", ...)` voltando
      `connectionStatus` para `"desconectado"` e emitindo
      `"connection-status-changed"`; expor `getConnectionStatus()` no
      objeto retornado por `createWhatsAppClient`.
      Cobre: R12, R13, R14.

- [x] T12 — Escrever em `tests/admin-kds.test.js` (Vitest, banco SQLite
      real em diretório temporário via `openDatabase`/
      `fs.mkdtempSync`, no padrão de `tests/delivery-time.test.js`):
      teste que, com pedidos de status variados inseridos (incluindo
      `"concluido"` e `"cancelado"`), confirma que
      `listPedidosAtivosComCliente(db)` (ou, de ponta a ponta,
      `listarPedidosAtivosComTempoEspera`) retorna exatamente os pedidos
      com status `"recebido"`, `"em_preparo"` e `"saiu_para_entrega"`,
      ordenados por `criado_em` ascendente.
      Cobre: R1, R2.

- [x] T13 — Adicionar em `tests/admin-kds.test.js`: teste que, com um
      cliente com `latitude`/`longitude` gravadas e uma `origem` válida,
      confirma que `listarPedidosAtivosComTempoEspera({ db, origem })`
      retorna `distanciaKm` e `tempoEsperaMinutos` numéricos e
      consistentes com a fórmula documentada em `design.md`
      (`calcularDistanciaKm` + `calcularTempoEsperaPorDistanciaEFila`)
      para os valores de entrada do teste.
      Cobre: R3.

- [x] T14 — Adicionar em `tests/admin-kds.test.js`: teste em que o
      cliente de um pedido ativo não tem `latitude`/`longitude`
      gravadas (`null`), confirmando que o pedido retornado por
      `listarPedidosAtivosComTempoEspera` tem `distanciaKm` e
      `tempoEsperaMinutos` iguais a `null`, e que os demais pedidos da
      lista (com coordenadas válidas) continuam com seus valores
      calculados normalmente.
      Cobre: R4.

- [x] T15 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que `listarPedidosAtivosComTempoEspera({ db })` (sem `origem`) e
      `listarPedidosAtivosComTempoEspera({ db, origem: {} })` lançam
      `InvalidCoordinatesError`.
      Cobre: R5.

- [x] T16 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que `updateStatusPedido(db, id, "em_preparo")` em um pedido
      `"recebido"` atualiza o `status` no banco e no valor retornado;
      repetir a verificação para as transições `em_preparo →
      saiu_para_entrega` e `saiu_para_entrega → concluido`.
      Cobre: R6, R7.

- [x] T17 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que `updateStatusPedido(db, id, "concluido")` chamado em um
      pedido `"recebido"` (transição não permitida) lança
      `InvalidStatusTransitionError` e que o `status` gravado no banco
      permanece `"recebido"` após a tentativa.
      Cobre: R7, R8.

- [x] T18 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que `updateStatusPedido(db, id, "em_preparo")` chamado com um
      pedido já `"concluido"` ou `"cancelado"` (estados finais) lança
      `InvalidStatusTransitionError`.
      Cobre: R7, R8.

- [x] T19 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que `updateStatusPedido(db, idInexistente, "em_preparo")` e
      `atribuirMotoboy(db, idInexistente, "João")` lançam
      `OrderNotFoundError`.
      Cobre: R9.

- [x] T20 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que `atribuirMotoboy(db, id, "Carlos Silva")` grava o nome no
      campo `motoboy` do pedido, tanto no valor retornado quanto ao
      reconsultar o pedido no banco.
      Cobre: R10.

- [x] T21 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que `atribuirMotoboy(db, id, "")`, `atribuirMotoboy(db, id, "   ")`
      e `atribuirMotoboy(db, id, null)` lançam `InvalidMotoboyError` e
      não alteram o campo `motoboy` previamente gravado.
      Cobre: R11.

- [x] T22 — Adicionar em `tests/admin-kds.test.js` (dublê de `adapter`
      via `EventEmitter`, no padrão de `tests/whatsapp-queue.test.js`):
      teste que confirma que `client.getConnectionStatus()` retorna
      `"desconectado"` antes de qualquer evento, `"conectado"` depois de
      `adapter.emitirComoAdapter("ready")`, e volta a `"desconectado"`
      depois de `adapter.emitirComoAdapter("disconnected")`.
      Cobre: R12.

- [x] T23 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que o evento público `"connection-status-changed"` é emitido com
      `"conectado"` ao receber `"ready"` do adapter, e com
      `"desconectado"` ao receber `"disconnected"`.
      Cobre: R13, R14.

- [x] T24 — Adicionar em `tests/admin-kds.test.js`: teste que confirma
      que, após `adapter.emitirComoAdapter("auth_failure", ...)` sem
      nunca ter emitido `"ready"`, `client.getConnectionStatus()`
      permanece `"desconectado"`.
      Cobre: R12.

- [x] T25 — Executar `npm test` e `./init.sh`; documentar a tabela de
      rastreabilidade R1–R14 → nome do teste em
      `progress/impl_feature-7.md`.
      Cobre: R1–R14 (verificação final).
