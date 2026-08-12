# Review — feature feature-10

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes

- R1: [x] `tests/ai-adapters-real.test.js` — `"instancia OpenAI com { apiKey } (R1)"`
- R2: [x] `"generateReply monta messages traduzindo o histórico e retorna o JSON parseado (R2)"`
- R3: [x] `"propaga a rejeição de chat.completions.create sem encapsulá-la (R3)"`
- R4: [x] `"lança erro descritivo quando a resposta não é JSON válido nem contém 'resposta' (R4)"`
- R5: [x] `"instancia OpenAI com { apiKey, baseURL: 'https://api.deepseek.com' } (R5)"`
- R6: [x] `"generateReply segue a mesma montagem de mensagens e retorno de openai-chat.js (R6)"`
- R7: [x] `"propaga a rejeição do SDK sem encapsulá-la (R7)"`
- R8: [x] `"instancia OpenAI com { apiKey } (R8)"` (describe `openai-client.js`)
- R9: [x] `"transcribeAudio chama audio.transcriptions.create com o modelo whisper-1 e retorna o texto (R9)"`
- R10: [x] `"describeImage chama chat.completions.create com image_url em formato data: e retorna o texto (R10)"`
- R11: [x] `"propaga a rejeição de audio.transcriptions.create/chat.completions.create sem encapsular (R11)"`
- R12: [x] coberto implicitamente pela existência/uso de `createHttpMediaFetcher()` em todos os testes do describe `"Adapter concreto http-media-fetcher.js"` (R13/R14/R15)
- R13: [x] `"download baixa a mídia via fetch e retorna { buffer, mimeType } a partir do Content-Type (R13)"`
- R14: [x] `"download lança erro descritivo quando a resposta HTTP não é ok (R14)"`
- R15: [x] `"download lança erro sem chamar fetch quando media.url está ausente (R15)"`
- R16: [x] `"convertFirstPageToImage carrega o documento via mupdf, renderiza a página 0 e retorna PNG (R16, R17)"`
- R17: [x] idem R16
- R18: [x] `"lança erro descritivo quando o PDF não tem nenhuma página (R18)"` e `"...quando a abertura do documento falha (R18)"`
- R19: [x] `tests/geocoder-real.test.js` — `"geocode chama fetch com q/format=json/limit=1 e User-Agent, retornando { latitude, longitude } (R19, R20, R21)"`
- R20: [x] idem R19
- R21: [x] idem R19
- R22: [x] `"geocode retorna null quando o Nominatim não encontra nenhum resultado (R22)"`
- R23: [x] `"geocode rejeita quando a resposta HTTP não é ok (R23)"` e `"...quando o fetch falha por erro de rede (R23)"`
- R24: [x] três testes `"lança de imediato sem instanciar chamada de rede quando apiKey está ausente (R24)"` (openai-chat, deepseek-chat, openai-client)
- R25: [x] `"nenhum arquivo de src/ai/ fora de adapters/ importa 'openai'/'mupdf' nem chama fetch diretamente"` (`ai-adapters-real.test.js`) e `"src/delivery/geocoder.js e geocoding.js não importam 'fetch(' diretamente nem 'openai'/'mupdf'"` (`geocoder-real.test.js`)

Todos os 25 requirements têm cobertura concreta e rastreável. Nenhum
`R<n>` ficou sem teste.

## Tasks completas

Todas as tasks T1–T26 de `specs/feature-10/tasks.md` estão marcadas
`[x]` e correspondem ao que foi de fato implementado (verificado por
leitura direta dos 6 adapters, dos 2 arquivos de teste, dos `index.js` e
do `package.json`).

## Verificação da estratégia de teste sem rede real

Confirmado por leitura direta de `tests/ai-adapters-real.test.js` e
`tests/geocoder-real.test.js`:

- `vi.mock("openai", ...)` (linhas 14–28 de `ai-adapters-real.test.js`)
  substitui `OpenAI`/`toFile` por dublês (`FakeOpenAI`) com
  `chat.completions.create`/`audio.transcriptions.create` como `vi.fn()`
  — nenhuma chamada real ao SDK.
- `vi.mock("mupdf", ...)` (linhas 34–46) substitui `Document`/`Matrix`/
  `ColorSpace` por dublês controlados — nenhuma renderização real de PDF.
- `vi.stubGlobal("fetch", vi.fn())` + `vi.unstubAllGlobals()` em
  `afterEach` isola o `fetch` global tanto no describe de
  `http-media-fetcher.js` (linhas 279–318) quanto em
  `geocoder-real.test.js` (linhas 7–59) — nenhuma requisição HTTP real.
