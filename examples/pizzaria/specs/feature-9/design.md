# Design — feature-9: Integração Real com WhatsApp Web

## Arquivos a criar / tocar

```
src/whatsapp/
├── adapters/
│   └── whatsapp-web-js.js   # NOVO — adapter concreto (única fronteira com a lib real)
├── adapter.js                # NÃO MODIFICADO — continua sendo apenas o contrato (JSDoc)
├── client.js                  # NÃO MODIFICADO — já consome qualquer adapter injetado
├── queue.js                    # NÃO MODIFICADO
├── errors.js                    # NÃO MODIFICADO (WhatsAppError já existe e é reutilizado, R10)
└── index.js                      # MODIFICADO — reexporta `createWhatsAppWebJsAdapter`

electron/main.js                   # MODIFICADO (fora de src/, mas necessário para uso real) —
                                    # instancia o adapter concreto via createWhatsAppWebJsAdapter()
                                    # e injeta em createWhatsAppClient(adapter, { db }), no lugar
                                    # do adapter dublê usado nos testes de feature-3.

package.json                        # MODIFICADO — nova dependência `whatsapp-web.js`

tests/
└── whatsapp-adapter-real.test.js  # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo de `src/whatsapp/client.js`, `queue.js` ou `errors.js` é
alterado: o contrato de `feature-3` (já `done` e testado em
`tests/whatsapp-queue.test.js`) permanece intocado, conforme exige o
`acceptance` #2 desta feature ("sem alteração do contrato do adapter").

## Biblioteca escolhida: `whatsapp-web.js`

### Alternativa escolhida e justificativa

Adotamos [`whatsapp-web.js`](https://wwebjs.dev/) (pacote npm
`whatsapp-web.js`, que usa Puppeteer/Chromium para automatizar uma sessão
real do WhatsApp Web em um navegador headless).

Justificativa:

1. **Aderência direta ao contrato já existente.** `whatsapp-web.js` expõe
   uma API baseada em eventos (`client.on("qr", ...)`,
   `client.on("ready", ...)`, `client.on("auth_failure", ...)`,
   `client.on("disconnected", ...)`, `client.on("message", ...)`) e
   métodos (`client.initialize()`, `client.sendMessage(chatId, texto)`)
   que mapeiam quase 1:1 para o contrato de `src/whatsapp/adapter.js`
   definido em `feature-3` — minimizando a tradução necessária e o risco
   de bugs na camada de adapter.
2. **Persistência de sessão pronta para uso desktop.** A estratégia de
   autenticação `LocalAuth` grava a sessão em disco (em
   `app.getPath("userData")`, alinhado a `docs/architecture.md` princípio
   5 — segredos/sessão fora da árvore de fontes), permitindo reconectar
   sem escanear o QR Code a cada reinício do app — requisito implícito de
   uma aplicação desktop de produção rodando dentro do Electron.
3. **Maturidade e cobertura de recursos.** É a biblioteca Node.js mais
   madura e documentada para automação do WhatsApp Web via navegador,
   com suporte ativo a mensagens de texto, mídia e grupos, cobrindo o que
   `feature-3` e `feature-5` já pressupõem (mensagens de texto simples
   por enquanto).

### Alternativa descartada: Baileys

[Baileys](https://github.com/WhiskeySockets/Baileys) conecta-se
diretamente ao protocolo do WhatsApp via WebSocket (multi-device), sem
depender de um navegador headless. Foi avaliada e descartada para esta
feature pelos seguintes trade-offs:

- **Prós do Baileys** (reconhecidos, mas não decisivos aqui): não exige
  Chromium/Puppeteer embutido (reduz o tamanho final do instalador
  gerado em `feature-8`) e tende a ser mais leve em CPU/memória.
- **Contras que pesaram na decisão:** (1) Baileys implementa o protocolo
  binário do WhatsApp por engenharia reversa e historicamente quebra com
  mais frequência a cada mudança do protocolo, exigindo atualizações mais
  ágeis do que este projeto tem capacidade de acompanhar; (2) sua API é
  estruturalmente mais distante do modelo de eventos simples que
  `src/whatsapp/adapter.js` já define — exigiria mais lógica de tradução
  dentro do adapter (ex.: reconstrução manual de eventos de mensagem a
  partir de estruturas de baixo nível do protocolo), aumentando a
  superfície de bugs nesta feature sem nenhum requisito do `acceptance`
  que justifique essa complexidade extra agora; (3) `docs/architecture.md`
  (princípio 3) pede que a dependência escolhida seja a mais direta para
  o que a feature exige — aqui, "enviar/receber mensagem de texto e QR
  Code", que `whatsapp-web.js` cobre com uma API já alinhada ao contrato.
  Uma futura feature pode reavaliar a troca para Baileys se o tamanho do
  instalador (`feature-8`) se tornar um problema real medido, mas essa
  reavaliação fica fora do escopo desta feature.

### Dependência declarada

`package.json` ganha `"whatsapp-web.js"` em `dependencies` (a biblioteca
já inclui `puppeteer` como dependência transitiva; nenhuma dependência
adicional de Chromium é instalada manualmente por esta feature).

## Assinatura nova (`src/whatsapp/adapters/whatsapp-web-js.js`)

```javascript
// Adapter concreto que satisfaz o contrato de WhatsAppAdapter
// (src/whatsapp/adapter.js) usando a biblioteca whatsapp-web.js.
// Única fronteira do domínio src/whatsapp/ que importa a lib real (R11).
export function createWhatsAppWebJsAdapter(options)
// options: { dataPath, puppeteerOptions } (dataPath: diretório de sessão
//   persistente, ex.: path.join(app.getPath("userData"), "whatsapp-session");
//   puppeteerOptions: repassado ao Puppeteer subjacente, ex.: { headless: true })
// -> WhatsAppAdapter (objeto simples, não EventEmitter público — expõe
//    apenas on/initialize/sendMessage, como já documentado em adapter.js)
```

Internamente, `createWhatsAppWebJsAdapter`:

1. Instancia `new Client({ authStrategy: new LocalAuth({ dataPath }),
   puppeteer: puppeteerOptions })` de `whatsapp-web.js` (import nomeado
   `{ Client, LocalAuth }`).
2. Mantém um `EventEmitter` interno (`node:events`) só para reexpor os
   eventos traduzidos via `on(evento, callback)` — a mesma técnica já
   usada em `client.js` (feature-3), mantendo homogeneidade
   (`docs/conventions.md`).
3. Assina os eventos nativos do `client` da lib (`client.on("qr", ...)`,
   `client.on("ready", ...)`, `client.on("auth_failure", ...)`,
   `client.on("disconnected", ...)`, `client.on("message", ...)`) e
   traduz cada um para o evento correspondente do contrato, conforme R3
   a R7.
4. `initialize()` chama `client.initialize()` da lib e retorna a mesma
   Promise (ou a envolve em uma, se a lib expuser callback), propagando
   rejeições (R8).
5. `sendMessage(clienteId, texto)`:
   - SE a sessão ainda não estiver `"ready"` (flag interna `pronta`,
     setada em `true` no evento nativo `ready` e `false` em
     `disconnected`/antes da inicialização), rejeita imediatamente com
     `new WhatsAppError("Sessão do WhatsApp ainda não está pronta.")`
     sem chamar a lib (R10).
   - Caso contrário, resolve `clienteId` para o formato de "chat id"
     exigido pela lib (ex.: `` `${clienteId}@c.us` `` quando `clienteId`
     ainda não contém o sufixo `@c.us`) e chama
     `client.sendMessage(chatId, texto)`, retornando a Promise resultante
     (R9).
6. Tradução do payload de mensagem recebida (R7): o evento nativo
   `"message"` da lib entrega um objeto `Message` com `.from` (ex.:
   `"5511999999999@c.us"`) e `.body` (texto). O adapter extrai o
   `clienteId` removendo o sufixo `@c.us` de `.from` e emite
   `"message"` com `{ clienteId, texto: mensagemNativa.body }` —
   exatamente o formato já consumido por `WhatsAppClient.adapter.on(
   "message", ...)` em `client.js` (feature-3), sem exigir nenhuma
   mudança nesse arquivo.

## Reexport (`src/whatsapp/index.js`)

```javascript
export { createWhatsAppWebJsAdapter } from "./adapters/whatsapp-web-js.js";
```

Mantido junto aos exports já existentes (`createWhatsAppClient`,
`createMessageQueue`, `WhatsAppError`, `AuthenticationError`), preservando
`src/whatsapp/index.js` como única superfície pública do domínio
(`docs/conventions.md`).

## Exceções

Nenhuma classe de erro nova é necessária. R10 reutiliza `WhatsAppError`
(já definida em `src/whatsapp/errors.js`, feature-3) — não `AuthenticationError`,
porque "sessão não pronta" é uma condição de uso indevido do adapter
(chamar `sendMessage` cedo demais), não uma falha de autenticação
reportada pela biblioteca.

## Estratégia de teste sem rede real (decisão técnica central)

`tests/whatsapp-adapter-real.test.js` **não pode** abrir um navegador
Chromium real nem depender de escanear um QR Code — isso quebraria
`./init.sh` em CI (`docs/architecture.md`, "Não chame APIs externas reais
... a partir de testes"; `docs/verification.md`, Nível 1/2 e antipadrões).

A estratégia adotada é mockar o pacote `whatsapp-web.js` inteiro no nível
do módulo, usando `vi.mock("whatsapp-web.js", ...)` no topo do arquivo de
teste, substituindo `Client` e `LocalAuth` por dublês controlados pelo
teste:

```javascript
vi.mock("whatsapp-web.js", () => {
  class FakeClient extends EventEmitter {
    initialize() { return Promise.resolve(); }
    sendMessage(chatId, texto) { return Promise.resolve({ id: "fake" }); }
  }
  class FakeLocalAuth {}
  return { Client: FakeClient, LocalAuth: FakeLocalAuth };
});
```

Isso é uma exceção deliberada e justificada à regra geral de
`docs/conventions.md` ("nada de mocks... interceptar na borda HTTP"): a
"borda" aqui não é HTTP simples, é o construtor de uma biblioteca de
terceiros que internamente sobe um Chromium — não há uma borda HTTP
única e estável para interceptar (Puppeteer fala com o Chromium via
protocolo DevTools, não uma API REST simples). Mockar o **construtor da
lib** (`Client`, `LocalAuth`) é o nível mais baixo possível que ainda
permite validar 100% do código que este `spec` escreve
(`whatsapp-web-js.js`), sem validar o código interno da biblioteca em si
(que não é responsabilidade desta feature nem deste projeto testar). Essa
escolha é análoga à já registrada em `docs/conventions.md`/`docs/architecture.md`
para OpenAI/Nominatim: interceptar no ponto de entrada mais próximo da
fronteira externa.

Com esse dublê, os testes:

- Verificam que `createWhatsAppWebJsAdapter({ dataPath, puppeteerOptions
  })` instancia `Client` com um objeto contendo `authStrategy` (instância
  de `LocalAuth` construída com `{ dataPath }`) e `puppeteer:
  puppeteerOptions` (R1, R2).
- Disparam `fakeClient.emit("qr", "QR-STRING")` e verificam que o adapter
  emite `"qr"` com `"QR-STRING"` (R3).
- Disparam `fakeClient.emit("auth_failure", "motivo")` e verificam que o
  adapter emite `"auth_failure"` com esse motivo, sem lançar (R4).
- Disparam `fakeClient.emit("ready")` e verificam que o adapter emite
  `"ready"` (R5).
- Disparam `fakeClient.emit("disconnected", "MOTIVO")` e verificam que o
  adapter emite `"disconnected"` (R6).
- Disparam `fakeClient.emit("message", { from: "5511999999999@c.us", body:
  "oi" })` e verificam que o adapter emite `"message"` com
  `{ clienteId: "5511999999999", texto: "oi" }` (R7).
- Espionam `fakeClient.initialize` (`vi.spyOn`) e verificam que
  `adapter.initialize()` delega a ela e propaga uma rejeição quando o
  dublê rejeita (R8).
- Espionam `fakeClient.sendMessage` e, após emitir `"ready"`, verificam
  que `adapter.sendMessage("5511999999999", "oi")` delega para
  `fakeClient.sendMessage("5511999999999@c.us", "oi")` (R9).
- Verificam que `adapter.sendMessage(...)` chamado **antes** de `"ready"`
  ser emitido rejeita com `WhatsAppError` e que `fakeClient.sendMessage`
  NÃO é chamado (R10).
- Verificam, por inspeção estática/import, que `src/whatsapp/client.js`,
  `queue.js` e `index.js` não importam `whatsapp-web.js` (R11) — via
  leitura do conteúdo-fonte desses arquivos no teste (`fs.readFileSync`)
  e asserção de que a string `"whatsapp-web.js"` não aparece neles, uma
  vez que o teste unitário de import estático já é garantido pelo próprio
  `tests/whatsapp-queue.test.js` de feature-3 continuar passando sem
  alterações.

## Fora do escopo automatizável (verificação manual)

Os seguintes comportamentos dependem de uma sessão real do WhatsApp Web e
**não são** cobertos por `tests/whatsapp-adapter-real.test.js` nem por
`./init.sh`. Ficam registrados aqui como checklist de verificação manual
(Nível 3, `docs/verification.md`) a ser executado pelo usuário humano
após a aprovação e implementação desta feature:

1. Rodar `npm run dev` para abrir a aplicação desktop (Electron).
2. Confirmar que um QR Code real aparece na tela da aplicação (via o
   evento `"qr"` já roteado por `feature-7`, painel administrativo).
3. Escanear o QR Code com o WhatsApp de um celular real (Configurações →
   Aparelhos conectados → Conectar um aparelho).
4. Confirmar que o status de conexão exibido muda para "conectado" (evento
   `"connection-status-changed"` já implementado em `client.js`).
5. Enviar, de outro número real, uma mensagem de teste (ex.: "oi") para o
   número conectado.
6. Confirmar que a mensagem aparece processada pelo motor de conversação
   (feature-5) e que uma resposta real chega de volta no WhatsApp do
   número que enviou a mensagem de teste.
7. Fechar e reabrir `npm run dev` e confirmar que a sessão reconecta sem
   pedir um novo QR Code (validação informal da persistência via
   `LocalAuth`/`dataPath`).

Esse roteiro não gera nenhum artefato de teste automatizado — é
documentado aqui para que o humano saiba exatamente o que verificar antes
de considerar a integração real "funcionando de fato" em produção.

## Alternativa de estrutura descartada

Considerou-se colocar o adapter concreto diretamente em `client.js`
(fundindo orquestração e biblioteca concreta em um único arquivo). Foi
descartada pelas mesmas razões já registradas no `design.md` de
feature-3: manter a biblioteca concreta isolada em
`src/whatsapp/adapters/whatsapp-web-js.js` preserva `client.js` e
`queue.js` livres de qualquer dependência pesada (Puppeteer/Chromium),
mantendo `tests/whatsapp-queue.test.js` (feature-3, já `done`) rápido e
sem qualquer necessidade de mock de biblioteca externa — só
`tests/whatsapp-adapter-real.test.js` (esta feature) precisa pagar o
custo de mockar `whatsapp-web.js`.
