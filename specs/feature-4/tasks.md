# Tasks — feature-4: Processamento Multimodal com IA (Whisper e Visão)

> Revisão pós-`spec_ready`: T3, T7 e T9 foram ajustadas e T10, T18, T19,
> T20 e T25–T28 foram adicionadas para cobrir o pedido do humano de
> processar PDFs (baixar, converter a primeira página em imagem e
> reaproveitar o fluxo de visão). Nenhuma task havia sido marcada `[x]`
> antes desta revisão.

- [x] T1 — Criar `src/ai/errors.js` com `AiError`, `MediaDownloadError`,
      `AudioTranscriptionError`, `ImageDescriptionError`,
      `UnsupportedMediaTypeError` e `PdfConversionError` (novo nesta
      revisão).
      Cobre: R4, R5, R8, R9, R12, R20.

- [x] T2 — Criar `src/ai/client.js` documentando (JSDoc) o contrato
      mínimo do `aiClient` injetável (`transcribeAudio({ buffer,
      filename, mimeType })`, `describeImage({ buffer, mimeType })`),
      sem importar nenhum SDK concreto.
      Cobre: R1, R3, R6.

- [x] T3 — Criar `src/ai/media.js` documentando (JSDoc) o contrato
      mínimo do `mediaFetcher` injetável (`download(media) -> { buffer,
      mimeType }`, onde `media.tipo` pode ser `"audio"`, `"imagem"` ou
      `"pdf"` — `"pdf"` adicionado nesta revisão), sem importar nenhuma
      biblioteca de rede concreta.
      Cobre: R1, R6, R15.

- [x] T4 — Criar `src/ai/pdfConverter.js` (novo nesta revisão)
      documentando (JSDoc) o contrato mínimo do `pdfConverter` injetável
      (`convertFirstPageToImage({ buffer, mimeType }) -> Promise<{
      buffer, mimeType }>`), sem importar nenhuma biblioteca de
      renderização de PDF concreta.
      Cobre: R16.

- [x] T5 — Criar `src/ai/audio.js` com a função interna
      `_prepareAudioFile(buffer, mimeType)` (mapeia `mimeType` conhecido
      para um `filename` com extensão compatível com a Whisper API,
      default `"audio.ogg"` se não reconhecido) e a função pública
      `transcribeAudioMessage({ aiClient, mediaFetcher, media })`: chama
      `mediaFetcher.download(media)` (captura falha e relança
      `MediaDownloadError`), prepara o arquivo, chama
      `aiClient.transcribeAudio(audioFile)` (captura falha e relança
      `AudioTranscriptionError` com `{ cause }`), retorna o texto
      transcrito.
      Cobre: R1, R2, R3, R4, R5.

- [x] T6 — Criar `src/ai/image.js` com a função pública
      `describeImageMessage({ aiClient, mediaFetcher, media, config })`:
      se `config?.imageEnabled !== true`, retorna `null` sem chamar
      `mediaFetcher` nem `aiClient`; caso contrário, chama
      `mediaFetcher.download(media)` (captura falha e relança
      `MediaDownloadError`), chama `aiClient.describeImage({ buffer,
      mimeType })` (captura falha e relança `ImageDescriptionError` com
      `{ cause }`), retorna o texto descritivo.
      Cobre: R6, R7, R8, R9.

- [x] T7 — Criar `src/ai/pdf.js` (novo nesta revisão) com a função
      pública `describePdfMessage({ aiClient, mediaFetcher, pdfConverter,
      media, config })`: se `config?.imageEnabled !== true`, retorna
      `null` sem chamar `mediaFetcher`, `pdfConverter` nem `aiClient`;
      caso contrário, chama `mediaFetcher.download(media)` (captura
      falha e relança `MediaDownloadError`), chama
      `pdfConverter.convertFirstPageToImage(pdf)` (captura falha e
      relança `PdfConversionError` com `{ cause }`), chama
      `aiClient.describeImage(imagem)` sobre a imagem resultante (captura
      falha e relança `ImageDescriptionError` com `{ cause }`), retorna o
      texto descritivo.
      Cobre: R15, R16, R17, R18, R19, R20, R21.

