# Tasks — feature-13: Interface React — Painel KDS

- [x] T1 — Criar `src/ui/panels/kds/localDataClient.js` com a
      implementação padrão de `dataClient`: `listarPedidosAtivos()`
      (delega a `listarPedidosAtivosComTempoEspera({ db, origem })` de
      `src/delivery/index.js`), `atualizarStatusPedido(id, novoStatus)`
      (delega a `updateStatusPedido(db, id, novoStatus)` de
      `src/db/index.js`), `atribuirMotoboy(id, motoboy)` (delega a
      `atribuirMotoboy(db, id, motoboy)` de `src/db/index.js`),
      `getStatusConexaoWhatsApp()` (delega a
      `whatsappClient.getConnectionStatus()`), `onConnectionStatusChange(callback)`
      (delega a `whatsappClient.on("connection-status-changed", callback)`
      e retorna uma função de cancelamento) e `onPedidosChange(callback)`
      (registra o callback e retorna uma função de cancelamento no-op,
      com a limitação documentada em `design.md`, Decisão 1). `db`,
      `origem` e `whatsappClient` recebidos como parâmetros da fábrica do
      cliente, não hardcoded.
      Cobre: R17 (implementação de referência do contrato).

- [x] T2 — Criar `src/ui/panels/kds/PedidoList.jsx` com o componente
      `PedidoList({ pedidos, onAtualizarStatus, onAtribuirMotoboy })`:
      renderiza um `PedidoCard` para cada pedido da lista recebida.
      Cobre: R1, R2.

- [x] T3 — Criar `src/ui/panels/kds/PedidoCard.jsx` com o componente
      `PedidoCard({ pedido, onAtualizarStatus, onAtribuirMotoboy })`:
      renderiza nome do cliente, status atual e tempo de espera
      (`tempoEsperaMinutos`), exibindo uma indicação de "tempo
      indisponível" quando `tempoEsperaMinutos` for `null`; inclui um
      seletor de status (opções: `"recebido"`, `"em_preparo"`,
      `"saiu_para_entrega"`, `"concluido"`, `"cancelado"`) com um
      `Button` de confirmar que chama `onAtualizarStatus(pedido.id,
      novoStatus)`; inclui um campo de texto para motoboy com um
      `Button` de confirmar que chama `onAtribuirMotoboy(pedido.id,
      motoboyDigitado)`.
      Cobre: R2, R6, R9.

- [x] T4 — Em `PedidoCard.jsx`, tratar o resultado das chamadas
      assíncronas recebidas via props (`onAtualizarStatus`/
      `onAtribuirMotoboy`, que retornam a `Promise` de
      `dataClient.atualizarStatusPedido`/`dataClient.atribuirMotoboy`
      encaminhada por `KdsPanel`): em caso de rejeição, capturar o erro
      (sem propagar exceção não tratada), exibir a mensagem associada
      àquele card (`Badge variant="danger"`) e manter o valor exibido
      anteriormente; em caso de sucesso, não é necessário lógica extra
      aqui — a atualização do valor exibido vem da nova prop `pedido`
      recalculada por `KdsPanel` (T6).
      Cobre: R7, R8, R10, R11.

- [x] T5 — Criar `src/ui/panels/kds/ConnectionStatus.jsx` com o
      componente `ConnectionStatus({ status })`: renderiza um `Badge`
      (`variant="success"` para `"conectado"`, `variant="danger"` para
      `"desconectado"`) com o rótulo textual do status.
      Cobre: R12, R13.

- [x] T6 — Criar `src/ui/panels/kds/KdsPanel.jsx` com o componente
      `KdsPanel({ dataClient })`:
      - em um `useEffect` na montagem, chama `dataClient.listarPedidosAtivos()`
        uma vez e guarda o resultado em estado local (R1);
      - no mesmo `useEffect` (ou em um segundo, com o mesmo array de
        dependências `[dataClient]`), chama `dataClient.onPedidosChange(callback)`
        uma vez, guardando a função de cancelamento retornada; quando o
        `callback` é acionado com uma nova lista, substitui o estado de
        pedidos por ela (R3, R4); no `cleanup` do efeito, invoca a
        função de cancelamento (R5);
      - chama `dataClient.getStatusConexaoWhatsApp()` uma vez na
        montagem e guarda o resultado em estado local (R12); chama
        `dataClient.onConnectionStatusChange(callback)` uma vez,
        atualizando o estado quando acionado (R13) e invocando a função
        de cancelamento no `cleanup` (R14);
      - implementa os handlers `handleAtualizarStatus(id, novoStatus)` e
        `handleAtribuirMotoboy(id, motoboy)`, que chamam
        `dataClient.atualizarStatusPedido`/`dataClient.atribuirMotoboy`
        respectivamente e, em caso de sucesso, atualizam apenas o pedido
        correspondente no estado local de pedidos com o `Pedido`
        retornado (R7, R10); ambos os handlers propagam a `Promise`
        (resolvida ou rejeitada) de volta para `PedidoCard` tratar (T4),
        sem engolir o erro silenciosamente;
      - renderiza `Navbar` com `ThemeToggle` e `ConnectionStatus` no
        topo, e `PedidoList` dentro de um `Card`.
      Cobre: R1, R3, R4, R5, R6, R7, R9, R10, R12, R13, R14, R15.

- [x] T7 — Criar `src/ui/panels/kds/index.js` reexportando apenas
      `KdsPanel` como porta pública deste subdomínio, seguindo o padrão
      de `index.js` único já usado em `src/ui/panels/config/index.js`.
      Cobre: R17 (contrato de composição), consistência estrutural.

