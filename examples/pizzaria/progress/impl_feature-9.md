# Implementação — feature-9: Integração Real com WhatsApp Web

## Arquivos criados/alterados

- `package.json` — nova dependência `"whatsapp-web.js": "^1.26.0"` em
  `dependencies`.
- `src/whatsapp/adapters/whatsapp-web-js.js` (NOVO) — adapter concreto
  que instancia `Client`/`LocalAuth` de `whatsapp-web.js` e traduz os
  eventos nativos para o contrato de `src/whatsapp/adapter.js`.
- `src/whatsapp/index.js` — adicionado reexport de
  `createWhatsAppWebJsAdapter`, sem remover nenhum export existente.
- `tests/whatsapp-adapter-real.test.js` (NOVO) — 12 testes, com
  `vi.mock("whatsapp-web.js", ...)` isolando a lib real (`FakeClient
  extends EventEmitter`).
- `specs/feature-9/tasks.md` — T1 a T22 marcadas `[x]`.

Nenhum arquivo de `src/whatsapp/client.js`, `queue.js` ou `errors.js` foi
alterado (confirmado por T11 e pelo teste de inspeção estática, R11).

## Rastreabilidade

- R1 → `"expõe apenas on/initialize/sendMessage, como documentado no
  contrato"` (existência de `createWhatsAppWebJsAdapter` satisfazendo o
  contrato) + reexport em `src/whatsapp/index.js` (T10).
- R2 → `"instancia Client com authStrategy (LocalAuth) construída com
  dataPath e puppeteer com puppeteerOptions"`.
- R3 → `"emite 'qr' com a mesma string recebida do evento nativo da
  lib"`.
- R4 → `"emite 'auth_failure' repassando o motivo, sem lançar exceção
  não tratada"`.
- R5 → `"emite 'ready' quando a lib emite seu evento nativo de sessão
  pronta"`.
- R6 → `"emite 'disconnected' quando a lib emite seu evento nativo de
  desconexão"`.
- R7 → `"traduz mensagem nativa recebida para {clienteId, texto} sem
  sufixo @c.us"`.
- R8 → `"initialize() delega para client.initialize() da lib"` e
  `"initialize() propaga rejeição levantada por client.initialize()"`.
- R9 → `"sendMessage delega para client.sendMessage com o chatId no
  formato @c.us após 'ready'"`.
- R10 → `"sendMessage rejeita com WhatsAppError e não chama a lib se a
  sessão ainda não estiver pronta"`.
- R11 → `"nenhum arquivo de src/whatsapp/ fora do adapter concreto
  importa whatsapp-web.js"` (inspeção estática via `fs.readFileSync` de
  `client.js`, `queue.js` e `index.js`).

Todos os R1–R11 têm pelo menos um teste concreto em
`tests/whatsapp-adapter-real.test.js`.

## Resultado de `./init.sh`

```
Test Files  8 passed (8)
     Tests  105 passed (105)
```

105 testes no total = 93 pré-existentes (features 1-7) + 12 novos desta
feature. Nenhum teste pré-existente foi alterado ou quebrado —
`tests/whatsapp-queue.test.js` (feature-3, 9 testes) continua passando
sem modificações.

## Decisão técnica de teste registrada durante a implementação

O `vi.mock("whatsapp-web.js", ...)` inicial falhou com
`ReferenceError: Cannot access '__vi_import_0__' before initialization`
porque a fábrica do mock (hoisted pelo Vitest para o topo do arquivo)
referenciava `EventEmitter` importado estaticamente de `node:events` no
topo do arquivo de teste — a ordem de hoisting do Vitest colocava a
avaliação do mock antes da inicialização desse import estático. Resolvido
importando `EventEmitter` dinamicamente (`await import("node:events")`)
dentro da própria fábrica do mock, e usando `vi.hoisted(...)` para o
array `instanciasCriadas` que rastreia as instâncias de `FakeClient`
criadas a cada chamada de `createWhatsAppWebJsAdapter`. Nenhuma mudança
de requirement ou design foi necessária — é um detalhe de implementação
do teste, não do adapter em si nem do spec.

## Checklist de verificação manual pendente (fora do escopo automatizável)

Reproduzido de `specs/feature-9/design.md`, seção "Fora do escopo
automatizável (verificação manual)". Nenhum destes passos é coberto por
`./init.sh` — devem ser executados manualmente pelo usuário humano após
a aprovação desta implementação:

1. Rodar `npm run dev` para abrir a aplicação desktop (Electron).
2. Confirmar que um QR Code real aparece na tela da aplicação (evento
   `"qr"` já roteado por feature-7, painel administrativo).
3. Escanear o QR Code com o WhatsApp de um celular real (Configurações →
   Aparelhos conectados → Conectar um aparelho).
4. Confirmar que o status de conexão exibido muda para "conectado"
   (evento `"connection-status-changed"` já implementado em
   `client.js`).
5. Enviar, de outro número real, uma mensagem de teste (ex.: "oi") para
   o número conectado.
6. Confirmar que a mensagem aparece processada pelo motor de
   conversação (feature-5) e que uma resposta real chega de volta no
   WhatsApp do número que enviou a mensagem de teste.
7. Fechar e reabrir `npm run dev` e confirmar que a sessão reconecta sem
   pedir um novo QR Code (validação informal da persistência via
   `LocalAuth`/`dataPath`).

**Observação:** `electron/main.js` ainda não foi tocado nesta sessão —
o design.md prevê sua modificação ("instancia o adapter concreto via
`createWhatsAppWebJsAdapter()` e injeta em `createWhatsAppClient(adapter,
{ db })`"), mas essa integração de fiação (wiring) do processo `main` do
Electron não está detalhada em nenhuma task de `tasks.md` (T1-T22 cobrem
apenas `src/whatsapp/` e o teste). Como não há requirement (`R<n>`) nem
task explícita cobrindo a edição de `electron/main.js`, e o `acceptance`
original já está satisfeito pelos R1-R11 (o adapter concreto existe e
satisfaz o contrato), este agente NÃO alterou `electron/main.js` para
não inventar decisão de design fora do spec aprovado. Se a fiação real
em `electron/main.js` for necessária, recomenda-se abrir/ajustar uma
task explícita no spec antes de implementá-la.

## Status final

Feature mantida em `in_progress` em `feature_list.json`, aguardando
revisão do `reviewer` antes de ser marcada `done`.
