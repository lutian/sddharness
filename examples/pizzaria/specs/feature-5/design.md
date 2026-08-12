# Design — feature-5: Motor de Conversação com OpenAI e DeepSeek

> **Nota de correção (2026-08-11):** a seção "Ordem de operações dentro de
> `processarMensagemConversa`" e o "Rastreamento de dados parciais do
> cliente" foram revisados após bloqueio do `implementer`
> (`progress/impl_feature-5.md`): `clienteId` recebido pela função é o
> **telefone** do cliente (entrada externa, vinda do WhatsApp), mas
> `findSessaoByClienteId`/`upsertSessao` (feature-1, já `done`) exigem o
> **id interno** (`clientes.id`), conforme `src/db/schema.js`
> (`sessoes.cliente_id INTEGER REFERENCES clientes(id)`) e o uso já `done`
> em `src/whatsapp/client.js`/`tests/whatsapp-queue.test.js`. A correção
> reordena o fluxo: o motor resolve/cria o cliente por telefone **antes**
> de tocar em sessão, e usa o id interno resultante em toda chamada a
> `findSessaoByClienteId`/`upsertSessao`. Nenhum contrato de
> `src/db/sessoes.js` nem de `src/whatsapp/` foi alterado.

## Visão geral

Esta feature entrega o **orquestrador de IA generativa** descrito em
`docs/architecture.md` para `src/ai/` ("orquestração OpenAI/DeepSeek, Whisper,
visão") — o motor de conversação propriamente dito, que decide qual modelo
usar, monta o contexto (system prompt + cardápio + histórico), aciona o
adapter de IA e persiste no banco (`src/db/`) os efeitos colaterais da
conversa: sessão atualizada, dados do cliente coletados e, no fechamento,
o pedido estruturado.

Não é uma feature de UI nem de integração de rede real: assim como
feature-4, toda chamada a um modelo de linguagem acontece atrás de um
adapter injetável, nunca via SDK concreto importado por `src/ai/`.

## Arquivos a criar/alterar

```
src/ai/
├── chatClient.js         # NOVO — contrato (JSDoc) do adapter de chat/LLM injetável
├── modelSelector.js       # NOVO — selectChatClient(adapters, config)
├── conversationEngine.js    # NOVO — processarMensagemConversa (orquestração completa)
├── errors.js                 # ALTERADO — + MissingApiKeyError, ChatCompletionError,
│                              #   IncompleteOrderDataError
└── index.js                    # ALTERADO — reexporta os símbolos novos acima

src/db/
├── clientes.js            # ALTERADO — + updateCliente(db, id, campos)
└── index.js                 # ALTERADO — reexporta updateCliente

src/menu/
└── config.js               # ALTERADO — + campo modeloSelecionado ("openai" | "deepseek")
                             #   em getDefaultConfig/loadConfig/_validarConfig

tests/
└── conversation-engine.test.js   # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo de `src/whatsapp/` ou `src/ui/` é tocado nesta feature. A
fiação entre a fila de mensagens do WhatsApp (`src/whatsapp/`, já `done`) e
`processarMensagemConversa` — isto é, chamar o motor a partir do
`processFn` da fila e usar `client.sendMessage` para devolver `resposta` ao
cliente — fica para uma feature de integração posterior (ou para
`electron/main.js`), fora do escopo do `acceptance` desta feature, que pede
apenas que a IA "utilize o modelo selecionado", "identifique intenção,
colete dados" e "gere um registro estruturado de pedido". Este motor entrega
uma função pública pronta para ser chamada por quem orquestra o fluxo
ponta a ponta, recebendo `clienteId` (o **telefone** do cliente, formato
bruto vindo do WhatsApp — não o id interno de `clientes.id`) e
`mensagemCliente`. Internamente, o motor resolve o id interno do cliente
(`clientes.id`) a partir desse telefone **antes** de consultar ou
persistir qualquer sessão (ver "Ordem de operações" abaixo), e é esse id
interno — não o telefone — que é passado a `findSessaoByClienteId`/
`upsertSessao` (`src/db/sessoes.js`, feature-1, já `done`), no mesmo
formato de identificador já usado por `src/whatsapp/client.js` (id
interno, não telefone).

## Por que `src/ai/` e não um domínio novo

`docs/architecture.md` já descreve `src/ai/` como "orquestração
OpenAI/DeepSeek, Whisper, visão" — o motor de conversação é exatamente essa
orquestração, não um domínio de negócio novo. Criar `src/conversation/`
duplicaria a responsabilidade já atribuída a `src/ai/` e contrariaria o
princípio "não introduza um domínio novo até que exista uma feature
concreta que o exija" — aqui a feature concreta exige apenas estender o
domínio já existente.

## Decisão técnica central: isolar o LLM de chat atrás de um adapter injetável (`chatClient`)

### Alternativa escolhida

Assim como `aiClient` (Whisper/visão, feature-4) e `mediaFetcher`, o motor
de conversação nunca importa o SDK `openai` nem qualquer SDK da DeepSeek.
Em vez disso, recebe por injeção um objeto `adapters = { openai, deepseek }`,
onde cada valor satisfaz o contrato documentado em `src/ai/chatClient.js`:

```javascript
// @typedef {object} ChatClientAdapter
// @property {(params: {
//   systemPrompt: string,
//   cardapio: object,
//   historico: Array<{ autor: "cliente" | "assistente", texto: string }>,
//   mensagemCliente: string,
// }) => Promise<{
//   resposta: string,
//   dadosCliente?: { nome?: string, endereco?: string, formaPagamento?: string },
//   pedido?: { itens: Array<{ nome: string, quantidade: number, preco: number }>, fechado: boolean },
// }>} generateReply
```

A responsabilidade de interpretar linguagem natural (identificar intenção de
compra, extrair nome/endereço/forma de pagamento, decidir quando o pedido
está "fechado") é do **adapter concreto** (que envolve a chamada real à
OpenAI ou à DeepSeek, usando prompt engineering/JSON mode/function calling —
detalhe de implementação de uma feature de integração real, fora deste
escopo). O motor (`conversationEngine.js`) só conhece o contrato acima:
monta o parâmetro de entrada, chama `generateReply` e decide o que fazer
com a saída estruturada (persistir sessão, cliente, pedido).

**Justificativa:** reaplica o mesmo padrão já aprovado em
`src/ai/client.js` (feature-4) e `src/whatsapp/adapter.js` (feature-3).
Permite que `tests/conversation-engine.test.js` exercite o motor real com
dublês determinísticos de `adapters.openai`/`adapters.deepseek` (funções
`async` que resolvem valores fixos), sem rede, sem SDK real, sem
credenciais — em linha com `docs/conventions.md` ("as chamadas de rede são
interceptadas na borda... nunca se bate na API real a partir de um teste")
e com `docs/architecture.md` ("segredos fora da árvore de fontes... os
testes usam valores fictícios").

### Alternativa descartada 1 — Importar os SDKs `openai` e `deepseek` diretamente em `src/ai/` e usar `vi.mock(...)` nos testes

Descartada pelas mesmas três razões já documentadas em
`specs/feature-4/design.md` para o SDK `openai`: (1) `vi.mock` tende a
testar a suposição do autor sobre o SDK, não o comportamento real do
domínio; (2) acoplaria `src/ai/` a dois SDKs concretos, tornando o motor
impossível de testar sem chaves de API válidas; (3) adiar a escolha do SDK
concreto, dos parâmetros de prompt e do formato exato de function
calling/JSON mode para a feature de integração real mantém esta feature
restrita ao que o `acceptance` pede — seleção de modelo, orquestração do
contexto, extração e persistência — sem introduzir uma dependência de rede
antes da hora.

### Alternativa descartada 2 — Inferir o modelo a partir de qual `apiKey` está preenchida, em vez de um campo explícito `modeloSelecionado`

Cogitou-se não adicionar nenhum campo novo a `src/menu/config.js` e, em vez
disso, inferir o modelo ativo observando quais chaves de API
(`config.apiKeys.openai`/`config.apiKeys.deepseek`) estão preenchidas.
Descartada porque: (1) o `acceptance` desta feature exige explicitamente "o
modelo selecionado **no painel**" — uma escolha explícita do operador, não
uma inferência; (2) a inferência é ambígua quando ambas as chaves estão
preenchidas (cenário plausível: o operador testa os dois provedores antes
de decidir), sem um critério de desempate confiável; (3) um campo explícito
é trivialmente testável (R1, R2) e não exige heurística. Por isso esta
feature estende `getDefaultConfig()`/`loadConfig()`/`saveConfig()` (de
`src/menu/config.js`, já `done` em feature-2) com um campo
`modeloSelecionado: "openai" | "deepseek"`, padrão `"openai"`, seguindo o
mesmo formato de merge raso e validação (`_validarConfig`) já usado para
`imageEnabled`/`audioEnabled`. É uma extensão aditiva e retrocompatível:
configurações salvas antes desta feature (sem o campo) continuam
carregando normalmente, assumindo `"openai"` como padrão via merge com
`getDefaultConfig()`.

### Alternativa descartada 3 — Adicionar uma coluna `forma_pagamento` à tabela `pedidos` (`src/db/schema.js`)

Cogitou-se estender o schema de `pedidos` (feature-1, já `done`) com uma
coluna dedicada para a forma de pagamento. Descartada porque: (1)
`insertPedido` já aceita qualquer estrutura serializável em `itens` — não
há necessidade de alterar o schema para satisfazer o `acceptance` ("gera um
registro estruturado"), já que "estruturado" se refere ao conteúdo JSON, não
a colunas SQL adicionais; (2) alterar o schema de uma tabela já em produção
(mesmo que hipotética, dado o estágio do projeto) exigiria uma estratégia
de migração para bancos já existentes, que `ensureSchema` (baseado em
`CREATE TABLE IF NOT EXISTS`) não cobre — introduzir isso aqui extrapolaria
o escopo desta feature; (3) manter a forma de pagamento dentro do payload
de `itens` (ver seção seguinte) é suficiente para R12 e mantém `src/db/`
alterado apenas pela adição estritamente necessária (`updateCliente`).
Se uma feature futura precisar consultar a forma de pagamento de forma
performática (índice, filtro SQL), a migração de schema pode ser revisitada
então, com sua própria justificativa.

## Payload de `itens` no fechamento do pedido (R12)

`conversationEngine.js` chama `insertPedido(db, { clienteId: cliente.id,
itens: payload, status: "recebido", motoboy: null })`, onde:

```javascript
const payload = {
  lista: pedido.itens,                                  // array vindo do adapter
  formaPagamento: dadosCliente?.formaPagamento ?? null,  // pode já ter sido coletada em turnos anteriores
};
```

`insertPedido` (feature-1) já serializa qualquer valor de `itens` via
`JSON.stringify`, sem validar sua forma interna — `payload` acima satisfaz
esse contrato sem exigir nenhuma alteração em `src/db/pedidos.js`. Note que
`formaPagamento` pode ter sido coletada em uma mensagem anterior à que
fecha o pedido; o motor lê o valor mais recente a partir do cliente
persistido (ver "Rastreamento de dados parciais do cliente" abaixo), não
apenas do turno atual — porém, como `formaPagamento` **não** é uma coluna
de `clientes` (ver Alternativa descartada 3), ela não é persistida entre
turnos pelo banco: o motor a repassa turno a turno a partir do
`dadosCliente` mais recente informado pelo adapter. Cabe ao adapter
concreto (fora do escopo desta feature) reincluir a forma de pagamento já
coletada no `dadosCliente` de cada resposta subsequente, já que ele recebe
o histórico completo da conversa em `historico` e pode extraí-la de lá
novamente quando necessário para fechar o pedido.

## Resolução do cliente por telefone antes da sessão (R4)

Antes de qualquer chamada a `findSessaoByClienteId`/`upsertSessao`, o motor
resolve (ou cria) o registro básico do cliente a partir do telefone
(`clienteId` recebido):

```javascript
// src/ai/conversationEngine.js (trecho — primeiro passo após selectChatClient)
let cliente = findClienteByTelefone(db, clienteId);
if (!cliente) {
  cliente = insertCliente(db, { telefone: clienteId }); // nome/endereco ficam null
}
// cliente.id é o id interno usado daqui em diante em findSessaoByClienteId/upsertSessao
```

Esta resolução é incondicional (independe de a mensagem trazer
`dadosCliente` ou não) porque `findSessaoByClienteId`/`upsertSessao`
exigem um id interno válido (`clientes.id`) já existente no banco — não
há como consultar/persistir sessão para um cliente que ainda não tem
registro em `clientes`. Por isso, mesmo mensagens que não coletam nenhum
dado do cliente (ex.: "oi", "quais sabores vocês têm?") resultam em um
registro básico de cliente (telefone apenas, demais campos `null`) sendo
criado na primeira mensagem desse telefone.

## Rastreamento de dados parciais do cliente (R10, R11)

`nome` e `endereco` **são** colunas de `clientes` e por isso persistem entre
turnos no banco (ao contrário de `formaPagamento`). Como o cliente básico
já foi resolvido/criado no passo anterior (R4), o tratamento de
`dadosCliente` nesta etapa é **sempre uma atualização**, nunca uma criação:

```javascript
// src/ai/conversationEngine.js (trecho — após upsertSessao)
if (respostaAdapter.dadosCliente) {
  cliente = updateCliente(db, cliente.id, respostaAdapter.dadosCliente);
}
// se dadosCliente estiver ausente, `cliente` permanece o registro básico
// resolvido em R4, sem nenhuma chamada a updateCliente (R11)
```

`updateCliente` (novo, `src/db/clientes.js`) faz um `UPDATE` parcial: só
altera as colunas cujo valor foi informado (`undefined` não sobrescreve o
valor já salvo), usando `COALESCE(@campo, coluna)` por campo — o mesmo
espírito de "normaliza `undefined -> null` antes do INSERT" já usado em
`insertCliente`, mas preservando (em vez de nulificar) quando o campo não
vem nesta chamada:

```javascript
// src/db/clientes.js (novo)
export function updateCliente(db, id, { nome, endereco, latitude, longitude } = {}) {
  const stmt = db.prepare(`
    UPDATE clientes SET
      nome = COALESCE(@nome, nome),
      endereco = COALESCE(@endereco, endereco),
      latitude = COALESCE(@latitude, latitude),
      longitude = COALESCE(@longitude, longitude)
    WHERE id = @id
  `);
  stmt.run({ id, nome: nome ?? null, endereco: endereco ?? null, latitude: latitude ?? null, longitude: longitude ?? null });
  return findClienteById(db, id);
}
```

Esta função já era antecipada na nota de design de feature-1
("`insertCliente`/uma futura `updateClienteEndereco`... para persistir o
resultado" da geocodificação) — `updateCliente` generaliza esse plano para
qualquer campo parcial, e será reaproveitada por feature-6 (geocodificação)
para gravar `latitude`/`longitude` sem depender desta feature.

## Assinaturas novas

### `src/ai/chatClient.js`
Apenas o contrato JSDoc (`ChatClientAdapter`), sem exportar símbolos de
runtime (`export {}`), no mesmo padrão de `src/ai/client.js`.

### `src/ai/modelSelector.js`
```javascript
// Seleciona o adapter de chat a usar (openai por padrão) a partir de
// config.modeloSelecionado. Lança MissingApiKeyError se a apiKey do modelo
// escolhido estiver ausente/vazia.
export function selectChatClient(adapters, config)
// -> ChatClientAdapter
```

### `src/ai/conversationEngine.js`
```javascript
// Processa uma mensagem de um cliente através do motor de conversação:
// seleciona o modelo, resolve/cria o cliente por telefone (obtendo o id
// interno), monta o contexto (system prompt + cardápio + histórico da
// sessão do id interno), chama o adapter, persiste sessão/cliente/pedido
// conforme a resposta estruturada.
export async function processarMensagemConversa({
  db,
  clienteId, // telefone do cliente (formato de entrada externo, vindo do WhatsApp)
  mensagemCliente,
  adapters,
  config,
  cardapio,
})
// -> Promise<{ resposta: string, pedidoRegistrado: boolean, clienteId: string }>
// clienteId no retorno é o mesmo telefone recebido na entrada, não o id
// interno do cliente resolvido internamente.
```

### `src/db/clientes.js`
```javascript
// Atualiza parcialmente um cliente existente (só altera os campos
// informados; undefined preserva o valor já salvo).
export function updateCliente(db, id, { nome, endereco, latitude, longitude } = {})
// -> { id, telefone, nome, endereco, latitude, longitude, criado_em }
```

### `src/menu/config.js`
```javascript
// getDefaultConfig() passa a incluir:
{ ..., modeloSelecionado: "openai" }

// loadConfig(path) passa a fazer merge do campo:
modeloSelecionado: salvo.modeloSelecionado ?? padrao.modeloSelecionado

// _validarConfig(config) passa a validar:
// modeloSelecionado deve ser "openai" ou "deepseek"
```

## Exceções (`src/ai/errors.js`, acrescidas)

```javascript
export class MissingApiKeyError extends AiError {}
export class ChatCompletionError extends AiError {}
export class IncompleteOrderDataError extends AiError {}
```

Seguindo `docs/conventions.md`: subtipos concretos da mesma base `AiError`
já usada por feature-4, mantendo uma única hierarquia de erros para todo o
domínio `src/ai/`. `ChatCompletionError` recebe a causa original
(`{ cause: erroOriginal }`), no mesmo padrão de `AudioTranscriptionError`/
`ImageDescriptionError`.

## Ordem de operações dentro de `processarMensagemConversa` (resumo)

1. `selectChatClient(adapters, config)` — lança `MissingApiKeyError` cedo,
   antes de qualquer leitura no banco (R3).
2. Resolve/cria o cliente por telefone: `findClienteByTelefone(db,
   clienteId)`; se não existir, `insertCliente(db, { telefone: clienteId
   })` (demais campos `null`). O `cliente.id` (id interno) resultante é
   usado em todos os passos seguintes que envolvem sessão/pedido (R4).
   Este passo acontece **antes** de qualquer chamada a
   `findSessaoByClienteId`/`upsertSessao`, e antes mesmo da chamada ao
   adapter de chat, já que o contexto de sessão depende do id interno.
3. `findSessaoByClienteId(db, cliente.id)` → decodifica `historico` (JSON)
   ou usa `[]` se não houver sessão (R6, R7).
4. `client.generateReply({ systemPrompt: config.systemPrompt, cardapio,
   historico, mensagemCliente })` (R5); falha vira `ChatCompletionError`
   (R9), interrompendo antes de `upsertSessao`/`updateCliente`/
   `insertPedido` (o cliente básico resolvido no passo 2, se recém-criado,
   permanece no banco — isso não é "persistir sessão nem pedido").
5. `upsertSessao(db, { clienteId: cliente.id, historico: ... })` com o
   histórico + mensagem do cliente + resposta (R8).
6. Se `dadosCliente` presente: `updateCliente(db, cliente.id,
   dadosCliente)`, atualizando `cliente` com o retorno (R10). Caso
   contrário, `cliente` permanece o registro básico do passo 2, sem
   nenhuma chamada a `updateCliente` (R11).
7. Se `pedido?.fechado === true`: exige que o `cliente` resolvido tenha
   `nome` **e** `endereco` preenchidos (do passo 2/6 combinados) — se não
   tiver, lança `IncompleteOrderDataError` (R14); caso tenha, monta o
   payload de `itens` e chama `insertPedido` associado a `cliente.id`
   (R12). Caso contrário, não insere pedido (R13).
8. Retorna `{ resposta, pedidoRegistrado, clienteId }`, onde `clienteId`
   é o telefone original recebido na chamada, não `cliente.id` (R15).

## Alternativa de estrutura descartada

Considerou-se implementar toda a lógica acima em uma única função dentro de
`src/ai/index.js`, sem os arquivos `chatClient.js`/`modelSelector.js`/
`conversationEngine.js` separados. Descartada pelo mesmo motivo já registrado
em `specs/feature-4/design.md`: `docs/conventions.md` prescreve manter
"os detalhes de IO/lógica em arquivos internos separados dentro do mesmo
domínio"; separar o contrato do adapter (`chatClient.js`), a seleção de
modelo (`modelSelector.js`, testável isoladamente para R1/R2/R3) e a
orquestração completa (`conversationEngine.js`) segue o padrão já usado em
`audio.js`/`image.js`/`pdf.js`/`conversation.js` desta mesma pasta.
