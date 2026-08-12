# Review — feature feature-2

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes

- R1: [x] coberto por `"lê um cardapio.json válido e retorna a estrutura de categorias e itens"` (tests/config-menu.test.js:36)
- R2: [x] coberto por `"lança InvalidMenuSchemaError quando um item não tem nome ou preco"` (tests/config-menu.test.js:56)
- R3: [x] coberto por `"lança MenuFileNotFoundError quando o arquivo não existe"` (tests/config-menu.test.js:71)
- R4: [x] coberto por `"lança InvalidMenuSchemaError quando o conteúdo não é JSON válido"` (tests/config-menu.test.js:77)
- R5: [x] coberto por `"retorna a configuração padrão sem criar arquivo quando o path não existe"` (tests/config-menu.test.js:86)
- R6: [x] coberto por `"persiste o arquivo de forma atômica, sem deixar restos de arquivo temporário"` (tests/config-menu.test.js:97)
- R7: [x] coberto por `"grava e relê as chaves de API da OpenAI e DeepSeek com permissões restritas"` (tests/config-menu.test.js:111)
- R8: [x] coberto por `"reflete systemPrompt, audioEnabled e imageEnabled atualizados em uma releitura"` (tests/config-menu.test.js:130)
- R9: [x] coberto por `"lança InvalidConfigError e não escreve arquivo quando systemPrompt não é string"` (tests/config-menu.test.js:148) e `"lança InvalidConfigError e não escreve arquivo quando audioEnabled/imageEnabled não são booleanos"` (tests/config-menu.test.js:156)

Todos os R1–R9 têm cobertura concreta. O mapa documentado em
`progress/impl_feature-2.md` confere exatamente com o que foi encontrado
nos testes (mesmos nomes, mesma cobertura).

## Tasks completas

- T1: [x] `src/menu/errors.js` define `MenuError`, `MenuFileNotFoundError`,
      `InvalidMenuSchemaError`, `InvalidConfigError`.
- T2: [x] `src/menu/cardapio.js` implementa `loadCardapio(path)`: checa
      existência (linha 41), `JSON.parse` protegido (linhas 47–52),
      validação de `categorias`/`nome`/`preco` (linhas 17–35), sem retorno
      parcial.
- T3: [x] `getDefaultConfig()` em `src/menu/config.js:11-18`.
- T4: [x] `loadConfig(path)` em `src/menu/config.js:23-42` com merge raso.
- T5: [x] `saveConfig(path, config)` em `src/menu/config.js:62-79`: valida
      antes de tocar disco, grava via arquivo temporário + `renameSync`,
      aplica `chmodSync(path, 0o600)` condicionado a API key preenchida,
      com `try/catch` silencioso.
- T6: [x] `src/menu/index.js` reexporta as quatro funções públicas e as
      quatro classes de erro, único ponto de entrada do domínio.
- T7–T15: [x] Todos presentes em `tests/config-menu.test.js`,
      correspondendo exatamente às tasks descritas (nomes de teste batem
      com o texto de cada task).
- T16: [x] `npm test`/`./init.sh` executados nesta revisão com sucesso (ver
      seção "Execução"); rastreabilidade documentada em
      `progress/impl_feature-2.md`.

Todas as 16 tasks de `specs/feature-2/tasks.md` estão marcadas `[x]`, e a
implementação encontrada corresponde ao que cada task descreve.

## Revisão de código contra architecture.md e conventions.md

- **Camadas por domínio / `index.js` como única superfície pública**:
  `src/menu/index.js` reexporta `loadCardapio`, `getDefaultConfig`,
  `loadConfig`, `saveConfig` e as classes de erro; `cardapio.js`,
  `config.js` e `errors.js` são internos e não importados de fora de
  `src/menu/`. Nenhum outro diretório de `src/` foi tocado (`electron/`
  e `cardapio.json` de exemplo ficam para features futuras, como
  declarado no `design.md`). Conforme `docs/architecture.md` §1.
- **Sem IO no renderer**: não há `src/ui/` nesta feature. `src/menu/` só
  é consumido programaticamente pelos testes até aqui. OK.
- **Nenhuma dependência nova**: usa somente `node:fs`/`node:path`;
  `package.json` não ganhou dependências novas — coerente com
  `design.md` (seção "Dependências externas novas: Nenhuma").
- **Erros explícitos com classes nomeadas**: `MenuError` como base,
  `MenuFileNotFoundError`, `InvalidMenuSchemaError`, `InvalidConfigError`
  como subtipos concretos (`src/menu/errors.js`). Nenhuma função retorna
  `null`/`undefined` silenciosamente em caso de falha. Conforme
  `docs/conventions.md` "Tratamento de erros".
