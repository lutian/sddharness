# Design — feature-10: Integração Real com OpenAI, DeepSeek e Nominatim

## Arquivos a criar / tocar

```
src/ai/
├── adapters/
│   ├── openai-chat.js       # NOVO — createOpenAiChatClient (ChatClientAdapter, R1-R4)
│   ├── deepseek-chat.js      # NOVO — createDeepSeekChatClient (ChatClientAdapter, R5-R7)
│   ├── openai-client.js       # NOVO — createOpenAiClient (AiClientAdapter, R8-R11)
│   ├── http-media-fetcher.js   # NOVO — createHttpMediaFetcher (MediaFetcher, R12-R15)
│   └── pdf-converter.js         # NOVO — createPdfConverter (PdfConverter, R16-R18)
├── chatClient.js             # NÃO MODIFICADO — continua sendo apenas o contrato (JSDoc)
├── client.js                  # NÃO MODIFICADO — continua sendo apenas o contrato (JSDoc)
├── media.js                    # NÃO MODIFICADO — continua sendo apenas o contrato (JSDoc)
├── pdfConverter.js               # NÃO MODIFICADO — continua sendo apenas o contrato (JSDoc)
├── modelSelector.js                # NÃO MODIFICADO
├── conversationEngine.js             # NÃO MODIFICADO
├── audio.js / image.js / pdf.js       # NÃO MODIFICADOS
├── conversation.js                      # NÃO MODIFICADO
├── errors.js                              # NÃO MODIFICADO
└── index.js                                # MODIFICADO — reexporta os 5 `create*` acima

src/delivery/
├── adapters/
│   └── nominatim.js          # NOVO — createNominatimGeocoder (GeocoderAdapter, R19-R23)
├── geocoder.js                 # NÃO MODIFICADO — continua sendo apenas o contrato (JSDoc)
├── geocoding.js                  # NÃO MODIFICADO
├── errors.js                       # NÃO MODIFICADO
└── index.js                          # MODIFICADO — reexporta `createNominatimGeocoder`

package.json                          # MODIFICADO — novas dependências `openai` e `mupdf`

tests/
├── ai-adapters-real.test.js          # (será escrito pelo implementer, NÃO por este agente)
└── geocoder-real.test.js               # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo de `src/ai/chatClient.js`, `client.js`, `media.js`,
`pdfConverter.js`, `modelSelector.js`, `conversationEngine.js`,
`audio.js`, `image.js`, `pdf.js`, `conversation.js`, nem de
`src/delivery/geocoder.js`, `geocoding.js` é alterado: os contratos já
aprovados e testados nas features 4, 5 e 6 (todas `done`) permanecem
intocados, conforme os `acceptance` #1/#2 desta feature ("respeitando os
contratos já definidos"). `electron/main.js` (composition root) ainda não
existe neste repositório — a fiação real (ler `config.apiKeys` de
`src/menu/config.js` e passá-las como `options.apiKey` aos construtores
abaixo) é responsabilidade explícita de feature-14 ("Processo Principal
Electron"), que já lista feature-10 como pré-requisito. Esta feature
entrega os construtores prontos para receber `apiKey` por injeção; não
inventa nenhuma leitura de `src/menu/` dentro de `src/ai/`/`src/delivery/`,
preservando o mesmo padrão de injeção já usado em toda a base
(`openDatabase(path)`, `createWhatsAppClient(adapter, options)`,
`selectChatClient(adapters, config)`).

## Biblioteca escolhida para chat/Whisper/visão: SDK `openai`

### Alternativa escolhida e justificativa

Adotamos o pacote npm oficial [`openai`](https://www.npmjs.com/package/openai)
para os três adapters de IA generativa (`openai-chat.js`,
`openai-client.js`) e, por compatibilidade de API, também para o adapter
DeepSeek (`deepseek-chat.js`).

Justificativa:

1. **Aderência direta aos contratos já existentes.** O SDK `openai`
   expõe `client.chat.completions.create(...)` e
   `client.audio.transcriptions.create(...)` com uma API baseada em
   Promise que mapeia 1:1 para `ChatClientAdapter.generateReply` e
   `AiClientAdapter.transcribeAudio`/`describeImage`, minimizando a
   lógica de tradução na camada de adapter — o mesmo raciocínio já usado
   em `specs/feature-9/design.md` para `whatsapp-web.js`.
2. **DeepSeek expõe uma API compatível com o formato OpenAI.** A
   documentação pública da DeepSeek (`https://api.deepseek.com`) declara
   compatibilidade com o formato de requisição/resposta da API de chat
   completions da OpenAI; por isso, `deepseek-chat.js` reutiliza o mesmo
   SDK `openai`, apenas sobrescrevendo `baseURL` para
   `"https://api.deepseek.com"` e `apiKey` para a chave da DeepSeek, em
   vez de adicionar um segundo SDK/dependência dedicado à DeepSeek. Isso
   reduz a superfície de dependências novas (`docs/architecture.md`,
   princípio 3) sem abrir mão de nenhum requisito do `acceptance`.
