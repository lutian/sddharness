# Tasks — feature-8: Empacotamento e Instalador Desktop Windows

- [x] T1 — Adicionar `electron-builder` (`^25.1.8`) em `devDependencies` de
      `package.json`. Cobre: R1.
- [x] T2 — Adicionar script `"dist:win": "electron-builder --win"` em
      `scripts` de `package.json`. Cobre: R1.
- [x] T3 — Adicionar campo `"build"` em `package.json` com `appId` e
      `productName` preenchidos. Cobre: R2.
- [x] T4 — Adicionar `build.files` cobrindo `electron/**/*`, `src/**/*` e
      `package.json`. Cobre: R3, R7.
- [x] T5 — Adicionar `build.asarUnpack` com a entrada de
      `better-sqlite3` (ex.: `"**/node_modules/better-sqlite3/**/*"`).
      Cobre: R4.
- [x] T6 — Adicionar `build.win.target` com `["nsis"]` (ou `["nsis",
      "msi"]`). Cobre: R5.
- [x] T7 — Adicionar `build.nsis` com `oneClick: false` e
      `perMachine: false`. Cobre: R6.
- [x] T8 — Escrever, em `tests/desktop-build.test.js`, uma função utilitária
      local de validação da configuração de empacotamento (recebe um objeto
      `build` e retorna a lista de campos ausentes/inválidos), reutilizada
      pelos testes positivos e negativos. Cobre: R9, R8.
- [x] T9 — Adicionar teste "declara `appId` e `productName` válidos em
      `package.json`" lendo o `package.json` real do projeto. Cobre: R2, R9.
- [x] T10 — Adicionar teste "declara `files` cobrindo `electron/` e `src/`".
      Cobre: R3, R9.
- [x] T11 — Adicionar teste "declara `asarUnpack` para `better-sqlite3`".
      Cobre: R4, R9.
- [x] T12 — Adicionar teste "declara ao menos um target Windows válido
      (`nsis`/`msi`)". Cobre: R5, R9.
- [x] T13 — Adicionar teste "target `nsis`, quando presente, usa `oneClick:
      false` e `perMachine: false`". Cobre: R6, R9.
- [x] T14 — Adicionar teste "script `dist:win` invoca `electron-builder
      --win`" e "`electron-builder` está em `devDependencies`". Cobre: R1,
      R9.
- [x] T15 — Adicionar, usando a função utilitária de T8, testes negativos que
      constroem objetos de configuração incompletos em memória (sem
      `appId`, sem `files`, sem `asarUnpack` de `better-sqlite3`, sem target
      Windows válido) e confirmam que a validação identifica o campo
      ausente correspondente, sem tocar o `package.json` real do projeto.
      Cobre: R8.
- [x] T16 — Adicionar teste que importa `resolvePaths` de
      `electron/main.js` (reaproveitando o mock de `electron` já usado em
      `tests/electron-main.test.js`) e confirma que `cardapioPath`,
      `configPath` e `whatsappSessionPath` são subcaminhos de
      `app.getPath("userData")`, sem modificar `electron/main.js` nem
      duplicar as demais asserções já feitas por
      `tests/electron-main.test.js`. Cobre: R10, R12.
- [x] T17 — Adicionar teste "`package.json` declara `main` como
      `electron/main.js`" (reconfirmação por leitura estática, sem executar
      o app real). Cobre: R13.
- [x] T18 — Confirmar por leitura de `tests/desktop-build.test.js` que
      nenhum teste invoca `electron-builder` como processo filho, acessa
      rede, ou depende de Wine/toolchain de cross-compilation — ajuste
      quaisquer testes que violem essa regra antes de finalizar. Cobre: R11.
- [x] T19 — Rodar `./init.sh` e confirmar 100% dos testes verdes (nenhuma
      regressão nas features 1–14, todas os arquivos de teste existentes
      continuam passando). Cobre: R1–R13 (verificação de integração final).
- [x] T20 — Documentar em `progress/impl_feature-8.md` a rastreabilidade
      R1–R13 ↔ testes concretos, e transcrever o checklist de verificação
      manual de `design.md` (com destaque explícito para o item 1 — a
      limitação de rebuild nativo cross-platform que não pode ser validada
      nesta máquina Linux). Cobre: R1–R13 (documentação, não código).