- **Atomicidade em disco**: `saveConfig` escreve em
  `${path}.tmp-${process.pid}` e usa `renameSync`, validando o `config`
  *antes* de criar o arquivo temporário (R9) — conforme
  `docs/architecture.md` princípio 6 e `design.md`.
- **Segredos fora da árvore de fontes / modo restrito**: `chmodSync(path,
  0o600)` aplicado apenas quando alguma API key está preenchida, com
  fallback silencioso fora de POSIX — conforme `docs/architecture.md`
  princípio 5 e `design.md`.
- **Nomenclatura**: arquivos em `kebab-case.js`, classes em
  `PascalCase`, funções/variáveis em `camelCase`, privadas com prefixo
  `_` (`_isItemValido`, `_validarCardapio`, `_validarConfig`) — conforme
  `docs/conventions.md` "Nomes".
- **Sem `console.log`/TODOs soltos**: busca em `src/menu/` e
  `tests/config-menu.test.js` não retornou ocorrências.
- **Testes com diretório temporário real**: `tests/config-menu.test.js`
  usa `fs.mkdtempSync(join(tmpdir(), "pizzaria-menu-"))` em `beforeEach`
  e `rmSync` em `afterEach`, sem mocks de fs. Nomes de teste descritivos
  em português.
- **ESM**: todos os arquivos usam `import`/`export`, consistente com
  `"type": "module"`.

### Observação menor (não bloqueante)

`src/menu/cardapio.js` linhas 19, 24 e 30 e `tests/config-menu.test.js`
linhas 148 e 156 excedem o limite de 100 caracteres por linha prescrito
em `docs/conventions.md` ("Formatação"). São mensagens de erro/nomes de
teste um pouco longos (101–119 caracteres). O mesmo tipo de excesso
pontual (101 caracteres) já existia em `src/db/pedidos.js:18` e
`tests/database.test.js:53`, aprovados sem ressalva na revisão da
feature-1 — trata-se de um desvio cosmético consistente com o padrão já
aceito no repositório, não de uma violação estrutural. Registro apenas
para uma eventual limpeza futura; não impede a aprovação desta feature.

## Execução

```
./init.sh  → [OK] Ambiente pronto. Você pode começar a trabalhar.
             22/22 testes (12 de tests/database.test.js + 10 de
             tests/config-menu.test.js)
npm test   → 22/22 testes passando
```

Ambos verdes nesta revisão.

## Escopo dos arquivos alterados

Comparado a `HEAD`, os únicos artefatos novos relativos a esta feature
são `src/menu/{errors,cardapio,config,index}.js`,
`tests/config-menu.test.js`, `specs/feature-2/*` e
`progress/impl_feature-2.md`. Nenhum arquivo fora do escopo declarado no
`design.md` foi tocado (não há alteração em `src/db/`, `electron/`, nem
em `src/menu/index.js` reexportando algo além do previsto).

## Checkpoints

- C1: [x] `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`
      existem; `docs/architecture.md`, `docs/conventions.md`,
      `docs/verification.md` existem; `./init.sh` termina com exit code 0.
- C2: [x] Apenas `feature-2` está em `in_progress` (confirmado via
      `feature_list.json`); demais features `pending` ou `done`.
      `progress/current.md` descreve a sessão ativa da feature-2, sem
      lixo de sessões anteriores.
- C3: [x] `src/` contém apenas `src/db/` e `src/menu/`, domínios
      previstos em `docs/architecture.md`. Nenhuma dependência nova em
      `package.json` nesta feature. Sem `console.log` soltos nem TODOs
      sem contexto em `src/menu/`.
- C4: [x] `tests/config-menu.test.js` cobre o único módulo público
      (`src/menu/index.js`) e seus quatro pontos de entrada. Usa
      `fs.mkdtempSync` real. `npm test` mostra 22 testes, todos verdes.
- C5: [x] Nenhum arquivo não rastreado suspeito (`*.tmp`, `node_modules/`,
      `*.sqlite`) fora do `.gitignore`. `progress/current.md` reflete a
      sessão ativa da feature-2 corretamente; feature ainda não marcada
      `done` (decisão do leader).
- C6: [x] `specs/feature-2/` tem os 3 arquivos (`requirements.md`,
      `design.md`, `tasks.md`). `requirements.md` usa EARS estrito
      (padrões Ubíquo/Evento/Indesejado claramente identificados em
      R1–R9). Todas as 16 tasks de `tasks.md` estão `[x]`. Cada `R<n>`
      está coberto por teste concreto (ver seção de rastreabilidade
      acima).

## Observação final

A implementação está completa, rastreável e verde. A feature está pronta
para transição `in_progress → done`, a critério do `leader`. Não há
mudanças bloqueantes necessárias; a única ressalva é o item cosmético de
comprimento de linha registrado acima.
