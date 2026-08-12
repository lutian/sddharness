# Design — feature-13: Interface React — Painel KDS

## Contexto

Esta feature é a segunda a produzir um painel React de domínio, replicando
diretamente o padrão estabelecido em `feature-12` (Painel de Configuração,
`done`), agora consumindo `src/delivery/painelPedidos.js` (feature-7,
`done`), `src/db/index.js` (`updateStatusPedido`, `atribuirMotoboy`,
feature-7, `done`) e `src/whatsapp/client.js`
(`getConnectionStatus`/evento `"connection-status-changed"`, feature-3/9,
`done`) por meio dos componentes base da feature-11 (`done`,
`src/ui/index.js`). Assim como em `feature-12`, a fiação real com o
processo `main` do Electron via IPC é escopo de `feature-14` (ainda
`pending`) — esta feature entrega o componente React e sua lógica de
interação, testável isoladamente em `jsdom`, sem depender de Electron, de
SQLite real ou de uma sessão real do WhatsApp Web rodando.

## Decisão 1 — `dataClient` injetável (mesmo padrão da feature-12)

**Problema:** idêntico ao de `specs/feature-12/design.md`, Decisão 1:
`docs/architecture.md`, princípio 2, proíbe IO direto no renderer. O IPC
real só existe a partir da feature-14. Além disso, aqui há uma segunda
fonte de dados que não é IO em disco/rede tradicional, mas um cliente
`EventEmitter` de longa duração (`WhatsAppClient`, feature-3/9) — que
também não deve ser importado nem instanciado dentro do renderer.

**Escolha: um `dataClient` injetável, com contrato mínimo:**

```javascript
// Contrato (não um arquivo de classe — apenas a forma esperada do objeto)
dataClient = {
  listarPedidosAtivos(): Promise<Pedido[]>,
  atualizarStatusPedido(id, novoStatus): Promise<Pedido>,
  atribuirMotoboy(id, motoboy): Promise<Pedido>,
  getStatusConexaoWhatsApp(): Promise<"conectado" | "desconectado">,
  onPedidosChange(callback: (pedidos: Pedido[]) => void): () => void,
  onConnectionStatusChange(callback: (status: string) => void): () => void,
};
```

`Pedido` é a forma retornada por `listarPedidosAtivosComTempoEspera`
(feature-7): `{ id, clienteId, itens, status, motoboy, criadoEm,
clienteNome, clienteTelefone, clienteEndereco, clienteLatitude,
clienteLongitude, distanciaKm, tempoEsperaMinutos }`.

`KdsPanel` recebe `dataClient` como prop (R17). Ele nunca importa
`src/db/*`, `src/delivery/*` ou `src/whatsapp/*` diretamente — toda
leitura/escrita/assinatura passa por essa interface. Duas implementações
concretas existem, mas **apenas a implementação local padrão é escopo
desta feature**:

