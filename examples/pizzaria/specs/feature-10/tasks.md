# Tasks — feature-10: Integração Real com OpenAI, DeepSeek e Nominatim

- [x] T1 — Adicionar `openai` e `mupdf` em `dependencies` de
      `package.json` (`npm install openai mupdf`).
      Cobre: R1, R5, R8, R16.

- [x] T2 — Criar `src/ai/adapters/openai-chat.js` com
      `createOpenAiChatClient({ apiKey, model })`: valida `apiKey` (lança
      erro descritivo e não instancia o SDK se ausente/vazio, R24);
      instancia `new OpenAI({ apiKey })` (import nomeado `{ OpenAI }` de
      `"openai"`); implementa `generateReply({ systemPrompt, cardapio,
      historico, mensagemCliente })` montando `messages` (sistema +
      histórico traduzido + mensagem atual) e chamando
      `chat.completions.create({ model: model ?? "gpt-5.4-mini", messages,
      response_format: { type: "json_object" } })`, parseando o JSON da
      resposta e validando o campo `resposta`.
      Cobre: R1, R2, R4, R24.

- [x] T3 — Em `openai-chat.js`, garantir que nenhuma chamada ao SDK é
      envolvida em `try/catch` que engula o erro — uma rejeição de
      `chat.completions.create` deve propagar sem alteração.
      Cobre: R3.

- [x] T4 — Criar `src/ai/adapters/deepseek-chat.js` com
      `createDeepSeekChatClient({ apiKey, model })`: valida `apiKey`
      (R24); instancia `new OpenAI({ apiKey, baseURL:
      "https://api.deepseek.com" })`; reutiliza a mesma lógica de
      `generateReply` de T2 (montagem de mensagens, `response_format`
      JSON, `model` padrão `"deepseek-v4-flash"`), propagando rejeições sem
      tratá-las.
      Cobre: R5, R6, R7, R24.

- [x] T5 — Criar `src/ai/adapters/openai-client.js` com
      `createOpenAiClient({ apiKey, transcriptionModel, visionModel })`:
      valida `apiKey` (R24); instancia `new OpenAI({ apiKey })`;
      implementa `transcribeAudio({ buffer, filename, mimeType })`
      chamando `audio.transcriptions.create({ model: transcriptionModel
      ?? "whisper-1", file: await toFile(buffer, filename) })` e
      retornando `.text`; implementa `describeImage({ buffer, mimeType })`
      chamando `chat.completions.create({ model: visionModel ??
      "gpt-5.4-mini", messages: [...] })` com a imagem em `data:` base64 e
      retornando `choices[0].message.content`; nenhuma das duas chamadas
      é envolvida em `try/catch`.
      Cobre: R8, R9, R10, R11, R24.

- [x] T6 — Criar `src/ai/adapters/http-media-fetcher.js` com
      `createHttpMediaFetcher(options)`: `download(media)` lança erro
      descritivo de imediato se `media?.url` estiver ausente, sem chamar
      `fetch` (R15); caso contrário, chama `fetch(media.url)`, lança erro
      descritivo se `resposta.ok` for falso (R14), e retorna
      `{ buffer: Buffer.from(await resposta.arrayBuffer()), mimeType:
      resposta.headers.get("content-type") || media.mimeType }` (R13).
      Cobre: R12, R13, R14, R15.

- [x] T7 — Criar `src/ai/adapters/pdf-converter.js` com
      `createPdfConverter({ scale })`: `convertFirstPageToImage({ buffer,
      mimeType })` carrega o documento via `mupdf`
      (`Document.openDocument`), carrega a página `0`, renderiza com
      `Matrix.scale(scale ?? 2, scale ?? 2)` em um `Pixmap` e converte
      para PNG (`pixmap.asPNG()`), retornando `{ buffer: Buffer.from(...),
      mimeType: "image/png" }`; qualquer falha de abertura/página
      ausente/renderização propaga como erro descritivo.
      Cobre: R16, R17, R18.

- [x] T8 — Criar `src/delivery/adapters/nominatim.js` com
      `createNominatimGeocoder({ baseUrl, userAgent })`: `geocode(endereco)`
      monta a URL com `q`/`format=json`/`limit=1` e chama `fetch(url, {
      headers: { "User-Agent": userAgent ?? <default> } })` (R20); lança
      erro descritivo se `resposta.ok` for falso (R23); retorna `null`
      quando o array JSON de resultados estiver vazio (R22); caso
      contrário retorna `{ latitude: Number(resultados[0].lat),
      longitude: Number(resultados[0].lon) }` (R21); rejeições de rede do
      `fetch` propagam sem tratamento (R23).
      Cobre: R19, R20, R21, R22, R23.

