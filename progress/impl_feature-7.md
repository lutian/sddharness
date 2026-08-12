# Implementação — feature-7: Painel Administrativo KDS e Gestão de Pedidos

## Escopo entregue

Conforme decisão de escopo já aprovada em `specs/feature-7/design.md`:
apenas a camada de dados/lógica (sem `src/ui/`, sem `electron/main.js`).
Nenhuma inconsistência foi encontrada entre o spec e o estado real de
`src/db/pedidos.js`, `src/delivery/` e `src/whatsapp/` — todos os
contratos descritos em "Contexto verificado antes da redação"
(`requirements.md`) e nas assinaturas de `design.md` bateram com o
código já existente. Implementação seguiu o spec sem desvios.

## Arquivos alterados

- `src/db/errors.js` — `OrderNotFoundError`, `InvalidStatusTransitionError`,
  `InvalidMotoboyError` (T1).
- `src/db/pedidos.js` — `STATUS_PEDIDO_ATIVO_PAINEL`,
  `TRANSICOES_PERMITIDAS`, `updateStatusPedido`, `atribuirMotoboy`,
  `listPedidosAtivosComCliente` (T2–T5).
- `src/db/index.js` — reexporta as três novas funções e as três novas
  classes de erro (T6).
- `src/delivery/waitTime.js` — extraída `calcularTempoEsperaPorDistanciaEFila`
  (função pura); `calcularTempoEspera` passa a delegar a ela, sem mudar
  assinatura nem comportamento público (T7).
- `src/whatsapp/adapter.js` — contrato JSDoc ganha o evento `"disconnected"`
  (T10).
- `src/whatsapp/client.js` — estado interno `connectionStatus`,
  `getConnectionStatus()`, evento `"connection-status-changed"` (T11).

## Arquivos criados

- `src/delivery/painelPedidos.js` — `listarPedidosAtivosComTempoEspera({ db, origem })`
  (T8).
- `tests/admin-kds.test.js` — 13 testes cobrindo R1–R14 (T12–T24).

## Resultado da verificação

- `npx vitest run tests/admin-kds.test.js`: 13/13 testes passam.
- `./init.sh`: 93/93 testes passam no total (80 pré-existentes das
  features 1–6 + 13 novos desta feature), nada quebrado.

## Rastreabilidade R<n> → teste

| Requirement | Teste em `tests/admin-kds.test.js` |
|---|---|
| R1 | `describe("Painel administrativo KDS — listagem de pedidos ativos")` → `"retorna exatamente os pedidos com status recebido, em_preparo e saiu_para_entrega, ordenados por criado_em ascendente"` |
| R2 | mesmo teste acima (exclui `"concluido"` e `"cancelado"` da listagem) |
| R3 | `"retorna distanciaKm e tempoEsperaMinutos numéricos e consistentes com a fórmula documentada quando o cliente tem latitude/longitude gravadas"` |
| R4 | `"retorna distanciaKm e tempoEsperaMinutos como null quando o cliente não tem latitude/longitude gravadas, sem afetar os demais pedidos"` |
| R5 | `"lança InvalidCoordinatesError quando origem é omitida ou não contém latitude/longitude numéricos"` |
| R6 | `describe("... atualização de status de pedido")` → `"atualiza o status seguindo o fluxo recebido → em_preparo → saiu_para_entrega → concluido"` |
| R7 | mesmo teste acima (transições permitidas) + `"lança InvalidStatusTransitionError ao tentar pular etapas (recebido → concluido) e não altera o status gravado"` + `"lança InvalidStatusTransitionError ao tentar transicionar a partir de um estado final (concluido ou cancelado)"` |
| R8 | `"lança InvalidStatusTransitionError ao tentar pular etapas (recebido → concluido) e não altera o status gravado"` e `"...a partir de um estado final..."` |
| R9 | `"lança OrderNotFoundError ao atualizar status ou atribuir motoboy em um pedido inexistente"` |
| R10 | `describe("... atribuição de motoboy")` → `"grava o nome do motoboy no pedido, tanto no valor retornado quanto ao reconsultar o banco"` |
| R11 | `"lança InvalidMotoboyError para motoboy vazio, só espaços, ou null, sem alterar o campo gravado"` |
| R12 | `describe("... status de conexão do WhatsApp")` → `"retorna 'desconectado' inicialmente, 'conectado' após 'ready' e volta a 'desconectado' após 'disconnected'"` e `"mantém 'desconectado' após 'auth_failure' quando 'ready' nunca foi emitido"` |
| R13 | `"emite o evento público 'connection-status-changed' com 'conectado' em 'ready' e 'desconectado' em 'disconnected'"` |
| R14 | mesmo teste acima (parte `"desconectado"` em `"disconnected"`) |

Todos os R1–R14 estão cobertos por pelo menos um teste concreto.

## Estado das tasks

Todas as 25 tasks (`T1`–`T25`) de `specs/feature-7/tasks.md` estão
marcadas `[x]`.

## Status

Aguardando revisão do reviewer. `feature_list.json` não foi alterado
(feature-7 permanece `in_progress`).
