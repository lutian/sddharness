# Tasks — feature-2: Leitor de Cardápio e Configurações Globais

- [x] T1 — Criar `src/menu/errors.js` com `MenuError`,
      `MenuFileNotFoundError`, `InvalidMenuSchemaError`,
      `InvalidConfigError`.
      Cobre: R2, R3, R4, R9.

- [x] T2 — Criar `src/menu/cardapio.js` com `loadCardapio(path)`: checa
      existência do arquivo (lança `MenuFileNotFoundError`), faz
      `JSON.parse` protegido por `try/catch` (lança
      `InvalidMenuSchemaError` em caso de erro de parse), valida que
      `categorias` é um array e que cada item de cada categoria tem
      `nome` (string não vazia) e `preco` (número finito), lançando
      `InvalidMenuSchemaError` sem retorno parcial caso contrário.
      Cobre: R1, R2, R3, R4.

- [x] T3 — Criar `src/menu/config.js` com `getDefaultConfig()` (objeto
      com `apiKeys.openai`/`apiKeys.deepseek` vazios, `systemPrompt`
      padrão, `audioEnabled`/`imageEnabled` como `false`).
      Cobre: R5.

- [x] T4 — Adicionar `loadConfig(path)` em `src/menu/config.js`: se o
      arquivo não existir, retorna `getDefaultConfig()` sem criar
      arquivo; se existir, lê e faz merge raso com os valores padrão
      (campos ausentes assumem o padrão).
      Cobre: R5, R7 (releitura), R8 (releitura).

- [x] T5 — Adicionar `saveConfig(path, config)` em `src/menu/config.js`:
      valida a forma de `config` (`systemPrompt` string,
      `audioEnabled`/`imageEnabled` booleanos), lançando
      `InvalidConfigError` sem tocar o disco se inválido; grava em
      arquivo temporário e usa `fs.renameSync` para o `path` final
      (escrita atômica); aplica `fs.chmodSync(path, 0o600)` quando
      `apiKeys.openai` ou `apiKeys.deepseek` estiverem preenchidos,
      silenciando falhas de `chmod` (ex.: Windows) sem interromper o
      fluxo.
      Cobre: R6, R7, R9.

- [x] T6 — Criar `src/menu/index.js` reexportando `loadCardapio`,
      `getDefaultConfig`, `loadConfig`, `saveConfig` e as classes de
      `src/menu/errors.js`, como superfície pública única do domínio.
      Cobre: R1, R5, R6, R7, R8, R9.

- [x] T7 — Escrever em `tests/config-menu.test.js` (Vitest, diretório
      temporário real via `fs.mkdtempSync(os.tmpdir())`, limpeza em
      `afterEach`): teste de `loadCardapio` com um `cardapio.json`
      válido retornando a estrutura esperada de categorias/itens.
      Cobre: R1.

- [x] T8 — Adicionar em `tests/config-menu.test.js`: teste de
      `loadCardapio` com um item sem `nome`/`preco` lançando
      `InvalidMenuSchemaError`.
      Cobre: R2.

- [x] T9 — Adicionar em `tests/config-menu.test.js`: teste de
      `loadCardapio` apontando para um `path` inexistente lançando
      `MenuFileNotFoundError`.
      Cobre: R3.

- [x] T10 — Adicionar em `tests/config-menu.test.js`: teste de
      `loadCardapio` com um arquivo cujo conteúdo não é JSON válido
      lançando `InvalidMenuSchemaError`.
      Cobre: R4.

- [x] T11 — Adicionar em `tests/config-menu.test.js`: teste de
      `loadConfig` sobre um `path` sem arquivo existente, verificando
      que retorna os valores padrão e que nenhum arquivo é criado em
      disco.
      Cobre: R5.

- [x] T12 — Adicionar em `tests/config-menu.test.js`: teste de
      `saveConfig` seguido de leitura direta do arquivo em disco (fora
      de `loadConfig`) logo após a chamada, confirmando que o conteúdo
      já é um JSON completo e válido (verificação da escrita atômica
      via arquivo temporário + rename, sem restos de arquivo `.tmp-*`
      no diretório).
      Cobre: R6.

- [x] T13 — Adicionar em `tests/config-menu.test.js`: teste de
      `saveConfig` com `apiKeys.openai` e `apiKeys.deepseek`
      preenchidos, seguido de `loadConfig` confirmando o roundtrip
      exato dos valores, e verificação do modo do arquivo (`0o600`,
      condicionada a plataforma POSIX via `process.platform !== "win32"`).
      Cobre: R7.

- [x] T14 — Adicionar em `tests/config-menu.test.js`: teste que chama
      `saveConfig` alterando `systemPrompt`, `audioEnabled` e
      `imageEnabled`, seguido de `loadConfig` sobre o mesmo `path`
      confirmando que os três valores retornados são os novos.
      Cobre: R8.

- [x] T15 — Adicionar em `tests/config-menu.test.js`: teste de
      `saveConfig` com `systemPrompt` não-string e outro teste com
      `audioEnabled`/`imageEnabled` não-booleano, ambos lançando
      `InvalidConfigError` e confirmando que nenhum arquivo foi
      criado/alterado em `path`.
      Cobre: R9.

- [x] T16 — Executar `npm test` e `./init.sh`; documentar a tabela de
      rastreabilidade R1–R9 → nome do teste em
      `progress/impl_feature-2.md` (a cargo do implementer, não deste
      spec).
      Cobre: R1–R9 (verificação final).
