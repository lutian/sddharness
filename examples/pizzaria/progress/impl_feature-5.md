# Implementação — feature-5: Motor de Conversação com OpenAI e DeepSeek

**Status desta sessão: implementação concluída (T1–T23), aguardando
review.** Retomada após bloqueio anterior (`clienteId` telefone vs. id
interno em `sessoes.cliente_id`), resolvido pela correção de spec aprovada
pelo humano em 2026-08-11 (ver `progress/history.md` e a nota de correção
no topo de `specs/feature-5/requirements.md`/`design.md`/`tasks.md`).

## O que foi feito nesta sessão

- `src/ai/conversationEngine.js` — reescrito para seguir a **nova ordem de
  operações** do `design.md` corrigido:
  1. `selectChatClient(adapters, config)` (R1–R3);
  2. resolve/cria o cliente por telefone (`findClienteByTelefone`/
     `insertCliente`) **antes** de tocar em sessão, obtendo o id interno
     `cliente.id` (R4);
  3. `findSessaoByClienteId(db, cliente.id)` + decodificação do histórico
     (R6, R7);
  4. `generateReply(...)` (R5), captura de falha → `ChatCompletionError`
     (R9);
  5. `upsertSessao(db, { clienteId: cliente.id, ... })` (R8);
  6. se `dadosCliente` presente, `updateCliente(db, cliente.id,
     dadosCliente)` (R10); senão `cliente` permanece o registro básico
     (R11);
  7. fechamento de pedido: exige `cliente.nome` e `cliente.endereco`
     preenchidos, senão `IncompleteOrderDataError` (R14); caso contrário
     `insertPedido` (R12) — ou nada quando `pedido.fechado` não é `true`
     (R13);
  8. retorno `{ resposta, pedidoRegistrado, clienteId }`, onde `clienteId`
     é sempre o telefone original recebido (R15).
- `tests/conversation-engine.test.js` — ajustados os 4 testes incompatíveis
  identificados em `progress/current.md`:
  1. "inclui o histórico decodificado..." — passa a resolver/criar o
     cliente por telefone antes de chamar `upsertSessao` diretamente no
     setup do teste, usando `cliente.id`.
  2. "persiste o histórico atualizado..." — passa a resolver o cliente via
     `findClienteByTelefone` antes de chamar `findSessaoByClienteId(db,
     cliente.id)` para reler a sessão persistida.
  3. "lança ChatCompletionError..." — trocada a asserção
     `findClienteByTelefone(...).toBeNull()` por uma que confirma que o
     cliente básico (R4) existe mas `nome`/`endereco` permanecem `null`, e
     que `findSessaoByClienteId(db, cliente.id)` continua `null`.
  4. "não cria nem altera nenhum registro em clientes..." (renomeado para
     "não altera nome/endereco do cliente quando dadosCliente está
     ausente...") — trocada a asserção de `toBeNull()` para confirmar que o
     cliente existe (registro básico de R4) com `nome`/`endereco` `null`.
  - Adicionados os 2 testes **novos** de T11 (R4): criação do cliente
    básico quando o telefone é inédito e sem `dadosCliente`; reaproveitamento
    do cliente já cadastrado (sem duplicata) quando o telefone já existe.
- `specs/feature-5/tasks.md` — T6, T8–T23 marcadas `[x]`.

## Rastreabilidade final (R1–R15 → teste)

Todos os testes abaixo estão em `tests/conversation-engine.test.js` e
passam (`npx vitest run tests/conversation-engine.test.js` → 19/19 ✅).

| R<n> | Teste | Status |
|------|-------|--------|
| R1 | "usa adapters.openai por padrão quando modeloSelecionado está ausente ou é \"openai\"" | ✅ |
| R2 | "usa adapters.deepseek quando modeloSelecionado é \"deepseek\"" | ✅ |
| R3 | "lança MissingApiKeyError e não chama nenhum adapter quando a apiKey do modelo selecionado está vazia" | ✅ |
| R4 | "resolve/cria um cliente básico por telefone (R4) mesmo quando a resposta do adapter não contém dadosCliente" e "reaproveita o cliente já cadastrado ao resolver por telefone (R4), sem criar duplicata" | ✅ |
| R5 | "chama generateReply com systemPrompt e cardapio exatamente iguais aos recebidos" | ✅ |
| R6 | "inclui o histórico decodificado da sessão salva quando ela existe para o clienteId" | ✅ |
| R7 | "chama generateReply com historico vazio quando não existe sessão salva para o clienteId" | ✅ |
| R8 | "persiste o histórico atualizado com a mensagem do cliente e a resposta do assistente, preservando mensagens anteriores" | ✅ |
| R9 | "lança ChatCompletionError com a causa original e não persiste sessão nem pedido quando generateReply falha" | ✅ |
| R10 | "cria um novo cliente quando dadosCliente é informado e o clienteId é inédito" e "atualiza apenas os campos informados de um cliente já existente, preservando os demais" | ✅ |
| R11 | "não altera nome/endereco do cliente quando dadosCliente está ausente (apenas o registro básico de R4 é criado)" | ✅ |
| R12 | "insere um pedido com status \"recebido\" e itens estruturados quando pedido.fechado é true" | ✅ |
| R13 | "não insere pedido quando pedido.fechado é false" e "não insere pedido quando a resposta do adapter não contém o campo pedido" | ✅ |
| R14 | "lança IncompleteOrderDataError e não insere pedido quando pedido.fechado é true sem cliente resolvido" (nome mantido; condição real agora é "sem nome/endereço preenchidos", ver nota T21) | ✅ |
| R15 | "retorna resposta, pedidoRegistrado e clienteId corretos em um fluxo de sucesso com fechamento de pedido" e "... sem fechamento de pedido" | ✅ |

## Verificação final

`./init.sh` → todos os testes passam: **69/69** (5 arquivos de teste:
`ai-multimodal.test.js` 19, `conversation-engine.test.js` 19,
`whatsapp-queue.test.js` 9, `database.test.js` 12, `config-menu.test.js`
10). Nenhuma feature já `done` (1–4) foi afetada.

## Estado

`specs/feature-5/tasks.md`: T1–T23 todas `[x]`. `feature_list.json`:
`feature-5.status` permanece `in_progress` — não alterado nesta sessão,
conforme protocolo (mudança para `done` é responsabilidade do
reviewer/leader após aprovação).
