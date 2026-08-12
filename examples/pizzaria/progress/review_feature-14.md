# Review — feature feature-14 (rodada 2, pós-correções)

**Veredito:** APPROVED

## Contexto

Esta é a segunda rodada de revisão. A primeira (preservada no histórico do
repositório) resultou em CHANGES_REQUESTED por dois motivos: (1) testes de
R10/R11/R14/R17 verificavam apenas o registro do handler IPC, sem invocar
o handler e checar o retorno; (2) T29/T30 marcadas `[ ]` em
`specs/feature-14/tasks.md`, contradizendo a afirmação em
`progress/impl_feature-14.md` de que todas as T1–T30 estavam `[x]`.

O implementador aplicou correções, documentadas na seção "Correções
pós-revisão" de `progress/impl_feature-14.md`. Ambas foram verificadas
nesta rodada.

## Verificação do problema 1 — testes de R10/R11/R14/R17

Confirmado em `tests/electron-main.test.js`:

- Linhas 229–243: `"o handler config:load-cardapio, quando invocado, retorna
  o resultado de loadCardapio(cardapioPath) (R10)"` — captura o handler via
  `electronMock.ipcMain._handlers.get("config:load-cardapio")`, invoca-o
  com `await handler({})`, e verifica `menuMock.loadCardapio` chamado com
  o path correto **e** que `resultado` é igual ao valor mockado
  (`{ categorias: [{ nome: "Pizzas" }] }`).
- Linhas 245–259: mesmo padrão para `"config:load-config"` (R11), com
  `loadConfig` e verificação do retorno `{ apiKeys: {...} }`.
- Linhas 261–280: mesmo padrão para `"kds:listar-pedidos-ativos"` (R14),
  verificando chamada com `{ db, origem }` corretos e retorno igual a
  `pedidosEsperados`.
- Linhas 282–296: mesmo padrão para `"kds:status-conexao-whatsapp"` (R17),
  verificando `getConnectionStatus()` chamado e `resultado` igual a
  `"desconectado"`.

Os quatro novos testes seguem exatamente o padrão já usado corretamente em
R12/R15/R16 na rodada anterior (captura do handler real via
`_handlers.get`, invocação, e assert de retorno concreto — não apenas
"não lançou exceção" ou "foi registrado"). Problema 1 sanado.

## Verificação do problema 2 — T29/T30

`grep -n "T29\|T30" specs/feature-14/tasks.md` confirma:

```
151:- [x] T29 — Rodar `./init.sh` e confirmar 100% dos testes verdes,
156:- [x] T30 — Documentar a rastreabilidade R↔teste em
```

Ambas agora `[x]`. Legitimidade confirmada: `./init.sh` de fato roda verde
(189/189, verificado nesta revisão) e a tabela de rastreabilidade R↔teste
existe e está atualizada em `progress/impl_feature-14.md`. Não é um
checkbox marcado sem substância — o trabalho correspondente existe e foi
conferido linha a linha nesta e na rodada anterior. Problema 2 sanado.

## `./init.sh`

Executado nesta rodada: **189/189 testes passando em 14 arquivos**, exit
code 0. Os logs de erro do React ("useTheme deve ser usado dentro de um
ThemeProvider") que aparecem no output são esperados — são gerados por um
teste negativo pré-existente em `tests/design-system.test.js` (verifica
que o hook lança erro fora do provider) e não indicam falha.

`git status --short` confirma que, fora da árvore nova de feature-14
(`electron/`, `specs/feature-14/`, `tests/electron-main.test.js`,
`src/ui/panels/{config,kds}/ipcDataClient.js`, `progress/impl_feature-14.md`,
`progress/review_feature-14.md`), o único arquivo pré-existente tocado é
`src/whatsapp/client.js`, com exatamente 1 linha adicionada (a exposição
aditiva de `off`) — sem regressão em nenhuma feature 1–13.

## Pontos já validados na rodada anterior (reconfirmados, sem nova verificação exaustiva)

- Rastreabilidade R1–R9, R12–R13, R15–R27: sem mudança desde a rodada
  anterior — permanecem cobertas como já registrado.
- `off` em `src/whatsapp/client.js`: ainda estritamente aditivo (git diff
  mostra 1 linha adicionada, nada removido/alterado).
- Mock completo do módulo `electron` em `tests/electron-main.test.js`:
  inalterado.
- Contratos IPC (`ipcDataClient.js` de config/kds) espelhando
  `localDataClient.js` local: inalterado, arquivos não tocados nesta
  rodada de correção.
- `onPedidosChange`/`kds:pedidos-changed` funcional via
  `notificarPedidosMudaram`: inalterado.

Nenhum desses pontos foi tocado pelas correções desta rodada (confirmado
por `git status`), portanto permanecem válidos sem necessidade de nova
verificação linha a linha.

## Rastreabilidade requirements ↔ testes (atualizada)

- R1–R9: [x] (ver rodada anterior, inalterado)
- R10: [x] coberto por `"o handler config:load-cardapio, quando invocado,
  retorna o resultado de loadCardapio(cardapioPath) (R10)"`
  (`tests/electron-main.test.js:229`)
- R11: [x] coberto por `"o handler config:load-config, quando invocado,
  retorna o resultado de loadConfig(configPath) (R11)"` (linha 245)
- R12–R13: [x] (inalterado)
- R14: [x] coberto por `"o handler kds:listar-pedidos-ativos, quando
  invocado, retorna o resultado de listarPedidosAtivosComTempoEspera({
  db, origem }) (R14)"` (linha 261)
- R15–R16: [x] (inalterado)
- R17: [x] coberto por `"o handler kds:status-conexao-whatsapp, quando
  invocado, retorna o resultado de whatsappClient.getConnectionStatus()
  (R17)"` (linha 282)
- R18–R27: [x] (inalterado)

## Tasks completas

- T1–T28: [x]
- T29: [x] (`specs/feature-14/tasks.md:151`)
- T30: [x] (`specs/feature-14/tasks.md:156`)

## Checkpoints

- C1: [x] — `./init.sh` verde, 189/189 testes, exit code 0.
- C2: [x] — apenas feature-14 em `in_progress` em `feature_list.json`.
- C3: [x] — `electron/` fora de `src/`; sem `console.log` nos módulos
  novos; dependência `electron` justificada em `design.md`.
- C4: [x] — todos os módulos públicos novos têm teste correspondente,
  incluindo agora os 4 handlers antes subcobertos.
- C5: [x] — nenhum arquivo temporário/artefato suspeito não rastreado.
- C6: [x] — todas as tasks `[x]` e todos os `R<n>` com cobertura de teste
  comportamental concreta (não apenas registro).

## Conclusão

Ambos os problemas apontados na rodada anterior foram corrigidos de forma
substantiva (não apenas cosmética): os 4 novos testes exercitam o handler
real capturado do `ipcMain.handle` mockado e verificam o valor de retorno
concreto, e T29/T30 refletem trabalho de fato realizado. `./init.sh`
termina verde com 189/189 testes, sem regressão em nenhuma feature
anterior. Feature-14 está **APPROVED**.

A feature não foi marcada como `done` em `feature_list.json` — essa
decisão cabe ao `leader`/humano.