- [x] T8 — Revisar `KdsPanel.jsx`, `PedidoList.jsx`, `PedidoCard.jsx` e
      `ConnectionStatus.jsx` garantindo que toda a estrutura visual
      (contêineres, botões, indicadores, navegação) usa exclusivamente
      `Card`, `Badge`, `Button`, `Navbar`, `ThemeToggle` de
      `src/ui/index.js`, sem elementos HTML de baixo nível equivalentes
      quando um componente base cobre o mesmo papel.
      Cobre: R15, R16.

- [x] T9 — Criar `tests/kds-panel-ui.test.js` (Vitest +
      `@testing-library/react`, com `import "@testing-library/jest-dom"`
      no topo) contendo, no mínimo, os seguintes casos, todos com um
      `dataClient` fake (`vi.fn()` por método, incluindo
      `onPedidosChange`/`onConnectionStatusChange` retornando funções de
      cancelamento `vi.fn()`) injetado via prop — nenhum acesso a
      SQLite, `src/whatsapp/*` real ou IPC:
      - Montar `KdsPanel` com `dataClient.listarPedidosAtivos` resolvido
        e verificar que foi chamado exatamente uma vez e que os pedidos
        retornados aparecem na tela (nome do cliente, status, tempo de
        espera).
        Cobre: R1, R2.
      - Montar `KdsPanel` com um pedido cujo `tempoEsperaMinutos` é
        `null` e verificar que a indicação de "tempo indisponível" é
        exibida em vez de um número.
        Cobre: R2.
      - Verificar que `dataClient.onPedidosChange` foi chamado
        exatamente uma vez na montagem; capturar o callback passado e
        invocá-lo manualmente com uma nova lista de pedidos, verificando
        que a tela é atualizada com os novos dados sem nova chamada a
        `listarPedidosAtivos`.
        Cobre: R3, R4.
      - Desmontar `KdsPanel` e verificar que a função de cancelamento
        retornada por `onPedidosChange` foi chamada.
        Cobre: R5.
      - Selecionar um novo status para um pedido exibido, confirmar, e
        verificar que `dataClient.atualizarStatusPedido` foi chamado
        exatamente uma vez com o `id` do pedido e o status selecionado;
        configurar a resolução com um pedido atualizado e verificar que
        o novo status aparece na tela.
        Cobre: R6, R7.
      - Configurar `dataClient.atualizarStatusPedido` para rejeitar com
        uma `InvalidStatusTransitionError` (importada de
        `src/db/errors.js`), confirmar uma mudança de status, e
        verificar que a mensagem de erro aparece associada àquele
        pedido, que o status exibido permanece o anterior, e que nenhuma
        exceção não tratada escapa do teste.
        Cobre: R8.
      - Digitar um nome de motoboy em um pedido exibido, confirmar, e
        verificar que `dataClient.atribuirMotoboy` foi chamado
        exatamente uma vez com o `id` do pedido e o nome digitado;
        configurar a resolução com um pedido atualizado e verificar que
        o nome do motoboy aparece na tela.
        Cobre: R9, R10.
      - Configurar `dataClient.atribuirMotoboy` para rejeitar com uma
        `InvalidMotoboyError` (importada de `src/db/errors.js`),
        confirmar uma atribuição, e verificar que a mensagem de erro
        aparece associada àquele pedido, que o motoboy exibido permanece
        o anterior, e que nenhuma exceção não tratada escapa do teste.
        Cobre: R11.
      - Montar `KdsPanel` com `dataClient.getStatusConexaoWhatsApp`
        resolvido para `"conectado"` e verificar que o indicador de
        conexão exibe esse status.
        Cobre: R12.
      - Verificar que `dataClient.onConnectionStatusChange` foi chamado
        exatamente uma vez na montagem; capturar o callback e invocá-lo
        manualmente com `"desconectado"`, verificando que o indicador de
        conexão é atualizado.
        Cobre: R13.
      - Desmontar `KdsPanel` e verificar que a função de cancelamento
        retornada por `onConnectionStatusChange` foi chamada.
        Cobre: R14.
      - Inspecionar a árvore renderizada e verificar (via `container` ou
        seletores de `testing-library`) que os elementos base usados
        (botões de confirmar status/motoboy, indicador de conexão,
        navbar) correspondem aos componentes `Button`/`Badge`/`Navbar`/
        `Card` de `src/ui/index.js` (ex.: via classes CSS derivadas
        desses componentes, como `"btn-primary"`, `"badge-success"`,
        `"badge-danger"`, `"glass-card"`, `"navbar"`).
        Cobre: R15.
      - Renderizar `KdsPanel` dentro de `ThemeProvider`, clicar no
        `ThemeToggle` do painel e verificar que a classe de tema em
        `document.documentElement` alterna, reaproveitando o
        comportamento validado em `tests/design-system.test.js`.
        Cobre: R16.
      - Verificar que `KdsPanel` é importável a partir de
        `src/ui/panels/kds/index.js` (porta pública) e que aceita
        `dataClient` como prop, sem exigir importação de
        `localDataClient.js` no teste.
        Cobre: R17.
      Cobre: R1–R17 (implementação de teste).

- [x] T10 — Executar `npm test` e `./init.sh`, confirmando que
      `tests/kds-panel-ui.test.js` roda em `jsdom` (via o padrão
      `tests/*-ui.test.js` já configurado na feature-11) e que todos os
      testes das features 1–12 continuam passando sem alteração de
      resultado; documentar a tabela de rastreabilidade R1–R17 → nome do
      teste em `progress/impl_feature-13.md` (a cargo do implementer, não
      deste spec).
      Cobre: R1–R17 (verificação final).
