# Review — feature feature-12

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes

Todos os testes estão em `tests/config-panel-ui.test.js` (12 testes), lidos
integralmente e conferidos contra `specs/feature-12/requirements.md`:

- R1: [x] coberto por `"chama loadCardapio() e loadConfig() exatamente uma vez cada e renderiza os dados retornados"` (verifica `toHaveBeenCalledTimes(1)` para ambos e renderização dos dados).
- R2: [x] coberto pelo mesmo teste (asserções de categorias `"Pizzas"`/`"Bebidas"` e itens com nome/preço via `getByDisplayValue`).
- R3: [x] coberto por `"reflete a edição de nome e preço de um item, mantendo os demais inalterados"`.
- R4: [x] coberto por `"exibe uma mensagem de erro de validação ao digitar um preço não numérico"` (`getByRole("alert")`).
- R5: [x] coberto pelo teste de carregamento inicial (asserções de `apiKeys`, `systemPrompt`, switches e `modeloSelecionado`).
- R6: [x] coberto por `"reflete a edição das chaves de API e do system prompt"`.
- R7: [x] coberto por `"inverte o estado dos switches de áudio e imagem ao alternar"`.
- R8: [x] coberto por `"atualiza modeloSelecionado ao selecionar um modelo diferente"`.
- R9: [x] coberto por `"chama dataClient.saveConfig() exatamente uma vez com os valores atuais do formulário"` (`toHaveBeenCalledWith` com objeto completo).
- R10: [x] coberto por `"exibe indicação de sucesso e nenhum erro quando saveConfig resolve"`.
- R11: [x] coberto por `"captura a rejeição de saveConfig, exibe a mensagem de erro e não propaga exceção"` (usa `InvalidConfigError` real de `src/menu/errors.js`, e `expect(() => fireEvent.click(...)).not.toThrow()`).
- R12: [x] coberto por `"usa Button, Badge, Navbar e Card de src/ui/index.js para sua estrutura visual"` (checa classes `btn-primary`, `glass-card`, `navbar`, `badge-success`).
- R13: [x] coberto por `"funciona dentro de um ThemeProvider: ThemeToggle alterna o tema do painel"`.
- R14: [x] coberto por `"é importável a partir de src/ui/panels/config/index.js e aceita dataClient como prop"`.

A tabela de rastreabilidade em `progress/impl_feature-12.md` confere fielmente
com o conteúdo real do teste.

## Injeção do dataClient e isolamento de IO (verificação especial)

Confirmado lendo `tests/config-panel-ui.test.js`: `criarDataClientFake()`
cria um objeto com `vi.fn()` para `loadCardapio`/`loadConfig`/`saveConfig`,
injetado via prop `dataClient` em `ConfigPanel`. Nenhum teste importa
`localDataClient.js` nem toca `src/menu/*` ou filesystem real. O único
import de `src/menu/` no teste é a classe `InvalidConfigError` (reuso de
domínio real, não execução de IO), conforme documentado no `design.md`.

## Delegação em `localDataClient.js`

`src/ui/panels/config/localDataClient.js` delega diretamente a
`loadCardapio`, `loadConfig`, `saveConfig` de `src/menu/index.js`, sem
reimplementar validação. Caminhos de arquivo são recebidos como parâmetros
da fábrica (`createLocalDataClient({ cardapioPath, configPath })`), não
hardcoded, como especificado em T1.

## Escopo do cardápio (edição só em memória)

Confirmado: `CardapioEditor.jsx` só chama `onChange` (estado local via
`setCardapio` em `ConfigPanel`); não existe nenhuma chamada de
`saveCardapio`/persistência de cardápio em nenhum arquivo do painel. O
handler de salvar (`handleSave` em `ConfigPanel.jsx`) só envia os campos de
`config` (`apiKeys`, `systemPrompt`, `audioEnabled`, `imageEnabled`,
`modeloSelecionado`) a `dataClient.saveConfig`, nunca o cardápio. Consistente
com a decisão documentada em `design.md`/`requirements.md`.