3. **Suporte oficial a JSON mode e a `File`/buffers para Whisper.** O SDK
   cobre diretamente os dois usos exigidos por feature-4/feature-5:
   `response_format: { type: "json_object" }` para obter
   `{ resposta, dadosCliente?, pedido? }` estruturado do modelo de chat, e
   `toFile(buffer, filename)`/similar para submeter áudio a
   `audio.transcriptions.create`.

### Alternativa descartada: implementar as chamadas HTTP "na mão" com `fetch`

Cogitou-se não adicionar o SDK `openai` e, em vez disso, montar as
requisições HTTP diretamente contra `https://api.openai.com/v1/...`
usando `fetch` nativo (mesma estratégia escolhida abaixo para
mídia/Nominatim). Descartada porque: (1) o SDK oficial já resolve
detalhes não triviais e sujeitos a mudança sem aviso (streaming,
multipart para upload de áudio, `retry`/backoff de rate limit, formatos
de erro), que teriam que ser reimplementados e mantidos manualmente; (2)
a API de chat/Whisper da OpenAI é significativamente mais rica que a de
Nominatim (que é uma única rota `GET` simples) — o custo de manter uma
integração "na mão" não se paga aqui como se paga para Nominatim; (3)
`docs/architecture.md` (princípio 3) permite dependências externas desde
que justificadas: o SDK oficial é mantido pelo próprio provedor,
reduzindo o risco de quebra silenciosa em relação a uma implementação
própria.

## Biblioteca escolhida para mídia e Nominatim: `fetch` nativo do Node

