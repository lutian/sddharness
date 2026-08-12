# Requirements — feature-9: Integração Real com WhatsApp Web

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/whatsapp-adapter-real.test.js`, sem depender de rede real nem de
> escanear um QR Code de verdade (a biblioteca concreta é isolada/mockada
> no nível mais baixo possível — ver `design.md`). Mapeamento aos 4
> `acceptance` originais de `feature_list.json` ao final do documento.

## R1
O sistema DEVE expor uma função pública `createWhatsAppWebJsAdapter(options)`
em `src/whatsapp/adapters/whatsapp-web-js.js` que instancia a biblioteca
concreta de automação do WhatsApp Web e retorna um objeto que satisfaz
integralmente o contrato de `WhatsAppAdapter` documentado em
`src/whatsapp/adapter.js` (`on(evento, callback)`, `initialize()`,
`sendMessage(clienteId, texto)`).

## R2
QUANDO `createWhatsAppWebJsAdapter(options)` é chamado, o sistema DEVE
instanciar o cliente da biblioteca concreta passando as opções de sessão
persistente (diretório de dados local, ex.: `LocalAuth`/`dataPath`
equivalente) e as opções de navegador headless necessárias para rodar
dentro do processo `main` do Electron, sem exigir intervenção manual além
da leitura do QR Code.

## R3
QUANDO a biblioteca concreta, já instanciada pelo adapter, emite seu
evento nativo de QR Code, o adapter DEVE traduzir esse evento para o
evento `"qr"` do contrato (`WhatsAppAdapter`), repassando a string do QR
Code recebida sem alteração de conteúdo.

## R4
QUANDO a biblioteca concreta emite seu evento nativo de falha de
autenticação, o adapter DEVE traduzir esse evento para o evento
`"auth_failure"` do contrato, repassando o motivo (quando disponível) sem
lançar exceção não tratada.

## R5
QUANDO a biblioteca concreta emite seu evento nativo de sessão pronta
(autenticada com sucesso), o adapter DEVE traduzir esse evento para o
evento `"ready"` do contrato.

## R6
QUANDO a biblioteca concreta emite seu evento nativo de desconexão de uma
sessão previamente autenticada, o adapter DEVE traduzir esse evento para
o evento `"disconnected"` do contrato.

## R7
QUANDO a biblioteca concreta emite seu evento nativo de mensagem recebida
de um cliente real, o adapter DEVE traduzir esse evento para o evento
`"message"` do contrato, emitindo um payload `{ clienteId, texto }` no
mesmo formato já consumido por `WhatsAppClient` (`src/whatsapp/client.js`,
feature-3), sem alterar a fila FIFO nem o restante do domínio
`src/whatsapp/`.

## R8
QUANDO `adapter.initialize()` é chamado, o sistema DEVE delegar a
inicialização real da conexão (abertura do navegador headless e início da
autenticação) ao método de inicialização da biblioteca concreta, e DEVE
propagar (rejeitar a Promise correspondente) qualquer erro síncrono ou
assíncrono levantado por essa inicialização, sem engoli-lo silenciosamente.

## R9
QUANDO `adapter.sendMessage(clienteId, texto)` é chamado, o sistema DEVE
delegar o envio à API de envio de mensagens da biblioteca concreta,
usando `clienteId` para resolver o destinatário no formato exigido por
essa biblioteca (ex.: `<numero>@c.us`), e DEVE retornar uma `Promise` que
resolve quando o envio é confirmado pela biblioteca ou rejeita se a
biblioteca reportar falha de envio.

## R10
SE `adapter.sendMessage(clienteId, texto)` for chamado antes de a sessão
estar pronta (evento `"ready"` ainda não emitido) ENTÃO o sistema DEVE
rejeitar a `Promise` retornada com `WhatsAppError`, e NÃO DEVE tentar
delegar o envio à biblioteca concreta nesse estado.

## R11
O sistema DEVE isolar toda referência direta à biblioteca concreta de
automação do WhatsApp Web dentro de
`src/whatsapp/adapters/whatsapp-web-js.js`; nenhum outro arquivo de
`src/whatsapp/` (`client.js`, `queue.js`, `index.js`) DEVE importar essa
biblioteca direta ou indiretamente.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                     | Coberto por                  |
|---------------------------------------------------------------------------------------------------------------------------------|---------------------------------|
| A implementação concreta do adapter conecta a uma sessão real do WhatsApp Web e expõe o QR Code de autenticação real.          | R1, R2, R3, R5, R8              |
| Mensagens reais recebidas de clientes são repassadas para a fila FIFO já implementada (feature-3) sem alteração do contrato do adapter. | R7, R11                         |
| Respostas geradas pelo motor de conversação (feature-5) são enviadas de volta ao cliente real via WhatsApp.                     | R9, R10                         |
| tests/whatsapp-adapter-real.test.js valida o adapter concreto contra o contrato já definido, isolando a biblioteca externa real. | R1, R3, R4, R5, R6, R7, R9, R10 (implementação de teste) |
