# Design — feature-3: Conexão WhatsApp e Fila de Mensagens Sequencial

## Arquivos a criar

```
src/whatsapp/
├── index.js         # superfície pública do domínio (única importável de fora)
├── errors.js         # WhatsAppError e subtipos
├── client.js          # WhatsAppClient: orquestra adapter + fila + sessão
├── queue.js             # MessageQueue: fila FIFO com processamento sequencial e delay
└── adapter.js             # contrato do adapter (JSDoc) + adapter "no-op" de referência

tests/
└── whatsapp-queue.test.js   # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo fora de `src/whatsapp/` é tocado nesta feature.
`electron/main.js` (registro dos canais IPC que exporão o evento `"qr"`
ao painel React) e a biblioteca concreta de automação do WhatsApp Web
ficam para uma feature posterior que os exija explicitamente (feature-7,
painel administrativo, é quem efetivamente exibe o QR Code na tela).
`src/whatsapp/` reutiliza `src/db/index.js` (já pronto, `feature-1`, via
`upsertSessao`/`findClienteById`) para ler e escrever `sessoes`, sem
reimplementar acesso a SQLite.

## Decisão técnica central: isolar a biblioteca de WhatsApp atrás de um adapter injetável

### Alternativa escolhida

`WhatsAppClient` (em `src/whatsapp/client.js`) **não importa nenhuma
biblioteca concreta de automação do WhatsApp Web** (ex.:
`whatsapp-web.js`). Em vez disso, ele recebe um `adapter` por injeção de
dependência em `createWhatsAppClient(adapter)`. O `adapter` é um objeto
que satisfaz um contrato mínimo e estável, documentado em
`src/whatsapp/adapter.js`:

```javascript
// Contrato que qualquer adapter de biblioteca WhatsApp deve satisfazer.
// { on(evento, callback), initialize(), sendMessage(clienteId, texto) }
// Eventos emitidos pelo adapter: "qr", "ready", "auth_failure", "message".
```

`WhatsAppClient` se inscreve nos eventos do `adapter` (`on("qr", ...)`,
`on("message", ...)`, etc.) e traduz esses eventos para sua própria
superfície pública (também baseada em `EventEmitter` nativo do Node:
`node:events`), sem jamais expor o formato interno da biblioteca
concreta a quem consome `src/whatsapp/index.js`.

A biblioteca real de automação do WhatsApp Web (integração de fato com
um navegador headless) é adicionada em uma feature futura que crie um
adapter concreto (ex.: `src/whatsapp/adapters/whatsapp-web-js.js`)
implementando esse mesmo contrato — fora do escopo desta feature, cujo
foco é a fila FIFO, o isolamento de sessão e o encaminhamento do QR
Code/erros de autenticação.

**Justificativa:** `docs/architecture.md` (princípio 3) exige que toda
dependência externa nova seja justificada e não seja adicionada "por via
das dúvidas"; nesta feature ainda não há necessidade de rodar um
navegador headless real, já que o que precisa ser testável e correto
agora é a fila FIFO, o delay humanizado e o isolamento de sessão — nada
disso depende da biblioteca concreta. `docs/conventions.md` proíbe
chamar APIs externas reais (incluindo WhatsApp) a partir de testes e
prescreve interceptar na borda; o adapter injetável **é** essa borda: os
testes de `tests/whatsapp-queue.test.js` usam um adapter dublê (um
`EventEmitter` simples controlado pelo teste, que dispara `"message"`,
`"qr"` etc. manualmente), sem depender de rede, navegador ou WhatsApp
real. Isso também respeita "sem IO no renderer" e evita subir um
Chromium dentro do processo de teste, o que seria lento e instável em
CI.

### Alternativa descartada

**Importar `whatsapp-web.js` (ou biblioteca equivalente) diretamente
dentro de `src/whatsapp/client.js`, mockando o módulo inteiro nos
testes com `vi.mock`.** É descartada por três razões: (1)
`docs/conventions.md` já prescreve "nada de mocks do sistema de
arquivos" e, por extensão de espírito, o padrão de verificação deste
projeto (`docs/verification.md`, Nível 2) prefere exercitar o módulo
real contra uma borda controlada em vez de simular internamente uma
biblioteca inteira com `vi.mock` — isso tende a testar a suposição do
autor sobre a biblioteca, não o comportamento real do sistema; (2)
acoplar `WhatsAppClient` a uma biblioteca concreta tornaria o domínio
`src/whatsapp/` impossível de testar sem baixar/mockar um pacote pesado
(que depende de Puppeteer/Chromium) só para validar uma regra de
negócio local (fila FIFO, delay, isolamento de sessão) que não tem
relação alguma com o driver de automação escolhido; (3) adiar a escolha
da biblioteca concreta para uma feature posterior (quando a conexão real
com o WhatsApp Web for de fato implementada) mantém esta feature restrita
ao que o `acceptance` pede — QR Code exibido, fila sequencial e
recuperação de histórico — sem introduzir uma dependência pesada
(`docs/architecture.md`, princípio 3) antes da hora.

## Assinaturas novas (`src/whatsapp/index.js`)

```javascript
// Cria o cliente WhatsApp de alto nível a partir de um adapter injetado
// (ver contrato em adapter.js). Não conecta nada real por si só — quem
// chama decide quando iniciar (`client.initialize()`, delegado ao adapter).
export function createWhatsAppClient(adapter, options)
// options: { db, minDelayMs = 1000, maxDelayMs = 3000 }
// -> WhatsAppClient (EventEmitter com eventos "qr", "error", "message-processed")

