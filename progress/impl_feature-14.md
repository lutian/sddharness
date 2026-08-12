# Implementação — feature-14: Processo Principal Electron (Composition Root)

## Arquivos criados

- `electron/main.js` — composition root: `resolvePaths`, `buildDependencies`,
  `createMainWindow`, `registerIpcHandlers`, `wireConversationFlow`,
  `startApp`.
- `electron/preload.js` — `contextBridge.exposeInMainWorld("electronAPI", ...)`
  com lista fixa de canais permitidos.
- `src/ui/panels/config/ipcDataClient.js` — `createIpcDataClient()` real via
  IPC, espelhando `localDataClient.js` (feature-12).
- `src/ui/panels/kds/ipcDataClient.js` — `createIpcDataClient()` real via
  IPC, espelhando `localDataClient.js` (feature-13), com cancelamento real
  em `onPedidosChange`/`onConnectionStatusChange`.
- `tests/electron-main.test.js` — suíte completa mockando `electron` +
  os 5 módulos de domínio (20 testes, após correções da revisão — ver
  "Correções pós-revisão" abaixo).

## Arquivos modificados

- `package.json` — `"electron": "^33.0.0"` em `devDependencies`, campo
  `"main": "electron/main.js"`.
- `src/whatsapp/client.js` — adição aditiva de `off(evento, callback)` ao
  objeto retornado por `createWhatsAppClient` (nenhuma outra chave/
  comportamento alterado).
- `tests/whatsapp-queue.test.js` — novo teste `"remove um listener
  registrado via off sem afetar outros listeners do mesmo evento"`.
- `specs/feature-14/tasks.md` — todas as T1–T30 marcadas `[x]` (T29 e T30
  ficaram incorretamente `[ ]` na primeira rodada; corrigidas nesta
  revisão — ver "Correções pós-revisão").

## Rastreabilidade R<n> → teste