## Uso exclusivo dos componentes base (R12)

`ConfigPanel.jsx` importa `Card`, `Navbar`, `ThemeToggle` de `../../index.js`;
`ConfigForm.jsx` importa `Badge`, `Button` da mesma porta. Nenhum dos dois
reimplementa elementos equivalentes (o botão de salvar usa `Button`, os
indicadores de sucesso/erro usam `Badge`). `CardapioEditor.jsx` usa
elementos HTML crus (`div`, `h3`, `input`) que não têm equivalente nos
componentes base listados em R12 (que são especificamente sobre estrutura
visual: contêineres, botões, indicadores, navegação, tema) — consistente com
o requirement, que se aplica à composição de `ConfigPanel`.

## Tasks completas

- T1: [x] `localDataClient.js` criado conforme especificado.
- T2: [x] `CardapioEditor` com `onChange` imutável via `_atualizarItem`.
- T3: [x] Validação client-side de preço com `Number.isFinite`.
- T4: [x] `ConfigForm` com todos os campos especificados.
- T5: [x] `Button`/`Badge` com `saving`/`saved`/`error`.
- T6: [x] `ConfigPanel` com `useEffect` de carga única e composição em `Card`s + `Navbar`/`ThemeToggle`.
- T7: [x] Handler de salvar com `saving`/`error`/`saved` corretamente geridos (inclusive `finally`).
- T8: [x] `index.js` reexporta apenas `ConfigPanel`.
- T9: [x] `tests/config-panel-ui.test.js` com os 12 casos descritos, todos presentes.
- T10: [x] `./init.sh` executado nesta revisão, confirma 154 testes verdes; `progress/impl_feature-12.md` documenta a rastreabilidade.

Todas as tasks de `specs/feature-12/tasks.md` estão marcadas `[x]` e
correspondem ao que foi de fato implementado.

## Checkpoints

- C1: [x] `./init.sh` termina com exit code 0 (`[OK] Ambiente pronto`).
- C2: [x] Apenas `feature-12` está `in_progress` em `feature_list.json`; `progress/current.md` reflete a sessão ativa.
- C3: [x] Nenhum arquivo fora de `src/ui/panels/config/` foi criado/alterado por esta feature; nenhum domínio novo introduzido; nenhum `console.log` de debug encontrado nos arquivos revisados.
- C4: [x] `npm test` (via `./init.sh`) mostra 154 testes, todos verdes; testes de domínio (`config-menu.test.js`) continuam usando diretórios temporários reais, não afetados por esta feature.
- C5: [x] Nenhum artefato temporário suspeito introduzido por esta feature.
- C6: [x] `specs/feature-12/` tem os 3 arquivos; `requirements.md` segue EARS estrito; todas as tasks `[x]`; todo `R<n>` tem teste concreto mapeado.

## Verificação de execução

`./init.sh` executado nesta revisão: **154 testes passando** (12 arquivos de
teste), 0 falhas, incluindo os 12 novos testes de
`tests/config-panel-ui.test.js` e os 142 pré-existentes sem regressão. O
stack trace de `"useTheme deve ser usado dentro de um ThemeProvider"`
impresso durante a execução é esperado — pertence a um teste de
`tests/design-system.test.js` (feature-11) que verifica intencionalmente
esse erro, não uma falha real.

## Observação menor (não bloqueante)

- `tests/config-panel-ui.test.js` tem 4 linhas acima de 100 caracteres
  (linhas 68, 215, 260, 333), violando levemente o limite de
  `docs/conventions.md`. Não bloqueante: mesmo padrão já existe em
  `tests/design-system.test.js:267` (feature-11, já aprovada), então é
  consistente com o precedente do repositório. Sugestão de melhoria
  futura, não motivo de rejeição.

## Mudanças necessárias (se aplicável)

Nenhuma. Feature aprovada.