`http-media-fetcher.js` e `nominatim.js` usam o `fetch` global disponível
nativamente a partir do Node 18+ (`docs/architecture.md`: "Runtime:
Node.js 20+"), sem nenhuma dependência nova de cliente HTTP.

Justificativa: ambos os usos são requisições `GET` simples (baixar um
binário por URL; consultar um único endpoint JSON do Nominatim), sem
necessidade de recursos avançados (retry automático, interceptors,
streaming complexo) que justificariam adicionar `axios`/`node-fetch`/
`got` como dependência — `docs/architecture.md` (princípio 3) pede para
não adicionar dependência "por via das dúvidas". Isso também alinha-se
com a nota já registrada em `specs/feature-4/design.md` ("um adapter de
mídia concreto... fora do escopo daquela feature") e com
`docs/conventions.md` ("interceptar na borda HTTP... com um dublê de
`fetch`").

### Alternativa descartada: `axios`

Descartada por não agregar nenhuma capacidade necessária para os dois
usos acima (nenhum interceptor, nenhuma configuração de proxy, nenhum
cancelamento complexo é exigido pelos requirements desta feature) e por
introduzir uma dependência de execução adicional sem justificativa
concreta, contrariando `docs/architecture.md` (princípio 3).

## Biblioteca escolhida para conversão de PDF: `mupdf` (WASM)

### Alternativa escolhida e justificativa

Adotamos [`mupdf`](https://www.npmjs.com/package/mupdf) — o binding
oficial em WebAssembly da biblioteca MuPDF (Artifex) para Node.js — em
`pdf-converter.js`.

Justificativa:

1. **Sem dependência nativa compilada.** `mupdf` roda inteiramente via
   WASM: não exige `node-gyp`, um binário de sistema pré-compilado nem
   `canvas` (que por sua vez depende de `Cairo`/`Pango` nativos). Isso é
   decisivo para `feature-8`/`feature-14`, que empacotam esta aplicação
   como instalador nativo Windows via Electron — dependências nativas
   compiladas são a fonte mais comum de falhas de empacotamento
   multiplataforma em projetos Electron (arquitetura/ABI do binário
   nativo precisa casar exatamente com a versão do Electron usada no
   build), enquanto um módulo WASM roda igual em qualquer plataforma
   suportada pelo runtime V8 embutido no Electron.
2. **Renderização de página em bitmap é exatamente o que o contrato
   exige.** `mupdf` expõe uma API para carregar um documento a partir de
   um `Buffer`, obter uma página por índice e renderizá-la em um
   `Pixmap`/PNG diretamente — cobrindo `convertFirstPageToImage` sem
   nenhuma etapa intermediária adicional.
3. **Mantida pelo fabricante da biblioteca de referência do ecossistema
   PDF.** MuPDF é amplamente usada (inclusive por `pdf.js`/outros
   projetos como referência de corretude), reduzindo o risco de a
   biblioteca escolhida ficar sem manutenção.

### Alternativa descartada: `pdfjs-dist` + `canvas`

`pdfjs-dist` (a biblioteca de renderização de PDF usada pelo próprio
Firefox) é a opção mais popular no ecossistema Node para converter
páginas de PDF em imagem, mas fora do navegador ela exige um `canvas`
concreto para desenhar o conteúdo rasterizado — tipicamente o pacote npm
`canvas`, que compila bindings nativos para Cairo. Foi avaliada e
descartada para esta feature pelos seguintes trade-offs:

- **Prós do `pdfjs-dist`+`canvas`** (reconhecidos, mas não decisivos
  aqui): ecossistema maior, mais exemplos disponíveis, motor de
  renderização usado em produção pelo Firefox.
- **Contras que pesaram na decisão:** (1) `canvas` é uma dependência
  nativa compilada (Cairo/Pango/libjpeg/libpng), historicamente frágil em
  pipelines de build multiplataforma e um risco direto para o
  empacotamento Windows de `feature-8`/`feature-14` — exatamente o
  problema que a escolha de `mupdf` evita; (2) `pdfjs-dist` por si só
  (sem `canvas`) não resolve o requisito sozinho: seria necessário somar
  duas dependências (`pdfjs-dist` + `canvas`) contra uma única (`mupdf`)
  para o mesmo resultado; (3) nenhum requisito desta feature (apenas
  "converter a primeira página em imagem") exige recursos específicos do
  `pdfjs-dist` (ex.: extração de texto/formulários) que `mupdf` não
  ofereça. Uma futura feature pode reavaliar `pdfjs-dist` se surgir uma
  necessidade concreta (ex.: extrair texto selecionável do PDF, não
  apenas renderizar), fora do escopo desta feature.

### Dependências declaradas

`package.json` ganha `"openai"` e `"mupdf"` em `dependencies`. Nenhuma
dependência de cliente HTTP é adicionada (usa-se `fetch` nativo do Node,
já disponível no runtime do projeto).

## Assinaturas novas

### `src/ai/adapters/openai-chat.js`
```javascript
// Adapter concreto que satisfaz ChatClientAdapter (src/ai/chatClient.js)
// usando o SDK `openai` (chat completions, JSON mode).
export function createOpenAiChatClient(options)
// options: { apiKey, model? } (model, padrão "gpt-4o-mini")
// -> ChatClientAdapter — { generateReply({ systemPrompt, cardapio, historico, mensagemCliente }) }
```

### `src/ai/adapters/deepseek-chat.js`
```javascript
// Adapter concreto que satisfaz ChatClientAdapter usando o SDK `openai`
// apontado para a API compatível da DeepSeek (baseURL customizada).
export function createDeepSeekChatClient(options)
// options: { apiKey, model? } (model, padrão "deepseek-v4-flash")
// -> ChatClientAdapter
```

### `src/ai/adapters/openai-client.js`
```javascript
// Adapter concreto que satisfaz AiClientAdapter (src/ai/client.js)
// usando o SDK `openai` (Whisper + modelo de visão).
export function createOpenAiClient(options)
// options: { apiKey, transcriptionModel?, visionModel? }
//   (transcriptionModel padrão "whisper-1"; visionModel padrão "gpt-4o-mini")
// -> AiClientAdapter — { transcribeAudio(audio), describeImage(imagem) }
```

### `src/ai/adapters/http-media-fetcher.js`
```javascript
// Adapter concreto que satisfaz MediaFetcher (src/ai/media.js) usando o
// fetch nativo do Node.
export function createHttpMediaFetcher(options)
// options: {} (reservado; nenhuma opção obrigatória nesta feature)
// -> MediaFetcher — { download(media) }
```

### `src/ai/adapters/pdf-converter.js`
```javascript
// Adapter concreto que satisfaz PdfConverter (src/ai/pdfConverter.js)
// usando a biblioteca `mupdf` (WASM).
export function createPdfConverter(options)
// options: { scale? } (scale, padrão 2 — fator de resolução do bitmap renderizado)
// -> PdfConverter — { convertFirstPageToImage(pdf) }
```

### `src/delivery/adapters/nominatim.js`
```javascript
// Adapter concreto que satisfaz GeocoderAdapter (src/delivery/geocoder.js)
// usando o fetch nativo do Node contra a API pública do Nominatim.
export function createNominatimGeocoder(options)
// options: { baseUrl?, userAgent? }
//   (baseUrl padrão "https://nominatim.openstreetmap.org/search";
//    userAgent padrão identificando esta aplicação, exigido pela política
//    de uso do Nominatim)
// -> GeocoderAdapter — { geocode(endereco) }
```

## Comportamento interno de cada adapter (mapeamento a R<n>)

1. **`openai-chat.js`**: `createOpenAiChatClient({ apiKey, model })` valida
   `apiKey` (R24) e instancia `new OpenAI({ apiKey })` (import nomeado
   `{ OpenAI }` de `"openai"`). `generateReply({ systemPrompt, cardapio,
   historico, mensagemCliente })` monta `messages` = `[{ role: "system",
   content: systemPrompt + JSON.stringify(cardapio) }, ...historico.map(h
   => ({ role: h.autor === "cliente" ? "user" : "assistant", content:
   h.texto })), { role: "user", content: mensagemCliente }]` e chama
   `client.chat.completions.create({ model, messages, response_format: {
   type: "json_object" } })` (R2). Faz `JSON.parse(resposta.choices[0]
   .message.content)`; se o parse falhar ou o objeto resultante não tiver
   `resposta` (string), lança `new Error(...)` descritivo (R4). Não
   envolve a chamada ao SDK em `try/catch` — uma rejeição da chamada
   propaga naturalmente (R3).
2. **`deepseek-chat.js`**: idêntico a `openai-chat.js`, exceto que
   instancia `new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" })`
   e usa `model` padrão `"deepseek-v4-flash"` (R5–R7). Nome do modelo
   definido pelo dono do produto como `"deepseek-v4-flash"` (decisão de
   configuração específica deste projeto/conta, não uma verificação de
   documentação pública genérica) — corrigido nesta revisão pontual do
   spec (feature-10 reaberta após `done`) a partir de `"deepseek-chat"`,
   valor desatualizado usado na redação original.
3. **`openai-client.js`**: `createOpenAiClient({ apiKey,
   transcriptionModel, visionModel })` valida `apiKey` (R24) e instancia
   `new OpenAI({ apiKey })`. `transcribeAudio({ buffer, filename,
   mimeType })` chama `client.audio.transcriptions.create({ model:
   transcriptionModel ?? "whisper-1", file: await toFile(buffer,
   filename) })` (usando o helper `toFile` exportado pelo próprio SDK
   `openai`) e retorna `resposta.text` (R9). `describeImage({ buffer,
   mimeType })` chama `client.chat.completions.create({ model: visionModel
   ?? "gpt-4o-mini", messages: [{ role: "user", content: [{ type:
   "image_url", image_url: { url: \`data:${mimeType};base64,
   ${buffer.toString("base64")}\` } }] }] })` e retorna
   `resposta.choices[0].message.content` (R10). Nenhuma das duas funções
   envolve a chamada em `try/catch` (R11).
4. **`http-media-fetcher.js`**: `download(media)` lança
   `new Error("media.url é obrigatório")` de imediato se `media?.url` não
   estiver definido, sem chamar `fetch` (R15). Caso contrário, chama
   `await fetch(media.url)`; se `resposta.ok` for `false`, lança um erro
   descritivo incluindo `resposta.status` (R14); caso contrário, lê
   `await resposta.arrayBuffer()`, converte para `Buffer.from(...)` e
   retorna `{ buffer, mimeType: resposta.headers.get("content-type") ||
   media.mimeType }` (R13). Uma rejeição de rede do próprio `fetch` (ex.:
   DNS falho) propaga naturalmente, sem `try/catch` (R14).
5. **`pdf-converter.js`**: `convertFirstPageToImage({ buffer, mimeType })`
   carrega o documento via `mupdf` a partir de `buffer` (API do pacote:
   `Document.openDocument(buffer, mimeType ?? "application/pdf")`), obtém
   a página de índice `0` (`document.loadPage(0)`) — lançando erro
   descritivo quando o documento não tiver nenhuma página ou a abertura
   falhar (R18) — renderiza a página com um `Matrix` de escala
   (`options.scale ?? 2`) em um `Pixmap` e converte o `Pixmap` para PNG
   (`pixmap.asPNG()`), retornando `{ buffer: Buffer.from(pngBytes),
   mimeType: "image/png" }` (R17). Qualquer exceção lançada pela própria
   biblioteca `mupdf` durante esse fluxo propaga naturalmente (R18).
6. **`nominatim.js`**: `geocode(endereco)` monta a URL
   `` `${baseUrl}?q=${encodeURIComponent(endereco)}&format=json&limit=1` ``
   e chama `await fetch(url, { headers: { "User-Agent": userAgent } })`
   (R20). Se `resposta.ok` for `false`, lança um erro descritivo incluindo
   `resposta.status` (R23). Caso contrário, `resultados =
   await resposta.json()`; se `resultados.length === 0`, retorna `null`
   (R22); caso contrário, retorna `{ latitude: Number(resultados[0].lat),
   longitude: Number(resultados[0].lon) }` (R21). Uma rejeição de rede do
   próprio `fetch` propaga naturalmente, sem `try/catch` (R23).

## Reexport (`src/ai/index.js` e `src/delivery/index.js`)

```javascript
// src/ai/index.js — adicionado aos exports já existentes
export { createOpenAiChatClient } from "./adapters/openai-chat.js";
export { createDeepSeekChatClient } from "./adapters/deepseek-chat.js";
export { createOpenAiClient } from "./adapters/openai-client.js";
export { createHttpMediaFetcher } from "./adapters/http-media-fetcher.js";
export { createPdfConverter } from "./adapters/pdf-converter.js";
```

```javascript
// src/delivery/index.js — adicionado aos exports já existentes
export { createNominatimGeocoder } from "./adapters/nominatim.js";
```

Ambos preservam `index.js` como única superfície pública de cada domínio
(`docs/conventions.md`), sem remover nenhum export já existente.

## Exceções

Nenhuma classe de erro nova é necessária. Todos os adapters lançam/
propagam `Error`s (nativos do SDK `openai`, do `fetch`, ou instâncias
simples de `Error` criadas pelo próprio adapter para R4/R15/R18/R24); a
tradução para as classes de domínio já existentes
(`MediaDownloadError`, `AudioTranscriptionError`, `ImageDescriptionError`,
`PdfConversionError`, `ChatCompletionError`, `GeocodingError`) já acontece
uma camada acima (`src/ai/audio.js`, `image.js`, `pdf.js`,
`conversationEngine.js`, feature-4/5; `src/delivery/geocoding.js`,
feature-6) e não é duplicada aqui — os adapters concretos desta feature
não conhecem essas classes.

## Estratégia de teste sem rede real (decisão técnica central)

`tests/ai-adapters-real.test.js` e `tests/geocoder-real.test.js` **não
podem** bater nas APIs reais da OpenAI, da DeepSeek nem do Nominatim —
isso quebraria `./init.sh` (`docs/architecture.md`, "Não chame APIs
externas reais... a partir de testes"; `docs/verification.md`, Nível 1/2
e antipadrões) e exigiria chaves de API reais e válidas no ambiente de
CI.

A estratégia adotada segue exatamente o mesmo padrão já aprovado em
`specs/feature-9/design.md`: mockar a biblioteca/SDK real no nível mais
baixo possível, isolando apenas o construtor/ponto de entrada, sem testar
o código interno da biblioteca em si.

### Para `openai-chat.js`, `deepseek-chat.js` e `openai-client.js`

`tests/ai-adapters-real.test.js` usa `vi.mock("openai", ...)` no topo do
arquivo, substituindo a classe `OpenAI` (e o helper `toFile`, quando
usado) por um dublê controlado pelo teste:

```javascript
vi.mock("openai", () => {
  class FakeOpenAI {
    constructor(config) {
      this.config = config;
      this.chat = { completions: { create: vi.fn() } };
      this.audio = { transcriptions: { create: vi.fn() } };
    }
  }
  return { OpenAI: FakeOpenAI, toFile: vi.fn(async (buffer, filename) => ({ buffer, filename })) };
});
```

Com esse dublê, os testes:

- Verificam que `createOpenAiChatClient({ apiKey: "sk-teste" })` instancia
  `OpenAI` com `{ apiKey: "sk-teste" }` (R1) e que
  `createDeepSeekChatClient({ apiKey: "ds-teste" })` instancia `OpenAI`
  com `{ apiKey: "ds-teste", baseURL: "https://api.deepseek.com" }` e
  chama `create` com `model: "deepseek-v4-flash"` por padrão (R5, R6).
- Configuram `fakeClient.chat.completions.create.mockResolvedValue({
  choices: [{ message: { content: JSON.stringify({ resposta: "oi!" }) } }]
  })` e verificam que `generateReply({ systemPrompt, cardapio, historico,
  mensagemCliente })` chama `create` com `messages` no formato esperado
  (papéis traduzidos de `historico`) e retorna `{ resposta: "oi!" }` (R2,
  R6).
- Configuram `create.mockRejectedValue(new Error("rate limit"))` e
  verificam que `generateReply(...)` rejeita com o mesmo erro, sem
  encapsulá-lo (R3, R7).
- Configuram `create.mockResolvedValue({ choices: [{ message: { content:
  "não é json" } }] })` e verificam que `generateReply(...)` rejeita com
  um erro descritivo (R4).
- Verificam que `createOpenAiClient({ apiKey: "sk-teste" })` instancia
  `OpenAI` com `{ apiKey: "sk-teste" }` (R8).
- Configuram `fakeClient.audio.transcriptions.create.mockResolvedValue({
  text: "oi, tudo bem" })` e verificam que `transcribeAudio({ buffer,
  filename, mimeType })` chama `create` com o modelo `"whisper-1"` e
  retorna `"oi, tudo bem"` (R9).
- Configuram `fakeClient.chat.completions.create.mockResolvedValue({
  choices: [{ message: { content: "uma pizza de calabresa" } }] })` e
  verificam que `describeImage({ buffer, mimeType })` chama `create` com
  uma mensagem contendo uma `image_url` no formato `data:` esperado e
  retorna `"uma pizza de calabresa"` (R10).
- Configuram `create`/`transcriptions.create` para rejeitar e verificam
  que `describeImage`/`transcribeAudio` propagam a rejeição sem
  encapsulá-la (R11).
- Chamam `createOpenAiChatClient({})`/`createDeepSeekChatClient({})`/
  `createOpenAiClient({})` (sem `apiKey`) e verificam que cada um lança
  de imediato, sem que `OpenAI` (o construtor mockado) tenha sido
  instanciado com sucesso a ponto de nenhuma chamada de rede ocorrer (R24).

### Para `http-media-fetcher.js`

O mesmo arquivo de teste mocka o `fetch` global via
`vi.stubGlobal("fetch", vi.fn())`, restaurado em `afterEach` com
`vi.unstubAllGlobals()`:

- Configuram `fetch.mockResolvedValue({ ok: true, status: 200, headers:
  new Map([["content-type", "audio/ogg"]]), arrayBuffer: async () =>
  new Uint8Array([1, 2, 3]).buffer })` (usando um objeto com `.get` para
  simular `Headers`) e verificam que `download({ tipo: "audio", url:
  "http://x/a.ogg" })` chama `fetch("http://x/a.ogg")` e retorna
  `{ buffer: Buffer.from([1,2,3]), mimeType: "audio/ogg" }` (R13).
- Configuram `fetch.mockResolvedValue({ ok: false, status: 404, ... })` e
  verificam que `download(...)` rejeita com um erro descritivo (R14).
- Chamam `download({ tipo: "audio" })` (sem `url`) e verificam que rejeita
  sem que `fetch` tenha sido chamado (R15).

### Para `pdf-converter.js`

`tests/ai-adapters-real.test.js` usa `vi.mock("mupdf", ...)`,
substituindo o namespace exportado pela biblioteca por um dublê:

```javascript
vi.mock("mupdf", () => {
  const fakePixmap = { asPNG: vi.fn(() => new Uint8Array([9, 9, 9])) };
  const fakePage = { toPixmap: vi.fn(() => fakePixmap) };
  const fakeDocument = { countPages: vi.fn(() => 1), loadPage: vi.fn(() => fakePage) };
  return {
    Document: { openDocument: vi.fn(() => fakeDocument) },
    Matrix: { scale: vi.fn((sx, sy) => [sx, 0, 0, sy, 0, 0]) },
  };
});
```

- Verificam que `convertFirstPageToImage({ buffer, mimeType:
  "application/pdf" })` chama `Document.openDocument` com `buffer`, carrega
  a página `0` e retorna `{ buffer: Buffer.from([9,9,9]), mimeType:
  "image/png" }` (R16, R17).
- Configuram `Document.openDocument` (ou `countPages`) para lançar/
  retornar `0` páginas e verificam que `convertFirstPageToImage(...)`
  rejeita com um erro descritivo (R18).

### Para `nominatim.js` (`tests/geocoder-real.test.js`)

Mocka o `fetch` global da mesma forma que `http-media-fetcher.js`:

- Configuram `fetch.mockResolvedValue({ ok: true, status: 200, json:
  async () => [{ lat: "-23.55", lon: "-46.63" }] })` e verificam que
  `geocode("Av. Paulista, 1000")` chama `fetch` com uma URL contendo
  `q=Av.%20Paulista%2C%201000&format=json&limit=1` e o cabeçalho
  `User-Agent` configurado, retornando `{ latitude: -23.55, longitude:
  -46.63 }` (R19, R20, R21).
- Configuram `fetch.mockResolvedValue({ ok: true, status: 200, json:
  async () => [] })` e verificam que `geocode(...)` retorna `null` (R22).
- Configuram `fetch.mockResolvedValue({ ok: false, status: 503, ... })` e,
  separadamente, `fetch.mockRejectedValue(new Error("DNS falhou"))`, e
  verificam que `geocode(...)` rejeita em ambos os casos (R23).

### Verificação de isolamento (R25)

Ambos os arquivos de teste incluem um teste que lê via
`fs.readFileSync` o conteúdo-fonte de `src/ai/chatClient.js`, `client.js`,
`media.js`, `pdfConverter.js`, `modelSelector.js`,
`conversationEngine.js`, `audio.js`, `image.js`, `pdf.js`,
`conversation.js` e de `src/delivery/geocoder.js`, `geocoding.js`, e
verifica que nenhuma dessas strings aparece: `"openai"`, `"mupdf"`,
`"fetch("` (chamada direta) — confirmando que somente os arquivos dentro
de `src/ai/adapters/`/`src/delivery/adapters/` referenciam as bibliotecas
concretas.

## Fora do escopo automatizável (verificação manual)

Os seguintes comportamentos dependem de credenciais reais e de rede
externa disponível, e **não são** cobertos por `tests/ai-adapters-real.test.js`,
`tests/geocoder-real.test.js` nem por `./init.sh`. Ficam registrados aqui
como checklist de verificação manual (Nível 3, `docs/verification.md`) a
ser executado pelo usuário humano após a aprovação, implementação desta
feature e a fiação feita por feature-14:

1. Abrir o painel de configuração (feature-12) e preencher uma chave de
   API real da OpenAI (`config.apiKeys.openai`) e, opcionalmente, da
   DeepSeek.
2. Rodar `npm run dev`, enviar uma mensagem de texto real via WhatsApp
   (feature-9, já `done`) e confirmar que uma resposta gerada de fato
   pela OpenAI (ou DeepSeek, conforme `modeloSelecionado`) retorna ao
   cliente.
3. Enviar uma nota de voz real via WhatsApp com `audioEnabled` ativo e
   confirmar que o texto transcrito (via Whisper real) aparece refletido
   na resposta do bot.
4. Enviar uma foto real (ex.: comprovante de pagamento) via WhatsApp com
   `imageEnabled` ativo e confirmar que a descrição gerada pelo modelo de
   visão real é coerente com o conteúdo da imagem.
5. Enviar um PDF real (ex.: comprovante em PDF) via WhatsApp com
   `imageEnabled` ativo e confirmar que a primeira página é convertida e
   descrita corretamente.
6. Cadastrar um endereço real de entrega e confirmar, no painel KDS
   (feature-13) ou nos logs, que as coordenadas retornadas pelo Nominatim
   real correspondem ao endereço informado.
7. Testar um endereço inexistente/inválido e confirmar que o fluxo trata
   graciosamente o caso "endereço não encontrado" (`AddressNotFoundError`,
   já testado com o adapter de feature-6) usando o Nominatim real.

Esse roteiro não gera nenhum artefato de teste automatizado — é
documentado aqui para que o humano saiba exatamente o que verificar antes
de considerar a integração real "funcionando de fato" em produção.

## Alternativa de estrutura descartada

Considerou-se colocar cada adapter concreto diretamente dentro do arquivo
de contrato correspondente (ex.: implementação real dentro de
`src/ai/client.js`, hoje apenas um `export {}` com JSDoc). Foi descartada
pelas mesmas razões já registradas em `specs/feature-9/design.md`: manter
os SDKs/bibliotecas concretos isolados em `src/ai/adapters/`/
`src/delivery/adapters/` preserva os arquivos de contrato
(`chatClient.js`, `client.js`, `media.js`, `pdfConverter.js`,
`geocoder.js`) como documentação pura, sem nenhuma dependência de
execução, e mantém `tests/ai-multimodal.test.js`,
`tests/conversation-engine.test.js` e `tests/delivery-time.test.js`
(features 4, 5 e 6, já `done`) livres de qualquer necessidade de mockar
`openai`/`mupdf`/`fetch` — só `tests/ai-adapters-real.test.js` e
`tests/geocoder-real.test.js` (esta feature) precisam pagar esse custo.
