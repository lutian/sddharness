# Requirements — feature-2: Leitor de Cardápio e Configurações Globais

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/config-menu.test.js`. Mapeamento aos 4 `acceptance` originais de
> `feature_list.json` ao final do documento.

## R1
O sistema DEVE expor uma função pública `loadCardapio(path)` que lê o
arquivo `cardapio.json` em `path` e retorna a estrutura validada de
categorias e itens (cada item com pelo menos `nome` e `preco`).

## R2
QUANDO `loadCardapio(path)` é invocado sobre um arquivo cujo conteúdo
tem pelo menos um item sem os campos obrigatórios `nome` ou `preco`, o
sistema DEVE lançar `InvalidMenuSchemaError` e NÃO DEVE retornar um
cardápio parcial.

## R3
SE o arquivo apontado por `path` não existir ENTÃO `loadCardapio(path)`
DEVE lançar `MenuFileNotFoundError`.

## R4
SE o conteúdo do arquivo em `path` não for um JSON sintaticamente válido
ENTÃO `loadCardapio(path)` DEVE lançar `InvalidMenuSchemaError`.

## R5
QUANDO `loadConfig(path)` é invocado e o arquivo de configuração ainda
não existe nesse `path`, o sistema DEVE retornar um objeto de
configuração padrão (`apiKeys.openai` e `apiKeys.deepseek` como string
vazia, `systemPrompt` com o valor padrão do domínio, `audioEnabled` e
`imageEnabled` como `false`), sem lançar exceção e sem criar o arquivo
em disco.

## R6
QUANDO `saveConfig(path, config)` é invocado com um `config` válido, o
sistema DEVE persistir o arquivo de configuração de forma atômica
(escrita em um arquivo temporário seguida de `fs.renameSync` para o
`path` final), de modo que nunca exista, em `path`, um arquivo
parcialmente escrito.

## R7
QUANDO `saveConfig(path, config)` persiste um `config` contendo
`apiKeys.openai` e/ou `apiKeys.deepseek` preenchidos, o sistema DEVE
gravar o arquivo resultante com permissões restritas ao usuário dono
(modo `0o600` em sistemas POSIX), e uma chamada subsequente a
`loadConfig(path)` DEVE reproduzir exatamente os mesmos valores de
`apiKeys.openai` e `apiKeys.deepseek` informados.

## R8
QUANDO `saveConfig(path, config)` é chamado alterando `systemPrompt`,
`audioEnabled` e/ou `imageEnabled` em relação ao estado anterior, uma
chamada subsequente a `loadConfig(path)` sobre o mesmo `path` DEVE
refletir imediatamente os novos valores desses três campos.

## R9
SE `saveConfig(path, config)` for invocado com `config.systemPrompt`
que não seja uma string, ou `config.audioEnabled`/`config.imageEnabled`
que não sejam booleanos, ENTÃO o sistema DEVE lançar
`InvalidConfigError` e NÃO DEVE escrever nem modificar nenhum arquivo em
`path`.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                   | Coberto por      |
|-------------------------------------------------------------------------------------------------------------------------------|-------------------|
| O sistema lê e valida o arquivo cardapio.json corretamente na inicialização.                                                 | R1, R2, R3, R4    |
| O painel ou backend consegue salvar e carregar as chaves de API da OpenAI e DeepSeek de forma segura.                        | R5, R6, R7        |
| As diretrizes do system prompt e switches de ativação de áudio e imagem são aplicadas em tempo de execução.                  | R8, R9            |
| tests/config-menu.test.js valida a leitura do cardápio e a persistência das configurações.                                   | R1–R9 (implementação de teste) |
