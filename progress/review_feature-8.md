# Review — feature feature-8

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes

- R1: [x] coberto por `"o script dist:win invoca electron-builder --win (R1)"` e `"electron-builder está declarado em devDependencies (R1)"` (`tests/desktop-build.test.js:153-163`)
- R2: [x] coberto por `"declara appId e productName válidos em package.json (R2)"` (linha 109-116)
- R3: [x] coberto por `"declara files cobrindo electron/ e src/ (R3, R7)"` (linha 118-127) — `src/**/*` cobre `src/db/schema.js`
- R4: [x] coberto por `"declara asarUnpack para better-sqlite3 (R4)"` (linha 129-135)
- R5: [x] coberto por `"declara ao menos um target Windows válido (nsis/msi) (R5)"` (linha 137-142)
- R6: [x] coberto por `"o target nsis, quando presente, usa oneClick: false e perMachine: false (R6)"` (linha 144-151)
- R7: [x] coberto (por leitura estática, conforme decisão explícita do design.md) pelo mesmo teste de R3 — a verificação de "build sem erros" fica documentada como impossível de automatizar (R11) e vira item 1 do checklist manual
- R8: [x] coberto pelo bloco `"Empacotamento Windows — validação de configurações incompletas (R8)"` (linha 166-218), 7 testes negativos usando `validarConfigBuild`
- R9: [x] coberto — toda a suíte só usa `readFileSync`/objetos em memória, nenhuma chamada a `electron-builder`
- R10: [x] coberto por `"cardapioPath, configPath e whatsappSessionPath são subcaminhos de app.getPath('userData')"` (linha 221-236), reaproveitando `resolvePaths` real de `electron/main.js` sem duplicar `tests/electron-main.test.js`
- R11: [x] confirmado por leitura de todo o arquivo — nenhuma chamada a `child_process`, `fetch`/`http`, nem dependência de Wine/toolchain
- R12: [x] confirmado via `git diff HEAD -- electron/main.js electron/preload.js` (sem diferenças) e `git status --porcelain electron/` (vazio)
- R13: [x] coberto por `"package.json declara main como electron/main.js"` (linha 238-244)

Todos os R1–R13 têm cobertura concreta e rastreável. Nenhuma lacuna.

## Tasks completas

- T1–T20: [x] todas marcadas em `specs/feature-8/tasks.md`, e cada uma corresponde a artefato real conferido (script, campo `build`, teste específico). T19 (`./init.sh` verde) e T20 (documentação em `progress/impl_feature-8.md`) também verificadas diretamente.

## Checkpoints

- C1: [x] `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md` existem; os 3 docs existem; `./init.sh` terminou com exit 0.
- C2: [x] apenas feature-8 está `in_progress`; `progress/current.md` reflete a sessão ativa sem lixo de sessões antigas.
- C3: [x] nenhum domínio novo foi criado em `src/`; a única dependência nova (`electron-builder`) está justificada na Decisão 1 de `specs/feature-8/design.md`; sem `console.log`/TODO soltos nos arquivos tocados.
- C4: [x] `tests/desktop-build.test.js` existe, cobre o módulo de configuração de empacotamento; `npm test`/`./init.sh` mostram 206 testes verdes (189 pré-existentes + 17 novos).
- C5: [x] `git status --porcelain` não mostra nada suspeito (`*.tmp`, `*.sqlite` fora do gitignore); `progress/history.md` tem entrada da sessão; feature-8 refletida como `in_progress` (aguardando este veredito para virar `done`).
- C6: [x] `specs/feature-8/` tem os 3 arquivos; `requirements.md` usa EARS estrito (QUANDO/SE/ONDE); todas as tasks `[x]`; cada `R<n>` tem teste concreto.

## Verificações adicionais

- Confirmado por leitura direta de `tests/desktop-build.test.js` que a suíte valida **apenas configuração estática** do `package.json` via `fs.readFileSync`/`JSON.parse` — nenhuma chamada a `electron-builder` como processo filho, nenhuma geração de `.exe`/`.msi`, nenhuma dependência de rede/Wine.
- `package.json` tem `build.appId`, `build.productName`, `build.files` (`electron/**/*`, `src/**/*`, `package.json`), `build.asarUnpack` (`**/node_modules/better-sqlite3/**/*`), `build.win.target: ["nsis"]`, `build.nsis.oneClick: false`, `build.nsis.perMachine: false` — exatamente o previsto em R2–R6.
- `git diff HEAD -- electron/main.js electron/preload.js` está vazio — nenhuma modificação no composition root da feature-14 (R12).
- Nenhum arquivo de `src/` foi alterado por esta feature. Encontrada uma modificação pré-existente (não desta sessão) em `src/whatsapp/adapters/whatsapp-web-js.js` e `tests/whatsapp-adapter-real.test.js`, mas está documentada em `progress/history.md` ("2026-08-12 — Verificação manual de `npm run dev`") como correção pontual da feature-9 (import ESM/CJS de `whatsapp-web.js`), anterior ao início da sessão de feature-8, e não faz parte do escopo/diff desta feature — não constitui violação de R12.
- `./init.sh` executado nesta revisão: `Test Files 15 passed (15)`, `Tests 206 passed (206)`, `[OK] Ambiente pronto`.
- O checklist de verificação manual em `progress/impl_feature-8.md` (transcrito de `design.md`) documenta com clareza, como item 1 explícito, a limitação de não poder validar o rebuild nativo de `better-sqlite3` para Windows nesta máquina Linux — coerente com a limitação já registrada em `progress/history.md` para `npm run dev`.
- Convenções respeitadas: nome de arquivo de teste em kebab-case (`desktop-build.test.js`), `describe`/`it` em português, sem mocks de sistema de arquivos (usa `fs.readFileSync` real sobre o `package.json` do próprio projeto), sem `console.log`.

## Mudanças necessárias (se aplicável)

Nenhuma. Feature aprovada sem ressalvas bloqueantes.
