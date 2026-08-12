# Implementação — feature-4: Processamento Multimodal com IA (Whisper e Visão)

## Arquivos criados

```
src/ai/errors.js         # AiError, MediaDownloadError, AudioTranscriptionError,
                          # ImageDescriptionError, UnsupportedMediaTypeError,
                          # PdfConversionError
src/ai/client.js         # contrato JSDoc do aiClient injetável
src/ai/media.js          # contrato JSDoc do mediaFetcher injetável
src/ai/pdfConverter.js   # contrato JSDoc do pdfConverter injetável
src/ai/audio.js          # transcribeAudioMessage + _prepareAudioFile
src/ai/image.js          # describeImageMessage (gate imageEnabled)
src/ai/pdf.js            # describePdfMessage (gate imageEnabled + conversão)
src/ai/conversation.js   # injectTextoExtraido + processarMensagemMultimodal
src/ai/index.js          # superfície pública do domínio
tests/ai-multimodal.test.js
```

Nenhum arquivo fora de `src/ai/` e `tests/ai-multimodal.test.js` foi tocado,
conforme `design.md`.

## Rastreabilidade R<n> → teste

Arquivo: `tests/ai-multimodal.test.js`. Todos os testes estão em
`describe("Processamento multimodal com IA (Whisper e Visão)", ...)`.

| Requisito | Teste (`it(...)`) |
|---|---|
| R1 | `describe("transcribeAudioMessage")` → "baixa o áudio antes de chamar aiClient.transcribeAudio e retorna exatamente o texto transcrito" |
| R2 | mesmo teste acima — `_prepareAudioFile` é exercitado implicitamente via `aiClient.chamadas.transcribeAudio` recebendo `{ buffer, filename, mimeType }` a partir do buffer/mimeType do dublê de `mediaFetcher` |
| R3 | mesmo teste acima — `expect(texto).toBe("quero uma pizza de calabresa")` |
| R4 | "lança MediaDownloadError e não chama aiClient.transcribeAudio quando o download do áudio falha" |
| R5 | "lança AudioTranscriptionError com a causa original quando aiClient.transcribeAudio falha" |
| R6 | `describe("describeImageMessage")` → "com imageEnabled=true, baixa a imagem, chama aiClient.describeImage e retorna o texto descritivo" |
| R7 | "com imageEnabled=false, retorna null sem chamar mediaFetcher.download nem aiClient.describeImage" |
| R8 | "lança MediaDownloadError e não chama aiClient.describeImage quando o download da imagem falha" |
| R9 | "lança ImageDescriptionError com a causa original quando aiClient.describeImage falha" |
| R10 | `describe("processarMensagemMultimodal")` → "com media.tipo='audio', retorna a mensagem com texto transcrito, clienteId preservado e sem mutar o objeto original" |
| R11 | "com media.tipo='imagem' e imageEnabled=true, retorna a mensagem com texto descritivo, clienteId preservado e sem mutar o objeto original" |
| R12 | "lança UnsupportedMediaTypeError e não chama mediaFetcher, pdfConverter nem aiClient para media.tipo desconhecido" |
| R13 | "sem o campo media (ou com media nulo), retorna a mensagem original inalterada sem chamar mediaFetcher, pdfConverter nem aiClient" |
| R14 | "com media.tipo='imagem' e imageEnabled=false, retorna a mensagem original inalterada sem lançar exceção nem chamar mediaFetcher/aiClient" |
| R15 | `describe("describePdfMessage")` → "com imageEnabled=true, baixa o PDF, converte a primeira página e chama aiClient.describeImage nessa ordem" |
| R16 | mesmo teste acima — ordem `["download", "convert", "describe"]` verificada explicitamente |
| R17 | mesmo teste acima — `expect(texto).toBe("comprovante em PDF de R$ 50,00")` |
| R18 | "com imageEnabled=false, retorna null sem chamar mediaFetcher, pdfConverter nem aiClient" |
| R19 | "lança MediaDownloadError e não chama pdfConverter nem aiClient.describeImage quando o download do PDF falha" |
| R20 | "lança PdfConversionError com a causa original quando a conversão da primeira página falha (PDF corrompido/sem páginas)" |
| R21 | "lança ImageDescriptionError com a causa original quando aiClient.describeImage falha após download e conversão bem-sucedidos" |
| R22 | `describe("processarMensagemMultimodal")` → "com media.tipo='pdf' e imageEnabled=true, retorna a mensagem com texto descritivo da 1ª página convertida, clienteId preservado e sem mutar o objeto original" |
| R23 | "com media.tipo='pdf' e imageEnabled=false, retorna a mensagem original inalterada sem lançar exceção nem chamar mediaFetcher/pdfConverter/aiClient" |

## Verificação

- `npx vitest run tests/ai-multimodal.test.js` — 19 testes, todos verdes.
- `./init.sh` — ambiente completo, 4 arquivos de teste, 50 testes, todos
  verdes (`tests/ai-multimodal.test.js`, `tests/database.test.js`,
  `tests/whatsapp-queue.test.js`, `tests/config-menu.test.js`).

## Tasks

Todas as tasks T1–T28 de `specs/feature-4/tasks.md` foram marcadas `[x]`.

## Observações de implementação

- Seguido o mesmo padrão de adapter injetável já usado em
  `src/whatsapp/adapter.js` (feature-3): `src/ai/client.js`, `src/ai/media.js`
  e `src/ai/pdfConverter.js` só documentam contratos via JSDoc (`export {}`),
  sem importar nenhum SDK/biblioteca concreta.
- `describeImageMessage`/`describePdfMessage` consomem `config.imageEnabled`
  recebido por injeção, sem importar `src/menu/` diretamente — mesmo padrão
  de `openDatabase(path)`/`createWhatsAppClient(adapter, options)`.
- `PdfConversionError` implementado como subtipo distinto de
  `MediaDownloadError`, permitindo aos testes (R19 vs. R20) isolar a falha
  de download da falha de conversão.
- `processarMensagemMultimodal` não muta o objeto `mensagem` original em
  nenhum caminho (usa spread em `injectTextoExtraido`; nos casos de retorno
  "inalterado" devolve a própria referência original).
- Não marquei a feature como `done` em `feature_list.json` — status
  permanece `in_progress`, aguardando aprovação do reviewer/leader.