- [x] T9 — Atualizar `src/ai/index.js` para reexportar
      `createOpenAiChatClient`, `createDeepSeekChatClient`,
      `createOpenAiClient`, `createHttpMediaFetcher` e
      `createPdfConverter` dos respectivos módulos em `adapters/`, sem
      remover nenhum export já existente.
      Cobre: R1, R5, R8, R12, R16.

- [x] T10 — Atualizar `src/delivery/index.js` para reexportar
      `createNominatimGeocoder` de `./adapters/nominatim.js`, sem remover
      nenhum export já existente.
      Cobre: R19.

- [x] T11 — Confirmar (revisão manual do implementer, sem alterar nenhum
      arquivo fora de `adapters/`) que `src/ai/chatClient.js`, `client.js`,
      `media.js`, `pdfConverter.js`, `modelSelector.js`,
      `conversationEngine.js`, `audio.js`, `image.js`, `pdf.js`,
      `conversation.js`, `src/delivery/geocoder.js` e `geocoding.js`
      continuam sem importar `"openai"`/`"mupdf"` nem chamar `fetch`
      diretamente.
      Cobre: R25.

- [x] T12 — Criar `tests/ai-adapters-real.test.js` (Vitest) com
      `vi.mock("openai", ...)` no topo do arquivo (substituindo `OpenAI`
      por uma `FakeOpenAI` com `chat.completions.create`/
      `audio.transcriptions.create` espiáveis via `vi.fn`, e `toFile` por
      um dublê simples) e `vi.mock("mupdf", ...)` (substituindo
      `Document`/`Matrix` por dublês controlados). Adicionar testes que
      verificam que `createOpenAiChatClient({ apiKey })` instancia
      `OpenAI` com `{ apiKey }` e que `createDeepSeekChatClient({ apiKey
      })` instancia `OpenAI` com `{ apiKey, baseURL:
      "https://api.deepseek.com" }`.
      Cobre: R1, R5.

- [x] T13 — Adicionar em `tests/ai-adapters-real.test.js`: testes que
      configuram `create.mockResolvedValue(...)` retornando um JSON válido
      `{ resposta }` e verificam que `generateReply(...)` de
      `openai-chat.js` e de `deepseek-chat.js` chamam `create` com
      `messages` no formato esperado (papéis traduzidos de `historico`) e
      retornam o objeto parseado.
      Cobre: R2, R6.

- [x] T14 — Adicionar em `tests/ai-adapters-real.test.js`: testes que
      configuram `create.mockRejectedValue(new Error("falha"))` para os
      dois adapters de chat e verificam que `generateReply(...)` rejeita
      com o mesmo erro, sem encapsulá-lo.
      Cobre: R3, R7.

- [x] T15 — Adicionar em `tests/ai-adapters-real.test.js`: teste que
      configura `create.mockResolvedValue(...)` retornando um conteúdo que
      não é JSON válido (ou sem o campo `resposta`) e verifica que
      `generateReply(...)` rejeita com um erro descritivo.
      Cobre: R4.

- [x] T16 — Adicionar em `tests/ai-adapters-real.test.js`: testes que
      chamam `createOpenAiChatClient({})`, `createDeepSeekChatClient({})` e
      `createOpenAiClient({})` sem `apiKey` e verificam que cada um lança
      de imediato, sem que nenhuma chamada ao SDK mockado (`create`) tenha
      ocorrido.
      Cobre: R24.

- [x] T17 — Adicionar em `tests/ai-adapters-real.test.js`: teste que
      verifica que `createOpenAiClient({ apiKey })` instancia `OpenAI` com
      `{ apiKey }`; teste que configura
      `audio.transcriptions.create.mockResolvedValue({ text: "..." })` e
      verifica que `transcribeAudio({ buffer, filename, mimeType })` chama
      `create` com o modelo `"whisper-1"` e retorna o texto.
      Cobre: R8, R9.

