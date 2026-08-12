# Requirements — feature-8: Empacotamento e Instalador Desktop Windows

## Contexto

Todas as demais features (1–14, `done`) já entregam uma aplicação Electron
funcional em modo desenvolvimento (`npm run dev`), com composition root em
`electron/main.js`/`electron/preload.js` (feature-14). Esta feature **não**
adiciona nenhuma funcionalidade de negócio nova — ela configura o processo
de build que transforma esse código-fonte já pronto num instalador nativo
distribuível para Windows (`.exe`/`.msi`), com o banco SQLite e as demais
dependências (incluindo o módulo nativo `better-sqlite3`) embutidos.

Uma limitação real de ambiente foi documentada em
`progress/history.md` (seção "2026-08-12 — Verificação manual de `npm run
dev`"): nesta máquina de desenvolvimento (Linux, Ubuntu 26.04),
`better-sqlite3` segfaulta dentro do processo Electron mesmo após
recompilado corretamente para a ABI do Electron via `@electron/rebuild`,
por um descompasso de toolchain nativo específico desta distro — não é um
defeito do código do projeto. Essa limitação é relevante aqui porque
gerar o instalador Windows exige reconstruir `better-sqlite3` para a
plataforma/ABI Windows a partir deste ambiente Linux, e essa reconstrução
**não pode ser executada nem validada de fato** nesta máquina (ver R11 e o
checklist de verificação manual em `design.md`).

## Requirements

### R1
O sistema DEVE expor um script `"dist:win"` em `package.json` que invoca a
ferramenta de empacotamento configurada (`electron-builder`) com o alvo
Windows (`--win`).

### R2
O sistema DEVE declarar em `package.json` (campo `"build"`) ou em um
arquivo de configuração dedicado do empacotador (`electron-builder.yml`) os
campos obrigatórios `appId` e `productName`.

### R3
O sistema DEVE declarar, na configuração de empacotamento, a lista de
`files`/`extraResources` que inclui o backend Node.js (`electron/`,
`src/`) e o schema de inicialização do banco SQLite (`src/db/schema.js`
e/ou os arquivos necessários para a criação do banco na primeira
execução).

### R4
SE `better-sqlite3` (dependência nativa em C++) estiver entre as
dependências empacotadas ENTÃO a configuração de empacotamento DEVE
declarar esse módulo em `asarUnpack`, para que seu binário nativo não
fique compactado dentro do arquivo `app.asar`.

### R5
O sistema DEVE declarar, na configuração de empacotamento, ao menos um
target de instalador Windows entre `nsis` ou `msi`.

### R6
ONDE o target `nsis` for usado, o sistema DEVE configurar
`oneClick: false` e `perMachine: false` (ou equivalente documentado), de
forma que o instalador grave a aplicação no diretório de perfil do
usuário (ex.: `%LOCALAPPDATA%`) em vez de `Program Files`, dispensando
privilégio de administrador na máquina do cliente Windows.

### R7
QUANDO o comando de build de produção (`npm run dist:win` ou equivalente)
é executado com sucesso, o sistema DEVE gerar o pacote empacotando o
frontend (`src/ui/`), o backend Node.js (`electron/`, `src/`) e o SQLite
local (`better-sqlite3` + schema), sem erros de compilação.

### R8
SE a configuração de empacotamento omitir o campo `appId`, `productName`,
`files`/`extraResources` obrigatório ou nenhum target Windows válido
(`nsis`/`msi`) ENTÃO a validação automatizada da configuração (R9) DEVE
falhar de forma explícita, identificando o campo ausente.

### R9
`tests/desktop-build.test.js` DEVE validar, por leitura estática do
arquivo de configuração de empacotamento (`package.json`/
`electron-builder.yml`), a presença e a forma correta de todos os campos
cobertos por R2–R6, sem executar um build real do `electron-builder`.

### R10
`tests/desktop-build.test.js` DEVE validar, reaproveitando (sem duplicar)
a lógica já testada em `tests/electron-main.test.js` (feature-14), que a
resolução de caminhos de dados em produção (`resolvePaths`/
`app.getPath("userData")` de `electron/main.js`) permanece consistente
com os diretórios que o instalador Windows configura como graváveis pelo
usuário (R6).

### R11
O sistema NÃO DEVE incluir em `tests/desktop-build.test.js` nenhum teste
que execute o comando real de build do `electron-builder`, gere um
instalador `.exe`/`.msi` real ou dependa de rede/Wine/toolchain de
cross-compilation — essa validação real é documentada como checklist de
verificação manual fora do escopo automatizável (`design.md`), a ser
executada numa máquina Windows real ou CI com runner Windows, nunca nesta
máquina Linux de desenvolvimento.

### R12
O sistema NÃO DEVE modificar `electron/main.js` nem `electron/preload.js`
(composition root já `done` da feature-14) para fins desta feature —
apenas a configuração de empacotamento é adicionada em cima deles.

### R13
QUANDO o executável instalado no Windows é iniciado, o sistema DEVE
carregar `electron/main.js` (`main` de `package.json`) como processo
principal em segundo plano e abrir a janela local (`createMainWindow`/
`startApp`, já validados por `tests/electron-main.test.js` na feature-14)
sem exigir nenhum passo manual adicional além de clicar no atalho gerado
pelo instalador — comportamento herdado do composition root e reafirmado
por `tests/desktop-build.test.js` apenas por leitura estática de
`package.json` (campo `"main"`, já coberto por R25 de feature-14 e
reconfirmado aqui sem duplicação de teste). A validação de que a janela
de fato abre sem falhas num executável Windows real é responsabilidade
do checklist de verificação manual (`design.md`), por depender do
runtime real do Windows.