// Fila FIFO de processamento sequencial com delay humanizado entre itens.
// Pode ser usada isoladamente (fora de WhatsAppClient) nos testes de fila pura.
export function createMessageQueue(options)
// options: { minDelayMs = 1000, maxDelayMs = 3000, processFn }
// -> MessageQueue com enqueue(mensagem) e eventos "processed", "error"
```

## Exceções (`src/whatsapp/errors.js`)

```javascript
export class WhatsAppError extends Error {}
export class AuthenticationError extends WhatsAppError {}
```

Seguindo `docs/conventions.md`: uma classe base por módulo
(`WhatsAppError`) e subtipos concretos. Falhas de processamento de uma
mensagem individual (R7) não interrompem a fila; são reportadas via
evento `"error"`, não via exceção lançada síncrona (a fila roda de forma
assíncrona/desacoplada do chamador de `enqueue`), consistente com "não
retornar `null`/`undefined` silenciosamente" — aqui o equivalente é "não
engolir o erro silenciosamente": ele é sempre emitido.

## `MessageQueue` — forma interna (`src/whatsapp/queue.js`)

```javascript
export function createMessageQueue({ minDelayMs = 1000, maxDelayMs = 3000, processFn }) {
  // fila interna: array em memória, FIFO estrito (push no fim, shift no início)
  // enqueue(mensagem) -> adiciona ao fim e dispara o loop de processamento
  //   se ele não estiver rodando ainda (_processing flag booleana).
  // loop interno: while (fila.length) { shift -> await processFn(item) ->
  //   captura exceção e emite "error" -> await delay aleatório entre
  //   minDelayMs e maxDelayMs -> repete }
}
```

O processamento sequencial (R5) é garantido por um único loop
`while`/`await` guardado por uma flag `_processing`: uma segunda chamada
a `enqueue` enquanto o loop já está ativo apenas adiciona à fila (`push`)
e retorna, sem disparar um segundo loop concorrente. Isso evita qualquer
condição de corrida sem precisar de mutex externo.

## Isolamento de sessão (R8, R9, R10, R11)

`WhatsAppClient` recebe `options.db` (o handle já aberto por
`openDatabase`, de `src/db/index.js`). Ao processar uma mensagem
`{ clienteId, texto }` retirada da fila, `WhatsAppClient`:

1. Busca a sessão atual do cliente via uma leitura em `sessoes` filtrada
   por `cliente_id` (reutilizando a tabela de `feature-1`; se
   necessário, uma pequena função de leitura `findSessaoByClienteId(db,
   clienteId)` é adicionada a `src/db/sessoes.js` nesta feature — a
   única exceção à regra "não tocar fora de `src/whatsapp/`", já
   justificada porque é uma leitura simétrica ao `upsertSessao`
   existente e pertence ao mesmo domínio de persistência).
2. Se não existir sessão para esse `clienteId` (R9), trata como
   `historico: null`/vazio — nunca lança exceção e nunca reaproveita o
   histórico de outro `clienteId` (R10), porque a busca é sempre
   filtrada estritamente por `cliente_id`, sem cache global
   compartilhado entre clientes.
3. Repassa `{ clienteId, texto, historico }` para a função de
   processamento (`processFn`) injetada — o conteúdo de IA (feature-5)
   ainda não existe nesta etapa; para esta feature, `processFn` padrão
   apenas emite o evento público `"message-processed"` com esse
   contexto, permitindo que os testes verifiquem o isolamento (R10) e a
   ordem por cliente (R11) sem depender de nenhuma lógica de IA futura.

O isolamento entre clientes (R11 — ordem relativa preservada por
`clienteId` dentro da ordem FIFO global) é uma consequência direta de a
fila ser um único array ordenado por chegada: como nada reordena os
itens por `clienteId`, a ordem relativa de cada cliente é preservada
trivialmente pela FIFO global. O teste correspondente intercalará
mensagens de dois `clienteId` e verificará a ordem de processamento
resultante.

## Delay humanizado (R6)

`_delay(minDelayMs, maxDelayMs)` interno de `queue.js` usa
`Math.random()` para escolher um valor no intervalo e
`await new Promise(resolve => setTimeout(resolve, ms))`. Nos testes,
`minDelayMs`/`maxDelayMs` são configurados para valores baixos
(ex.: `1`–`2` ms) via `options`, evitando testes lentos sem precisar de
fake timers — mantendo a recomendação de `docs/verification.md` de não
mockar o comportamento real, apenas ajustar seus parâmetros para um
teste rápido e determinístico o suficiente (a asserção de R6 verifica
que existe algum atraso mensurável entre o fim de um processamento e o
início do seguinte, não um valor exato).

## Alternativa de estrutura descartada

Considerou-se implementar a fila como parte do próprio `WhatsAppClient`
(um único arquivo/classe), em vez de separar `MessageQueue` em
`queue.js`. É descartada porque a fila FIFO com delay é uma
responsabilidade independente e reutilizável (poderia, em tese, servir
outra origem de mensagens no futuro), e separá-la permite testá-la
isoladamente sem precisar instanciar um `WhatsAppClient` inteiro — em
linha com `docs/conventions.md` ("os detalhes de IO/lógica ficam em
arquivos separados dentro do mesmo diretório, o `index.js` orquestra").
