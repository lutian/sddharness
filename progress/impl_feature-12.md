# Implementação — feature-12: Interface React — Painel de Configuração

## Arquivos criados

- `src/ui/panels/config/localDataClient.js` — implementação padrão de
  `dataClient` (delega a `src/menu/index.js`).
- `src/ui/panels/config/CardapioEditor.jsx` — edição em memória do
  cardápio (nome/preço), com validação client-side de preço.
- `src/ui/panels/config/ConfigForm.jsx` — formulário de configuração
  (API keys, system prompt, switches, modelo) + ação de salvar.
- `src/ui/panels/config/ConfigPanel.jsx` — componente raiz do painel,
  carrega dados via `dataClient` e orquestra `CardapioEditor`/
  `ConfigForm`.
- `src/ui/panels/config/index.js` — porta pública (`ConfigPanel`).
- `tests/config-panel-ui.test.js` — 12 testes (Vitest + testing-library
  + jsdom).

## Arquivos alterados

- `specs/feature-12/tasks.md` — T1–T10 marcadas `[x]`.

## Nenhum arquivo tocado fora do escopo

Nenhum arquivo de `src/menu/`, `src/db/`, `src/whatsapp/`, `src/ai/`,
`src/delivery/`, `electron/` foi criado ou alterado, conforme
`design.md` ("Fora do escopo").

## Rastreabilidade R<n> → teste

Todos os testes estão em `tests/config-panel-ui.test.js`.

| Requirement | Teste (describe > it) |
|---|---|
| R1 (chama loadCardapio/loadConfig 1x cada, renderiza dados) | `ConfigPanel — carregamento inicial > chama loadCardapio() e loadConfig() exatamente uma vez cada e renderiza os dados retornados` |
| R2 (renderiza categorias/itens com nome e preço) | mesmo teste acima (asserções de `Pizzas`/`Bebidas`/itens com nome e preço) |
| R3 (edição de nome/preço reflete no campo, demais inalterados) | `ConfigPanel — edição do cardápio > reflete a edição de nome e preço de um item, mantendo os demais inalterados` |
| R4 (preço não numérico exibe erro de validação) | `ConfigPanel — edição do cardápio > exibe uma mensagem de erro de validação ao digitar um preço não numérico` |
| R5 (campos de config preenchidos com valores de loadConfig) | `ConfigPanel — carregamento inicial > chama loadCardapio() e loadConfig() exatamente uma vez cada e renderiza os dados retornados` (asserções de `apiKeys`/`systemPrompt`/switches/modelo) |
| R6 (edição de API keys e system prompt reflete no estado) | `ConfigPanel — edição de configuração > reflete a edição das chaves de API e do system prompt` |
| R7 (switches de áudio/imagem invertem ao alternar) | `ConfigPanel — edição de configuração > inverte o estado dos switches de áudio e imagem ao alternar` |
| R8 (seleção de modelo atualiza modeloSelecionado) | `ConfigPanel — edição de configuração > atualiza modeloSelecionado ao selecionar um modelo diferente` |
| R9 (saveConfig chamado 1x com valores atuais do formulário) | `ConfigPanel — salvamento de configuração > chama dataClient.saveConfig() exatamente uma vez com os valores atuais do formulário` |
| R10 (sucesso exibe indicação visual, sem mensagem de erro) | `ConfigPanel — salvamento de configuração > exibe indicação de sucesso e nenhum erro quando saveConfig resolve` |
| R11 (rejeição é capturada, erro exibido, sem exceção não tratada) | `ConfigPanel — salvamento de configuração > captura a rejeição de saveConfig, exibe a mensagem de erro e não propaga exceção` |
| R12 (composição exclusiva com Card/Badge/Button/Navbar/ThemeToggle) | `ConfigPanel — composição com o sistema de design (feature-11) > usa Button, Badge, Navbar e Card de src/ui/index.js para sua estrutura visual` |
| R13 (funciona dentro de ThemeProvider; ThemeToggle alterna tema) | `ConfigPanel — composição com o sistema de design (feature-11) > funciona dentro de um ThemeProvider: ThemeToggle alterna o tema do painel` |
| R14 (dataClient injetável via prop, porta pública) | `ConfigPanel — porta pública e contrato de dataClient > é importável a partir de src/ui/panels/config/index.js e aceita dataClient como prop` |

## Verificação

- `npx vitest run tests/config-panel-ui.test.js` → 12/12 testes
  passando.
- `./init.sh` → **154 testes passando** (12 arquivos de teste), 0
  falhas. Inclui os 142 testes pré-existentes das features 1–11 sem
  nenhuma regressão.

## Decisões de implementação sem impacto em requirement (dentro do
   espaço deixado pelo design.md)

- Layout visual mínimo (sem CSS adicional além do já herdado de
  `src/ui/styles/tokens.css` via os componentes base), conforme
  `design.md`, "Fora do escopo": "Estilos visuais além dos já definidos
  ... decisão de detalhe deixada ao implementer, sem impacto em nenhum
  `R<n>`".
- `CardapioEditor` mantém um estado local `precoTexto` (texto bruto por
  item) separado do valor numérico armazenado em `cardapio.preco`, para
  que um valor inválido continue visível no campo (R3) sem contaminar o
  estado "oficial" do cardápio (R4) — detalhe de implementação da
  Decisão 3 do `design.md`, não um requirement novo.
- `tests/config-panel-ui.test.js` segue o mesmo padrão de
  `tests/design-system.test.js` (feature-11): arquivo `.js` com
  `React.createElement` (sem sintaxe JSX) e `expect.extend(jestDomMatchers)`
  em vez de `import "@testing-library/jest-dom"` puro — o projeto não
  ativa `test.globals` no Vitest (decisão já registrada em
  `specs/feature-11/design.md`, Decisão 5), então o import direto do
  pacote (que espera um `expect` global estilo Jest) não funcionaria;
  esta é a mesma adaptação já validada e em uso na feature-11, não uma
  invenção nova desta feature.

## Bloqueios

Nenhum. Nenhuma inconsistência foi encontrada entre o spec e os
contratos já `done` de `src/ui/` (feature-11) e `src/menu/` (feature-2).
