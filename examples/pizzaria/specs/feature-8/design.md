# Design — feature-8: Empacotamento e Instalador Desktop Windows

## Contexto

Esta feature não escreve lógica de aplicação nova. Ela adiciona
**configuração de empacotamento** em cima do composition root já `done`
(`electron/main.js`/`electron/preload.js`, feature-14) e das dependências
já `done` (`better-sqlite3`, `mupdf`, `openai`, `whatsapp-web.js`, `react`/
`react-dom`). Nenhum arquivo de `src/` ou `electron/` é alterado.

## Arquivos a criar / tocar

```
package.json                # MODIFICADO — devDependency `electron-builder`,
                             #   script "dist:win", campo "build" (R1–R6)
electron-builder.yml        # NOVO (alternativa ao campo "build" em package.json —
                             #   ver Decisão 1) OU inline em package.json
tests/
└── desktop-build.test.js   # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo de `src/db/`, `src/menu/`, `src/ai/`, `src/delivery/`,
`src/whatsapp/`, `src/ui/`, `electron/main.js` ou `electron/preload.js` é
modificado (R12).

## Decisão 1 — Ferramenta de empacotamento: `electron-builder`

**Escolhida:** `electron-builder` (`^25.x`), adicionada em
`devDependencies`.

Motivos:

1. É o padrão de fato do ecossistema Electron para gerar instaladores
   Windows nativos (`nsis`/`msi`) com documentação madura de
   cross-compilation de módulos nativos (`node-gyp`/prebuilt binaries) a
   partir de um host Linux/macOS.
2. Executa automaticamente `electron-builder install-app-deps` (ou
   equivalente via hook), que reconstrói/baixa binários pré-compilados de
   módulos nativos (`better-sqlite3`) para a **combinação de plataforma +
   arquitetura + ABI do Electron alvo** (aqui, Windows x64, ABI do
   Electron 33), a partir da flag `--win` — sem exigir que o
   desenvolvedor rode manualmente `@electron/rebuild` para cada
   plataforma alvo (esse último já é usado hoje só para o ABI local em
   `npm run dev`, feature-14).
3. Suporta `asarUnpack` nativamente (R4), necessário porque um binário
   `.node` compilado não pode ser executado de dentro do arquivo
   compactado `app.asar` — regra bem documentada e amplamente usada por
   projetos Electron com `better-sqlite3`/`sqlite3`.
4. Único ponto de configuração declarativa (`package.json`/
   `electron-builder.yml`) o suficiente para ser validado por leitura
   estática em teste automatizado (R9), sem exigir plugins/JS de build
   arbitrário.

### Alternativa descartada: `electron-forge`

Também suportado oficialmente pelo projeto Electron e também lida com
módulos nativos (via `@electron-forge/maker-squirrel` para Windows).
Descartada nesta feature porque:

- Sua configuração de makers (`forge.config.js`) é orientada a código
  JavaScript arbitrário, não a um objeto de configuração puramente
  declarativo — dificultando a validação estática exigida por R9 sem
  executar o próprio `forge.config.js` (o que reintroduziria a
  necessidade de rodar lógica de build real dentro do teste, violando
  R11).
- `electron-builder` tem, para o caso específico desta feature (gerar
  `.exe`/`.msi` com módulo nativo embutido a partir de um host Linux),
  documentação mais direta e é a escolha mais citada pela comunidade para
  exatamente esse cenário (empacotamento cross-platform de apps com
  dependências nativas).

Nenhuma das duas ferramentas resolve a limitação de ambiente descrita na
Decisão 2 — a escolha não muda esse fato, apenas a forma de configurá-lo.

## Decisão 2 — Rebuild cross-platform de `better-sqlite3` para Windows (decisão técnica central)

**O que é tecnicamente possível a partir deste ambiente Linux:**
`electron-builder`, ao rodar com `--win`, aciona o rebuild/download de
binários nativos para a plataforma e ABI alvo (Windows x64, Electron 33)
mesmo executando o comando num host Linux — isso é suportado porque
`better-sqlite3` publica binários pré-compilados (`prebuild-install`) para
combinações comuns de plataforma/Node ABI, e quando não há um prebuilt
disponível, `electron-builder`/`node-gyp` tentam compilar via toolchain
cross-compiler (ex.: MinGW) instalado no host — o que exige setup adicional
de sistema operacional não presente por padrão neste ambiente.

**O que NÃO pode ser validado de fato nesta máquina:** rodar o build real
(`npm run dist:win`) e depois **executar** o instalador `.exe`/`.msi`
resultante para confirmar que `better-sqlite3` de fato funciona dentro do
processo Electron no Windows. Isso é exatamente o mesmo tipo de limitação
já documentada em `progress/history.md` ("2026-08-12 — Verificação manual
de `npm run dev`"): mesmo quando o rebuild/cross-compile *termina sem
erro* neste host Linux, a única forma de saber se o binário resultante
funciona de verdade dentro de um processo Electron real é rodá-lo na
plataforma alvo (aqui, Windows) — não existe emulador de ABI nativa
confiável disponível neste ambiente para validar isso automaticamente.

**Decisão:** esta feature configura o empacotamento (R1–R6) e escreve
testes que validam apenas a **configuração declarativa** (R9), nunca o
resultado de um build real (R11). A validação de que o `.exe`/`.msi`
gerado de fato abre e opera corretamente com `better-sqlite3` embutido
**fica registrada como item explícito do checklist de verificação manual
abaixo**, a ser executado pelo usuário humano numa máquina Windows real ou
num runner de CI Windows — nunca nesta máquina Linux de desenvolvimento.

### Alternativa descartada: tentar validar o rebuild Windows automaticamente nesta máquina (ex.: via Wine)

Cogitada como forma de aproximar a cobertura automatizada de R11 do
comportamento real. Descartada porque: (1) Wine não reproduz com
fidelidade suficiente o runtime real do Electron/Node no Windows para dar
confiança sobre um segfault de ABI nativa — o mesmo tipo de sintoma sutil
já documentado na sessão de `npm run dev` local poderia se repetir ou se
mascarar sob Wine sem relação com o comportamento real no Windows; (2)
adicionaria uma dependência de sistema pesada (Wine) só para uso neste
teste, sem benefício de confiança proporcional; (3) `docs/conventions.md`
e `docs/architecture.md` já estabelecem que testes automatizados não devem
depender de infraestrutura externa frágil/lenta — o mesmo racional já
usado para não chamar APIs externas reais a partir de testes.

## Decisão 3 — Permissões de leitura/escrita no Windows (R6)

O instalador NSIS é configurado com `oneClick: false` e `perMachine:
false`, que resulta na instalação padrão em
`%LOCALAPPDATA%\Programs\<productName>` (pasta de perfil do usuário
corrente), em vez de `C:\Program Files\<productName>`.

**Por quê:** `Program Files` exige privilégio de administrador tanto para
a instalação quanto, dependendo de política do Windows, para escritas
subsequentes feitas pelo próprio processo da aplicação (ex.: o arquivo
SQLite em `app.getPath("userData")`, que já é resolvido para a pasta de
dados do usuário — `resolvePaths`/`openDatabase`, feature-1/feature-14 —
e não muda nesta feature). Instalar em `%LOCALAPPDATA%` elimina a
necessidade de elevação de privilégio tanto na instalação quanto na
execução, satisfazendo diretamente o acceptance "o instalador gerado
configura corretamente as permissões de leitura e escrita na máquina do
cliente Windows" sem exigir nenhuma configuração adicional de ACL do
Windows — a aplicação já grava exclusivamente dentro do perfil do usuário
que a instalou (nunca em `Program Files` ou outra pasta protegida).

### Alternativa descartada: instalação `perMachine: true` em `Program Files`

Descartada porque exigiria elevação de administrador (prompt UAC) tanto
na instalação quanto, potencialmente, em escritas subsequentes de
runtime — contrariando diretamente o acceptance de permissões de
leitura/escrita, e adicionando fricção desnecessária de instalação para o
público-alvo (pequena pizzaria, uma única máquina Windows, sem TI
dedicado).

## Decisão 4 — Estrutura da configuração de empacotamento

Configuração adicionada em `package.json`, campo `"build"` (mantendo um
único arquivo de configuração do projeto, no mesmo espírito de
simplicidade já seguido por `vitest.config.js` separado apenas quando
necessário):

```jsonc
{
  "scripts": {
    "dist:win": "electron-builder --win"
  },
  "build": {
    "appId": "com.pizzaria.whatsapp-delivery-desktop",
    "productName": "Pizzaria WhatsApp Delivery",
    "files": [
      "electron/**/*",
      "src/**/*",
      "package.json"
    ],
    "asarUnpack": [
      "**/node_modules/better-sqlite3/**/*"
    ],
    "win": {
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false
    }
  },
  "devDependencies": {
    "electron-builder": "^25.1.8"
  }
}
```

`files` inclui `electron/**/*` e `src/**/*` (backend Node.js + frontend
React já buildado/servido pelo próprio processo Electron, sem bundler
adicional nesta feature) — cobrindo R3/R7. `src/db/schema.js` já está
dentro de `src/**/*`, portanto não precisa de uma entrada separada em
`extraResources`; o schema é aplicado em runtime pelo próprio código já
`done` (`openDatabase`), não é um arquivo estático a copiar.

### Alternativa descartada: `electron-builder.yml` separado

Cogitada por ser a forma mais comum na documentação oficial do
`electron-builder`. Descartada em favor de manter tudo em `package.json`
porque o projeto já concentra toda configuração de ferramentas em
`package.json` (scripts, `vitest` não usa `vitest.config.js` mais que o
necessário) e porque um único arquivo de config reduz a superfície que
`tests/desktop-build.test.js` precisa ler (apenas `JSON.parse` de
`package.json`, sem parser YAML adicional — nenhuma dependência de teste
nova). Se o `implementer` julgar o campo `"build"` de `package.json`
inadequado por tamanho durante a implementação, pode migrar para
`electron-builder.yml` desde que documente a mudança em
`progress/impl_feature-8.md` e ajuste `tests/desktop-build.test.js` de
acordo — mas a forma default proposta é inline em `package.json`.

## Decisão 5 — Estratégia de teste sem build real (R9, R10, R11)

`tests/desktop-build.test.js` **não invoca `electron-builder`**. Ele lê
`package.json` via `fs.readFileSync`/`JSON.parse` (mesmo padrão já usado
em `tests/electron-main.test.js` para validar `"main"`/`devDependencies`,
feature-14) e faz asserções estruturais sobre o campo `"build"`:

- `build.appId` e `build.productName` são strings não vazias (R2).
- `build.files` é um array não vazio contendo entradas que cobrem
  `electron/` e `src/` (R3).
- `build.asarUnpack` inclui uma entrada que casa com
  `better-sqlite3` (R4).
- `build.win.target` inclui `"nsis"` ou `"msi"` (R5).
- SE `build.win.target` incluir `"nsis"` ENTÃO `build.nsis.oneClick ===
  false` e `build.nsis.perMachine === false` (R6).
- `scripts["dist:win"]` existe e referencia `electron-builder` com a flag
  `--win` (R1).
- `devDependencies["electron-builder"]` existe (dependência declarada,
  sem instalar/rodar o binário durante o teste).

Casos negativos (R8) são exercitados construindo, dentro do próprio
teste, um objeto de configuração incompleto em memória (não o
`package.json` real do projeto) e reaplicando a mesma função de validação
usada nos casos positivos — confirmando que ela rejeita a ausência de
cada campo obrigatório individualmente. Isso evita duplicar o
`package.json` real ou escrever um `package.json` de fixture em disco.

Para R10, o teste importa `resolvePaths` de `electron/main.js` (mesmo
mock de `electron` já usado em `tests/electron-main.test.js` —
`app.getPath` stubado) e confirma apenas que os caminhos retornados
(`cardapioPath`, `configPath`, `whatsappSessionPath`) são todos
subcaminhos de `app.getPath("userData")`, sem reintroduzir nenhuma
asserção já coberta por `tests/electron-main.test.js` (feature-14) sobre
o comportamento de `buildDependencies`/`startApp` — reaproveitamento, não
duplicação.

Nenhum teste desta feature:
- chama `electron-builder` como processo filho;
- acessa rede;
- gera um arquivo `.exe`/`.msi` real;
- depende de Wine ou de um toolchain de cross-compilation instalado.

## Exceções

Nenhuma classe de erro de domínio nova é necessária — esta feature não
introduz lógica de runtime, apenas configuração de build e testes de
configuração.

## Fora do escopo desta feature

- **Ícone/assinatura de código do instalador (`.ico`, certificado
  Authenticode).** Não exigido por nenhum `acceptance`; pode ser
  adicionado depois sem impacto nos `R<n>` aqui definidos.
- **Auto-update.** Não exigido por nenhum `acceptance`.
- **Empacotamento para macOS/Linux.** Fora do título da feature
  ("Instalador Desktop Windows"); a mesma configuração `electron-builder`
  poderia suportar outros alvos no futuro, mas não é parte desta feature.
- **Redução do tamanho final do instalador** (`whatsapp-web.js` depende de
  Puppeteer/Chromium, que é volumoso). Registrado como observação para o
  humano, não como requisito — nenhum `acceptance` desta feature impõe um
  limite de tamanho.

## Checklist de verificação manual (fora do escopo automatizável)

Os itens abaixo **dependem do runtime real do Windows** (ou de um runner
de CI Windows) e não podem ser executados nem validados nesta máquina
Linux de desenvolvimento — mesma classe de limitação documentada em
`progress/history.md` para `npm run dev`/`better-sqlite3`. Ficam
registrados aqui como checklist de verificação manual (Nível 3,
`docs/verification.md`), a ser executado pelo usuário humano numa máquina
Windows real (ou CI com runner Windows) após a aprovação e implementação
desta feature:

1. **[Limitação de ambiente — item central]** Rodar `npm run dist:win`
   numa máquina Windows real (ou runner de CI Windows) e confirmar que o
   build termina sem erros, incluindo o rebuild/download bem-sucedido do
   binário nativo de `better-sqlite3` para a ABI do Electron 33 em
   Windows x64. Este passo **não pode ser validado nesta máquina Linux**
   — nem o resultado do rebuild, nem, principalmente, se o binário
   resultante evita o mesmo tipo de segfault de ABI nativa já visto
   localmente com o processo Electron em Linux (`progress/history.md`).
2. Instalar o `.exe`/`.msi` gerado numa máquina Windows limpa (sem
   privilégios de administrador) e confirmar que a instalação conclui sem
   solicitar elevação (UAC), validando a Decisão 3 (`%LOCALAPPDATA%`).
3. Abrir a aplicação instalada e confirmar que o processo principal
   (`electron/main.js`) inicia em segundo plano e a janela local abre sem
   falhas — em particular, confirmar que `new Database(...)`
   (`better-sqlite3`, chamado por `openDatabase`) não segfaulta dentro do
   processo Electron empacotado, resolvendo de fato (ou não) a limitação
   registrada na sessão de `npm run dev` local.
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