1. **`src/ui/panels/kds/localDataClient.js` (escopo desta feature).**
   Implementação padrão que roda dentro de um processo Node/Electron
   `main` (ou de um script standalone de desenvolvimento) e delega:
   - `listarPedidosAtivos()` → `listarPedidosAtivosComTempoEspera({ db,
     origem })` de `src/delivery/index.js`, envolvida em `Promise` (a
     função de domínio é síncrona; o contrato do `dataClient` é sempre
     assíncrono, pelo mesmo motivo documentado na feature-12: para que a
     troca por IPC não exija mudança de assinatura).
   - `atualizarStatusPedido(id, novoStatus)` → `updateStatusPedido(db,
     id, novoStatus)` de `src/db/index.js`.
   - `atribuirMotoboy(id, motoboy)` → `atribuirMotoboy(db, id, motoboy)`
     de `src/db/index.js` (mesmo nome de função nos dois domínios — o
     `dataClient` apenas repassa, sem ambiguidade porque cada um vive no
     seu próprio módulo).
   - `getStatusConexaoWhatsApp()` → `whatsappClient.getConnectionStatus()`
     de `src/whatsapp/client.js`, envolvida em `Promise`.
   - `onConnectionStatusChange(callback)` → registra `callback` via
     `whatsappClient.on("connection-status-changed", callback)` e
     retorna uma função de cancelamento.
   - `onPedidosChange(callback)` → **limitação documentada**: nem
     `src/db/index.js` nem `src/delivery/index.js` expõem hoje uma fonte
     de eventos para mudanças na tabela `pedidos` (acesso síncrono via
     `better-sqlite3`, sem `EventEmitter`). A implementação local desta
     feature registra o `callback` internamente mas não o aciona
     sozinha (retorna uma função de cancelamento no-op). Dar um "tempo
     real" de fato a essa assinatura (via polling periódico ou push real)
     é responsabilidade de `feature-14`, conforme o enunciado desta
     tarefa deixa explícito. O contrato do `dataClient` já suporta essa
     evolução sem qualquer mudança em `KdsPanel`.
   - **Limitação adicional documentada**: a função de cancelamento
     retornada por `onConnectionStatusChange` na implementação local é
     também um no-op, porque `createWhatsAppClient` (feature-3/9) expõe
     apenas `on(evento, callback)`, sem `off`/`removeListener` público.
     Isso não compromete nenhum `R<n>` desta feature: os requisitos de
     cancelamento de assinatura (R5, R14) descrevem o comportamento do
     **componente** (ele deve chamar a função retornada pelo
     `dataClient`), verificável com um `dataClient` fake cuja função de
     cancelamento é um `vi.fn()` de verdade — a limitação da
     implementação local real não é exercitada pelos testes desta
     feature (mesma decisão já tomada na feature-12 para
     `localDataClient.js`, ver Decisão 4).
2. **Uma futura implementação baseada em IPC (`ipcDataClient.js`), a
   cargo da feature-14.** Mesmo contrato, falando com handlers
   registrados em `electron/main.js` e resolvendo as duas limitações
   acima (push real de atualizações de pedidos, cancelamento real de
   assinatura de conexão). `KdsPanel` não muda uma linha.

Nos testes desta feature (`tests/kds-panel-ui.test.js`), um terceiro
`dataClient` fake (definido no próprio arquivo de teste) é injetado, com
`vi.fn()` para cada método — incluindo `onPedidosChange` e
`onConnectionStatusChange` retornando funções de cancelamento `vi.fn()`
próprias — permitindo disparar manualmente os callbacks registrados e
verificar que `KdsPanel` reage e cancela corretamente, sem tocar SQLite,
`src/whatsapp/*` real, nem IPC.

**Alternativa descartada: acoplar `KdsPanel` diretamente a `src/db/*`,
`src/delivery/*` e `src/whatsapp/*` via import estático, adiando a
abstração para a feature-14.** Descartada pelos mesmos dois motivos já
registrados em `specs/feature-12/design.md`, Decisão 1: (a) exigiria
reescrever `KdsPanel` inteiro quando a feature-14 chegasse, trocando
chamadas diretas por `ipcRenderer.invoke`; e (b) tornaria os testes desta
feature dependentes de um banco SQLite real e de uma instância real de
`WhatsAppClient` (violando `docs/conventions.md`, que exige isolar IO em
teste, e `docs/architecture.md`, que proíbe chamar integrações externas
reais a partir de testes). Adicionalmente, aqui haveria um motivo a mais
para descartar: `WhatsAppClient` é um objeto com estado e ciclo de vida
próprio (fila FIFO, adapter); instanciá-lo dentro de um componente React
violaria a separação de camadas de `docs/architecture.md`, princípio 1.

## Decisão 2 — Estrutura de pastas

