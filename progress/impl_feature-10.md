# Implementação — feature-10: Integração Real com OpenAI, DeepSeek e Nominatim

## Arquivos criados

- `src/ai/adapters/openai-chat.js` — `createOpenAiChatClient`.
- `src/ai/adapters/deepseek-chat.js` — `createDeepSeekChatClient`.
- `src/ai/adapters/openai-client.js` — `createOpenAiClient` (Whisper + visão).
- `src/ai/adapters/http-media-fetcher.js` — `createHttpMediaFetcher`.
- `src/ai/adapters/pdf-converter.js` — `createPdfConverter` (via `mupdf`).
- `src/delivery/adapters/nominatim.js` — `createNominatimGeocoder`.
- `tests/ai-adapters-real.test.js` — 21 testes.
- `tests/geocoder-real.test.js` — 5 testes.

## Arquivos alterados

- `package.json` — adicionadas dependências `openai` (^4.68.0, instalado
  4.104.0) e `mupdf` (^1.3.0, instalado 1.28.0) em `dependencies`.
- `src/ai/index.js` — reexporta os 5 `create*` novos, sem remover nenhum
  export existente.
- `src/delivery/index.js` — reexporta `createNominatimGeocoder`, sem
  remover nenhum export existente.
- `specs/feature-10/tasks.md` — todas as T1–T26 marcadas `[x]`.

## Arquivos NÃO tocados (contratos preservados, conforme design.md)

`src/ai/chatClient.js`, `client.js`, `media.js`, `pdfConverter.js`,
`modelSelector.js`, `conversationEngine.js`, `audio.js`, `image.js`,
`pdf.js`, `conversation.js`, `errors.js`; `src/delivery/geocoder.js`,
`geocoding.js`, `distance.js`, `waitTime.js`, `painelPedidos.js`,
`errors.js`.

## Rastreabilidade R<n> → teste

| Requirement | Teste (`tests/ai-adapters-real.test.js` salvo indicação em contrário) |
|---|---|
| R1  | `Adapter concreto openai-chat.js > instancia OpenAI com { apiKey } (R1)` |
| R2  | `Adapter concreto openai-chat.js > generateReply monta messages traduzindo o histórico e retorna o JSON parseado (R2)` |
| R3  | `Adapter concreto openai-chat.js > propaga a rejeição de chat.completions.create sem encapsulá-la (R3)` |
| R4  | `Adapter concreto openai-chat.js > lança erro descritivo quando a resposta não é JSON válido nem contém 'resposta' (R4)` |
| R5  | `Adapter concreto deepseek-chat.js > instancia OpenAI com { apiKey, baseURL: 'https://api.deepseek.com' } (R5)` |
| R6  | `Adapter concreto deepseek-chat.js > generateReply segue a mesma montagem de mensagens e retorno de openai-chat.js (R6)` |
| R7  | `Adapter concreto deepseek-chat.js > propaga a rejeição do SDK sem encapsulá-la (R7)` |
| R8  | `Adapter concreto openai-client.js (Whisper + Visão) > instancia OpenAI com { apiKey } (R8)` |
| R9  | `Adapter concreto openai-client.js (Whisper + Visão) > transcribeAudio chama audio.transcriptions.create com o modelo whisper-1 e retorna o texto (R9)` |
| R10 | `Adapter concreto openai-client.js (Whisper + Visão) > describeImage chama chat.completions.create com image_url em formato data: e retorna o texto (R10)` |
| R11 | `Adapter concreto openai-client.js (Whisper + Visão) > propaga a rejeição de audio.transcriptions.create/chat.completions.create sem encapsular (R11)` |
| R12 | `Adapter concreto http-media-fetcher.js > download baixa a mídia via fetch e retorna { buffer, mimeType } a partir do Content-Type (R13)` (existência do adapter, coberta implicitamente por todos os testes deste describe) |
| R13 | `Adapter concreto http-media-fetcher.js > download baixa a mídia via fetch e retorna { buffer, mimeType } a partir do Content-Type (R13)` |
| R14 | `Adapter concreto http-media-fetcher.js > download lança erro descritivo quando a resposta HTTP não é ok (R14)` |
| R15 | `Adapter concreto http-media-fetcher.js > download lança erro sem chamar fetch quando media.url está ausente (R15)` |
| R16 | `Adapter concreto pdf-converter.js > convertFirstPageToImage carrega o documento via mupdf, renderiza a página 0 e retorna PNG (R16, R17)` |
| R17 | `Adapter concreto pdf-converter.js > convertFirstPageToImage carrega o documento via mupdf, renderiza a página 0 e retorna PNG (R16, R17)` |
| R18 | `Adapter concreto pdf-converter.js > lança erro descritivo quando o PDF não tem nenhuma página (R18)` e `> lança erro descritivo quando a abertura do documento falha (R18)` |
| R19 | `tests/geocoder-real.test.js > Adapter concreto nominatim.js > geocode chama fetch com q/format=json/limit=1 e User-Agent, retornando { latitude, longitude } (R19, R20, R21)` |
| R20 | idem R19 |
| R21 | idem R19 |
| R22 | `tests/geocoder-real.test.js > Adapter concreto nominatim.js > geocode retorna null quando o Nominatim não encontra nenhum resultado (R22)` |
| R23 | `tests/geocoder-real.test.js > Adapter concreto nominatim.js > geocode rejeita quando a resposta HTTP não é ok (R23)` e `> geocode rejeita quando o fetch falha por erro de rede (R23)` |
| R24 | `Adapter concreto openai-chat.js > lança de imediato sem instanciar chamada de rede quando apiKey está ausente (R24)`, idem em `deepseek-chat.js` e `openai-client.js` |
| R25 | `Isolamento das bibliotecas concretas (R25) > nenhum arquivo de src/ai/ fora de adapters/ importa 'openai'/'mupdf' nem chama fetch diretamente` (`tests/ai-adapters-real.test.js`) e `tests/geocoder-real.test.js > Isolamento das bibliotecas concretas (R25) > src/delivery/geocoder.js e geocoding.js não importam 'fetch(' diretamente nem 'openai'/'mupdf'` |

