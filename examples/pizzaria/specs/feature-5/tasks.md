# Tasks — feature-5: Motor de Conversação com OpenAI e DeepSeek

> **Nota de correção (2026-08-11):** T6 e T8–T21 foram revisadas para
> refletir a nova ordem de operações de `design.md` (cliente resolvido por
> telefone antes de sessão — ver R4 em `requirements.md`). T1–T5 e T7
> (config, chatClient, errors, modelSelector, `updateCliente`,
> `src/ai/index.js`) já foram implementadas em uma sessão anterior e não
> são afetadas pela reordenação — permanecem `[x]`. **T6 volta a `[ ]`**:
> `conversationEngine.js` já existe, mas foi escrito seguindo a ordem
> antiga (incorreta) e precisa ser reescrito conforme a nova ordem de
> `design.md`. T8–T21 (testes) também voltam a `[ ]`: os 17 testes já
> escritos em `tests/conversation-engine.test.js` continuam válidos na
> maioria dos casos, mas ao menos 4 deles precisam de ajuste — ver
> `progress/current.md`, seção sobre testes incompatíveis com a nova
> ordem, antes de marcar T8–T21 como concluídas.

- [x] T1 — Estender `src/menu/config.js`: adicionar `modeloSelecionado: "openai"`
      em `getDefaultConfig()`; em `loadConfig(path)`, fazer merge do campo
      (`salvo.modeloSelecionado ?? padrao.modeloSelecionado`); em
      `_validarConfig(config)`, validar que `modeloSelecionado` é `"openai"`
      ou `"deepseek"`, lançando `InvalidConfigError` caso contrário.
      Cobre: R1, R2.

- [x] T2 — Criar `src/ai/chatClient.js` documentando (JSDoc) o contrato
      `ChatClientAdapter` (`generateReply({ systemPrompt, cardapio, historico,
      mensagemCliente }) -> Promise<{ resposta, dadosCliente?, pedido? }>`),
      sem importar nenhum SDK concreto.
      Cobre: R5, R6, R7, R10, R12.

- [x] T3 — Estender `src/ai/errors.js` com `MissingApiKeyError`,
      `ChatCompletionError` e `IncompleteOrderDataError`, todas subtipos de
      `AiError`.
      Cobre: R3, R9, R14.

- [x] T4 — Criar `src/ai/modelSelector.js` com `selectChatClient(adapters,
      config)`: resolve `"openai"` como padrão quando `config.modeloSelecionado`
      estiver ausente ou fora do conjunto `{"openai", "deepseek"}`; lança
      `MissingApiKeyError` se `config.apiKeys[<modelo>]` estiver ausente/vazia;
      retorna `adapters[<modelo>]`.
      Cobre: R1, R2, R3.

- [x] T5 — Estender `src/db/clientes.js` com `updateCliente(db, id, { nome,
      endereco, latitude, longitude } = {})`: `UPDATE` parcial via
      `COALESCE(@campo, coluna)` por campo, preservando valores já salvos
      quando o campo não é informado; retorna o cliente atualizado via
      `findClienteById`. Reexportar em `src/db/index.js`.
      Cobre: R10.

