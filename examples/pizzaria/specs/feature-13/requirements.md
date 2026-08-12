# Requirements — feature-13: Interface React — Painel KDS

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/kds-panel-ui.test.js`, rodando em ambiente `jsdom` (já coberto pelo
> padrão `tests/*-ui.test.js` de `vitest.config.js`, feature-11) com
> `@testing-library/react`. Nenhum teste desta feature toca o banco SQLite
> real, `src/delivery/*` real ou `src/whatsapp/*` real — todas as
> interações de dados e de status de conexão passam por um "cliente de
> dados" fake injetado (ver `design.md`, Decisão 1). Mapeamento aos 5
> `acceptance` originais de `feature_list.json` ao final do documento.

## Observação sobre "tempo real" (acceptance 1 e 3)

`feature-14` (composition root/IPC), que ligaria o painel a atualizações
reais de banco/WhatsApp por polling ou push via IPC, ainda está `pending`.
Portanto, nesta feature, "tempo real" significa que o componente reage
corretamente a atualizações entregues por **assinatura/callback expostos
pelo `dataClient` injetado** (`onPedidosChange`, `onConnectionStatusChange`
— ver `design.md`, Decisão 1), e não uma implementação própria de
polling/websocket/IPC. A responsabilidade de *disparar* essas atualizações
a partir de uma fonte real (banco, evento do WhatsApp) é de `feature-14`.

## R1
O sistema DEVE expor um componente `KdsPanel` em
`src/ui/panels/kds/KdsPanel.jsx` que, ao ser montado, chama
`dataClient.listarPedidosAtivos()` exatamente uma vez e renderiza os
pedidos retornados.

## R2
QUANDO `dataClient.listarPedidosAtivos()` resolve com uma lista de
pedidos (cada um com `id`, `clienteNome`, `status`, `motoboy`,
`tempoEsperaMinutos`), o sistema DEVE renderizar, para cada pedido, o
nome do cliente, o status atual e o tempo de espera; SE
`tempoEsperaMinutos` for `null` ENTÃO o sistema DEVE exibir uma indicação
de que o tempo de espera está indisponível para aquele pedido, em vez de
um valor numérico.

## R3
O sistema DEVE, ao montar `KdsPanel`, chamar
`dataClient.onPedidosChange(callback)` exatamente uma vez para se
inscrever em atualizações da lista de pedidos.

## R4
QUANDO a assinatura registrada por `dataClient.onPedidosChange` é
acionada com uma nova lista de pedidos, o sistema DEVE substituir a
listagem exibida pela nova lista recebida, sem exigir nova chamada a
`dataClient.listarPedidosAtivos()`.

## R5
QUANDO `KdsPanel` é desmontado, o sistema DEVE invocar a função de
cancelamento retornada por `dataClient.onPedidosChange` para encerrar a
assinatura.

## R6
QUANDO o operador seleciona um novo status para um pedido exibido e
confirma a ação, o sistema DEVE chamar
`dataClient.atualizarStatusPedido(id, novoStatus)` exatamente uma vez,
com o `id` do pedido correspondente e o `novoStatus` selecionado.

## R7
QUANDO `dataClient.atualizarStatusPedido(id, novoStatus)` resolve com
sucesso, o sistema DEVE refletir o novo status retornado na exibição
daquele pedido.

## R8
SE `dataClient.atualizarStatusPedido(id, novoStatus)` rejeitar com um
erro (incluindo, mas não se limitando a, uma instância de
`InvalidStatusTransitionError` ou `InvalidOrderStatusError` de
`src/db/errors.js`) ENTÃO o sistema DEVE capturar essa rejeição, exibir a
mensagem de erro associada àquele pedido, manter o status exibido
anteriormente inalterado, e NÃO DEVE lançar uma exceção não tratada para
fora do componente.

## R9
QUANDO o operador digita um nome de motoboy no campo correspondente a um
pedido exibido e confirma a atribuição, o sistema DEVE chamar
`dataClient.atribuirMotoboy(id, motoboy)` exatamente uma vez, com o `id`
do pedido correspondente e o texto digitado.

## R10
QUANDO `dataClient.atribuirMotoboy(id, motoboy)` resolve com sucesso, o
sistema DEVE refletir o nome do motoboy retornado na exibição daquele
pedido.

## R11
SE `dataClient.atribuirMotoboy(id, motoboy)` rejeitar com um erro
(incluindo, mas não se limitando a, uma instância de
`InvalidMotoboyError` ou `OrderNotFoundError` de `src/db/errors.js`)
ENTÃO o sistema DEVE capturar essa rejeição, exibir a mensagem de erro
associada àquele pedido, manter o motoboy exibido anteriormente
inalterado, e NÃO DEVE lançar uma exceção não tratada para fora do
componente.

## R12
O sistema DEVE, ao montar `KdsPanel`, chamar
`dataClient.getStatusConexaoWhatsApp()` exatamente uma vez e renderizar o
status retornado (`"conectado"` ou `"desconectado"`) em um indicador
visual.

## R13
O sistema DEVE, ao montar `KdsPanel`, chamar
`dataClient.onConnectionStatusChange(callback)` exatamente uma vez para
se inscrever em atualizações do status de conexão do WhatsApp; QUANDO
essa assinatura é acionada com um novo status, o sistema DEVE atualizar o
indicador visual de conexão para refletir o novo status recebido.

## R14
QUANDO `KdsPanel` é desmontado, o sistema DEVE invocar a função de
cancelamento retornada por `dataClient.onConnectionStatusChange` para
encerrar a assinatura.

## R15
O sistema DEVE compor `KdsPanel` usando exclusivamente os componentes
base exportados por `src/ui/index.js` (`Card`, `Badge`, `Button`,
`Navbar`, `ThemeToggle`) para sua estrutura visual (contêineres de
pedido, ações de mudança de status/atribuição de motoboy, indicador de
status de conexão, navegação e alternância de tema), sem declarar
elementos HTML de baixo nível equivalentes a esses componentes quando um
componente base cobre o mesmo papel (ex.: um `<button>` cru para
confirmar status, quando `Button` está disponível).

## R16
O sistema DEVE envolver `KdsPanel` (ou seu ponto de montagem) em um
`ThemeProvider` de `src/ui/index.js`, de forma que `ThemeToggle`, quando
presente no painel, funcione corretamente (alterna e persiste o tema),
reaproveitando o comportamento já validado na feature-11 sem
reimplementá-lo.

## R17
O sistema DEVE aceitar o "cliente de dados" (`dataClient`, com os
métodos `listarPedidosAtivos`, `atualizarStatusPedido`, `atribuirMotoboy`,
`getStatusConexaoWhatsApp`, `onPedidosChange`, `onConnectionStatusChange`)
como uma prop explícita de `KdsPanel` (ou via um provedor de contexto
dedicado), permitindo que os testes injetem uma implementação fake e que
uma futura integração (feature-14) injete uma implementação real baseada
em IPC, sem alterar o código de `KdsPanel`.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                              | Coberto por            |
|------------------------------------------------------------------------------------------------------------------------------------------|---------------------------|
| O painel exibe em tempo real a listagem de pedidos ativos com tempo de espera calculado (feature-6/7).                              | R1, R2, R3, R4, R5         |
| O operador altera o status do pedido e atribui motoboy pela UI, refletindo as regras de transição já definidas na feature-7.        | R6, R7, R8, R9, R10, R11   |
| O painel exibe o status de conexão do WhatsApp Web em tempo real (feature-3/9).                                                     | R12, R13, R14              |
| O painel usa o Sistema de Design da feature-11 (tema claro/escuro, componentes base).                                               | R15, R16                   |
| tests/kds-panel-ui.test.js valida a lógica de interação do painel (mudança de status, atribuição de motoboy) com testing-library.   | R1–R17 (implementação de teste) |