- [x] T8 — Criar `src/ai/conversation.js` com `injectTextoExtraido(mensagem,
      textoExtraido)` (retorna `{ ...mensagem, texto: textoExtraido }`
      sem mutar `mensagem`) e `processarMensagemMultimodal({ mensagem,
      aiClient, mediaFetcher, pdfConverter, config })`: sem
      `mensagem.media`, retorna `mensagem` inalterada; `media.tipo ===
      "audio"`, chama `transcribeAudioMessage` e injeta o texto;
      `media.tipo === "imagem"`, chama `describeImageMessage` e injeta o
      texto se não for `null`, senão retorna `mensagem` inalterada;
      `media.tipo === "pdf"` (novo nesta revisão), chama
      `describePdfMessage` e injeta o texto se não for `null`, senão
      retorna `mensagem` inalterada; qualquer outro `media.tipo` lança
      `UnsupportedMediaTypeError` sem chamar `mediaFetcher`/`pdfConverter`/
      `aiClient`.
      Cobre: R10, R11, R12, R13, R14, R22, R23.

- [x] T9 — Criar `src/ai/index.js` reexportando `transcribeAudioMessage`,
      `describeImageMessage`, `describePdfMessage` (novo nesta revisão),
      `injectTextoExtraido`, `processarMensagemMultimodal` e as classes
      de `src/ai/errors.js` (incluindo `PdfConversionError`), como
      superfície pública única do domínio.
      Cobre: R1–R23.

- [x] T10 — Escrever em `tests/ai-multimodal.test.js` (Vitest, dublês
      simples de `aiClient` e `mediaFetcher` — funções `async`
      controladas pelo teste, sem rede real): teste que baixa e
      transcreve uma mensagem de áudio com sucesso, verificando que
      `mediaFetcher.download` é chamado antes de
      `aiClient.transcribeAudio` e que o texto retornado é exatamente o
      do dublê.
      Cobre: R1, R2, R3.

- [x] T11 — Adicionar em `tests/ai-multimodal.test.js`: teste em que o
      dublê de `mediaFetcher.download` rejeita para uma mensagem de
      áudio, verificando que `transcribeAudioMessage` lança
      `MediaDownloadError` e que `aiClient.transcribeAudio` nunca é
      chamado.
      Cobre: R4.

- [x] T12 — Adicionar em `tests/ai-multimodal.test.js`: teste em que o
      dublê de `aiClient.transcribeAudio` rejeita, verificando que
      `transcribeAudioMessage` lança `AudioTranscriptionError` com a
      causa original preservada (`error.cause`).
      Cobre: R5.

- [x] T13 — Adicionar em `tests/ai-multimodal.test.js`: teste de
      `describeImageMessage` com `config.imageEnabled = true`,
      verificando que baixa a imagem, chama `aiClient.describeImage` e
      retorna o texto descritivo do dublê.
      Cobre: R6.

- [x] T14 — Adicionar em `tests/ai-multimodal.test.js`: teste de
      `describeImageMessage` com `config.imageEnabled = false`,
      verificando que retorna `null` e que nem `mediaFetcher.download`
      nem `aiClient.describeImage` são chamados.
      Cobre: R7.

- [x] T15 — Adicionar em `tests/ai-multimodal.test.js`: teste em que o
      dublê de `mediaFetcher.download` rejeita para uma mensagem de
      imagem com `imageEnabled` ativo, verificando que
      `describeImageMessage` lança `MediaDownloadError` e que
      `aiClient.describeImage` nunca é chamado.
      Cobre: R8.

- [x] T16 — Adicionar em `tests/ai-multimodal.test.js`: teste em que o
      dublê de `aiClient.describeImage` rejeita, verificando que
      `describeImageMessage` lança `ImageDescriptionError` com a causa
      original preservada.
      Cobre: R9.

- [x] T17 — Adicionar em `tests/ai-multimodal.test.js` (novo nesta
      revisão): teste de `describePdfMessage` com `config.imageEnabled =
      true`, verificando que baixa o PDF (`mediaFetcher.download`),
      converte a primeira página (`pdfConverter.convertFirstPageToImage`)
      e chama `aiClient.describeImage` nessa ordem, retornando o texto
      descritivo do dublê.
      Cobre: R15, R16, R17.

- [x] T18 — Adicionar em `tests/ai-multimodal.test.js` (novo nesta
      revisão): teste de `describePdfMessage` com `config.imageEnabled =
      false`, verificando que retorna `null` e que nem
      `mediaFetcher.download`, nem `pdfConverter.convertFirstPageToImage`,
      nem `aiClient.describeImage` são chamados.
      Cobre: R18.