```
src/ui/panels/kds/
├── index.js                 # NOVO — porta pública do painel: exporta KdsPanel
├── KdsPanel.jsx              # NOVO — componente raiz do painel
├── PedidoList.jsx            # NOVO — lista de pedidos ativos (R1–R5)
├── PedidoCard.jsx            # NOVO — card de um pedido: status + motoboy (R6–R11)
├── ConnectionStatus.jsx      # NOVO — indicador de status de conexão do WhatsApp (R12–R14)
└── localDataClient.js        # NOVO — implementação padrão de dataClient (Decisão 1)

tests/
└── kds-panel-ui.test.js      # (será escrito pelo implementer, NÃO por este agente)
```

Segue exatamente o padrão de `src/ui/panels/config/` (feature-12) e
`docs/conventions.md` ("cada domínio expõe sua superfície pública em um
único `index.js`"). `src/ui/panels/kds/index.js` reexporta apenas
`KdsPanel` — os subcomponentes internos (`PedidoList`, `PedidoCard`,
`ConnectionStatus`) e `localDataClient` não são importados de fora desta
pasta.

`KdsPanel` importa os componentes base exclusivamente de
`src/ui/index.js` (nunca de `src/ui/components/*` diretamente),
reforçando R15 e o contrato de porta única já estabelecido na feature-11.

Nenhum arquivo de `src/db/`, `src/delivery/`, `src/whatsapp/`,
`src/menu/`, `src/ai/` é tocado por esta feature.

## Decisão 3 — Interação de status e motoboy: capturar erro de domínio, não reimplementar validação

`updateStatusPedido` (`src/db/pedidos.js`) já valida a transição contra
`TRANSICOES_PERMITIDAS` e lança `InvalidStatusTransitionError` ou
`InvalidOrderStatusError` quando inválida; `atribuirMotoboy` já valida
nome não vazio e lança `InvalidMotoboyError`; ambas lançam
`OrderNotFoundError` se o `id` não existir. `PedidoCard.jsx` **não**
reimplementa `TRANSICOES_PERMITIDAS` nem duplica essas checagens: ele
oferece um seletor com o conjunto completo de status de pedido
(`"recebido"`, `"em_preparo"`, `"saiu_para_entrega"`, `"concluido"`,
`"cancelado"` — mesmos valores de `STATUS_PERMITIDOS`, que este spec
apenas replica como opções de UI, não como validação) e delega toda
decisão de "essa transição é permitida?" a
`dataClient.atualizarStatusPedido`. Se a promessa rejeitar (R8), o
componente:

- captura a rejeição (nunca deixa escapar uma exceção não tratada, R8,
  R11);
- exibe `erro.message` associado àquele pedido especificamente (um
  `Badge variant="danger"` por card, não um erro global do painel);
- mantém o status (ou motoboy) exibido anteriormente, sem otimisticamente
  aplicar o valor que falhou.

Em caso de sucesso (R7, R10), o componente atualiza o card com o
`Pedido` retornado pela própria chamada (não espera um
`onPedidosChange` disparar, já que a implementação local desse callback é
um no-op documentado na Decisão 1) — isso garante feedback imediato ao
operador independentemente de a integração de "tempo real" completa já
existir.

## Decisão 4 — Estratégia de teste

Mesma linha de `tests/config-panel-ui.test.js` (feature-12): Vitest +
`@testing-library/react` + `jsdom`, já habilitado para
`tests/kds-panel-ui.test.js` pelo padrão `tests/*-ui.test.js` em
`vitest.config.js` (nenhuma mudança de configuração necessária nesta
feature).

Padrão de teste:

```javascript
const dataClient = {
  listarPedidosAtivos: vi.fn().mockResolvedValue([{ id: 1, clienteNome: "Alice", status: "recebido", motoboy: null, tempoEsperaMinutos: 12 }]),
  atualizarStatusPedido: vi.fn().mockResolvedValue({ id: 1, status: "em_preparo" }),
  atribuirMotoboy: vi.fn().mockResolvedValue({ id: 1, motoboy: "Carlos" }),
  getStatusConexaoWhatsApp: vi.fn().mockResolvedValue("conectado"),
  onPedidosChange: vi.fn().mockReturnValue(vi.fn()),
  onConnectionStatusChange: vi.fn().mockReturnValue(vi.fn()),
};

render(
  <ThemeProvider>
    <KdsPanel dataClient={dataClient} />
  </ThemeProvider>
);
```

- Interações de usuário via `fireEvent`/`userEvent` (selecionar novo
  status, digitar e confirmar motoboy).
- Simulação de "tempo real": o teste captura o `callback` passado a
  `dataClient.onPedidosChange`/`onConnectionStatusChange` (via
  `mock.calls[0][0]`) e o invoca manualmente dentro do teste para
  verificar que `KdsPanel` re-renderiza com os novos dados (R4, R13),
  sem qualquer polling ou IPC real.
- Teste de cancelamento: desmontar (`unmount()`) e verificar que a
  função de cancelamento retornada por `onPedidosChange`/
  `onConnectionStatusChange` (o `vi.fn()` interno de cada mock) foi
  chamada (R5, R14).
- Caso de erro de transição: `dataClient.atualizarStatusPedido`
  configurado com `mockRejectedValue(new InvalidStatusTransitionError("..."))`
  (importado de `src/db/errors.js`, reaproveitando a classe real de
  domínio) para validar R8. Caso de erro de motoboy: análogo com
  `InvalidMotoboyError` para validar R11.
- Nenhum teste importa `localDataClient.js`, abre um banco SQLite real,
  nem instancia `createWhatsAppClient` — só o `dataClient` fake definido
  no arquivo de teste.
- Asserções sobre a árvore renderizada usam os componentes base
  (`Card`/`Badge`/`Button`/`Navbar`) via suas classes CSS derivadas
  (`"glass-card"`, `"badge-success"`/`"badge-danger"`, `"btn-primary"`,
  `"navbar"`), mesmo padrão de `tests/config-panel-ui.test.js`.

## Exceções

Nenhuma classe de erro de domínio nova é necessária nesta feature.
`KdsPanel`/`PedidoCard` capturam e exibem qualquer erro lançado por
`dataClient.atualizarStatusPedido` ou `dataClient.atribuirMotoboy`
(incluindo, mas não limitado a, `InvalidStatusTransitionError`,
`InvalidOrderStatusError`, `InvalidMotoboyError` e `OrderNotFoundError`
de `src/db/errors.js`), sem criar uma hierarquia de erro própria de UI —
o tratamento é puramente de apresentação (R8, R11).

## Fora do escopo desta feature

- **Push real de atualizações de pedidos e cancelamento real de
  assinatura de conexão.** Como documentado na Decisão 1,
  `localDataClient.js` registra os callbacks de `onPedidosChange`/
  `onConnectionStatusChange` mas não os aciona/cancela de fato contra
  fontes reais (banco, `WhatsAppClient`). Resolver isso (polling,
  push via IPC, ou expor `off` em `WhatsAppClient`) é escopo de
  `feature-14`.
- **Implementação de IPC (`ipcDataClient.js`) e qualquer código em
  `electron/main.js`.** Escopo de `feature-14`.
- **Alterar `src/db/pedidos.js`, `src/delivery/painelPedidos.js` ou
  `src/whatsapp/client.js` para expor eventos/removeListener novos.**
  Nenhuma mudança é feita nesses arquivos por esta feature; a limitação
  documentada na Decisão 1 é aceita como está, com o ponto de extensão
  explícito para `feature-14`.
- **Estilos visuais além dos já definidos em `src/ui/styles/tokens.css`
  (feature-11).** Nenhum token novo é introduzido; decisão de layout
  (grid de cards, espaçamento) deixada ao `implementer`, sem impacto em
  nenhum `R<n>` desta feature.
- **Teste do `localDataClient.js` contra SQLite/WhatsApp reais.** Fora
  do escopo desta feature pelo mesmo raciocínio da feature-12: é pura
  delegação, sem lógica própria de domínio a testar aqui; a cobertura de
  `updateStatusPedido`/`atribuirMotoboy`/`listarPedidosAtivosComTempoEspera`
  já existe em `tests/admin-kds.test.js` (feature-7).
