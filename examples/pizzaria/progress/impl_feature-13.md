# Implementação — feature-13: Interface React — Painel KDS

## Arquivos criados

- `src/ui/panels/kds/localDataClient.js` — implementação padrão de
  `dataClient`, delegando a `src/delivery/index.js` (`listarPedidosAtivosComTempoEspera`),
  `src/db/index.js` (`updateStatusPedido`, `atribuirMotoboy`) e
  `whatsappClient` (`getConnectionStatus`, `on("connection-status-changed")`)
  injetados via fábrica `createLocalDataClient({ db, origem, whatsappClient })`.
  Limitações documentadas (aceitas pelo spec, escopo de feature-14):
  `onPedidosChange` não é acionado sozinho (sem fonte de eventos de domínio
  para mudanças em `pedidos`); cancelamento de `onConnectionStatusChange` é
  no-op (`WhatsAppClient` não expõe `off`).
- `src/ui/panels/kds/PedidoList.jsx` — lista de pedidos ativos.
- `src/ui/panels/kds/PedidoCard.jsx` — card de um pedido: nome do cliente,
  status, tempo de espera, seletor de status + confirmação, campo de
  motoboy + confirmação, captura/exibição de erro por card.
- `src/ui/panels/kds/ConnectionStatus.jsx` — indicador de status de conexão
  do WhatsApp via `Badge`.
- `src/ui/panels/kds/KdsPanel.jsx` — componente raiz: efeitos de montagem
  (`listarPedidosAtivos`, `onPedidosChange`, `getStatusConexaoWhatsApp`,
  `onConnectionStatusChange`, com cleanup de assinaturas), handlers de
  atualização de status e atribuição de motoboy.
- `src/ui/panels/kds/index.js` — porta pública, reexporta apenas `KdsPanel`.
- `tests/kds-panel-ui.test.js` — 14 testes Vitest + `@testing-library/react`
  em `jsdom`, com `dataClient` fake (`vi.fn()` por método).

## Arquivos alterados

- `specs/feature-13/tasks.md` — todas as tasks T1–T10 marcadas `[x]`.
- `progress/current.md` — atualizado com o andamento da sessão.

## Nenhum arquivo tocado em `src/db/`, `src/delivery/`, `src/whatsapp/`,
`src/menu/`, `src/ai/`, conforme escopo do `design.md`.

## Resultado de `./init.sh`

Todos os 168 testes passam (154 pré-existentes das features 1–12 + 14 novos
de `tests/kds-panel-ui.test.js`), sem nenhuma alteração de resultado nos
testes já existentes.

## Rastreabilidade R<n> → teste

- R1 → `"chama listarPedidosAtivos() exatamente uma vez e renderiza os pedidos retornados"`
- R2 → `"chama listarPedidosAtivos() exatamente uma vez e renderiza os pedidos retornados"` e
  `"exibe indicação de tempo indisponível quando tempoEsperaMinutos é null"`
- R3 → `"assina onPedidosChange uma vez e substitui a listagem ao acionar o callback recebido"`
- R4 → `"assina onPedidosChange uma vez e substitui a listagem ao acionar o callback recebido"`
- R5 → `"invoca a função de cancelamento de onPedidosChange ao desmontar"`
- R6 → `"chama atualizarStatusPedido com id e novoStatus, refletindo o status retornado"`
- R7 → `"chama atualizarStatusPedido com id e novoStatus, refletindo o status retornado"`
- R8 → `"captura a rejeição de atualizarStatusPedido, exibe o erro e mantém o status anterior"`
- R9 → `"chama atribuirMotoboy com id e motoboy digitado, refletindo o motoboy retornado"`
- R10 → `"chama atribuirMotoboy com id e motoboy digitado, refletindo o motoboy retornado"`
- R11 → `"captura a rejeição de atribuirMotoboy, exibe o erro e mantém o motoboy anterior"`
- R12 → `"chama getStatusConexaoWhatsApp() e exibe o status retornado"`
- R13 → `"assina onConnectionStatusChange uma vez e atualiza o indicador ao acionar o callback"`
- R14 → `"invoca a função de cancelamento de onConnectionStatusChange ao desmontar"`
- R15 → `"usa Button, Badge, Navbar e Card de src/ui/index.js para sua estrutura visual"`
- R16 → `"funciona dentro de um ThemeProvider: ThemeToggle alterna o tema do painel"`
- R17 → `"é importável a partir de src/ui/panels/kds/index.js e aceita dataClient como prop"`

Todos os R1–R17 estão cobertos por pelo menos um teste concreto em
`tests/kds-panel-ui.test.js`.

## Observações

- Nenhuma inconsistência encontrada entre o spec e os contratos já `done`
  (`src/delivery/painelPedidos.js`, `src/db/index.js`, `src/whatsapp/client.js`).
  As duas limitações documentadas no `design.md` (Decisão 1) foram
  implementadas exatamente como especificado, sem inventar solução: elas
  ficam explicitamente para `feature-14`.
- `PedidoCard.jsx` sincroniza `statusSelecionado`/`motoboyDigitado` com a
  prop `pedido` via `useEffect` (não previsto explicitamente no `design.md`,
  mas necessário para que R7/R10 — refletir o valor retornado pela chamada
  bem-sucedida — funcionem, já que o estado local do seletor/input precisa
  acompanhar a nova prop calculada por `KdsPanel`). Não introduz nenhum
  requirement novo nem se desvia da Decisão 3 do `design.md` (delega toda
  validação a `dataClient`).
