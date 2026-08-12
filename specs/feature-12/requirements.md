# Requirements — feature-12: Interface React — Painel de Configuração

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/config-panel-ui.test.js`, rodando em ambiente `jsdom` (já coberto
> pelo padrão `tests/*-ui.test.js` de `vitest.config.js`, feature-11) com
> `@testing-library/react`. Nenhum teste desta feature toca o sistema de
> arquivos real nem chama `loadCardapio`/`loadConfig`/`saveConfig`
> diretamente — todas as interações de dados passam por um "cliente de
> dados" fake injetado (ver `design.md`, Decisão 1). Mapeamento aos 4
> `acceptance` originais de `feature_list.json` ao final do documento.

## Observação sobre escopo de "editar o cardápio" (acceptance 1)

O `acceptance` original distingue textualmente cardápio ("exibe e permite
**editar**") de API keys/prompt/switches ("exibe e permite **salvar**").
`src/menu/index.js` (feature-2, `done`) expõe `loadCardapio` mas **não**
expõe nenhuma função de persistência de cardápio (`saveCardapio` não
existe). Este spec, portanto, cobre edição do cardápio como estado local
do componente React (em memória, com validação client-side de
apresentação), sem persistir em disco — a persistência do cardápio
editado fica fora do escopo desta feature, por ausência de contrato de
domínio que a suporte (ver `design.md`, "Fora do escopo"). Já os campos
de configuração (API keys, system prompt, switches, modelo) usam
`saveConfig`, que existe e é chamado de fato.

## R1
O sistema DEVE expor um componente `ConfigPanel` em
`src/ui/panels/config/ConfigPanel.jsx` que, ao ser montado, chama
`dataClient.loadCardapio()` e `dataClient.loadConfig()` exatamente uma
vez cada, e renderiza os dados retornados.

## R2
QUANDO `dataClient.loadCardapio()` resolve com um objeto de cardápio
válido (`{ categorias: [{ nome, itens: [{ nome, preco }, ...] }, ...] }`),
o sistema DEVE renderizar, para cada categoria, o nome da categoria e a
lista de seus itens com nome e preço.

## R3
QUANDO o usuário edita o campo de nome ou o campo de preço de um item do
cardápio exibido, o sistema DEVE refletir o novo valor digitado nesse
campo, mantendo os demais itens e categorias inalterados no estado local
do componente.

## R4
SE o usuário digitar um valor não numérico no campo de preço de um item
do cardápio ENTÃO o sistema DEVE exibir uma mensagem de erro de validação
associada a esse campo e NÃO DEVE incluir esse item nos dados enviados a
`dataClient.saveConfig()` nem a qualquer outra chamada de persistência.

## R5
QUANDO `dataClient.loadConfig()` resolve, o sistema DEVE renderizar campos
de formulário preenchidos com os valores retornados: `apiKeys.openai`,
`apiKeys.deepseek`, `systemPrompt`, `audioEnabled`, `imageEnabled` e
`modeloSelecionado`.

## R6
QUANDO o usuário altera o campo de chave de API da OpenAI, o campo de
chave de API da DeepSeek, ou a área de texto do system prompt, o sistema
DEVE refletir o novo valor digitado no estado local do formulário.

## R7
QUANDO o usuário alterna o switch de áudio ou o switch de imagem, o
sistema DEVE inverter o valor booleano correspondente (`audioEnabled` ou
`imageEnabled`) no estado local do formulário.

## R8
QUANDO o usuário seleciona um modelo de IA (`"openai"` ou `"deepseek"`)
no seletor de modelo, o sistema DEVE atualizar `modeloSelecionado` no
estado local do formulário para o valor selecionado.

## R9
QUANDO o usuário aciona a ação de salvar configurações, o sistema DEVE
chamar `dataClient.saveConfig(config)` exatamente uma vez, com `config`
contendo os valores atuais de `apiKeys.openai`, `apiKeys.deepseek`,
`systemPrompt`, `audioEnabled`, `imageEnabled` e `modeloSelecionado`
presentes no formulário no momento do clique.

## R10
QUANDO `dataClient.saveConfig(config)` resolve com sucesso, o sistema
DEVE exibir uma indicação visual de sucesso e NÃO DEVE exibir nenhuma
mensagem de erro.

## R11
SE `dataClient.saveConfig(config)` rejeitar com um erro (incluindo, mas
não se limitando a, uma instância de `InvalidConfigError` de
`src/menu/errors.js`) ENTÃO o sistema DEVE capturar essa rejeição, exibir
a mensagem de erro ao usuário, e NÃO DEVE lançar uma exceção não tratada
para fora do componente.

## R12
O sistema DEVE compor `ConfigPanel` usando exclusivamente os componentes
base exportados por `src/ui/index.js` (`Card`, `Badge`, `Button`, `Navbar`,
`ThemeToggle`) para sua estrutura visual (contêineres, botões de ação,
indicadores de estado, navegação e alternância de tema), sem declarar
elementos HTML de baixo nível equivalentes a esses componentes (ex.: um
`<button>` cru para a ação de salvar, quando `Button` está disponível).

## R13
O sistema DEVE envolver `ConfigPanel` (ou seu ponto de montagem) em um
`ThemeProvider` de `src/ui/index.js`, de forma que `ThemeToggle`, quando
presente no painel, funcione corretamente (alterna e persiste o tema),
reaproveitando o comportamento já validado na feature-11 sem
reimplementá-lo.

## R14
O sistema DEVE aceitar o "cliente de dados" (`dataClient`, com os métodos
`loadCardapio`, `loadConfig`, `saveConfig`) como uma prop explícita de
`ConfigPanel` (ou via um provedor de contexto dedicado), permitindo que
os testes injetem uma implementação fake e que uma futura integração
(feature-14) injete uma implementação real baseada em IPC, sem alterar o
código de `ConfigPanel`.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                    | Coberto por                          |
|---------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| O painel exibe e permite editar o cardápio carregado (feature-2).                                                           | R1, R2, R3, R4                            |
| O painel exibe e permite salvar as chaves de API da OpenAI e DeepSeek, o system prompt e os switches de áudio/imagem (feature-2). | R1, R5, R6, R7, R8, R9, R10, R11          |
| O painel usa o Sistema de Design da feature-11 (tema claro/escuro, componentes base).                                       | R12, R13                                  |
| tests/config-panel-ui.test.js valida a lógica de interação do painel (edição, salvamento, validação) com testing-library.   | R1–R14 (implementação de teste)           |
