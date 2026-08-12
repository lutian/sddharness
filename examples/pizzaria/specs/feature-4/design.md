# Design — feature-4: Processamento Multimodal com IA (Whisper e Visão)

## Arquivos a criar

```
src/ai/
├── index.js         # superfície pública do domínio (única importável de fora)
├── errors.js         # AiError e subtipos
├── client.js          # contrato (JSDoc) do adapter de IA (Whisper + Visão) injetável
├── media.js             # contrato (JSDoc) do adapter de download de mídia injetável
├── pdfConverter.js         # contrato (JSDoc) do adapter de conversão PDF→imagem injetável
├── audio.js               # transcribeAudioMessage: baixa + prepara + chama Whisper
├── image.js                 # describeImageMessage: gate do switch imageEnabled + baixa + chama visão
├── pdf.js                     # describePdfMessage: gate do switch imageEnabled + baixa + converte 1ª página + chama visão
└── conversation.js            # injectTextoExtraido / processarMensagemMultimodal (orquestração)

tests/
└── ai-multimodal.test.js   # (será escrito pelo implementer, NÃO por este agente)
```

> **Revisão pós-`spec_ready`:** o humano pediu, antes de aprovar, que a
> feature também cubra o caso de o cliente enviar um PDF (ex.: comprovante
> em PDF em vez de foto). `src/ai/pdfConverter.js` e `src/ai/pdf.js` são
> acréscimos desta revisão; nenhum arquivo já descrito acima foi removido,
> apenas `errors.js` e `conversation.js` ganham um item novo (ver seções
> abaixo).

Nenhum arquivo fora de `src/ai/` é tocado nesta feature. Em particular:

- `src/whatsapp/` (feature-3, já `done`) NÃO é modificado. O formato de
  mensagem que `WhatsAppClient` hoje entrega ao seu `processFn`
  (`{ clienteId, texto }`) permanece como está; a extensão para incluir
  `media` (áudio/imagem anexados a uma mensagem) e a fiação real entre a
  fila do WhatsApp e `processarMensagemMultimodal` é responsabilidade de
  uma feature de orquestração posterior (feature-5, "Motor de
  Conversação com OpenAI e DeepSeek", que já está descrita como
  orquestradora de IA em `feature_list.json`). Esta feature entrega a
  função pública `processarMensagemMultimodal(mensagem, ...)` pronta para
  ser chamada por quem orquestra o fluxo, recebendo uma mensagem no
  formato `{ clienteId, texto, media }` — um superconjunto compatível do
  formato já usado por `src/whatsapp/`.
- `src/menu/` (feature-2, já `done`) NÃO é modificado. O switch
  `imageEnabled` já existe em `getDefaultConfig()`/`loadConfig()`
  (`src/menu/config.js`); `src/ai/` apenas **consome** o objeto de
  configuração já carregado (`config.imageEnabled`), recebido como
  argumento pelas funções públicas, no mesmo padrão de injeção usado por
  `openDatabase(path)` e `createWhatsAppClient(adapter, options)`.

## Decisão técnica central: isolar a API da OpenAI atrás de dois adapters injetáveis

### Alternativa escolhida

Nenhuma chamada de rede real à OpenAI (Whisper ou modelo de visão)
acontece dentro de `src/ai/` nesta feature. Em vez disso, as funções
públicas recebem, por injeção de dependência, dois colaboradores:

1. **`aiClient`** (contrato documentado em `src/ai/client.js`, análogo a
   `src/whatsapp/adapter.js`):

   ```javascript
   // @typedef {object} AiClientAdapter
   // @property {(audio: { buffer: Buffer, filename: string, mimeType: string }) => Promise<string>} transcribeAudio
   // @property {(imagem: { buffer: Buffer, mimeType: string }) => Promise<string>} describeImage
   ```

2. **`mediaFetcher`** (contrato documentado em `src/ai/media.js`):

   ```javascript
   // @typedef {object} MediaFetcher
   // @property {(media: { tipo: "audio"|"imagem"|"pdf", url?: string, id?: string }) =>
   //   Promise<{ buffer: Buffer, mimeType: string }>} download
   ```