- [x] T19 — Adicionar em `tests/ai-multimodal.test.js` (novo nesta
      revisão): dois testes de falha em `describePdfMessage` com
      `imageEnabled` ativo: (a) dublê de `mediaFetcher.download` rejeita
      → lança `MediaDownloadError`, nem `pdfConverter` nem
      `aiClient.describeImage` são chamados; (b) dublê de
      `pdfConverter.convertFirstPageToImage` rejeita (simulando PDF
      corrompido/sem páginas) → lança `PdfConversionError` com a causa
      original preservada, e `aiClient.describeImage` nunca é chamado.
      Cobre: R19, R20.

- [x] T20 — Adicionar em `tests/ai-multimodal.test.js` (novo nesta
      revisão): teste em que o dublê de `aiClient.describeImage` rejeita
      durante o fluxo de PDF (após download e conversão bem-sucedidos),
      verificando que `describePdfMessage` lança `ImageDescriptionError`
      com a causa original preservada.
      Cobre: R21.

- [x] T21 — Adicionar em `tests/ai-multimodal.test.js`: teste de
      `processarMensagemMultimodal` com uma mensagem `{ clienteId,
      texto: "", media: { tipo: "audio", ... } }`, verificando que a
      mensagem retornada tem `texto` igual ao transcrito pelo dublê,
      `clienteId` preservado, e que o objeto de mensagem original não
      foi mutado.
      Cobre: R10.

- [x] T22 — Adicionar em `tests/ai-multimodal.test.js`: teste de
      `processarMensagemMultimodal` com uma mensagem de imagem e
      `config.imageEnabled = true`, verificando que a mensagem retornada
      tem `texto` igual à descrição do dublê de visão, `clienteId`
      preservado, e que o objeto original não foi mutado.
      Cobre: R11.

- [x] T23 — Adicionar em `tests/ai-multimodal.test.js`: teste de
      `processarMensagemMultimodal` com `media.tipo` desconhecido (ex.:
      `"video"`), verificando que lança `UnsupportedMediaTypeError` e que
      nem `mediaFetcher`, `pdfConverter` nem `aiClient` são chamados.
      Cobre: R12.

- [x] T24 — Adicionar em `tests/ai-multimodal.test.js`: teste de
      `processarMensagemMultimodal` com uma mensagem sem campo `media`
      (e outro com `media: null`), verificando que a mensagem retornada é
      igual à original e que nem `mediaFetcher`, `pdfConverter` nem
      `aiClient` são chamados.
      Cobre: R13.

- [x] T25 — Adicionar em `tests/ai-multimodal.test.js`: teste de
      `processarMensagemMultimodal` com uma mensagem de imagem e
      `config.imageEnabled = false`, verificando que a mensagem retornada
      é igual à original (mesmo `texto`), sem exceção lançada, e que nem
      `mediaFetcher` nem `aiClient` são chamados.
      Cobre: R14.

- [x] T26 — Adicionar em `tests/ai-multimodal.test.js` (novo nesta
      revisão): teste de `processarMensagemMultimodal` com uma mensagem
      `{ clienteId, texto: "", media: { tipo: "pdf", ... } }` e
      `config.imageEnabled = true`, verificando que a mensagem retornada
      tem `texto` igual à descrição gerada a partir da imagem convertida
      pelo dublê de `pdfConverter`, `clienteId` preservado, e que o
      objeto de mensagem original não foi mutado.
      Cobre: R22.

- [x] T27 — Adicionar em `tests/ai-multimodal.test.js` (novo nesta
      revisão): teste de `processarMensagemMultimodal` com uma mensagem
      de PDF e `config.imageEnabled = false`, verificando que a mensagem
      retornada é igual à original (mesmo `texto`), sem exceção lançada,
      e que nem `mediaFetcher`, `pdfConverter` nem `aiClient` são
      chamados.
      Cobre: R23.

- [x] T28 — Executar `npm test` e `./init.sh`; documentar a tabela de
      rastreabilidade R1–R23 → nome do teste em
      `progress/impl_feature-4.md` (a cargo do implementer, não deste
      spec).
      Cobre: R1–R23 (verificação final).