- [x] T6 — Criar/reescrever `src/ai/conversationEngine.js` com
      `processarMensagemConversa({ db, clienteId, mensagemCliente, adapters,
      config, cardapio })`, implementando, **nesta ordem** (`clienteId` é o
      telefone recebido; o id interno do cliente é resolvido no passo 2 e
      usado a partir daí): (1) seleção do adapter via `selectChatClient`;
      (2) resolução/criação do cliente por telefone —
      `findClienteByTelefone(db, clienteId)` e, se não existir,
      `insertCliente(db, { telefone: clienteId })` (demais campos `null`)
      — obtendo `cliente.id` (id interno); (3) leitura da sessão existente
      (`findSessaoByClienteId(db, cliente.id)`) e decodificação do
      `historico` em JSON, ou `[]` se não houver sessão; (4) chamada a
      `generateReply` com `systemPrompt`, `cardapio`, `historico` e
      `mensagemCliente`, capturando falha e relançando
      `ChatCompletionError` com `{ cause }` (sem chamar `upsertSessao`,
      `updateCliente` nem `insertPedido` neste caso); (5)
      `upsertSessao(db, { clienteId: cliente.id, historico })` com o
      histórico atualizado (mensagem do cliente + resposta do assistente
      anexadas às mensagens anteriores); (6) se `dadosCliente` estiver
      presente na resposta, `updateCliente(db, cliente.id, dadosCliente)`,
      atualizando a variável `cliente` com o retorno; caso contrário,
      `cliente` permanece o registro básico do passo 2, sem chamar
      `updateCliente`; (7) inserção de pedido quando `pedido?.fechado ===
      true` e `cliente.nome`/`cliente.endereco` estiverem ambos
      preenchidos (via `insertPedido`, associado a `cliente.id`,
      serializando `{ lista: pedido.itens, formaPagamento:
      dadosCliente?.formaPagamento ?? null }` em `itens`, `status:
      "recebido"`, `motoboy: null`), lançando `IncompleteOrderDataError`
      se `pedido?.fechado === true` e `nome`/`endereco` não estiverem
      ambos preenchidos; (8) retorno de `{ resposta, pedidoRegistrado,
      clienteId }`, onde `clienteId` é o telefone original recebido (não
      `cliente.id`).
      Cobre: R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15.

- [x] T7 — Atualizar `src/ai/index.js` reexportando `selectChatClient`,
      `processarMensagemConversa` e as classes novas de `src/ai/errors.js`
      (`MissingApiKeyError`, `ChatCompletionError`, `IncompleteOrderDataError`).
      Cobre: R1–R15 (superfície pública).

- [x] T8 — Escrever em `tests/conversation-engine.test.js` (Vitest, dublês
      simples de `adapters.openai`/`adapters.deepseek` — funções `async`
      controladas pelo teste, sem rede real, e um banco SQLite real em
      diretório temporário via `openDatabase`/`fs.mkdtempSync`): teste que
      confirma que, com `config.modeloSelecionado` ausente (ou `"openai"`),
      `adapters.openai.generateReply` é chamado e `adapters.deepseek` não é
      tocado.
      Cobre: R1. (Já escrito e compatível com a nova ordem — sem alteração
      necessária.)

- [x] T9 — Adicionar em `tests/conversation-engine.test.js`: teste com
      `config.modeloSelecionado = "deepseek"` confirmando que
      `adapters.deepseek.generateReply` é chamado e `adapters.openai` não é
      tocado.
      Cobre: R2. (Já escrito e compatível — sem alteração necessária.)

- [x] T10 — Adicionar em `tests/conversation-engine.test.js`: teste em que a
      `apiKey` do modelo selecionado está vazia, verificando que
      `processarMensagemConversa` lança `MissingApiKeyError` e que nenhum
      adapter é chamado.
      Cobre: R3. (Já escrito e compatível — sem alteração necessária.)

- [x] T11 — Adicionar em `tests/conversation-engine.test.js`: teste **novo**
      que confirma que, ao processar uma mensagem de um `clienteId`
      (telefone) inédito, um cliente básico é criado em `clientes` com
      `telefone` igual ao `clienteId` (via `findClienteByTelefone`) mesmo
      quando a resposta do adapter não contém `dadosCliente`; e teste
      complementar confirmando que, para um `clienteId` já cadastrado, a
      resolução reaproveita o cliente existente (não cria duplicata —
      `insertCliente` lançaria `DuplicatePhoneError` em caso de duplicata).
      Cobre: R4. (Teste novo — não existe em `tests/conversation-engine.test.js`
      hoje; precisa ser adicionado.)

