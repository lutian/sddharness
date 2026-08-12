# Review — feature feature-13

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes
- R1: [x] `"chama listarPedidosAtivos() exatamente uma vez e renderiza os pedidos retornados"` (tests/kds-panel-ui.test.js:58)
- R2: [x] mesmo teste acima + `"exibe indicação de tempo indisponível quando tempoEsperaMinutos é null"` (linha 70)
- R3: [x] `"assina onPedidosChange uma vez e substitui a listagem ao acionar o callback recebido"` (linha 93)
- R4: [x] idem (verifica substituição da lista sem nova chamada a `listarPedidosAtivos`)
- R5: [x] `"invoca a função de cancelamento de onPedidosChange ao desmontar"` (linha 110)
- R6: [x] `"chama atualizarStatusPedido com id e novoStatus, refletindo o status retornado"` (linha 133)
- R7: [x] idem (verifica reflexo do novo status)
- R8: [x] `"captura a rejeição de atualizarStatusPedido, exibe o erro e mantém o status anterior"` (linha 153)
- R9: [x] `"chama atribuirMotoboy com id e motoboy digitado, refletindo o motoboy retornado"` (linha 186)
- R10: [x] idem
- R11: [x] `"captura a rejeição de atribuirMotoboy, exibe o erro e mantém o motoboy anterior"` (linha 204)
- R12: [x] `"chama getStatusConexaoWhatsApp() e exibe o status retornado"` (linha 237)
- R13: [x] `"assina onConnectionStatusChange uma vez e atualiza o indicador ao acionar o callback"` (linha 250)
- R14: [x] `"invoca a função de cancelamento de onConnectionStatusChange ao desmontar"` (linha 269)
- R15: [x] `"usa Button, Badge, Navbar e Card de src/ui/index.js para sua estrutura visual"` (linha 294)
- R16: [x] `"funciona dentro de um ThemeProvider: ThemeToggle alterna o tema do painel"` (linha 311)
- R17: [x] `"é importável a partir de src/ui/panels/kds/index.js e aceita dataClient como prop"` (linha 335)

Todos os 17 requirements têm cobertura de teste concreta e rastreável, conforme mapa em
`progress/impl_feature-13.md` — conferido linha a linha contra o arquivo de teste real.

## Tasks completas
- T1: [x] `localDataClient.js` implementa `createLocalDataClient({ db, origem, whatsappClient })`,
  delegando corretamente a `listarPedidosAtivosComTempoEspera` (src/delivery/index.js),
  `updateStatusPedido`/`atribuirMotoboy` (src/db/index.js) e
  `whatsappClient.getConnectionStatus()`/`on("connection-status-changed", ...)`. Confirmado que
  `db`, `origem` e `whatsappClient` são parâmetros da fábrica, não hardcoded.
- T2: [x] `PedidoList.jsx` renderiza um `PedidoCard` por pedido.
- T3: [x] `PedidoCard.jsx` renderiza cliente/status/tempo, seletor de status e campo de motoboy
  com botões de confirmação.
- T4: [x] `PedidoCard.jsx` captura rejeição em `handleConfirmarStatus`/`handleConfirmarMotoboy`,
  exibe `Badge variant="danger"` com `erro.message` e reverte o valor exibido ao anterior.
- T5: [x] `ConnectionStatus.jsx` renderiza `Badge` com variant/rótulo conforme status.
- T6: [x] `KdsPanel.jsx` implementa os dois `useEffect` (pedidos e conexão) com cleanup de
  assinatura, e os handlers que propagam a Promise para `PedidoCard` tratar.
- T7: [x] `index.js` reexporta apenas `KdsPanel`.
- T8: [x] Componentes usam exclusivamente `Card`/`Badge`/`Button`/`Navbar`/`ThemeToggle` de
  `src/ui/index.js` para a estrutura visual coberta por esses componentes; `<select>`/`<input>`
  brutos são usados apenas onde não existe componente base equivalente (mesmo padrão já aceito em
  `src/ui/panels/config/` na feature-12, que usa `<input>`/`<textarea>` crus da mesma forma).
- T9: [x] `tests/kds-panel-ui.test.js` contém os 14 casos descritos na task, todos presentes e
  batendo com a task.
- T10: [x] `./init.sh` executado nesta revisão: 168 testes passando (154 pré-existentes + 14
  novos), nenhuma regressão. `progress/impl_feature-13.md` documenta a tabela de rastreabilidade
  R1–R17.

Todas as tasks T1–T10 estão marcadas `[x]` em `specs/feature-13/tasks.md` e correspondem ao que
foi de fato implementado.