3. **`pdfConverter`** (contrato documentado em `src/ai/pdfConverter.js`,
   adicionado nesta revisão para cobrir o pedido do humano de tratar PDFs
   enviados por clientes):

   ```javascript
   // @typedef {object} PdfConverter
   // @property {(pdf: { buffer: Buffer, mimeType: string }) =>
   //   Promise<{ buffer: Buffer, mimeType: string }>} convertFirstPageToImage
   ```

`src/ai/audio.js`, `src/ai/image.js`, `src/ai/pdf.js` e
`src/ai/conversation.js` só conhecem esses três contratos — nunca
importam o SDK `openai`, nenhuma biblioteca de renderização de PDF, nem
fazem `fetch` para a rede diretamente. Um adapter concreto que envolva o
SDK `openai` real (Whisper + `gpt-4o`/modelo de visão), um `mediaFetcher`
concreto que baixe mídia de fato do WhatsApp Web (reaproveitando o
adapter de `src/whatsapp/`) e um `pdfConverter` concreto que efetivamente
renderize a primeira página de um PDF em imagem ficam para a feature que
efetivamente liga os fluxos de ponta a ponta (feature-5), fora do escopo
desta feature, cujo foco é a lógica de domínio: download → preparo/
conversão → transcrição/descrição → injeção no fluxo da conversa, e o
gate do switch `imageEnabled`.

**Justificativa:** `docs/architecture.md` (princípio 3) exige que toda
dependência externa nova seja justificada; nesta feature não há
necessidade de adicionar o SDK `openai` como dependência de execução,
porque o que precisa ser testável e correto agora é a lógica de domínio
(download → conversão → chamada → injeção → tratamento de erro), não a
integração HTTP concreta com a OpenAI. `docs/conventions.md` proíbe
chamar APIs externas reais a partir de testes e prescreve interceptar na
borda ("com um dublê de `fetch` ou do cliente concreto"); os três
adapters injetáveis **são** essa borda: `tests/ai-multimodal.test.js` usa
dublês simples de `aiClient`, `mediaFetcher` e `pdfConverter` (funções
`async` que resolvem/rejeitam valores fixos e determinísticos), sem
depender de rede, de credenciais de API, do SDK real da OpenAI nem de uma
biblioteca real de renderização de PDF. Este é o mesmo padrão já aprovado
em `src/whatsapp/adapter.js` (feature-3), reaplicado aqui para a
integração com a OpenAI e, nesta revisão, para a conversão de PDF.

### Alternativa descartada 1 — Importar o SDK `openai` diretamente em `src/ai/` e usar `vi.mock("openai")` nos testes

