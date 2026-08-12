# Requirements — feature-4: Processamento Multimodal com IA (Whisper e Visão)

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/ai-multimodal.test.js`. Mapeamento aos 4 `acceptance` originais de
> `feature_list.json` ao final do documento.

## R1
QUANDO `transcribeAudioMessage` é invocado com uma mensagem de mídia do
tipo áudio e um `mediaFetcher` injetado, o sistema DEVE baixar o conteúdo
binário do áudio chamando `mediaFetcher.download(media)` antes de
qualquer chamada ao Whisper.

## R2
QUANDO o download do áudio é concluído com sucesso, o sistema DEVE
preparar o arquivo de áudio (nome de arquivo e `mimeType` compatíveis com
a API do Whisper) a partir do `buffer` e do `mimeType` retornados por
`mediaFetcher.download`, sem alterar o conteúdo binário original.

## R3
QUANDO o áudio preparado é enviado a `aiClient.transcribeAudio`, o
sistema DEVE retornar, como resultado de `transcribeAudioMessage`,
exatamente o texto transcrito devolvido pelo `aiClient`.

## R4
SE `mediaFetcher.download(media)` falhar (rejeitar a promise) durante o
processamento de uma mensagem de áudio ENTÃO o sistema DEVE lançar
`AiError` (subtipo `MediaDownloadError`) e NÃO DEVE chamar
`aiClient.transcribeAudio`.

## R5
SE `aiClient.transcribeAudio` falhar (rejeitar a promise) ENTÃO o sistema
DEVE lançar `AiError` (subtipo `AudioTranscriptionError`) contendo a
causa original do erro.

## R6
ONDE a configuração `imageEnabled` estiver `true`, `describeImageMessage`
DEVE baixar a imagem via `mediaFetcher.download(media)` e enviar seu
conteúdo para `aiClient.describeImage`, retornando o texto descritivo
produzido.

## R7
ONDE a configuração `imageEnabled` estiver `false`, `describeImageMessage`
DEVE retornar `null` sem chamar `mediaFetcher.download` nem
`aiClient.describeImage`.

## R8
SE `mediaFetcher.download(media)` falhar durante o processamento de uma
mensagem de imagem com `imageEnabled` ativo ENTÃO o sistema DEVE lançar
`AiError` (subtipo `MediaDownloadError`) e NÃO DEVE chamar
`aiClient.describeImage`.

## R9
SE `aiClient.describeImage` falhar (rejeitar a promise) ENTÃO o sistema
DEVE lançar `AiError` (subtipo `ImageDescriptionError`) contendo a causa
original do erro.

## R10
QUANDO `processarMensagemMultimodal` processa uma mensagem cujo
`media.tipo` é `"audio"`, o sistema DEVE retornar uma nova mensagem cujo
campo `texto` é o texto transcrito pelo Whisper, preservando `clienteId`,
sem mutar o objeto de mensagem original.

## R11
QUANDO `processarMensagemMultimodal` processa uma mensagem cujo
`media.tipo` é `"imagem"` com `imageEnabled` ativo, o sistema DEVE
retornar uma nova mensagem cujo campo `texto` é o texto descritivo
gerado pelo modelo de visão, preservando `clienteId`, sem mutar o objeto
de mensagem original.

## R12
SE `processarMensagemMultimodal` receber uma mensagem cujo `media.tipo`
não seja `"audio"`, `"imagem"` nem `"pdf"` ENTÃO o sistema DEVE lançar
`AiError` (subtipo `UnsupportedMediaTypeError`) e NÃO DEVE chamar
`mediaFetcher` nem `aiClient`.

## R13
QUANDO `processarMensagemMultimodal` processa uma mensagem sem o campo
`media` (ou com `media` nulo/ausente), o sistema DEVE retornar a
mensagem original inalterada, sem chamar `mediaFetcher` nem `aiClient`.

## R14
QUANDO `processarMensagemMultimodal` processa uma mensagem cujo
`media.tipo` é `"imagem"` com `imageEnabled` desativado, o sistema DEVE
retornar a mensagem original com seu campo `texto` inalterado (a imagem é
ignorada), sem lançar exceção.

## R15
ONDE a configuração `imageEnabled` estiver `true`, `describePdfMessage`
DEVE baixar o PDF via `mediaFetcher.download(media)` antes de qualquer
conversão ou chamada ao modelo de visão.

## R16
QUANDO o download do PDF é concluído com sucesso, o sistema DEVE
converter a primeira página do PDF em imagem chamando
`pdfConverter.convertFirstPageToImage({ buffer, mimeType })` antes de
enviar qualquer conteúdo a `aiClient.describeImage`.

## R17
QUANDO a conversão da primeira página do PDF em imagem é concluída com
sucesso, `describePdfMessage` DEVE enviar o `buffer`/`mimeType` da imagem
resultante para `aiClient.describeImage`, retornando exatamente o texto
descritivo devolvido pelo `aiClient`.

## R18
ONDE a configuração `imageEnabled` estiver `false`, `describePdfMessage`
DEVE retornar `null` sem chamar `mediaFetcher.download`,
`pdfConverter.convertFirstPageToImage` nem `aiClient.describeImage`.

## R19
SE `mediaFetcher.download(media)` falhar durante o processamento de uma
mensagem de PDF com `imageEnabled` ativo ENTÃO o sistema DEVE lançar
`AiError` (subtipo `MediaDownloadError`) e NÃO DEVE chamar
`pdfConverter.convertFirstPageToImage` nem `aiClient.describeImage`.

## R20
SE `pdfConverter.convertFirstPageToImage` falhar (rejeitar a promise —
por exemplo, PDF corrompido ou sem páginas) ENTÃO o sistema DEVE lançar
`AiError` (subtipo `PdfConversionError`) contendo a causa original do
erro e NÃO DEVE chamar `aiClient.describeImage`.

## R21
SE `aiClient.describeImage` falhar (rejeitar a promise) durante o
processamento de uma mensagem de PDF ENTÃO o sistema DEVE lançar
`AiError` (subtipo `ImageDescriptionError`) contendo a causa original do
erro.

## R22
QUANDO `processarMensagemMultimodal` processa uma mensagem cujo
`media.tipo` é `"pdf"` com `imageEnabled` ativo, o sistema DEVE retornar
uma nova mensagem cujo campo `texto` é o texto descritivo gerado a partir
da primeira página convertida do PDF, preservando `clienteId`, sem mutar
o objeto de mensagem original.

## R23
QUANDO `processarMensagemMultimodal` processa uma mensagem cujo
`media.tipo` é `"pdf"` com `imageEnabled` desativado, o sistema DEVE
retornar a mensagem original com seu campo `texto` inalterado (o PDF é
ignorado), sem lançar exceção.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                    | Coberto por                  |
|--------------------------------------------------------------------------------------------------------------------------------|-------------------------------|
| Mensagens de áudio recebidas no WhatsApp são baixadas, convertidas e enviadas para o Whisper gerando o texto correspondente. | R1, R2, R3, R4, R5, R12       |
| Imagens enviadas pelos clientes (como comprovantes ou fotos) são processadas pelo modelo de visão da OpenAI quando o switch estiver ativo. | R6, R7, R8, R9, R12, R14      |
| O texto extraído de áudios e imagens é injetado no fluxo da conversa da IA.                                                  | R10, R11, R13                 |
| tests/ai-multimodal.test.js valida o fluxo de tratamento de áudio e imagem.                                                  | R1–R14 (implementação de teste) |

### Extensão pós-revisão (pedido humano, ainda não presente nos `acceptance` de `feature_list.json`)

| Extensão solicitada                                                                                                              | Coberto por        |
|------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| Quando o cliente enviar um PDF, o sistema deve baixar o arquivo e converter a primeira página em imagem, enviando-a para o fluxo de visão da OpenAI. | R12, R15, R16, R17, R18, R19, R20, R21, R22, R23 |