## Checkpoints
- C1: [x] Arquivos base presentes; `./init.sh` termina com exit code 0 (confirmado nesta revisão).
- C2: [x] Apenas feature-13 está `in_progress` em `feature_list.json`; `progress/current.md`
  reflete a sessão ativa.
- C3: [x] `src/ui/panels/kds/` segue exatamente a estrutura de domínio prevista (porta pública
  única em `index.js`); nenhuma dependência nova introduzida; sem `console.log` nem TODOs soltos.
- C4: [x] `tests/kds-panel-ui.test.js` cobre o módulo público `KdsPanel`; suíte completa roda
  verde (168 > 0).
- C5: [x] Nenhum arquivo suspeito não rastreado introduzido por esta feature; escopo de arquivos
  modificados/criados restrito a `src/ui/panels/kds/`, `tests/kds-panel-ui.test.js`,
  `specs/feature-13/tasks.md` e `progress/`.
- C6: [x] `specs/feature-13/` tem os 3 arquivos; `requirements.md` usa EARS estrito; todas as
  tasks `done` marcadas `[x]`; cada `R<n>` coberto por teste concreto.

## Verificações específicas adicionais

1. **Delegação em `localDataClient.js` (sem duplicar lógica de domínio):** confirmado por leitura
   direta — `listarPedidosAtivos` delega a `listarPedidosAtivosComTempoEspera` (exportada em
   `src/delivery/index.js:7`), `atualizarStatusPedido`/`atribuirMotoboy` delegam a
   `updateStatusPedido`/`atribuirMotoboy` (exportadas em `src/db/index.js:77-78`), e
   `getStatusConexaoWhatsApp`/`onConnectionStatusChange` delegam a `whatsappClient` (métodos
   `getConnectionStatus`/evento `"connection-status-changed"` confirmados em
   `src/whatsapp/client.js:20-64`). Nenhuma lógica de validação de domínio é reimplementada.

2. **As duas limitações aceitas estão implementadas exatamente como descrito:**
   `onPedidosChange` registra o callback e retorna `() => {}` sem nunca acioná-lo
   (`localDataClient.js:40-42`); a função de cancelamento de `onConnectionStatusChange` também é
   um `() => {}` no-op (`localDataClient.js:43-46`). Ambas documentadas com comentários claros no
   topo do arquivo (linhas 15-25), citando o motivo técnico (ausência de fonte de eventos em
   `src/db/`/`src/delivery/`, ausência de `off`/`removeListener` em `WhatsAppClient`) e o ponto de
   extensão (`feature-14`). Nenhuma tentativa de mascarar a limitação como funcional.

3. **Erros de transição/motoboy inválidos:** `PedidoCard.jsx` captura a rejeição em
   `try/catch` (linhas 37-55), exibe `erro.message` via `Badge variant="danger"` por card e
   reverte o valor exibido, sem reimplementar `TRANSICOES_PERMITIDAS` nem validação de motoboy —
   apenas replica a lista de status como opções de UI (`STATUS_PERMITIDOS`, linha 11-17),
   exatamente como a Decisão 3 do `design.md` prescreve.

4. **Uso exclusivo dos componentes base (R15/R16):** `KdsPanel.jsx` importa `Card`, `Navbar`,
   `ThemeToggle` de `../../index.js`; `PedidoCard.jsx` e `ConnectionStatus.jsx` importam
   `Badge`/`Button`/`Card` do mesmo caminho. Nenhum componente é importado de
   `src/ui/components/*` diretamente. `<select>`/`<input>` crus são usados apenas onde não existe
   componente de formulário no sistema de design (`src/ui/index.js` não exporta `Select`/`Input`),
   consistente com o padrão já aprovado em `src/ui/panels/config/ConfigForm.jsx` (feature-12).

5. **`dataClient` injetável e testes isolados:** `KdsPanel({ dataClient })` recebe a prop
   explicitamente (R17); `tests/kds-panel-ui.test.js` usa exclusivamente um fake criado no próprio
   arquivo de teste (`criarDataClientFake`), nunca importa `localDataClient.js`, não abre SQLite
   real, não instancia `createWhatsAppClient` nem toca IPC/filesystem/rede.

6. **`./init.sh`:** executado nesta revisão — 168 testes passando (13 arquivos de teste), exit
   code 0, sem regressão nas features 1–12.

7. **Escopo de arquivos:** nenhum arquivo de `src/db/`, `src/delivery/`, `src/whatsapp/`,
   `src/menu/`, `src/ai/` foi tocado por esta feature, conforme declarado em `design.md` e
   `progress/impl_feature-13.md`.

## Mudanças necessárias (se aplicável)
Nenhuma. Feature aprovada sem ressalvas.
