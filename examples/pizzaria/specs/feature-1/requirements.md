# Requirements — feature-1: Banco de Dados SQLite e Modelagem Inicial

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/database.test.js`. Mapeamento aos 4 `acceptance` originais de
> `feature_list.json` ao final do documento.

## R1
QUANDO é invocado `openDatabase(path)` com um `path` cujo diretório pai já
existe mas cujo arquivo ainda não existe, o sistema DEVE criar um arquivo
de banco SQLite nesse `path` exato.

## R2
QUANDO é invocado `openDatabase()` sem argumento de `path`, o sistema
DEVE criar (ou abrir) o arquivo SQLite dentro da pasta de dados do
sistema do usuário resolvida via `app.getPath("userData")` (Electron) —
ou, quando `app` não estiver disponível (contexto de teste fora do
processo Electron), via um `resolveUserDataPath()` injetável que replica
essa resolução.

## R3
QUANDO é invocado `openDatabase(path)` sobre um `path` cujo arquivo já
existe com o schema esperado, o sistema DEVE abrir a conexão sem recriar
nem apagar as tabelas existentes.

## R4
O sistema DEVE criar, na primeira abertura do banco, a tabela `clientes`
com exatamente as colunas: `id` (chave primária), `telefone` (texto,
único, obrigatório), os dados cadastrais `nome` e `criado_em` (timestamp
de registro), `endereco` (texto) e as coordenadas de geolocalização
`latitude` e `longitude` (numéricas).

## R5
SE for tentada a inserção em `clientes` de um registro cujo `telefone` já
existe em outro registro ENTÃO o sistema DEVE rejeitar a inserção
lançando `DatabaseError` (subtipo `DuplicatePhoneError`), sem alterar o
registro existente.

## R6
O sistema DEVE criar, na primeira abertura do banco, a tabela `sessoes`
com colunas que incluam `id`, `cliente_id` (referência a `clientes.id`),
`historico` (texto/JSON da conversa) e `atualizado_em` (timestamp).

## R7
QUANDO é registrada uma nova sessão para um `cliente_id` que já possui
uma sessão anterior armazenada, o sistema DEVE substituí-la (remover a
sessão antiga e persistir apenas a mais recente) de modo que, após a
operação, exista no máximo uma linha em `sessoes` por `cliente_id`.

## R8
O sistema DEVE criar, na primeira abertura do banco, a tabela `pedidos`
com colunas que incluam `id`, `cliente_id`, `itens` (texto contendo JSON
válido serializado), `status` (texto) e `motoboy` (texto, anulável).

## R9
QUANDO é inserido um pedido através da função pública de inserção de
pedidos com uma lista/array de itens em memória, o sistema DEVE
serializar essa lista como JSON válido na coluna `itens`, de forma que a
releitura do registro via `JSON.parse` reproduza a mesma estrutura de
dados original.

## R10
SE for tentada a inserção de um pedido com um `status` fora do conjunto
de valores permitidos (`"recebido"`, `"em_preparo"`,
`"saiu_para_entrega"`, `"concluido"`, `"cancelado"`) ENTÃO o sistema DEVE
rejeitar a inserção lançando `DatabaseError` (subtipo
`InvalidOrderStatusError`).

## R11
O sistema DEVE expor uma função pública (`closeDatabase`) que fecha a
conexão SQLite subjacente de forma limpa, sem lançar exceção quando
chamada sobre uma conexão já aberta e válida.

## R12
QUANDO é invocada a função pública de inserção de clientes (`insertCliente`)
sem os campos `endereco`, `latitude` ou `longitude`, o sistema DEVE inserir
o registro normalmente, armazenando esses campos como `NULL`, sem lançar
exceção. (A geocodificação — converter um endereço em coordenadas via
Nominatim — é escopo de feature-6 e NÃO é implementada por esta feature.)

## R13
QUANDO é invocada a função pública de inserção de clientes (`insertCliente`)
informando `endereco`, `latitude` e `longitude`, o sistema DEVE persistir
esses três valores de forma que a releitura do registro (por exemplo via
`findClienteByTelefone`) reproduza exatamente os mesmos valores
informados.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                                    | Coberto por  |
|--------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| O arquivo do banco SQLite é criado corretamente na pasta de dados do sistema do usuário.                                                     | R1, R2, R3   |
| A tabela de clientes armazena o telefone, dados cadastrais, endereço e coordenadas de geolocalização (latitude/longitude), e a tabela de sessões mantém apenas o histórico mais recente por cliente. | R4, R5, R6, R7, R12, R13 |
| A tabela de pedidos armazena corretamente os itens em JSON, status e nome do motoboy.                                                         | R8, R9, R10  |
| tests/database.test.js valida a criação das tabelas e a regra de unicidade e limpeza de sessões antigas.                                     | R1, R3, R4, R5, R6, R7 (implementação de teste) |