Descartada pelas mesmas três razões já documentadas em `specs/feature-3/design.md`
para a biblioteca do WhatsApp: (1) `docs/conventions.md` prefere
exercitar o módulo real contra uma borda controlada em vez de simular
internamente um SDK inteiro com `vi.mock`, o que tende a testar a
suposição do autor sobre o SDK, não o comportamento real do domínio; (2)
acoplar `src/ai/` ao SDK `openai` tornaria o domínio impossível de testar
sem uma chave de API válida ou um mock pesado da biblioteca, contrariando
`docs/architecture.md` ("segredos fora da árvore de fontes... os testes
usam valores fictícios"); (3) adiar a escolha e a configuração do SDK
concreto (modelo de visão exato, parâmetros do Whisper, tratamento de
rate limit) para a feature que de fato orquestra IA (feature-5) mantém
esta feature restrita ao que o `acceptance` pede — download, conversão,
chamada e injeção no fluxo — sem introduzir uma dependência de rede antes
da hora.

### Alternativa descartada 2 — Converter o áudio para outro formato com uma biblioteca de transcodificação (ex.: `ffmpeg`/`fluent-ffmpeg`)

Descartada porque a Whisper API da OpenAI já aceita diretamente os
formatos de áudio tipicamente usados em notas de voz do WhatsApp (ex.:
`audio/ogg` com codec Opus), então a "conversão" exigida pelo
`acceptance` (R2) é tratada nesta feature como **normalização do
envelope do arquivo** — associar ao `buffer` já baixado um `filename` e
`mimeType` compatíveis com o que a API espera (`prepareAudioFile`, função
interna de `src/ai/audio.js`) — não uma transcodificação real de
codec/sample rate. Isso evita adicionar uma dependência nativa pesada
(`ffmpeg` exige um binário externo, o que contraria a decisão do projeto
de não embutir binários externos, ver `docs/architecture.md`, "Stack") só
para um caso que a própria API já resolve. Se no futuro surgir um formato
de áudio realmente incompatível com a Whisper API, a transcodificação
real é reavaliada em uma feature dedicada, com sua própria dependência
justificada.

### Alternativa descartada 3 (revisão pós-`spec_ready`) — Fazer `mediaFetcher` já devolver a imagem convertida quando `media.tipo === "pdf"`

Cogitou-se não introduzir um adapter novo e, em vez disso, sobrecarregar
`mediaFetcher.download` para que, ao receber `media.tipo === "pdf"`, ele
mesmo baixasse o PDF e devolvesse diretamente `{ buffer, mimeType }` de
uma imagem já convertida — reaproveitando `describeImageMessage` sem
nenhum código novo em `src/ai/`. Descartada por três razões: (1) mistura
duas responsabilidades distintas (baixar bytes de uma URL vs. renderizar
um documento) no mesmo colaborador, contrariando `docs/architecture.md`
("Não misture IO com lógica de domínio dentro de um mesmo módulo
interno"); um adapter de download de mídia genérico não deveria precisar
saber renderizar PDF. (2) Impede testar isoladamente a falha de
conversão (R20, PDF corrompido/sem páginas) da falha de download (R19,
rede/URL inválida) — com dois adapters, cada dublê de teste falha de
forma independente, exatamente como já se faz para `aiClient` e
`mediaFetcher`. (3) Mantém o padrão já estabelecido nesta feature
(`aiClient`, `mediaFetcher` como bordas isoladas e injetáveis, sem SDK/
biblioteca concreta importada por `src/ai/`): um `pdfConverter` injetável
separado é consistente e não exige alterar o contrato já aprovado de
`mediaFetcher`. A biblioteca concreta de renderização (candidatas mais
prováveis para a feature de integração real: `pdf-to-img`, `pdfjs-dist`
com `canvas`, ou invocar `pdftoppm` do `poppler-utils`) e a escolha entre
elas ficam para a feature que liga os adapters concretos (feature-5),
seguindo a mesma política já aplicada ao SDK `openai` na Alternativa
descartada 1.

## Assinaturas novas (`src/ai/index.js`)

```javascript
// Baixa (mediaFetcher.download), prepara e transcreve uma mensagem de
// áudio via aiClient.transcribeAudio. Lança MediaDownloadError se o
// download falhar, AudioTranscriptionError se a transcrição falhar.
export async function transcribeAudioMessage({ aiClient, mediaFetcher, media })
// -> Promise<string> (texto transcrito)

// Se config.imageEnabled for false, retorna null sem chamar mediaFetcher
// nem aiClient. Se true, baixa a imagem e retorna a descrição do modelo
// de visão. Lança MediaDownloadError/ImageDescriptionError nas falhas.
export async function describeImageMessage({ aiClient, mediaFetcher, media, config })
// -> Promise<string | null>

// (Novo nesta revisão.) Se config.imageEnabled for false, retorna null
// sem chamar mediaFetcher, pdfConverter nem aiClient. Se true, baixa o
// PDF, converte a primeira página em imagem via
// pdfConverter.convertFirstPageToImage e reaproveita o mesmo fluxo de
// visão de describeImageMessage (aiClient.describeImage) sobre a imagem
// resultante. Lança MediaDownloadError/PdfConversionError/
// ImageDescriptionError nas falhas correspondentes.
export async function describePdfMessage({ aiClient, mediaFetcher, pdfConverter, media, config })
// -> Promise<string | null>

// Constrói uma nova mensagem com o texto extraído (áudio, imagem ou PDF)
// substituindo mensagem.texto, sem mutar o objeto original.
export function injectTextoExtraido(mensagem, textoExtraido)
// -> { ...mensagem, texto: textoExtraido }

// Orquestra o fluxo completo para uma mensagem { clienteId, texto, media }:
// - sem media -> retorna a mensagem original inalterada.
// - media.tipo === "audio" -> transcreve e injeta o texto.
// - media.tipo === "imagem" -> se imageEnabled, descreve e injeta;
//   se não, retorna a mensagem original inalterada.
// - media.tipo === "pdf" -> se imageEnabled, baixa, converte a 1ª página
//   e injeta a descrição gerada pelo fluxo de visão; se não, retorna a
//   mensagem original inalterada. (Novo nesta revisão.)
// - qualquer outro media.tipo -> lança UnsupportedMediaTypeError.
export async function processarMensagemMultimodal({ mensagem, aiClient, mediaFetcher, pdfConverter, config })
// -> Promise<{ clienteId, texto, ... }>
```

## Exceções (`src/ai/errors.js`)

```javascript
export class AiError extends Error {}
export class MediaDownloadError extends AiError {}
export class AudioTranscriptionError extends AiError {}
export class ImageDescriptionError extends AiError {}
export class UnsupportedMediaTypeError extends AiError {}
export class PdfConversionError extends AiError {} // novo nesta revisão
```

`PdfConversionError` é um subtipo novo, não um reaproveitamento de
`MediaDownloadError`: o download do PDF (falha de rede/URL, R19) e a
conversão da primeira página em imagem (PDF corrompido, sem páginas,
biblioteca de renderização falhando, R20) são falhas de natureza
diferente e o `reviewer`/`implementer` precisam poder distinguir qual
etapa falhou a partir do tipo da exceção — o mesmo raciocínio já usado
para separar `MediaDownloadError` de `AudioTranscriptionError`/
`ImageDescriptionError` nesta feature.

Seguindo `docs/conventions.md`: uma classe base por módulo (`AiError`) e
subtipos concretos. `AudioTranscriptionError`, `ImageDescriptionError` e
`PdfConversionError` recebem a causa original (`{ cause: erroOriginal }`,
suportado nativamente por `Error` desde Node 16.9) para não perder o
motivo da falha vindo do `aiClient`/`pdfConverter`.

## Forma esperada da mensagem (`src/ai/conversation.js`)

```javascript
{
  clienteId: "5511999999999",
  texto: "",                       // pode vir vazio quando a mensagem é só mídia
  media: {                          // ausente/null quando a mensagem é só texto
    tipo: "audio" | "imagem" | "pdf",  // "pdf" adicionado nesta revisão
    url: "...",                    // ou "id", conforme o que mediaFetcher exigir
    mimeType: "audio/ogg",         // opcional, informativo
  },
}
```

`processarMensagemMultimodal` é a única função que decide, a partir de
`media.tipo`, qual caminho (`transcribeAudioMessage`, `describeImageMessage`
ou `describePdfMessage`) acionar, e é a função que efetivamente chama
`injectTextoExtraido` para produzir a mensagem final — mantendo
`transcribeAudioMessage`/`describeImageMessage`/`describePdfMessage`
puros em relação ao formato de mensagem (recebem apenas `media`, não a
mensagem inteira), reutilizáveis fora do fluxo de conversa se necessário.

## Preparo do áudio para o Whisper (R2)

```javascript
// src/ai/audio.js (interno)
function _prepareAudioFile(buffer, mimeType) {
  // mapeia mimeType conhecidos (ex.: "audio/ogg; codecs=opus" -> "audio.ogg",
  // "audio/mpeg" -> "audio.mp3") para um filename com extensão compatível
  // com a Whisper API; usa "audio.ogg" como default quando o mimeType não é
  // reconhecido, já que é o formato mais comum de nota de voz do WhatsApp.
  // Retorna { buffer, filename, mimeType } — o mesmo buffer, sem
  // recodificação (ver "Alternativa descartada 2" acima).
}
```

## Conversão do PDF em imagem, reaproveitando o fluxo de visão (R16, R17, R19–R21)

```javascript
// src/ai/pdf.js
export async function describePdfMessage({ aiClient, mediaFetcher, pdfConverter, media, config }) {
  if (config?.imageEnabled !== true) return null;           // R18
  let pdf;
  try {
    pdf = await mediaFetcher.download(media);                // R15
  } catch (erroOriginal) {
    throw new MediaDownloadError("falha ao baixar o PDF", { cause: erroOriginal }); // R19
  }
  let imagem;
  try {
    imagem = await pdfConverter.convertFirstPageToImage(pdf); // R16
  } catch (erroOriginal) {
    throw new PdfConversionError("falha ao converter a primeira página do PDF em imagem", { cause: erroOriginal }); // R20
  }
  try {
    return await aiClient.describeImage(imagem);               // R17
  } catch (erroOriginal) {
    throw new ImageDescriptionError("falha ao descrever a imagem convertida do PDF", { cause: erroOriginal }); // R21
  }
}
```

`describePdfMessage` deliberadamente **não** reutiliza o corpo de
`describeImageMessage` chamando-o diretamente (o que exigiria simular um
"download" que já devolve a imagem), pois `describeImageMessage` baixa a
mídia via `mediaFetcher.download(media)` assumindo que `media` já
referencia uma imagem — para o PDF, `media` referencia o PDF, e a
"imagem" só existe depois da conversão. Em vez disso, `describePdfMessage`
reaproveita apenas a etapa final (`aiClient.describeImage`), que é o que
o pedido do humano chama de "fluxo de visão já existente". Isso mantém
`describeImageMessage` sem nenhuma mudança de comportamento nesta
revisão — apenas `errors.js`, `conversation.js` e `index.js` ganham
referências novas.

## Gate do switch `imageEnabled` (R6, R7, R14, R15, R18, R22, R23)

`describeImageMessage` recebe `config` (o objeto já retornado por
`loadConfig(path)` de `src/menu/`, feature-2) como argumento — nunca lê
nem importa `src/menu/` diretamente, evitando acoplar `src/ai/` ao
formato de arquivo de configuração em disco. A checagem é
`config?.imageEnabled === true`; qualquer outro valor (`false`,
`undefined`, ausência de `config`) resulta em `describeImageMessage`
retornando `null` sem efeitos colaterais (sem download, sem chamada à
API), conforme R7. `processarMensagemMultimodal` propaga esse `null`
como "mensagem original inalterada" (R14), nunca lançando exceção para
esse caso — imagens são silenciosamente ignoradas quando o switch está
desligado, como pede o `acceptance` ("quando o switch estiver ativo").

`describePdfMessage` (novo nesta revisão) segue exatamente o mesmo gate:
recebe o mesmo `config`, faz a mesma checagem `config?.imageEnabled ===
true` (R15/R18) e, quando o switch está desligado, retorna `null` sem
baixar o PDF nem invocar `pdfConverter`. É deliberado que PDFs sigam o
mesmo switch `imageEnabled` (e não um switch dedicado): o pedido do
humano é "enviar essa imagem para a OpenAI (fluxo de visão)" — ou seja, o
PDF é apenas mais um caminho de entrada para o mesmo fluxo de visão que
já existe para imagens, então reaproveita o mesmo controle de
liga/desliga. `processarMensagemMultimodal` trata o `null` de
`describePdfMessage` da mesma forma que trata o de `describeImageMessage`
(R23: mensagem original inalterada, sem exceção).

## Alternativa de estrutura descartada

Considerou-se unir toda a lógica de áudio, imagem e (nesta revisão) PDF em
um único arquivo `src/ai/multimodal.js`, dado que os três compartilham o
mesmo padrão download → chamada → tratamento de erro. É descartada
porque `docs/conventions.md` prescreve manter os detalhes de IO/lógica em
arquivos internos separados dentro do mesmo domínio, e áudio, imagem e
PDF têm regras de negócio distintas (áudio sempre processa; imagem é
condicional ao switch `imageEnabled`; PDF é condicional ao mesmo switch
mas tem uma etapa extra de conversão com seu próprio tipo de erro) —
mantê-los em `audio.js`, `image.js` e `pdf.js` separados, com
`conversation.js` orquestrando os três, segue o mesmo padrão já usado em
`src/db/` (`clientes.js`, `sessoes.js`, `pedidos.js`) e `src/whatsapp/`
(`client.js`, `queue.js`, `adapter.js` separados).