- [x] T12 — Adicionar em `tests/conversation-engine.test.js`: teste que
      verifica que `generateReply` é chamado com `systemPrompt` e `cardapio`
      exatamente iguais aos recebidos por `processarMensagemConversa`, sem
      alteração.
      Cobre: R5. (Já escrito e compatível — sem alteração necessária.)

- [x] T13 — Adicionar em `tests/conversation-engine.test.js`: teste que
      grava uma sessão prévia para um `clienteId` e confirma que
      `generateReply` recebe esse histórico decodificado em `historico`;
      teste complementar para `clienteId` sem sessão prévia, confirmando
      `historico: []`.
      Cobre: R6, R7. **Ajuste necessário no teste existente** ("inclui o
      histórico decodificado..."): hoje o teste chama
      `upsertSessao(db, { clienteId, historico })` diretamente, passando o
      **telefone** como `clienteId` — isso viola a FK de
      `sessoes.cliente_id` (que referencia `clientes.id`), já que nenhum
      cliente com esse id numérico existe. O teste precisa primeiro
      resolver/criar o cliente (`findClienteByTelefone`/`insertCliente`,
      como o próprio motor faria) para obter o id interno, e só então
      chamar `upsertSessao(db, { clienteId: cliente.id, historico })`.

- [x] T14 — Adicionar em `tests/conversation-engine.test.js`: teste que,
      após uma chamada bem-sucedida, relê a sessão do cliente no banco e
      confirma que o histórico persistido contém a mensagem do cliente e a
      resposta do assistente, além de mensagens anteriores (chamando o motor
      duas vezes em sequência para o mesmo `clienteId`).
      Cobre: R8. **Ajuste necessário no teste existente** ("persiste o
      histórico atualizado..."): hoje o teste chama
      `findSessaoByClienteId(db, clienteId)` com o telefone diretamente
      para conferir a sessão persistida; como a sessão agora é indexada
      pelo id interno do cliente, o teste precisa primeiro resolver o
      cliente via `findClienteByTelefone(db, clienteId)` e usar
      `cliente.id` na chamada a `findSessaoByClienteId`.

- [x] T15 — Adicionar em `tests/conversation-engine.test.js`: teste em que o
      dublê de `generateReply` rejeita, verificando que
      `processarMensagemConversa` lança `ChatCompletionError` com a causa
      original preservada e que nenhuma sessão/pedido é gravado.
      Cobre: R9. **Ajuste necessário no teste existente** ("lança
      ChatCompletionError..."): hoje o teste verifica também
      `findClienteByTelefone(db, clienteId)).toBeNull()` após a falha —
      isso não é mais válido, pois a resolução/criação do cliente básico
      (R4) acontece **antes** da chamada a `generateReply`, logo um
      registro básico de cliente (telefone apenas, `nome`/`endereco`
      `null`) já existe mesmo quando `generateReply` falha. O teste deve
      remover essa asserção (ou trocá-la por uma que confirme que o
      cliente, se existir, não tem `nome`/`endereco` preenchidos) e manter
      apenas a verificação de que nenhuma sessão foi persistida
      (`findSessaoByClienteId` continua retornando `null`) e nenhum pedido
      foi inserido.

- [x] T16 — Adicionar em `tests/conversation-engine.test.js`: teste em que a
      resposta do adapter inclui `dadosCliente: { nome, endereco }` para um
      `clienteId` inédito, verificando que o cliente correspondente no
      banco passa a ter `nome`/`endereco` preenchidos.
      Cobre: R10. (Já escrito — "cria um novo cliente quando dadosCliente é
      informado..." — e permanece compatível: a asserção final via
      `findClienteByTelefone` continua válida independentemente de o
      registro ter sido criado em R4 e depois atualizado, ou criado
      diretamente; apenas a descrição/nome do teste pode ser ajustada para
      refletir que a operação de banco realizada é `updateCliente`, não
      `insertCliente`.)

- [x] T17 — Adicionar em `tests/conversation-engine.test.js`: teste em que
      um cliente já existe (criado previamente com `nome`) e a resposta do
      adapter inclui `dadosCliente: { endereco }` (sem `nome`), verificando
      que o `endereco` é atualizado e o `nome` previamente salvo é
      preservado.
      Cobre: R10. (Já escrito e compatível — sem alteração necessária.)

- [x] T18 — Adicionar em `tests/conversation-engine.test.js`: teste em que a
      resposta do adapter não inclui `dadosCliente`, verificando que nenhum
      `updateCliente` é aplicado (ou seja, `nome`/`endereco`/`latitude`/
      `longitude` do cliente permanecem `null`/inalterados).
      Cobre: R11. **Ajuste necessário no teste existente** ("não cria nem
      altera nenhum registro em clientes..."): hoje o teste verifica
      `findClienteByTelefone(db, clienteId)).toBeNull()` — isso não é mais
      válido, pois R4 sempre resolve/cria um registro básico de cliente
      (telefone apenas) antes de tocar em sessão, mesmo sem `dadosCliente`.
      O teste deve trocar a asserção para confirmar que o cliente **existe**
      (registro básico) mas `nome` e `endereco` permanecem `null`.

- [x] T19 — Adicionar em `tests/conversation-engine.test.js`: teste em que a
      resposta do adapter inclui `dadosCliente` (com `formaPagamento`) e
      `pedido: { itens: [...], fechado: true }` para um cliente já resolvido
      na mesma chamada, verificando que um pedido é inserido com `status:
      "recebido"` e que `JSON.parse(pedido.itens)` reproduz `{ lista,
      formaPagamento }` corretamente.
      Cobre: R12. (Já escrito e compatível — sem alteração necessária.)

- [x] T20 — Adicionar em `tests/conversation-engine.test.js`: dois testes
      verificando que nenhum pedido é inserido quando `pedido.fechado ===
      false` e quando `pedido` está ausente da resposta.
      Cobre: R13. (Já escrito e compatível — sem alteração necessária.)

- [x] T21 — Adicionar em `tests/conversation-engine.test.js`: teste em que a
      resposta do adapter contém `pedido.fechado === true` sem
      `dadosCliente` e sem que exista cliente prévio (com `nome`/`endereco`
      preenchidos) para o `clienteId`, verificando que
      `processarMensagemConversa` lança `IncompleteOrderDataError` e que
      nenhum pedido é inserido.
      Cobre: R14. O teste já escrito ("lança IncompleteOrderDataError...")
      permanece compatível em termos de resultado observável (erro lançado,
      zero pedidos), pois mesmo com a resolução básica do cliente em R4 (que
      cria um registro com `telefone` apenas), esse cliente não tem
      `nome`/`endereco` preenchidos — condição agora exigida por R14. Não é
      necessário alterar as asserções deste teste, mas seu comentário/nome
      pode ser ajustado para descrever a nova condição ("sem nome/endereço
      preenchidos", não "sem cliente resolvido").

- [x] T22 — Adicionar em `tests/conversation-engine.test.js`: teste que
      confirma o formato do retorno de `processarMensagemConversa` em um
      fluxo de sucesso com fechamento de pedido (`pedidoRegistrado === true`)
      e em um fluxo de sucesso sem fechamento (`pedidoRegistrado === false`),
      incluindo `resposta` e `clienteId` (telefone original) corretos em
      ambos.
      Cobre: R15. (Já escrito e compatível — sem alteração necessária.)

- [x] T23 — Executar `npm test` e `./init.sh`; aplicar os ajustes indicados
      em T13, T14, T15, T18 (e opcionalmente T16, T21) a
      `tests/conversation-engine.test.js`; adicionar o teste novo de T11;
      documentar a tabela de rastreabilidade R1–R15 → nome do teste em
      `progress/impl_feature-5.md`.
      Cobre: R1–R15 (verificação final).