| Requisito | Cobertura de teste |
|---|---|
| R1 (openDatabase antes de outras etapas) | `tests/electron-main.test.js` — `"buildDependencies monta db, config, cardápio, adapters de IA, geocoder e cliente WhatsApp na ordem esperada"` |
| R2 (adapter + client WhatsApp injetando db) | mesmo teste acima — `createWhatsAppWebJsAdapter`/`createWhatsAppClient` verificados |
| R3 (adapters de IA reais via config) | mesmo teste acima — `createOpenAiChatClient`/`createDeepSeekChatClient`/etc. com `apiKey` de `config.apiKeys` |
| R4 (geocoder real) | mesmo teste acima — `createNominatimGeocoder` |
| R5 (`whatsappClient.initialize()` ao final da montagem) | `"startApp chama whatsappClient.initialize() após montar as dependências"` |
| R6 (message-processed → processarMensagemConversa) | `"uma mensagem processada aciona o motor de conversação e envia a resposta de volta ao cliente"` |
| R7 (resposta → sendMessage) | mesmo teste acima |
| R8 (erro capturado, reportado via onError, sem rejeição não tratada) | `"um erro no motor de conversação é reportado via callback de erro, sem derrubar o processo"` |
| R9 (pedidoRegistrado → notificação de domínio) | `"quando um pedido é registrado, o painel KDS é notificado da mudança via kds:pedidos-changed"` |
| R10 (`config:load-cardapio` retorna `loadCardapio(cardapioPath)`) | `"o handler config:load-cardapio, quando invocado, retorna o resultado de loadCardapio(cardapioPath) (R10)"` — invoca o handler capturado e verifica o valor retornado |
| R11 (`config:load-config` retorna `loadConfig(configPath)`) | `"o handler config:load-config, quando invocado, retorna o resultado de loadConfig(configPath) (R11)"` — invoca o handler capturado e verifica o valor retornado |
| R12 (`config:save-config`, propaga erro) | `"registra os sete canais IPC esperados"` (canal registrado) + `"config:save-config propaga o erro de validação lançado por saveConfig sem engoli-lo"` (handler invocado) |
| R13 (`ipcDataClient` de config espelha contrato) | `"delega loadCardapio/loadConfig/saveConfig aos canais IPC certos"` |
| R14 (`kds:listar-pedidos-ativos` retorna `listarPedidosAtivosComTempoEspera({ db, origem })`) | `"o handler kds:listar-pedidos-ativos, quando invocado, retorna o resultado de listarPedidosAtivosComTempoEspera({ db, origem }) (R14)"` — invoca o handler capturado e verifica o valor retornado |
| R15 (`kds:atualizar-status-pedido` + notificação) | `"o handler kds:atualizar-status-pedido atualiza o status e notifica a mudança de pedidos"` |
| R16 (`kds:atribuir-motoboy` + notificação) | `"o handler kds:atribuir-motoboy atribui o motoboy e notifica a mudança de pedidos"` |
| R17 (`kds:status-conexao-whatsapp` retorna `whatsappClient.getConnectionStatus()`) | `"o handler kds:status-conexao-whatsapp, quando invocado, retorna o resultado de whatsappClient.getConnectionStatus() (R17)"` — invoca o handler capturado e verifica o valor retornado |
| R18 (`kds:pedidos-changed` recalculado e enviado) | `"quando um pedido é registrado..."` + os dois testes de handler (R15/R16) |
| R19 (`kds:connection-status-changed` repassado) | `"uma mudança de status de conexão do WhatsApp é repassada ao painel KDS via kds:connection-status-changed"` |
| R20 (`ipcDataClient` do KDS espelha contrato) | `"delega os métodos de leitura/escrita aos canais IPC certos e retorna cancelamento real em onPedidosChange/onConnectionStatusChange"` |
| R21 (cancelamento real de onPedidosChange/onConnectionStatusChange) | mesmo teste acima — verifica que a função retornada é exatamente a de `window.electronAPI.on` e que, ao ser chamada, aciona o dublê de `removeListener` |
| R22 (`off` aditivo em `WhatsAppClient`) | `tests/whatsapp-queue.test.js` — `"remove um listener registrado via off sem afetar outros listeners do mesmo evento"` |
| R23 (`off` não afeta outros callbacks do mesmo evento) | mesmo teste acima + `tests/electron-main.test.js` — `"off(evento, callback) remove um listener registrado via on sem afetar outros callbacks do mesmo evento"` (módulo real, sem mock) |
| R24 (preload restrito, rejeita canal desconhecido) | `"expõe apenas invoke/on e rejeita canais fora da lista permitida"` |
| R25 (`electron` em devDependencies + `"main"`) | `"declara electron como devDependency e o campo main aponta para electron/main.js"` |
| R26 (funções de composição exportadas e testáveis individualmente) | `"as funções de composição são exportadas individualmente e chamáveis sem abrir uma janela Electron real"` (e, implicitamente, todos os outros testes que as invocam isoladamente) |
| R27 (nenhuma chamada real a SQLite/WhatsApp/rede nos testes) | garantido pelos `vi.mock("electron", ...)` e `vi.mock` dos 5 módulos de domínio no topo de `tests/electron-main.test.js` — nenhum teste desta suíte toca disco real (exceto leitura de `package.json`, que não é IO de domínio) nem rede |

## Resultado de `./init.sh`

189 testes passando em 14 arquivos (168 pré-existentes + 20 em
`tests/electron-main.test.js` + 1 novo em `tests/whatsapp-queue.test.js`).
Nenhuma regressão em `tests/whatsapp-queue.test.js` nem
`tests/whatsapp-adapter-real.test.js`.

## Correções pós-revisão (`progress/review_feature-14.md`, CHANGES_REQUESTED)

O reviewer apontou dois problemas na primeira rodada, ambos corrigidos
nesta sessão:

1. **Testes de R10, R11, R14 e R17 fracos.** O teste `"registra os sete
   canais IPC esperados"` só verificava que `ipcMain.handle` havia sido
   chamado com o nome do canal (`ipcMain._handlers.has(canal)`), sem
   nunca invocar o handler capturado para confirmar o valor retornado.
   Corrigido adicionando 4 novos testes em
   `tests/electron-main.test.js` — um para cada requisito — que:
   - capturam o handler via `electronMock.ipcMain._handlers.get(canal)`
     (o mesmo padrão já usado corretamente para R12/R15/R16);
   - invocam o handler com um evento fake (`{}`) e os argumentos
     esperados;
   - verificam tanto a chamada correta ao módulo de domínio mockado
     (`loadCardapio`, `loadConfig`, `listarPedidosAtivosComTempoEspera`,
     `whatsappClient.getConnectionStatus`) quanto o valor efetivamente
     retornado pelo handler.
   A tabela de rastreabilidade acima já reflete essa correção.

