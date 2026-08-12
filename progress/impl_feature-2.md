# Implementação — feature-2: Leitor de Cardápio e Configurações Globais

## Resumo

Implementado o domínio `src/menu/` conforme `specs/feature-2/design.md`:

- `src/menu/errors.js` — `MenuError`, `MenuFileNotFoundError`,
  `InvalidMenuSchemaError`, `InvalidConfigError`.
- `src/menu/cardapio.js` — `loadCardapio(path)`.
- `src/menu/config.js` — `getDefaultConfig()`, `loadConfig(path)`,
  `saveConfig(path, config)`.
- `src/menu/index.js` — superfície pública reexportando os itens acima.
- `tests/config-menu.test.js` — 10 testes cobrindo R1–R9.

Todas as 16 tasks de `specs/feature-2/tasks.md` foram marcadas `[x]`.
`npm test` e `./init.sh` executados com sucesso: 22 testes passando (12
de `tests/database.test.js` + 10 de `tests/config-menu.test.js`).

## Rastreabilidade

- R1 → `"lê um cardapio.json válido e retorna a estrutura de categorias e itens"`
- R2 → `"lança InvalidMenuSchemaError quando um item não tem nome ou preco"`
- R3 → `"lança MenuFileNotFoundError quando o arquivo não existe"`
- R4 → `"lança InvalidMenuSchemaError quando o conteúdo não é JSON válido"`
- R5 → `"retorna a configuração padrão sem criar arquivo quando o path não existe"`
- R6 → `"persiste o arquivo de forma atômica, sem deixar restos de arquivo temporário"`
- R7 → `"grava e relê as chaves de API da OpenAI e DeepSeek com permissões restritas"`
- R8 → `"reflete systemPrompt, audioEnabled e imageEnabled atualizados em uma releitura"`
- R9 → `"lança InvalidConfigError e não escreve arquivo quando systemPrompt não é string"` e
  `"lança InvalidConfigError e não escreve arquivo quando audioEnabled/imageEnabled não são booleanos"`

## Observações

- Nenhuma alteração fora de `src/menu/` e `tests/config-menu.test.js`,
  conforme escopo do `design.md` (IPC/`electron/main.js` e um
  `cardapio.json` de exemplo ficam para features posteriores que os
  exijam).
- `saveConfig` grava via arquivo temporário `${path}.tmp-<pid>` seguido
  de `fs.renameSync`, e aplica `fs.chmodSync(path, 0o600)` apenas quando
  alguma API key está preenchida, silenciando falhas de `chmod` fora de
  POSIX.
- Feature permanece com status `in_progress` em `feature_list.json` —
  não marcada `done` por este agente, conforme protocolo.
