# Requirements — feature-5: Motor de Conversação com OpenAI e DeepSeek

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/conversation-engine.test.js`. Mapeamento aos 4 `acceptance` originais
> de `feature_list.json` ao final do documento.

> **Nota de correção (2026-08-11):** este documento foi revisado após o
> `implementer` reportar bloqueio (`progress/impl_feature-5.md`,
> `progress/history.md`) por inconsistência entre o formato de `clienteId`
> assumido por R9/R10 originais (telefone) e o contrato já `done` de
> `findSessaoByClienteId`/`upsertSessao` (`src/db/sessoes.js`, feature-1),
> que exigem o **id interno** (`clientes.id`). A correção aprovada pelo
> humano é reordenar o fluxo: resolver/criar o cliente por telefone
> **antes** de tocar em sessão. Um requirement novo (**R4**) foi inserido
> para cobrir essa resolução; os requirements a partir de R4 foram
> renumerados/ajustados em relação à versão anterior (R9 e R10 originais
> foram fundidos em R10, já que a criação do cliente passa a ocorrer
> sempre em R4, restando a R10 apenas a atualização de campos). A
> numeração final continua R1–R15.

## R1
O sistema DEVE selecionar o adapter de modelo de IA (`openai` ou `deepseek`)
a partir do campo `config.modeloSelecionado`, usando `"openai"` como valor
padrão quando esse campo estiver ausente ou contiver um valor diferente de
`"openai"` e de `"deepseek"`.

## R2
QUANDO `config.modeloSelecionado` for `"deepseek"` e o colaborador
`adapters.deepseek` estiver presente, o sistema DEVE usar `adapters.deepseek`
(e não `adapters.openai`) para gerar a resposta da conversa.

## R3
SE a chave de API correspondente ao modelo selecionado
(`config.apiKeys.openai` ou `config.apiKeys.deepseek`, conforme o caso)
estiver ausente ou for uma string vazia ENTÃO o sistema DEVE lançar
`MissingApiKeyError` e NÃO DEVE chamar `generateReply` do adapter
selecionado.

## R4
QUANDO o motor processa uma mensagem do cliente, e antes de consultar ou
persistir qualquer sessão (`findSessaoByClienteId`/`upsertSessao`), o
sistema DEVE resolver o cliente correspondente ao `clienteId` informado
(que é o **telefone** do cliente) da seguinte forma: buscar um cliente
existente com esse `telefone` (via `findClienteByTelefone`) e, se não
existir nenhum, criar um novo cliente (via `insertCliente`) com `telefone`
igual ao `clienteId` e os demais campos (`nome`, `endereco`, `latitude`,
`longitude`) nulos. O **id interno** (`cliente.id`) resultante desta
resolução DEVE ser o identificador usado em todas as chamadas subsequentes
a `findSessaoByClienteId`/`upsertSessao` durante o processamento desta
mensagem.

## R5
QUANDO o motor processa uma mensagem do cliente, o sistema DEVE chamar
`generateReply` do adapter selecionado passando exatamente `config.systemPrompt`
e o `cardapio` recebidos pelo motor, sem alteração de conteúdo.

## R6
QUANDO o motor processa uma mensagem do cliente e já existe uma sessão
salva (via `findSessaoByClienteId`, usando o id interno do cliente
resolvido em R4) para esse cliente, o sistema DEVE incluir, no parâmetro
`historico` enviado a `generateReply`, o histórico decodificado (JSON)
previamente persistido para esse cliente.

## R7
QUANDO o motor processa uma mensagem do cliente e não existe sessão salva
(via `findSessaoByClienteId`, usando o id interno do cliente resolvido em
R4) para esse cliente, o sistema DEVE chamar `generateReply` com
`historico` igual a um array vazio.

## R8
QUANDO `generateReply` retorna uma `resposta` com sucesso, o sistema DEVE
persistir, via `upsertSessao` (usando o id interno do cliente resolvido em
R4 como `clienteId` do registro de sessão), um histórico atualizado que
inclua a nova mensagem do cliente e a resposta do assistente, preservando
as mensagens anteriores já existentes no histórico.

## R9
SE a chamada a `generateReply` falhar (rejeitar a promise) ENTÃO o sistema
DEVE lançar `ChatCompletionError` contendo a causa original do erro, e NÃO
DEVE persistir sessão nem pedido, nem alterar `nome`/`endereco` do cliente
resolvido em R4 (a resolução/criação básica do cliente em R4, por ocorrer
antes da chamada a `generateReply`, já pode ter acontecido mesmo quando
`generateReply` falha; isso não constitui persistência de sessão nem de
pedido).

## R10
QUANDO a resposta do adapter contém `dadosCliente` com `nome` e/ou
`endereco`, o sistema DEVE atualizar (via `updateCliente`) o cliente
resolvido em R4, aplicando apenas os campos informados em `dadosCliente` e
preservando os valores já salvos para os campos não informados nesta
mensagem.

## R11
QUANDO a resposta do adapter não contém o campo `dadosCliente` (ausente ou
nulo), o sistema NÃO DEVE chamar `updateCliente` nem alterar `nome`,
`endereco`, `latitude` ou `longitude` do cliente resolvido em R4 (o
registro básico do cliente, resolvido/criado em R4 apenas com `telefone`,
permanece inalterado nos demais campos).

## R12
QUANDO a resposta do adapter contém `pedido.fechado` igual a `true`, o
sistema DEVE inserir um pedido (via `insertPedido`) associado ao id
interno do cliente resolvido em R4, com `status` igual a `"recebido"` e
com o campo `itens` contendo, serializado como JSON, um objeto com a
lista de itens (`pedido.itens`) e a forma de pagamento informada em
`dadosCliente.formaPagamento`.

## R13
QUANDO a resposta do adapter contém `pedido.fechado` igual a `false`, ou não
contém o campo `pedido`, o sistema NÃO DEVE inserir nenhum registro na
tabela `pedidos`.

## R14
SE a resposta do adapter contiver `pedido.fechado` igual a `true` e, ao
final do processamento dos dados do cliente desta mesma mensagem (R4,
R10, R11), o cliente resolvido não possuir `nome` **e** `endereco`
preenchidos (nem previamente salvos em turnos anteriores, nem informados
em `dadosCliente` nesta mensagem) ENTÃO o sistema DEVE lançar
`IncompleteOrderDataError` e NÃO DEVE inserir o pedido.

## R15
QUANDO o processamento de uma mensagem é concluído com sucesso, o sistema
DEVE retornar um objeto contendo, no mínimo, `resposta` (o texto a enviar
de volta ao cliente), `pedidoRegistrado` (booleano indicando se um pedido
foi inserido nesta chamada) e `clienteId` (o mesmo valor de telefone
recebido no parâmetro `clienteId` da chamada original, e não o id interno
resolvido em R4).

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                              | Coberto por                     |
|------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|
| O bot utiliza o modelo selecionado no painel (OpenAI ou DeepSeek) respeitando o system prompt e o cardápio.                              | R1, R2, R3, R5, R9               |
| A IA consegue identificar a intenção de compra, coletar nome, endereço e forma de pagamento, salvando os dados no banco.                 | R4, R6, R7, R8, R10, R11         |
| O fluxo de fechamento de pedido gera um registro estruturado na tabela de pedidos.                                                        | R12, R13, R14, R15               |
| tests/conversation-engine.test.js valida a triagem, extração de dados e registro do pedido.                                              | R1–R15 (implementação de teste)  |
