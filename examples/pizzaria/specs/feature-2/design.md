# Design — feature-2: Leitor de Cardápio e Configurações Globais

## Arquivos a criar

```
src/menu/
├── index.js       # superfície pública do domínio (única importável de fora)
├── errors.js       # MenuError e subtipos
├── cardapio.js       # leitura/validação de cardapio.json
└── config.js           # leitura/persistência atômica de configurações globais

tests/
└── config-menu.test.js   # (será escrito pelo implementer, NÃO por este agente)
```

Nenhum arquivo fora de `src/menu/` é tocado nesta feature. `electron/main.js`
(registro dos canais IPC que exporão `loadCardapio`/`loadConfig`/`saveConfig`
ao painel React) fica para uma feature posterior que o exija explicitamente
(feature-7, painel administrativo), assim como não se cria aqui nenhum
`cardapio.json` de exemplo em `src/` — o `path` é sempre recebido como
argumento pelas funções públicas, igual ao padrão de `openDatabase(path)`
de `src/db/index.js`.

## Dependências externas novas

Nenhuma. `src/menu/` usa apenas `node:fs` (API síncrona: `readFileSync`,
`writeFileSync`, `renameSync`, `chmodSync`, `existsSync`) e `node:path`,
seguindo o mesmo estilo síncrono de `src/db/` (`better-sqlite3` também é
síncrono) e o princípio de "carregar no início, modificar em memória,
salvar no final" de `docs/architecture.md`.

- **Alternativa descartada: validar o schema de `cardapio.json` com uma
  biblioteca de JSON Schema (ex.: `ajv`).** É descartada porque o formato
  de `cardapio.json` desta feature é pequeno e fixo (lista de categorias,
  cada uma com itens `{ nome, preco, descricao? }`); validação manual de
  campo é suficiente e evita adicionar uma dependência nova sem
  justificativa concreta (`docs/architecture.md`, princípio 3). Se um
  cardápio mais complexo (variações, combos) exigir validação estrutural
  mais rica no futuro, isso é reavaliado em uma feature dedicada.
- **Alternativa descartada: armazenar as API keys em um cofre do SO via
  `keytar` (ou equivalente) em vez de um arquivo JSON com permissões
  restritas.** É descartada nesta feature porque `keytar` exige bindings
  nativos por plataforma, o que complica o empacotamento Windows previsto
  em feature-8, e `docs/architecture.md` (princípio 5) já prescreve
  guardar segredos fora da árvore de fontes, em
  `app.getPath("userData")`, sem exigir um cofre de SO. A mitigação usada
  aqui é: arquivo fora do repositório, nunca em fixtures de teste, e modo
  `0o600` (leitura/escrita restrita ao usuário dono) quando `apiKeys` é
  gravado. Uma camada de criptografia em repouso pode ser adicionada
  depois, em feature dedicada, se o requisito de segurança evoluir.

## Assinaturas novas (`src/menu/index.js`)

```javascript
// Lê e valida o cardápio. Lança MenuFileNotFoundError se path não existir
// e InvalidMenuSchemaError se o JSON for inválido ou faltar nome/preco
// em algum item.
export function loadCardapio(path)
// -> { categorias: [{ nome, itens: [{ nome, preco, descricao }] }] }

// Retorna a configuração padrão (nunca lê/escreve disco).
export function getDefaultConfig()
// -> { apiKeys: { openai: "", deepseek: "" }, systemPrompt, audioEnabled: false, imageEnabled: false }

// Lê a configuração em path. Se o arquivo não existir, retorna
// getDefaultConfig() sem lançar exceção e sem criar arquivo.
export function loadConfig(path)
// -> { apiKeys: { openai, deepseek }, systemPrompt, audioEnabled, imageEnabled }

// Valida o formato de config e persiste atomicamente (arquivo temporário
// + fs.renameSync). Se apiKeys.openai ou apiKeys.deepseek estiverem
// preenchidos, aplica chmod 0o600 no arquivo final. Lança
// InvalidConfigError sem tocar o disco se o formato for inválido.
export function saveConfig(path, config)
// -> void
```

## Exceções (`src/menu/errors.js`)

```javascript
export class MenuError extends Error {}
export class MenuFileNotFoundError extends MenuError {}
export class InvalidMenuSchemaError extends MenuError {}
export class InvalidConfigError extends MenuError {}
```

