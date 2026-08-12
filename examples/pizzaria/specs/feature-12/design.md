# Design — feature-12: Interface React — Painel de Configuração

## Contexto

Esta é a primeira feature a produzir um app React que efetivamente exibe
dados de domínio (cardápio e configuração de `src/menu/`, feature-2,
`done`) usando os componentes base e o tema da feature-11 (`done`,
`src/ui/index.js`). A fiação real com o processo `main` do Electron via
IPC é escopo de `feature-14` (ainda `pending`) — esta feature entrega o
componente React e sua lógica de interação, testável isoladamente em
`jsdom`, sem depender de Electron rodando.

## Decisão 1 — Como a UI acessa os dados sem IPC pronto (abstração de "cliente de dados")

**Problema:** `docs/architecture.md`, princípio 2, proíbe IO direto no
renderer ("`src/ui/` nunca acessa disco nem rede diretamente. Fala
exclusivamente por IPC"). Mas o IPC real só existe a partir da
feature-14. Se `ConfigPanel` chamar `loadCardapio`/`loadConfig`/
`saveConfig` de `src/menu/` diretamente por import estático, a feature-14
teria que reescrever o componente para trocar essas chamadas por
`ipcRenderer.invoke(...)`, e os testes desta feature ficariam acoplados
ao filesystem real (violando `docs/conventions.md`, que exige isolar IO
em teste).

**Escolha: um `dataClient` injetável, com contrato mínimo:**

```javascript
// Contrato (não um arquivo de classe — apenas a forma esperada do objeto)
dataClient = {
  loadCardapio(): Promise<Cardapio>,
  loadConfig(): Promise<Config>,
  saveConfig(config: Config): Promise<void>,
};
```

`ConfigPanel` recebe `dataClient` como prop (R14). Ele nunca importa
`src/menu/*` diretamente — toda leitura/escrita passa por essa interface.
Duas implementações concretas de `dataClient` existem, mas **nenhuma das
duas é escopo desta feature exceto a implementação padrão de
desenvolvimento standalone**, descrita abaixo:

1. **`src/ui/panels/config/localDataClient.js` (escopo desta feature).**
   Implementação padrão que roda dentro de um processo Node/Electron
   `main` (ou de um script standalone) e chama diretamente
   `loadCardapio`, `loadConfig`, `saveConfig` de `src/menu/index.js`,
   envolvendo cada chamada síncrona em uma `Promise` (o contrato do
   `dataClient` é sempre assíncrono, para que a troca por IPC — também
   assíncrono — não exija mudança de assinatura). Esta implementação é
   útil hoje para rodar o painel fora do Electron (ex.: um harness de
   desenvolvimento local) e documenta o caminho de dados real sem exigir
   IPC.
2. **Uma futura implementação baseada em IPC (`ipcRenderer.invoke`), a
   cargo da feature-14.** Quando a feature-14 existir, ela cria um
   `ipcDataClient.js` com o mesmo contrato (`loadCardapio`, `loadConfig`,
   `saveConfig`), que fala com handlers registrados em
   `electron/main.js`. `ConfigPanel` não muda uma linha — só a
   implementação de `dataClient` injetada na raiz do app muda.

Nos testes desta feature (`tests/config-panel-ui.test.js`), um terceiro
`dataClient` fake (definido no próprio arquivo de teste, não em
`src/`) é injetado, com `vi.fn()` para cada método, permitindo verificar
chamadas e resolver/rejeitar promessas sob controle do teste — sem tocar
disco real nem IPC.

**Alternativa descartada: acoplar `ConfigPanel` diretamente a
`src/menu/*` via import estático, adiando a abstração para a feature-14.**
Foi descartada porque exigiria reescrever `ConfigPanel` inteiro quando a
feature-14 chegasse (toda chamada síncrona a `loadCardapio`/`loadConfig`/
`saveConfig` teria que virar uma chamada assíncrona a `ipcRenderer`,
mudando a forma dos `useEffect`/handlers), e porque tornaria os testes
desta feature dependentes de arquivos reais no disco (violando
`docs/conventions.md`: "Nada de mocks do sistema de arquivos" já é a
regra para os testes de domínio, mas aqui o objetivo inverso se aplica —
a UI não deve testar IO de domínio de novo, isso já é responsabilidade de
`tests/config-menu.test.js`, feature-2).

## Decisão 2 — Estrutura de pastas

```
src/ui/panels/config/
├── index.js                # NOVO — porta pública do painel: exporta ConfigPanel
├── ConfigPanel.jsx          # NOVO — componente raiz do painel
├── CardapioEditor.jsx        # NOVO — subcomponente de edição do cardápio (R2, R3, R4)
├── ConfigForm.jsx            # NOVO — subcomponente de formulário de configuração (R5–R11)
└── localDataClient.js       # NOVO — implementação padrão de dataClient (Decisão 1)

tests/
└── config-panel-ui.test.js  # (será escrito pelo implementer, NÃO por este agente)
```

Segue o padrão já estabelecido em `src/ui/` (feature-11): cada painel é
um subdomínio com um único ponto de entrada (`index.js`), consistente com
`docs/conventions.md` ("cada domínio expõe sua superfície pública em um
único `index.js`"). `src/ui/panels/config/index.js` reexporta apenas
`ConfigPanel` — os subcomponentes internos (`CardapioEditor`,
`ConfigForm`) e `localDataClient` não são importados de fora desta pasta.

`ConfigPanel` importa os componentes base exclusivamente de
`src/ui/index.js` (nunca de `src/ui/components/*` diretamente),
reforçando R12 e o contrato de porta única já estabelecido na feature-11.

Nenhum arquivo de `src/menu/`, `src/db/`, `src/whatsapp/`, `src/ai/`,
`src/delivery/` é tocado por esta feature.

## Decisão 3 — Formulário e validação client-side

**Cardápio (`CardapioEditor.jsx`):**
- Estado local (`useState`) inicializado a partir do retorno de
  `dataClient.loadCardapio()`, com a mesma forma
  `{ categorias: [{ nome, itens: [{ nome, preco }] }] }` usada por
  `src/menu/cardapio.js`.
- Cada item renderiza um campo de texto para `nome` e um campo numérico
  para `preco`. Editar um campo atualiza apenas aquele item no estado
  local (imutabilidade via `map`/spread), conforme R3.
- Validação client-side do campo `preco`: se o valor digitado não for
  convertível para um número finito (`Number.isFinite`), o campo entra em
  estado de erro visual e o item correspondente é marcado como inválido
  (R4). Esta é uma validação de **apresentação** (feedback imediato ao
  usuário), não uma reimplementação da validação de domínio de
  `src/menu/cardapio.js` — não existe função de persistência de cardápio
  para chamar (ver `requirements.md`, observação de escopo), então esta
  validação apenas impede que um item com preço inválido seja incluído em
  qualquer payload futuro de salvamento (hoje, nenhum; documentado como
  ponto de extensão para quando uma feature futura adicionar
  `saveCardapio` a `src/menu/`).
- Persistência do cardápio editado está **fora do escopo** desta feature
  (ver seção "Fora do escopo").

**Configuração (`ConfigForm.jsx`):**
- Estado local inicializado a partir do retorno de
  `dataClient.loadConfig()`, espelhando exatamente os campos de
  `getDefaultConfig()`/`loadConfig()` de `src/menu/config.js`:
  `apiKeys.openai` (texto, tipo `password` para não expor a chave em
  tela), `apiKeys.deepseek` (idem), `systemPrompt` (`<textarea>`),
  `audioEnabled` e `imageEnabled` (switches/checkboxes booleanos),
  `modeloSelecionado` (seletor restrito a `"openai"`/`"deepseek"`, os
  mesmos dois valores de `MODELOS_PERMITIDOS` em `src/menu/config.js`).
- Nenhuma validação de domínio é duplicada no cliente: o formulário
  permite digitar qualquer valor nos campos de texto e monta o objeto
  `config` tal como está ao acionar salvar (R9). É `dataClient.saveConfig`
  (que, na implementação padrão, delega a `saveConfig` de
  `src/menu/config.js`) quem valida e pode rejeitar com
  `InvalidConfigError`. O componente apenas captura essa rejeição (R11) e
  a exibe — não reimplementa `MODELOS_PERMITIDOS` nem as checagens de
  tipo já feitas em `_validarConfig`.
- Ação de salvar: um `Button` (`variant="primary"`) que, ao clicar,
  monta o objeto `config` a partir do estado atual do formulário e chama
  `dataClient.saveConfig(config)`. Enquanto a promessa está pendente, o
  botão fica desabilitado (evita duplo envio); ao resolver, exibe um
  `Badge` de sucesso (`variant="success"`); ao rejeitar, exibe um `Badge`
  de erro (`variant="danger"`) com a mensagem capturada.

## Decisão 4 — Estratégia de teste

Mesma linha de `tests/design-system.test.js` (feature-11): Vitest +
`@testing-library/react` + `jsdom`, já habilitado para
`tests/config-panel-ui.test.js` pelo padrão `tests/*-ui.test.js` em
`vitest.config.js` (nenhuma mudança de configuração necessária nesta
feature).

Padrão de teste:

```javascript
const dataClient = {
  loadCardapio: vi.fn().mockResolvedValue({ categorias: [...] }),
  loadConfig: vi.fn().mockResolvedValue({ apiKeys: {...}, ... }),
  saveConfig: vi.fn().mockResolvedValue(undefined),
};

render(
  <ThemeProvider>
    <ConfigPanel dataClient={dataClient} />
  </ThemeProvider>
);
```

- Interações de usuário via `fireEvent`/`userEvent` (preencher campo de
  texto, marcar/desmarcar switch, selecionar modelo, clicar em salvar).
- Asserções sobre chamadas (`expect(dataClient.saveConfig).toHaveBeenCalledWith({...})`)
  em vez de qualquer acesso a filesystem real — `localDataClient.js` (a
  implementação real) **não** é exercitado por este arquivo de teste; ele
  é simples o bastante (delegação direta a `src/menu/*`) para não exigir
  cobertura própria nesta feature, e uma cobertura de integração real
  (com filesystem/IPC de verdade) é escopo de `feature-14`.
- Caso de erro: `dataClient.saveConfig` configurado com
  `mockRejectedValue(new InvalidConfigError("..."))` (importado de
  `src/menu/errors.js`, reaproveitando a classe real de domínio em vez de
  inventar uma nova) para validar R11.

## Exceções

Nenhuma classe de erro de domínio nova é necessária nesta feature.
`ConfigPanel`/`ConfigForm` capturam e exibem qualquer erro lançado por
`dataClient.saveConfig` (incluindo, mas não limitado a,
`InvalidConfigError` de `src/menu/errors.js`), sem criar uma hierarquia de
erro própria de UI — o tratamento é puramente de apresentação (R11).

## Fora do escopo desta feature

- **Persistência do cardápio editado.** `src/menu/index.js` não expõe
  `saveCardapio`. Esta feature cobre exibição e edição em estado local
  (R2, R3, R4), mas não inclui nenhuma chamada de salvamento de cardápio.
  Se uma feature futura adicionar `saveCardapio` a `src/menu/`, um novo
  `R<n>` e uma nova task cobrirão a chamada a partir de
  `CardapioEditor.jsx` — não é necessário reescrever o componente, apenas
  estender seu handler de salvar.
- **Implementação de IPC (`ipcDataClient.js`) e qualquer código em
  `electron/main.js`.** Escopo de `feature-14`.
- **Estilos visuais além dos já definidos em `src/ui/styles/tokens.css`
  (feature-11).** Nenhum token novo é introduzido; classes utilitárias
  adicionais necessárias para o layout do formulário (grid, espaçamento)
  reaproveitam classes já existentes em `docs/styles.css`/
  `tokens.css` quando disponíveis, ou usam estilo inline mínimo — decisão
  de detalhe deixada ao `implementer`, sem impacto em nenhum `R<n>` desta
  feature (nenhum requirement exige um layout visual específico, apenas
  comportamento).
- **Teste do `localDataClient.js` contra o filesystem real.** Coberto
  indiretamente por `tests/config-menu.test.js` (feature-2), que já
  valida `loadCardapio`/`loadConfig`/`saveConfig`; `localDataClient.js` é
  pura delegação, sem lógica própria a testar nesta feature.
