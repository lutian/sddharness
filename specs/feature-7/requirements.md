# Requirements — feature-7: Painel Administrativo KDS e Gestão de Pedidos

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/admin-kds.test.js`. Mapeamento aos 4 `acceptance` originais de
> `feature_list.json` ao final do documento.

## Decisão de escopo (leia antes dos requirements)

O `acceptance` original fala em "interface em React" e "painel". Porém:

- `package.json` (raiz) não declara `react`, `react-dom` nem nenhuma
  biblioteca de testing-library/jsdom entre as dependências. Todas as
  features 1–6 (`done`) foram implementadas e testadas com Vitest puro em
  ambiente Node, sem DOM real.
- O único requisito de teste concreto listado no `acceptance` —
  `tests/admin-kds.test.js` valida "as operações de atualização de status
  de pedidos e atribuição de motoboy" — descreve lógica de dados/domínio
  (transição de status, gravação de motoboy), não renderização de
  componentes de UI.
- `docs/architecture.md` já reserva `src/ui/` para o "painel React (KDS)"
  como *renderer process* do Electron, falando exclusivamente por IPC
  contra `electron/main.js` ("Sem IO no renderer"). Construir esse
  renderer agora exigiria introduzir `react`/`react-dom` e uma biblioteca
  de teste de componentes — uma dependência nova não justificada por
  nenhum `acceptance` verificável nesta feature (ver `design.md`,
  "Alternativa descartada 1").

Por isso, esta feature entrega exclusivamente a **camada de dados/lógica**
que um painel KDS (React, Electron renderer) consumiria via IPC: listar
pedidos ativos com tempo de espera calculado, atualizar status de pedido
respeitando transições permitidas, atribuir motoboy, e expor o status de
conexão do WhatsApp Web. A construção do componente React em `src/ui/` e
dos handlers IPC em `electron/main.js` que os expõem ao renderer fica para
uma feature futura de UI — fora do escopo verificável por Vitest hoje.

## Contexto verificado antes da redação

- `src/db/schema.js` (feature-1, `done`): a tabela `pedidos` já tem
  `status TEXT NOT NULL`, `motoboy TEXT` e `criado_em TEXT NOT NULL
  DEFAULT (datetime('now'))`; a tabela `clientes` já tem `latitude REAL`
  e `longitude REAL`.
- `src/db/pedidos.js` (feature-1/feature-6, `done`): o enum
  `STATUS_PERMITIDOS` já contém `"recebido"`, `"em_preparo"`,
  `"saiu_para_entrega"`, `"concluido"`, `"cancelado"`; `contarPedidosAtivos(db)`
  (feature-6) já conta pedidos com status `"recebido"` ou `"em_preparo"`
  para a demanda da cozinha. **Não existe hoje** nenhuma função de
  atualização de status de pedido, de atribuição de motoboy, nem de
  listagem de pedidos com dados do cliente — esta feature precisa criá-las
  (ver `design.md`).
- **Não existe hoje**, em nenhum lugar do código ou dos specs aprovados
  (feature-1 a feature-6), uma regra formal de quais transições de status
  são permitidas. Definir essa regra é, portanto, uma decisão de design
  nova desta feature (ver `design.md`, seção "Transições de status
  permitidas").
- `src/delivery/waitTime.js` (feature-6, `done`): `calcularTempoEspera`
  já calcula `distanciaKm` e `tempoEsperaMinutos` a partir de uma
  geocodificação nova a cada chamada. Para uma listagem que é
  recarregada continuamente pelo painel, geocodificar de novo a cada
  atualização seria uma chamada de rede desnecessária, já que
  `clientes.latitude`/`longitude` já foram persistidos por um fluxo
  anterior (feature-5/feature-6). Esta feature reaproveita a fórmula de
  tempo de espera (extraída como função pura, ver `design.md`) e
  `calcularDistanciaKm`/`contarPedidosAtivos` já existentes, sem chamar o
  `geocoder` novamente.
- `src/whatsapp/client.js` e `src/whatsapp/adapter.js` (feature-3,
  `done`): o adapter já emite `"qr"`, `"ready"` e `"auth_failure"|"message"`;
  `createWhatsAppClient` hoje escuta `"qr"`, `"auth_failure"` e
  `"message"`, mas **não escuta `"ready"`** nem expõe nenhum estado de
  conexão. Não existe hoje nenhum evento `"disconnected"` no contrato do
  adapter. Esta feature estende `WhatsAppClient` para rastrear e expor o
  status de conexão (ver `design.md`).

## R1
QUANDO a função pública de listagem de pedidos ativos é chamada, o
sistema DEVE retornar todos os pedidos cujo `status` seja `"recebido"`,
`"em_preparo"` ou `"saiu_para_entrega"`, ordenados por `criado_em`
ascendente (mais antigos primeiro).

## R2
O sistema NÃO DEVE incluir, na listagem de pedidos ativos, pedidos cujo
`status` seja `"concluido"` ou `"cancelado"`.

## R3
QUANDO a listagem de pedidos ativos é gerada e o cliente de um pedido
possui `latitude` e `longitude` numéricas gravadas em `clientes`, o
sistema DEVE incluir nesse pedido os campos `distanciaKm` e
`tempoEsperaMinutos`, calculados a partir dessas coordenadas, da `origem`
informada e da quantidade atual de pedidos ativos na cozinha
(`contarPedidosAtivos`), usando a mesma fórmula de tempo de espera de
`calcularTempoEspera` (feature-6).

## R4
SE o cliente de um pedido ativo não possuir `latitude`/`longitude`
gravadas (valor `null`) ENTÃO a listagem DEVE incluir esse pedido com
`distanciaKm` e `tempoEsperaMinutos` iguais a `null`, sem lançar erro e
sem impedir o cálculo dos demais pedidos da listagem.

## R5
SE a função pública de listagem de pedidos ativos for chamada sem
`origem` ou com uma `origem` que não contenha `latitude`/`longitude`
numéricos ENTÃO o sistema DEVE lançar `InvalidCoordinatesError`
(reaproveitando a classe já existente em `src/delivery/errors.js`,
feature-6) e NÃO DEVE consultar o banco de pedidos.

## R6
QUANDO a função pública de atualização de status é chamada com um `id`
de pedido existente e um `novoStatus` que seja uma transição permitida a
partir do `status` atual do pedido, o sistema DEVE atualizar o `status`
gravado no banco e retornar o pedido atualizado.

## R7
O sistema DEVE considerar como transições de status permitidas
exclusivamente: de `"recebido"` para `"em_preparo"` ou `"cancelado"`; de
`"em_preparo"` para `"saiu_para_entrega"` ou `"cancelado"`; e de
`"saiu_para_entrega"` para `"concluido"`. Nenhuma transição é permitida a
partir de `"concluido"` ou `"cancelado"` (estados finais).

## R8
SE a função pública de atualização de status for chamada com um
`novoStatus` que não seja uma transição permitida a partir do `status`
atual do pedido (R7) ENTÃO o sistema DEVE lançar
`InvalidStatusTransitionError` e NÃO DEVE alterar o `status` gravado no
banco.

## R9
SE a função pública de atualização de status ou a função pública de
atribuição de motoboy forem chamadas com um `id` de pedido que não existe
no banco ENTÃO o sistema DEVE lançar `OrderNotFoundError`.

## R10
QUANDO a função pública de atribuição de motoboy é chamada com um `id`
de pedido existente e um `motoboy` (string não vazia após `trim()`), o
sistema DEVE gravar esse nome no campo `motoboy` do pedido no banco e
retornar o pedido atualizado.

## R11
SE a função pública de atribuição de motoboy for chamada com `motoboy`
igual a `null`, `undefined` ou uma string vazia (após `trim()`) ENTÃO o
sistema DEVE lançar `InvalidMotoboyError` e NÃO DEVE alterar o campo
`motoboy` gravado no banco.

## R12
O sistema DEVE expor uma função pública de status de conexão do
WhatsApp que retorna `"conectado"` quando o adapter injetado já emitiu o
evento `"ready"` e nenhum evento `"disconnected"` ocorreu depois, e
`"desconectado"` em qualquer outro caso (estado inicial antes de
`"ready"`, após `"disconnected"`, ou após `"auth_failure"`).

## R13
QUANDO o adapter injetado emite o evento `"ready"`, o sistema DEVE
emitir o evento público `"connection-status-changed"` com o valor
`"conectado"`.

## R14
QUANDO o adapter injetado emite o evento `"disconnected"`, o sistema
DEVE emitir o evento público `"connection-status-changed"` com o valor
`"desconectado"`.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                    | Coberto por            |
|--------------------------------------------------------------------------------------------------------------------------------|---------------------------|
| O painel exibe em tempo real a listagem de pedidos ativos com seus respectivos tempos de espera calculados.                     | R1, R2, R3, R4, R5         |
| O operador pode alterar o status do pedido (Em Preparo, Saiu para Entrega, Concluído) e atribuir o nome do motoboy.              | R6, R7, R8, R9, R10, R11   |
| O painel exibe o status de conexão do WhatsApp Web (Conectado/Desconectado).                                                     | R12, R13, R14              |
| tests/admin-kds.test.js valida as operações de atualização de status de pedidos e atribuição de motoboy.                        | R1–R14 (implementação de teste) |