2. **T29 e T30 estavam `[ ]` em `specs/feature-14/tasks.md`, apesar de
   `progress/impl_feature-14.md` afirmar (incorretamente) que todas as
   T1–T30 já estavam `[x]`.** Verificado: o trabalho descrito por ambas
   já havia sido de fato realizado na rodada anterior (`./init.sh`
   verde com 185 testes, e a tabela de rastreabilidade acima já
   existia) — só os checkboxes não haviam sido atualizados. Marcadas
   `[x]` em `specs/feature-14/tasks.md` nesta sessão, e a afirmação
   incorreta sobre "todas as T1–T30 marcadas" foi corrigida acima, na
   seção "Arquivos modificados", para deixar claro que o erro existiu
   e foi corrigido.

Após essas correções, `./init.sh` foi executado novamente e os 189
testes passam (185 anteriores + 4 novos testes de R10/R11/R14/R17).

## Checklist de verificação manual pendente (Nível 3, fora do escopo automatizável)

Depende de runtime real do Electron, sessão real do WhatsApp Web,
credenciais reais de API e rede externa — não coberto por
`tests/electron-main.test.js` nem `./init.sh`. A ser executado pelo
usuário humano:

1. Colocar um `cardapio.json` válido e, opcionalmente, um `config.json` com
   chaves de API reais em `app.getPath("userData")` (ou preencher via painel
   de configuração após o primeiro `npm run dev`).
2. Rodar `npm run dev` e confirmar que a janela do Electron abre sem erros
   no console principal (DevTools).
3. Confirmar que um QR Code real aparece nos logs/evento `"qr"` (sem UI
   dedicada — fora do escopo desta feature) e escaneá-lo com um WhatsApp
   real.
4. Abrir o painel de configuração (feature-12) dentro da janela Electron e
   confirmar que carrega o cardápio/configuração reais via IPC (não a
   implementação local) e que salvar a configuração persiste de fato em
   `config.json`.
5. Abrir o painel KDS (feature-13) e confirmar que a listagem de pedidos
   ativos aparece com tempo de espera calculado, e que o indicador de
   conexão do WhatsApp reflete o status real.
6. Enviar uma mensagem de texto real via WhatsApp para o número conectado,
   confirmar que uma resposta real gerada pela IA chega de volta ao
   remetente, sem qualquer intervenção manual no processo.
7. Fechar um pedido através da conversa real (fluxo completo até
   `pedidoRegistrado: true`) e confirmar que o painel KDS aberto atualiza a
   lista de pedidos automaticamente, sem recarregar a página (validação de
   R9/R18).
8. No painel KDS, alterar o status de um pedido e atribuir um motoboy, e
   confirmar que a mudança persiste no banco real e é refletida
   imediatamente na UI.
9. Desconectar a sessão do WhatsApp (ex.: remover o aparelho conectado pelo
   celular) e confirmar que o indicador de conexão do painel KDS muda para
   "desconectado" em tempo real, sem recarregar a página (validação de R19).

## Observações

- Nenhuma inconsistência encontrada entre o spec (`specs/feature-14/`) e os
  contratos reais já `done` de feature-1 a feature-13 — todas as
  assinaturas (`openDatabase`, `createWhatsAppClient`,
  `createWhatsAppWebJsAdapter`, `processarMensagemConversa`,
  `listarPedidosAtivosComTempoEspera`, `updateStatusPedido`,
  `atribuirMotoboy`, `loadCardapio`, `loadConfig`, `saveConfig`,
  `localDataClient.js` de config/kds) batem exatamente com o que
  `design.md` descreve.
- Não marquei a feature como `done` em `feature_list.json` — aguardando o
  `reviewer`.