- Não há nenhuma URL real (`https://api.openai.com`,
  `https://api.deepseek.com`, `https://nominatim.openstreetmap.org`)
  usada como alvo de uma chamada de rede não mockada em nenhum dos dois
  arquivos de teste.

Estratégia corretamente aplicada, conforme `docs/conventions.md`
("intercepte na borda HTTP... nunca se bate na API real") e
`docs/architecture.md` ("Não chame APIs externas reais a partir de
testes").

## Checkpoints

- C1: [x] Arquivos base presentes; `./init.sh` termina com exit code 0.
- C2: [x] Apenas `feature-10` em `in_progress` em `feature_list.json`;
  `progress/current.md` reflete a sessão ativa sem lixo de sessões
  anteriores.
- C3: [x] `src/` contém somente os domínios previstos
  (`src/ai/adapters/`, `src/delivery/adapters/` são subdiretórios
  internos dos domínios já existentes); dependências novas (`openai`,
  `mupdf`) justificadas em `specs/feature-10/design.md`; nenhum
  `console.log`/TODO nos arquivos novos (confirmado via `grep`).
- C4: [x] `tests/ai-adapters-real.test.js` (21 testes) e
  `tests/geocoder-real.test.js` (5 testes) cobrem os 6 novos módulos
  públicos; a estratégia de mock na borda (SDK/`fetch`) é a prevista
  pelo próprio `docs/verification.md` para integrações externas; `npm
  test`/`./init.sh` mostram 131 testes, todos verdes.
- C5: [x] Nenhum arquivo suspeito não rastreado (`*.tmp`,
  `node_modules/`, `*.sqlite`); `progress/history.md`/`current.md`
  refletem a sessão; feature-10 corretamente em `in_progress` (aguardando
  este veredito antes de virar `done`, decisão do leader).
- C6: [x] `specs/feature-10/` tem os 3 arquivos; `requirements.md` usa
  EARS estrito; todas as tasks `[x]`; todo `R<n>` coberto por teste
  concreto.

## Observações (não bloqueantes)

1. Duas linhas excedem o limite de 100 colunas de `docs/conventions.md`:
   `src/ai/adapters/pdf-converter.js:31` (103 col.) e
   `src/delivery/adapters/nominatim.js:17` (104 col.). É uma violação
   real da convenção, mas o mesmo padrão já existe em 9 linhas
   pré-existentes de código já `done` (ex.: `src/ai/chatClient.js:19`,
   `src/db/pedidos.js:45/93`, `src/menu/cardapio.js:19/24/30`), então não
   é uma regressão introduzida por esta feature nem motivo isolado de
   rejeição — mas vale corrigir numa próxima limpeza de estilo.
2. O ajuste do implementer no teste de isolamento (R25) — checar a
   substring `from "openai"`/`from "mupdf"` em vez da string bruta
   `"openai"`/`"mupdf"` — é razoável e foi confirmado por leitura direta:
   `src/ai/modelSelector.js` de fato contém a string literal `"openai"`
   como valor de `MODELOS_VALIDOS`/retorno de `selectChatClient`, não
   como import de biblioteca (`grep` confirma ausência de qualquer
   `import ... from "openai"`/`from "mupdf"` em todos os 12 arquivos de
   contrato verificados). O ajuste continua validando exatamente o que
   R25 exige ("nenhum outro arquivo... deve importar openai/mupdf") sem
   contorná-lo — não é um enfraquecimento do teste, é uma correção de
   falso positivo.
3. Os arquivos de contrato de features 4/5/6
   (`chatClient.js`, `client.js`, `media.js`, `pdfConverter.js`,
   `modelSelector.js`, `conversationEngine.js`, `audio.js`, `image.js`,
   `pdf.js`, `conversation.js`, `geocoder.js`, `geocoding.js`) foram
   confirmados intocados por leitura direta (nenhum `import`/referência
   a `openai`/`mupdf`/`fetch(` fora de `adapters/`); como o repositório
   git ainda não tem histórico anterior a "first commit" para esses
   arquivos (todos aparecem como `??` no `git status`), a confirmação
   foi feita por inspeção de conteúdo em vez de `git diff`, o que é
   suficiente para o propósito desta revisão.
4. A nota de que a fiação completa (composition root injetando
   `config.apiKeys` real nos construtores) depende de feature-14
  (`pending`) é coerente com `feature_list.json` (feature-14 lista
  feature-10 como pré-requisito) e com o próprio `design.md`/`tasks.md`
  desta feature, que nunca prometeram tocar `electron/main.js`. O
  checklist de verificação manual (Nível 3) em `progress/impl_feature-10.md`
  é claro, numerado e specifica exatamente que credenciais/fluxos reais
  faltam testar depois da fiação.

## Mudanças necessárias

Nenhuma. Feature aprovada.
