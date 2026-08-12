# Requirements — feature-14: Processo Principal Electron (Composition Root)

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/electron-main.test.js`, rodando em Node puro (ambiente `node` do
> Vitest, não `jsdom`), com o módulo `electron` inteiro e os módulos de
> domínio (`src/db`, `src/whatsapp`, `src/ai`, `src/delivery`, `src/menu`)
> mockados — ver `design.md`, "Estratégia de teste sem Electron real".
> Mapeamento aos 4 `acceptance` originais de `feature_list.json` ao final
> do documento.

## Observação sobre o escopo desta feature

Esta é a feature que amarra as features 1 a 13 num processo `main` real de
Electron. Ela não redefine nenhum contrato já aprovado (`dataClient` de
feature-12/13, `WhatsAppAdapter` de feature-3/9, adapters de IA/geocoder de
feature-10) — apenas os instancia, injeta e expõe via IPC. Duas limitações
documentadas explicitamente como pendentes nas features 12/13 são
resolvidas por esta feature: (a) `onPedidosChange` nunca autodisparado no
painel KDS; (b) cancelamento no-op de `onConnectionStatusChange` por falta
de `off` em `WhatsAppClient`.

## R1
QUANDO o Electron sinaliza que o app está pronto (`app.whenReady()`), o
sistema DEVE chamar `openDatabase()` (`src/db/index.js`) para abrir/criar o
banco SQLite antes de qualquer outra etapa de inicialização que dependa do
banco.

## R2
QUANDO o processo principal inicializa, o sistema DEVE instanciar o
adapter real de WhatsApp via `createWhatsAppWebJsAdapter({ dataPath })`
(`src/whatsapp/index.js`, feature-9) e criar o cliente de alto nível via
`createWhatsAppClient(adapter, { db })`, injetando o `db` aberto em R1.

## R3
QUANDO o processo principal inicializa, o sistema DEVE instanciar os
adapters reais de IA (`createOpenAiChatClient`, `createDeepSeekChatClient`,
`createOpenAiClient`, `createHttpMediaFetcher`, `createPdfConverter`,
`src/ai/index.js`, feature-10) usando as `apiKeys` lidas da configuração
persistida (`loadConfig`, `src/menu/index.js`), sem hardcodar nenhuma chave
de API no código-fonte.

## R4
QUANDO o processo principal inicializa, o sistema DEVE instanciar o
geocoder real via `createNominatimGeocoder()` (`src/delivery/index.js`,
feature-10).

## R5
QUANDO o processo principal termina a montagem das dependências (R1–R4), o
sistema DEVE chamar `whatsappClient.initialize()` para iniciar a conexão
real com o WhatsApp Web, sem exigir nenhuma chamada manual adicional.

## R6
QUANDO `whatsappClient` emite o evento `"message-processed"` com
`{ clienteId, texto, historico }`, o sistema DEVE chamar
`processarMensagemConversa` (`src/ai/index.js`) passando `db`, `clienteId`,
`mensagemCliente: texto`, os adapters de chat montados em R3, `config` e
`cardapio`, sem exigir nenhuma intervenção manual do operador.

## R7
QUANDO a chamada a `processarMensagemConversa` feita em R6 resolve com um
objeto contendo `resposta`, o sistema DEVE chamar
`whatsappClient.sendMessage(clienteId, resposta)` para enviar a resposta
gerada de volta ao cliente real, completando o fluxo WhatsApp → fila FIFO →
motor de conversação → resposta, sem intervenção manual.

## R8
SE a chamada a `processarMensagemConversa` (R6) ou a
`whatsappClient.sendMessage` (R7) rejeitar, ENTÃO o sistema DEVE capturar o
erro sem interromper o processo principal nem deixar uma rejeição de
Promise não tratada, e DEVE reportar o erro através de um canal IPC de
erro dedicado (`webContents.send`) em vez de `console.log`.

## R9
QUANDO a chamada a `processarMensagemConversa` (R6) resolve com
`pedidoRegistrado === true`, o sistema DEVE notificar todos os painéis
conectados de que a lista de pedidos mudou (evento de domínio "pedidos
mudaram"), sem exigir nenhuma ação manual do operador para que a mudança
seja propagada.

## R10
O sistema DEVE registrar um handler IPC no canal `"config:load-cardapio"`
que, quando invocado, retorna o resultado de `loadCardapio(cardapioPath)`
(`src/menu/index.js`).

## R11
O sistema DEVE registrar um handler IPC no canal `"config:load-config"`
que, quando invocado, retorna o resultado de `loadConfig(configPath)`
(`src/menu/index.js`).

## R12
O sistema DEVE registrar um handler IPC no canal `"config:save-config"`
que, quando invocado com um objeto `config`, chama
`saveConfig(configPath, config)` (`src/menu/index.js`); SE `saveConfig`
lançar (ex.: `InvalidConfigError`) ENTÃO o handler DEVE propagar essa
rejeição para o `invoke` correspondente no renderer, sem engolir o erro.

## R13
O sistema DEVE expor `src/ui/panels/config/ipcDataClient.js`, exportando
uma função que cria um `dataClient` cujo `loadCardapio`, `loadConfig` e
`saveConfig` chamam, respectivamente, os canais IPC `"config:load-cardapio"`,
`"config:load-config"` e `"config:save-config"` registrados em R10–R12,
satisfazendo exatamente o mesmo contrato de `dataClient` já consumido por
`ConfigPanel` (`src/ui/panels/config/ConfigPanel.jsx`, feature-12), sem
exigir nenhuma alteração nesse componente.

## R14
O sistema DEVE registrar um handler IPC no canal
`"kds:listar-pedidos-ativos"` que, quando invocado, retorna o resultado de
`listarPedidosAtivosComTempoEspera({ db, origem })`
(`src/delivery/index.js`).

## R15
O sistema DEVE registrar um handler IPC no canal
`"kds:atualizar-status-pedido"` que, quando invocado com `(id, novoStatus)`,
chama `updateStatusPedido(db, id, novoStatus)` (`src/db/index.js`), retorna
o pedido atualizado ao `invoke` correspondente e, em caso de sucesso,
aciona a mesma notificação de domínio "pedidos mudaram" definida em R9; SE
`updateStatusPedido` lançar (ex.: `InvalidStatusTransitionError`,
`InvalidOrderStatusError`, `OrderNotFoundError`) ENTÃO o handler DEVE
propagar essa rejeição sem acionar a notificação de domínio.

## R16
O sistema DEVE registrar um handler IPC no canal `"kds:atribuir-motoboy"`
que, quando invocado com `(id, motoboy)`, chama `atribuirMotoboy(db, id,
motoboy)` (`src/db/index.js`), retorna o pedido atualizado ao `invoke`
correspondente e, em caso de sucesso, aciona a mesma notificação de
domínio "pedidos mudaram" definida em R9; SE `atribuirMotoboy` lançar (ex.:
`InvalidMotoboyError`, `OrderNotFoundError`) ENTÃO o handler DEVE propagar
essa rejeição sem acionar a notificação de domínio.

## R17
O sistema DEVE registrar um handler IPC no canal
`"kds:status-conexao-whatsapp"` que, quando invocado, retorna o resultado
de `whatsappClient.getConnectionStatus()`.

## R18
QUANDO a notificação de domínio "pedidos mudaram" é acionada (por R9, R15
ou R16), o sistema DEVE recalcular a listagem via
`listarPedidosAtivosComTempoEspera({ db, origem })` e enviá-la, via
`webContents.send`, no canal `"kds:pedidos-changed"`, para todas as janelas
abertas.

## R19
QUANDO `whatsappClient` emite o evento `"connection-status-changed"` com
um novo status, o sistema DEVE repassar esse status, via
`webContents.send`, no canal `"kds:connection-status-changed"`, para todas
as janelas abertas.

## R20
O sistema DEVE expor `src/ui/panels/kds/ipcDataClient.js`, exportando uma
função que cria um `dataClient` cujo `listarPedidosAtivos`,
`atualizarStatusPedido`, `atribuirMotoboy` e `getStatusConexaoWhatsApp`
chamam, respectivamente, os canais IPC `"kds:listar-pedidos-ativos"`,
`"kds:atualizar-status-pedido"`, `"kds:atribuir-motoboy"` e
`"kds:status-conexao-whatsapp"` registrados em R14–R17, e cujo
`onPedidosChange`/`onConnectionStatusChange` assinam, respectivamente, os
canais `"kds:pedidos-changed"`/`"kds:connection-status-changed"` definidos
em R18/R19, satisfazendo exatamente o mesmo contrato de `dataClient` já
consumido por `KdsPanel` (`src/ui/panels/kds/KdsPanel.jsx`, feature-13),
sem exigir nenhuma alteração nesse componente.

## R21
QUANDO a função de cancelamento retornada por `onPedidosChange` ou por
`onConnectionStatusChange` do `dataClient` criado em R20 é chamada, o
sistema DEVE efetivamente parar de invocar o `callback` correspondente em
notificações futuras desse canal (cancelamento real, não um no-op).

## R22
O sistema DEVE adicionar um método `off(evento, callback)` ao objeto
retornado por `createWhatsAppClient` (`src/whatsapp/client.js`, feature-3)
que remove um listener previamente registrado via `on(evento, callback)`,
de forma aditiva — sem alterar a assinatura, o comportamento ou os eventos
já emitidos por `on`, `initialize`, `sendMessage` ou
`getConnectionStatus`.

## R23
QUANDO `off(evento, callback)` (R22) é chamado com um `callback`
previamente registrado via `on(evento, callback)` para o mesmo `evento`, o
sistema NÃO DEVE mais invocar esse `callback` quando esse `evento` for
emitido novamente, mas DEVE continuar invocando quaisquer outros callbacks
ainda registrados para esse mesmo `evento`.

## R24
O sistema DEVE expor, via `electron/preload.js` e
`contextBridge.exposeInMainWorld("electronAPI", ...)`, uma API restrita
contendo apenas `invoke(canal, ...args)` e `on(canal, callback)` (com
retorno de uma função de cancelamento); QUANDO `canal` não pertencer a uma
lista fixa de canais IPC conhecidos (os definidos em R10–R12, R14–R17,
R18, R19) ENTÃO o sistema NÃO DEVE encaminhar a chamada para
`ipcRenderer`.

## R25
O sistema DEVE declarar `"electron"` em `devDependencies` de
`package.json` e definir o campo `"main"` apontando para
`"electron/main.js"`.

## R26
O sistema DEVE estruturar `electron/main.js` de forma que suas funções de
composição (montagem de dependências, registro dos handlers IPC descritos
em R10–R17, ligação do fluxo de mensagens descrita em R6–R9) sejam
exportadas nomeadamente e invocáveis individualmente por um teste, sem
exigir que uma janela real do Electron seja aberta.

## R27
`tests/electron-main.test.js` DEVE mockar o módulo `electron` inteiro
(`app`, `BrowserWindow`, `ipcMain`, `session`) e os módulos de domínio
(`src/db`, `src/whatsapp`, `src/ai`, `src/delivery`, `src/menu`), de forma
que a execução da suíte de testes NÃO faça nenhuma chamada real a SQLite
em disco, a uma sessão real do WhatsApp Web, nem a rede real (OpenAI,
DeepSeek, Nominatim).

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                         | Coberto por                              |
|---------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------|
| O processo principal inicializa o banco SQLite, o cliente WhatsApp real e os adapters de IA/geocodificação reais na inicialização do app. | R1, R2, R3, R4, R5, R25                   |
| Mensagens reais recebidas fluem: WhatsApp → fila FIFO → motor de conversação → resposta enviada de volta ao cliente real, sem intervenção manual. | R6, R7, R8, R9                            |
| As interfaces React (painel de configuração e painel KDS) recebem e enviam dados reais via IPC, refletindo o estado real do banco/WhatsApp. | R10–R21, R22, R23, R24                    |
| tests/electron-main.test.js valida a lógica de inicialização e ligação dos módulos (composition root), isolando o runtime real do Electron. | R26, R27 (e implementação de teste de R1–R25) |
