# Review — feature feature-5

**Veredito:** APPROVED

## Rastreabilidade requirements ↔ testes
- R1: [x] `"usa adapters.openai por padrão quando modeloSelecionado está ausente ou é \"openai\""` (`tests/conversation-engine.test.js:71`)
- R2: [x] `"usa adapters.deepseek quando modeloSelecionado é \"deepseek\""` (linha 91)
- R3: [x] `"lança MissingApiKeyError e não chama nenhum adapter quando a apiKey do modelo selecionado está vazia"` (linha 110)
- R4: [x] `"resolve/cria um cliente básico por telefone (R4) mesmo quando a resposta do adapter não contém dadosCliente"` (linha 130) e `"reaproveita o cliente já cadastrado ao resolver por telefone (R4), sem criar duplicata"` (linha 149)
- R5: [x] `"chama generateReply com systemPrompt e cardapio exatamente iguais aos recebidos"` (linha 169)
- R6: [x] `"inclui o histórico decodificado da sessão salva quando ela existe para o clienteId"` (linha 186)
- R7: [x] `"chama generateReply com historico vazio quando não existe sessão salva para o clienteId"` (linha 212)
- R8: [x] `"persiste o histórico atualizado com a mensagem do cliente e a resposta do assistente, preservando mensagens anteriores"` (linha 228)
- R9: [x] `"lança ChatCompletionError com a causa original e não persiste sessão nem pedido quando generateReply falha"` (linha 266)
- R10: [x] `"cria um novo cliente quando dadosCliente é informado e o clienteId é inédito"` (linha 307) e `"atualiza apenas os campos informados de um cliente já existente, preservando os demais"` (linha 329)
- R11: [x] `"não altera nome/endereco do cliente quando dadosCliente está ausente (apenas o registro básico de R4 é criado)"` (linha 350)
- R12: [x] `"insere um pedido com status \"recebido\" e itens estruturados quando pedido.fechado é true"` (linha 370)
- R13: [x] `"não insere pedido quando pedido.fechado é false"` (linha 398) e `"não insere pedido quando a resposta do adapter não contém o campo pedido"` (linha 421)
- R14: [x] `"lança IncompleteOrderDataError e não insere pedido quando pedido.fechado é true sem cliente resolvido"` (linha 442)
- R15: [x] `"retorna resposta, pedidoRegistrado e clienteId corretos em um fluxo de sucesso com fechamento de pedido"` (linha 464) e `"... sem fechamento de pedido"` (linha 489)

Todos os R1–R15 (versão corrigida) têm cobertura de teste concreta e rastreável. O mapa declarado em `progress/impl_feature-5.md` bate com o conteúdo real de `tests/conversation-engine.test.js` (19 testes, conferidos linha a linha).

## Tasks completas
- T1–T23: [x] todas marcadas `[x]` em `specs/feature-5/tasks.md`, e o conteúdo real de `src/menu/config.js`, `src/ai/*`, `src/db/clientes.js`, `src/db/index.js` e `tests/conversation-engine.test.js` corresponde ao que cada task descreve. Nenhuma task ficou pendente.

## Verificação da correção de spec (ponto crítico)
Confirmado que a nova ordem de operações está de fato implementada em
`src/ai/conversationEngine.js`:
1. `selectChatClient(adapters, config)` (linha 31) — antes de qualquer IO no banco.
2. `findClienteByTelefone(db, clienteId)` / `insertCliente(db, { telefone: clienteId })` (linhas 36–39) — resolve/cria o cliente por telefone **antes** de tocar em sessão.
3. `findSessaoByClienteId(db, cliente.id)` (linha 41) — usa o **id interno**, não o telefone.
4. `generateReply(...)` (linha 46) com captura de falha → `ChatCompletionError` (linhas 52–57).
5. `upsertSessao(db, { clienteId: cliente.id, ... })` (linha 64) — id interno.
6. `updateCliente(db, cliente.id, dadosCliente)` condicional (linhas 66–68).
7. Checagem de `nome`/`endereco` preenchidos antes de `insertPedido` associado a `cliente.id`, com `IncompleteOrderDataError` caso contrário (linhas 72–92).
8. Retorno com `clienteId` = telefone original recebido no parâmetro da função (linha 97), **nunca** o id interno resolvido — confirmado pelo teste da linha 464 (`toEqual({ ..., clienteId })` com `clienteId` sendo a variável de telefone usada na chamada, não `cliente.id`).

Não há vestígio da ordem antiga (que causava `FOREIGN KEY constraint failed`
em `upsertSessao`, relatada em `progress/impl_feature-5.md`/`progress/current.md`
no bloqueio original). A correção do spec foi propagada de forma completa e
consistente a `requirements.md`, `design.md`, `tasks.md`, ao código de
`conversationEngine.js` e aos testes.

## Consistência com contratos já `done`
- `src/db/sessoes.js` e `src/whatsapp/` não foram alterados nesta feature
  (confirmado por leitura de `design.md` e ausência de diffs nesses
  arquivos fora do escopo de feature-5).
- `updateCliente` (novo, `src/db/clientes.js:51`) segue o padrão de update
  parcial via `COALESCE`, reexportado corretamente em `src/db/index.js`.
- `src/menu/config.js` estende `getDefaultConfig`/`loadConfig`/
  `_validarConfig` com `modeloSelecionado` de forma aditiva e
  retrocompatível, conforme `design.md`.
- `src/ai/errors.js` acrescenta `MissingApiKeyError`, `ChatCompletionError`,
  `IncompleteOrderDataError` como subtipos de `AiError`, seguindo
  `docs/conventions.md` (hierarquia de erros por domínio).
- `src/ai/index.js` reexporta corretamente os novos símbolos públicos.

## Execução de `./init.sh`
```
Test Files  5 passed (5)
     Tests  69 passed (69)
[OK]    Ambiente pronto. Você pode começar a trabalhar.
```
Confirmado: 12 (database) + 10 (config-menu) + 9 (whatsapp-queue) +
19 (ai-multimodal) + 19 (conversation-engine) = 69 testes, todos verdes.
Nenhuma feature já `done` (1–4) sofreu regressão.

## Checkpoints
- C1: [x] Arquivos base presentes; `./init.sh` termina em exit code 0.
- C2: [x] Apenas feature-5 em `in_progress`; `progress/current.md` reflete a sessão ativa (histórico do bloqueio e da correção, sem lixo de sessões não relacionadas).
- C3: [x] `src/` contém apenas os domínios previstos (`db`, `menu`, `whatsapp`, `ai`); nenhuma dependência nova não justificada; sem `console.log`/TODO soltos em `src/ai`, `src/db`, `src/menu`.
- C4: [x] `tests/` cobre todo módulo público tocado; diretórios temporários reais (`fs.mkdtempSync`) usados em `tests/conversation-engine.test.js`; `npm test`/`./init.sh` mostram 69 testes verdes.
- C5: [x] Nenhum artefato suspeito não rastreado; `progress/current.md`/`progress/impl_feature-5.md` documentam a sessão; estado de feature-5 (`in_progress`, aguardando decisão do reviewer/leader) é coerente com o trabalho concluído.
- C6: [x] `specs/feature-5/` tem os 3 arquivos; `requirements.md` usa EARS estrito; todas as tasks de `tasks.md` estão `[x]`; cada `R<n>` tem cobertura de teste concreta.

## Mudanças necessárias (se aplicável)
Nenhuma. A implementação está completa, rastreável e consistente com a
correção de spec aprovada. Recomenda-se ao `leader` transicionar
`feature-5.status` de `in_progress` para `done` em `feature_list.json`.