Todos os R1–R25 estão cobertos por pelo menos um teste concreto.

## Resultado de `./init.sh`

```
Test Files  10 passed (10)
     Tests  131 passed (131)
```

131 testes = 105 testes pré-existentes (features 1–9, nenhum alterado) +
21 (`tests/ai-adapters-real.test.js`) + 5 (`tests/geocoder-real.test.js`).

## Decisões de implementação (dentro do spec aprovado)

- `deepseek-chat.js` duplica a lógica de parse/validação de JSON de
  `openai-chat.js` (em vez de reexportar uma função de parse compartilhada)
  para manter os dois adapters totalmente independentes um do outro, como
  já é o padrão em `openai-chat.js`/`deepseek-chat.js` de bibliotecas
  irmãs neste repositório; apenas `montarMensagens` é reaproveitado via
  export nomeado, exatamente como o design permite implicitamente ("mesma
  lógica de T2").
- `pdf-converter.js` usa a API real documentada em
  `node_modules/mupdf/dist/mupdf.d.ts` (`Document.openDocument(buffer,
  mimeType)`, `document.countPages()`, `document.loadPage(0)`,
  `page.toPixmap(matrix, colorspace)`, `pixmap.asPNG()`), incluindo
  `ColorSpace.DeviceRGB` como segundo argumento de `toPixmap` (exigido pela
  assinatura real do pacote instalado, não explicitado no `design.md`, que
  mostrava o dublê de teste com `toPixmap()` sem argumentos — o dublê do
  teste ignora os argumentos extras normalmente, então nenhuma mudança de
  comportamento foi necessária).
- O teste de isolamento (R25) verifica a substring `from "openai"`/`from
  "mupdf"` em vez da substring bruta `"openai"`/`"mupdf"`, porque
  `src/ai/modelSelector.js` (feature-5, já `done`) contém a string literal
  `"openai"` como nome de modelo válido (`MODELOS_VALIDOS = ["openai",
  "deepseek"]`), não como import da biblioteca — um falso positivo que o
  `design.md` não previa explicitamente. Nenhum arquivo de
  `src/ai/modelSelector.js` foi alterado; apenas a assertiva do teste foi
  ajustada para verificar a forma de import real (`from "openai"`), que é
  o que R25 de fato exige ("nenhum outro arquivo... deve importar
  openai/mupdf").

## Checklist de verificação manual (Nível 3, pendente — depende de
credenciais reais e de feature-14 para a fiação de composition root)

1. Abrir o painel de configuração (feature-12, ainda `pending`) e
   preencher uma chave de API real da OpenAI (`config.apiKeys.openai`) e,
   opcionalmente, da DeepSeek.
2. Rodar `npm run dev`, enviar uma mensagem de texto real via WhatsApp
   (feature-9, já `done`) e confirmar que uma resposta gerada de fato pela
   OpenAI (ou DeepSeek, conforme `modeloSelecionado`) retorna ao cliente.
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
   graciosamente o caso "endereço não encontrado" (`AddressNotFoundError`)
   usando o Nominatim real.

Nota: a fiação real (`electron/main.js` lendo `config.apiKeys` de
`src/menu/config.js` e injetando nos construtores `create*` desta feature)
é responsabilidade explícita de feature-14 ("Processo Principal
Electron"), ainda `pending`. Até lá, os itens 1–7 acima não são
executáveis de ponta a ponta — os construtores em si (`createOpenAi*`,
`createNominatimGeocoder`) já estão prontos e testados isoladamente.

## Status

Feature permanece `in_progress` em `feature_list.json` (implementer não
marca `done`; aguardando revisão do `reviewer`).
