# Requirements — feature-10: Integração Real com OpenAI, DeepSeek e Nominatim

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/ai-adapters-real.test.js` ou `tests/geocoder-real.test.js`, sem
> depender de rede real nem de chaves de API válidas (os SDKs/`fetch`
> concretos são isolados/mockados no nível mais baixo possível — ver
> `design.md`). Mapeamento aos 4 `acceptance` originais de
> `feature_list.json` ao final do documento.

## Adapter de chat OpenAI (`ChatClientAdapter`, `src/ai/chatClient.js`)

### R1
O sistema DEVE expor uma função pública `createOpenAiChatClient(options)`
em `src/ai/adapters/openai-chat.js` que instancia o SDK `openai` com a
chave `options.apiKey` e retorna um objeto que satisfaz integralmente o
contrato `ChatClientAdapter` documentado em `src/ai/chatClient.js`
(`generateReply({ systemPrompt, cardapio, historico, mensagemCliente })`).

### R2
QUANDO `generateReply(...)` é chamado, o adapter DEVE montar a lista de
mensagens de chat (mensagem de sistema com `systemPrompt`+`cardapio`,
seguida do `historico` traduzido para os papéis `user`/`assistant`, e por
fim `mensagemCliente` como última mensagem `user`) e chamar
`chat.completions.create` do SDK `openai` solicitando resposta em JSON
(`response_format: { type: "json_object" }`), retornando o objeto
`{ resposta, dadosCliente?, pedido? }` obtido do `JSON.parse` do conteúdo
da resposta.

### R3
SE a chamada subjacente do SDK `openai` (`chat.completions.create`)
rejeitar a Promise ENTÃO `generateReply(...)` DEVE propagar essa rejeição
sem tratá-la nem convertê-la em outro tipo de erro (o motor de
conversação, `src/ai/conversationEngine.js`, já converte a rejeição em
`ChatCompletionError`, feature-5).

### R4
SE o conteúdo retornado pelo SDK `openai` não for um JSON válido ou não
contiver o campo `resposta` ENTÃO `generateReply(...)` DEVE lançar um
erro descritivo, sem retornar um objeto incompleto ou `undefined`.

## Adapter de chat DeepSeek (`ChatClientAdapter`, `src/ai/chatClient.js`)

### R5
O sistema DEVE expor uma função pública `createDeepSeekChatClient(options)`
em `src/ai/adapters/deepseek-chat.js` que instancia o SDK `openai` com
`apiKey: options.apiKey` e `baseURL: "https://api.deepseek.com"` (API da
DeepSeek compatível com o formato OpenAI) e retorna um objeto que
satisfaz integralmente o mesmo contrato `ChatClientAdapter` usado por
R1–R4.

### R6
QUANDO `generateReply(...)` é chamado no adapter DeepSeek, o sistema DEVE
seguir exatamente a mesma montagem de mensagens e o mesmo contrato de
retorno descritos em R2.

### R7
SE a chamada subjacente do SDK usado pelo adapter DeepSeek rejeitar a
Promise ENTÃO `generateReply(...)` DEVE propagar essa rejeição sem
tratá-la, no mesmo comportamento descrito em R3.

## Adapter de IA multimodal — Whisper e Visão (`AiClientAdapter`, `src/ai/client.js`)

### R8
O sistema DEVE expor uma função pública `createOpenAiClient(options)` em
`src/ai/adapters/openai-client.js` que instancia o SDK `openai` com
`options.apiKey` e retorna um objeto que satisfaz integralmente o
contrato `AiClientAdapter` documentado em `src/ai/client.js`
(`transcribeAudio(audio)`, `describeImage(imagem)`).

### R9
QUANDO `transcribeAudio({ buffer, filename, mimeType })` é chamado, o
adapter DEVE chamar `audio.transcriptions.create` do SDK `openai` com o
modelo `whisper-1` (ou `options.transcriptionModel`, quando informado),
passando um arquivo construído a partir de `buffer`/`filename`, e DEVE
retornar a string `.text` da resposta.

### R10
QUANDO `describeImage({ buffer, mimeType })` é chamado, o adapter DEVE
chamar `chat.completions.create` do SDK `openai` com um modelo de visão
(`gpt-4o-mini`, ou `options.visionModel`, quando informado), enviando a
imagem como uma URL de dados base64 (`data:${mimeType};base64,<buffer em
base64>`) em uma mensagem de usuário, e DEVE retornar a string
`choices[0].message.content` da resposta.

### R11
SE a chamada subjacente do SDK `openai` (`audio.transcriptions.create` ou
`chat.completions.create`) rejeitar a Promise, em `transcribeAudio` ou em
`describeImage`, ENTÃO o adapter DEVE propagar essa rejeição sem tratá-la
(`src/ai/audio.js`/`src/ai/image.js`/`src/ai/pdf.js`, feature-4, já
convertem essas rejeições em `AudioTranscriptionError`/
`ImageDescriptionError`).

## Adapter de download de mídia (`MediaFetcher`, `src/ai/media.js`)

### R12
O sistema DEVE expor uma função pública `createHttpMediaFetcher(options)`
em `src/ai/adapters/http-media-fetcher.js` que retorna um objeto que
satisfaz integralmente o contrato `MediaFetcher` documentado em
`src/ai/media.js` (`download(media)`).

### R13
QUANDO `download(media)` é chamado com `media.url` definido, o adapter
DEVE realizar uma requisição HTTP `GET` a `media.url` usando o `fetch`
nativo do Node, ler o corpo da resposta como `Buffer` e retornar
`{ buffer, mimeType }`, onde `mimeType` é resolvido do cabeçalho
`Content-Type` da resposta quando presente, caindo para `media.mimeType`
quando o cabeçalho estiver ausente ou vazio.

### R14
SE a requisição HTTP disparada por `download(media)` retornar um status
HTTP fora da faixa 200–299, ou o `fetch` rejeitar por erro de rede, ENTÃO
o adapter DEVE lançar um erro descritivo (`src/ai/audio.js`/`image.js`/
`pdf.js`, feature-4, já convertem esse erro em `MediaDownloadError`).

### R15
SE `download(media)` for chamado sem `media.url` definido ENTÃO o adapter
DEVE lançar um erro descritivo sem realizar nenhuma requisição de rede.

## Adapter de conversão de PDF (`PdfConverter`, `src/ai/pdfConverter.js`)

### R16
O sistema DEVE expor uma função pública `createPdfConverter(options)` em
`src/ai/adapters/pdf-converter.js` que retorna um objeto que satisfaz
integralmente o contrato `PdfConverter` documentado em
`src/ai/pdfConverter.js` (`convertFirstPageToImage(pdf)`), usando a
biblioteca `mupdf` para a renderização.

### R17
QUANDO `convertFirstPageToImage({ buffer, mimeType })` é chamado com um
PDF válido de ao menos uma página, o adapter DEVE carregar `buffer` via
`mupdf`, renderizar a primeira página (índice `0`) em um bitmap PNG e
retornar `{ buffer: <Buffer PNG>, mimeType: "image/png" }`.

### R18
SE `buffer` não representar um PDF válido, ou o PDF não tiver nenhuma
página, ou a renderização via `mupdf` falhar por qualquer outro motivo,
ENTÃO `convertFirstPageToImage(...)` DEVE lançar um erro descritivo
(`src/ai/pdf.js`, feature-4, já converte esse erro em
`PdfConversionError`).

## Adapter de geocodificação Nominatim (`GeocoderAdapter`, `src/delivery/geocoder.js`)

### R19
O sistema DEVE expor uma função pública `createNominatimGeocoder(options)`
em `src/delivery/adapters/nominatim.js` que retorna um objeto que
satisfaz integralmente o contrato `GeocoderAdapter` documentado em
`src/delivery/geocoder.js` (`geocode(endereco)`).

### R20
QUANDO `geocode(endereco)` é chamado, o adapter DEVE realizar uma
requisição HTTP `GET` usando o `fetch` nativo do Node ao endpoint de
busca do Nominatim (`options.baseUrl`, padrão
`"https://nominatim.openstreetmap.org/search"`) com a query string
`q=<endereco codificado>&format=json&limit=1`, incluindo o cabeçalho
`User-Agent` (`options.userAgent`, padrão identificando esta aplicação),
conforme a política de uso exigida pelo Nominatim.

### R21
QUANDO a resposta HTTP do Nominatim for um array JSON com ao menos um
elemento, `geocode(endereco)` DEVE retornar
`{ latitude, longitude }`, convertendo os campos `lat`/`lon` (strings) do
primeiro elemento do array para `number`.

### R22
QUANDO a resposta HTTP do Nominatim for um array JSON vazio (nenhum
resultado encontrado para o endereço), `geocode(endereco)` DEVE retornar
`null`.

### R23
SE a requisição HTTP disparada por `geocode(endereco)` retornar um status
HTTP fora da faixa 200–299, ou o `fetch` rejeitar por erro de rede, ENTÃO
`geocode(endereco)` DEVE lançar um erro descritivo (`src/delivery/geocoding.js`,
feature-6, já converte esse erro em `GeocodingError`).

## Uso das chaves de API configuradas pelo usuário

### R24
SE `options.apiKey` estiver ausente ou for uma string vazia ENTÃO
`createOpenAiChatClient(options)`, `createDeepSeekChatClient(options)` e
`createOpenAiClient(options)` DEVEM lançar um erro descritivo antes de
instanciar o SDK `openai` subjacente, e NÃO DEVEM realizar nenhuma
chamada de rede.

## Isolamento das bibliotecas/SDKs concretos

### R25
O sistema DEVE isolar toda referência direta ao SDK `openai` e à
biblioteca `mupdf`, e todo uso direto de `fetch` para mídia/Nominatim,
dentro dos arquivos de `src/ai/adapters/` e `src/delivery/adapters/`;
nenhum outro arquivo de `src/ai/` (fora de `adapters/`) ou de
`src/delivery/` (fora de `adapters/`) DEVE importar `openai`/`mupdf` ou
chamar `fetch` diretamente.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                       | Coberto por                                     |
|-----------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| As implementações concretas dos adapters de IA fazem chamadas reais às APIs da OpenAI e DeepSeek respeitando os contratos já definidos e testados nas features 4 e 5. | R1–R11, R25                                     |
| A implementação concreta do geocoder faz chamadas HTTP reais à API do Nominatim respeitando o contrato já definido e testado na feature 6. | R19–R23, R25                                    |
| As chaves de API configuradas pelo usuário (feature-2) são usadas nas chamadas reais.                                          | R1, R5, R8, R24                                 |
| tests/ai-adapters-real.test.js e tests/geocoder-real.test.js validam os adapters concretos contra os contratos já definidos, isolando as chamadas de rede reais. | R1–R25 (implementação de teste, ver `design.md`) |