Seguindo `docs/conventions.md`: uma classe base por módulo (`MenuError`)
e subtipos concretos, cobrindo tanto o sub-tópico "cardápio" quanto
"configuração", já que ambos vivem no mesmo domínio `src/menu/`
conforme `docs/architecture.md`.

## Forma de `cardapio.json` esperada

```json
{
  "categorias": [
    {
      "nome": "Pizzas",
      "itens": [
        { "nome": "Margherita", "preco": 45.9, "descricao": "Molho, mussarela e manjericão" }
      ]
    }
  ]
}
```

`descricao` é opcional; `nome` e `preco` são obrigatórios em cada item
(R2). `loadCardapio` valida: (a) o arquivo existe (R3); (b) o conteúdo é
JSON válido (R4); (c) `categorias` é um array e cada item de cada
categoria tem `nome` (string não vazia) e `preco` (número finito) (R2).
Qualquer falha nesses três pontos lança `InvalidMenuSchemaError` (exceto
arquivo ausente, que é `MenuFileNotFoundError`), sem retorno parcial.

## Forma de configuração esperada

```json
{
  "apiKeys": { "openai": "", "deepseek": "" },
  "systemPrompt": "...",
  "audioEnabled": false,
  "imageEnabled": false
}
```

`loadConfig` faz merge raso com `getDefaultConfig()` para tolerar um
arquivo de configuração de uma versão anterior que não tenha algum campo
novo (ex.: `imageEnabled` adicionado depois): campos ausentes no arquivo
em disco assumem o valor padrão, campos presentes prevalecem.

## Persistência atômica e permissões (R6, R7, R9)

`saveConfig` segue o mesmo padrão prescrito em `docs/architecture.md`
(princípio 6 — atomicidade em disco): escreve em `${path}.tmp-<pid>`
via `writeFileSync`, depois `renameSync` para `path`. `rename` em um
mesmo volume é atômico no nível do sistema de arquivos, então nunca há
uma janela em que `path` contém um JSON parcial.

Antes de escrever, `saveConfig` valida a forma de `config`
(`systemPrompt` deve ser string, `audioEnabled`/`imageEnabled` devem ser
booleanos) e lança `InvalidConfigError` sem tocar o disco se a validação
falhar (R9) — nem o arquivo temporário é criado nesse caso.

Depois do `renameSync`, se `config.apiKeys.openai` ou
`config.apiKeys.deepseek` forem strings não vazias, `saveConfig` aplica
`fs.chmodSync(path, 0o600)` (R7). Em plataformas onde `chmod` não tem
efeito (Windows, verificação feita via `try/catch` silencioso em torno
da chamada, já que o objetivo em Windows será resolvido pelo instalador
de feature-8), a chamada não lança para o restante do fluxo.

## Aplicação em tempo de execução (R8)

Como `src/ai/` (feature-5) e o painel (feature-7) ainda não existem
nesta etapa do projeto, "aplicado em tempo de execução" é escopado, para
esta feature, ao contrato observável do próprio módulo: uma chamada a
`loadConfig(path)` logo após um `saveConfig(path, config)` bem-sucedido
DEVE refletir os novos valores de `systemPrompt`, `audioEnabled` e
`imageEnabled`. Não há cache em memória dentro de `src/menu/` — cada
chamada a `loadConfig` lê o arquivo atual do disco, o que é aceitável
aqui porque, ao contrário do loop de mensagens do WhatsApp
(`docs/architecture.md`, "O que NÃO fazer"), a leitura de configuração
acontece apenas quando o chamador explicitamente decide recarregar
(ex.: ao abrir o painel ou receber um evento de "configuração salva"),
não a cada iteração de um loop. Domínios consumidores futuros
(`src/ai/`, `src/ui/` via IPC) decidem, em suas próprias features, se e
como cacheiam o resultado em memória.

## Alternativa de estrutura descartada

Considerou-se unir `cardapio.js` e `config.js` em um único arquivo
dentro de `src/menu/index.js`, já que ambos são pequenos. É descartada
porque `docs/conventions.md` prescreve manter os detalhes de IO em
arquivos internos separados do `index.js` orquestrador, e cardápio e
configuração são sub-tópicos com formas de dado e regras de validação
distintas — mantê-los em arquivos separados facilita localizar e testar
cada um independentemente, como já ocorre em `src/db/`
(`clientes.js`, `sessoes.js`, `pedidos.js` separados).