- [x] T18 — Adicionar em `tests/ai-adapters-real.test.js`: teste que
      configura `chat.completions.create.mockResolvedValue({ choices: [{
      message: { content: "descrição" } }] })` e verifica que
      `describeImage({ buffer, mimeType })` chama `create` com uma
      mensagem contendo `image_url` no formato `data:${mimeType};base64,...`
      e retorna `"descrição"`; testes que configuram
      `create`/`transcriptions.create` para rejeitar e verificam que
      `describeImage`/`transcribeAudio` propagam a rejeição.
      Cobre: R10, R11.

- [x] T19 — Adicionar em `tests/ai-adapters-real.test.js`:
      `vi.stubGlobal("fetch", vi.fn())` (com `vi.unstubAllGlobals()` em
      `afterEach`); testes que configuram uma resposta `ok: true` com
      `headers`/`arrayBuffer` simulados e verificam que
      `download({ tipo: "audio", url })` de `http-media-fetcher.js` chama
      `fetch(url)` e retorna `{ buffer, mimeType }` corretos; teste com
      resposta `ok: false` verificando rejeição; teste sem `media.url`
      verificando rejeição sem chamar `fetch`.
      Cobre: R12, R13, R14, R15.

- [x] T20 — Adicionar em `tests/ai-adapters-real.test.js`: testes que
      verificam que `convertFirstPageToImage({ buffer, mimeType })` de
      `pdf-converter.js` chama `Document.openDocument` com `buffer`,
      carrega a página `0` e retorna `{ buffer, mimeType: "image/png" }`
      a partir do dublê de `mupdf`; teste que configura o dublê para
      indicar ausência de páginas/falha de abertura e verifica que
      `convertFirstPageToImage(...)` rejeita com erro descritivo.
      Cobre: R16, R17, R18.

- [x] T21 — Adicionar em `tests/ai-adapters-real.test.js`: teste de
      isolamento que lê via `fs.readFileSync` o conteúdo-fonte de
      `src/ai/chatClient.js`, `client.js`, `media.js`, `pdfConverter.js`,
      `modelSelector.js`, `conversationEngine.js`, `audio.js`, `image.js`,
      `pdf.js`, `conversation.js` e verifica que nenhuma das strings
      `"openai"`/`"mupdf"` aparece nesses arquivos.
      Cobre: R25.

- [x] T22 — Criar `tests/geocoder-real.test.js` (Vitest) com
      `vi.stubGlobal("fetch", vi.fn())` (`vi.unstubAllGlobals()` em
      `afterEach`). Adicionar teste que configura uma resposta `ok: true`
      com `json()` retornando `[{ lat: "-23.55", lon: "-46.63" }]` e
      verifica que `geocode("Av. Paulista, 1000")` de `nominatim.js` chama
      `fetch` com uma URL contendo `q=`/`format=json`/`limit=1` e o
      cabeçalho `User-Agent`, retornando `{ latitude: -23.55, longitude:
      -46.63 }`.
      Cobre: R19, R20, R21.

- [x] T23 — Adicionar em `tests/geocoder-real.test.js`: teste que
      configura `json()` retornando `[]` e verifica que `geocode(...)`
      retorna `null`.
      Cobre: R22.

- [x] T24 — Adicionar em `tests/geocoder-real.test.js`: teste que
      configura uma resposta `ok: false` (ex.: status 503) e verifica que
      `geocode(...)` rejeita; teste separado com `fetch.mockRejectedValue(
      new Error("DNS falhou"))` verificando que `geocode(...)` também
      rejeita.
      Cobre: R23.

- [x] T25 — Adicionar em `tests/geocoder-real.test.js`: teste de
      isolamento que lê via `fs.readFileSync` o conteúdo-fonte de
      `src/delivery/geocoder.js` e `geocoding.js` e verifica que nenhuma
      das strings `"fetch("`/`"openai"`/`"mupdf"` aparece nesses arquivos.
      Cobre: R25.

- [x] T26 — Executar `npm test` e `./init.sh` (garantindo que
      `tests/ai-multimodal.test.js`, `tests/conversation-engine.test.js` e
      `tests/delivery-time.test.js`, das features 4, 5 e 6, continuam
      passando sem nenhuma alteração); documentar a tabela de
      rastreabilidade R1–R25 → nome do teste em
      `progress/impl_feature-10.md` (a cargo do implementer, não deste
      spec).
      Cobre: R1–R25 (verificação final).
