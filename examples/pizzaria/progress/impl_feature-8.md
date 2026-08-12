# Implementação — feature-8: Empacotamento e Instalador Desktop Windows

## Resumo

Feature de configuração pura de empacotamento: nenhum arquivo de `src/`,
`electron/main.js` ou `electron/preload.js` foi tocado. Alterações
restritas a `package.json` (devDependency `electron-builder`, script
`dist:win`, campo `"build"`) e um novo arquivo de teste
`tests/desktop-build.test.js`, exatamente como previsto na Decisão 4 de
`specs/feature-8/design.md` (config inline em `package.json`, sem
`electron-builder.yml` separado — não foi necessário migrar).

## Arquivos criados/alterados

- `package.json` — adicionado `devDependencies.electron-builder` (`^25.1.8`),
  `scripts["dist:win"]` e o campo `"build"` completo (`appId`,
  `productName`, `files`, `asarUnpack`, `win.target`, `nsis`).
- `tests/desktop-build.test.js` (novo) — 17 testes de validação estática.
- `specs/feature-8/tasks.md` — T1–T20 marcadas `[x]`.
- `progress/current.md` — atualizado com o andamento da implementação.
- `package-lock.json`, `node_modules/` — atualizados por `npm install`.

Nenhum arquivo de `src/db/`, `src/menu/`, `src/ai/`, `src/delivery/`,
`src/whatsapp/`, `src/ui/`, `electron/main.js` ou `electron/preload.js` foi
modificado (R12).

## Rastreabilidade R<n> → teste

| Requirement | Descrição resumida | Teste(s) em `tests/desktop-build.test.js` |
|---|---|---|
| R1 | Script `dist:win` invoca `electron-builder --win`; `electron-builder` em devDependencies | `"o script dist:win invoca electron-builder --win (R1)"`; `"electron-builder está declarado em devDependencies (R1)"` |
| R2 | `appId`/`productName` obrigatórios | `"declara appId e productName válidos em package.json (R2)"` |
| R3 | `files`/`extraResources` cobrindo `electron/` e `src/` (schema do banco incluso via `src/**/*`) | `"declara files cobrindo electron/ e src/ (R3, R7)"` |
| R4 | `asarUnpack` para `better-sqlite3` | `"declara asarUnpack para better-sqlite3 (R4)"` |
| R5 | Ao menos um target Windows (`nsis`/`msi`) | `"declara ao menos um target Windows válido (nsis/msi) (R5)"` |
| R6 | `nsis.oneClick: false` e `perMachine: false` quando `nsis` presente | `"o target nsis, quando presente, usa oneClick: false e perMachine: false (R6)"` |
| R7 | Build empacota frontend + backend + SQLite sem erro (config declarativa) | `"declara files cobrindo electron/ e src/ (R3, R7)"` (validação estática — build real fora do escopo automatizável, R11) |
| R8 | Validação falha explicitamente quando um campo obrigatório falta | Bloco `"Empacotamento Windows — validação de configurações incompletas (R8)"` — 7 testes negativos com a função utilitária `validarConfigBuild` |
| R9 | `tests/desktop-build.test.js` valida por leitura estática, sem build real | Toda a suíte (nenhum teste chama `electron-builder`/`child_process`) |
| R10 | `resolvePaths`/`app.getPath("userData")` consistente com diretório gravável pelo instalador | `"cardapioPath, configPath e whatsappSessionPath são subcaminhos de app.getPath('userData')"` (reaproveita `resolvePaths` real de `electron/main.js`, feature-14, sem duplicar asserções de `tests/electron-main.test.js`) |
| R11 | Nenhum teste executa build real / rede / Wine / toolchain | Confirmado por leitura de todo `tests/desktop-build.test.js` (T18): nenhuma chamada a `child_process`, `fetch`/`http`, ou Wine. Todas as leituras são `fs.readFileSync` de `package.json` ou objetos construídos em memória. |
| R12 | `electron/main.js`/`electron/preload.js` não modificados | Confirmado por diff desta sessão (nenhuma alteração nesses arquivos); teste de R10 importa a função `resolvePaths` já existente sem alterá-la |
| R13 | `package.json.main === "electron/main.js"` (reconfirmação estática) | `"package.json declara main como electron/main.js"` |

Todos os R1–R13 estão cobertos por pelo menos um teste concreto.

## Resultado de `./init.sh`

```
Test Files  15 passed (15)
     Tests  206 passed (206)
```

206 = 189 testes pré-existentes (features 1–14) + 17 novos testes de
`tests/desktop-build.test.js`. Nenhuma regressão. `npm install` executado
com sucesso (233 pacotes adicionados, incluindo `electron-builder`).

## Checklist de verificação manual (fora do escopo automatizável — Nível 3)

Transcrito de `specs/feature-8/design.md`. Estes itens dependem do runtime
real do Windows (ou de um runner de CI Windows) e **não podem ser
executados nem validados nesta máquina Linux de desenvolvimento** — mesma
classe de limitação já documentada em `progress/history.md` para
`npm run dev`/`better-sqlite3`. A ser executado pelo usuário humano numa
máquina Windows real (ou CI com runner Windows):

1. **[Limitação de ambiente — item central]** Rodar `npm run dist:win` numa
   máquina Windows real (ou runner de CI Windows) e confirmar que o build
   termina sem erros, incluindo o rebuild/download bem-sucedido do binário
   nativo de `better-sqlite3` para a ABI do Electron 33 em Windows x64.
   Este passo **não pode ser validado nesta máquina Linux** — nem o
   resultado do rebuild, nem, principalmente, se o binário resultante
   evita o mesmo tipo de segfault de ABI nativa já visto localmente com o
   processo Electron em Linux (`progress/history.md`).
2. Instalar o `.exe`/`.msi` gerado numa máquina Windows limpa (sem
   privilégios de administrador) e confirmar que a instalação conclui sem
   solicitar elevação (UAC), validando a instalação em
   `%LOCALAPPDATA%\Programs\<productName>` (Decisão 3 do design.md).
3. Abrir a aplicação instalada e confirmar que o processo principal
   (`electron/main.js`) inicia em segundo plano e a janela local abre sem
   falhas — em particular, confirmar que `new Database(...)`
   (`better-sqlite3`, chamado por `openDatabase`) não segfaulta dentro do
   processo Electron empacotado.
4. Confirmar que o arquivo SQLite é criado dentro de
   `%LOCALAPPDATA%\<productName>\...` (ou equivalente resolvido por
   `app.getPath("userData")` no Windows empacotado), sem erro de
   permissão.
5. Repetir, dentro da aplicação instalada, os itens 2–9 do checklist de
   verificação manual já registrado em `specs/feature-14/design.md`
   (QR Code real, mensagem real via WhatsApp, painéis de configuração e
   KDS via IPC, atualização em tempo real de pedidos) — agora rodando a
   partir do executável instalado, não de `npm run dev`.
6. Desinstalar a aplicação (via painel de desinstalação do Windows) e
   confirmar que a remoção conclui sem erro e sem deixar processos
   pendurados.

## Observações

- Nenhuma inconsistência entre spec e realidade foi encontrada. A
  configuração descrita na Decisão 4 do `design.md` foi aplicada
  literalmente, sem necessidade de migrar para `electron-builder.yml`.
- Sessão não marca a feature como `done` — aguardando revisão do
  `reviewer`.
