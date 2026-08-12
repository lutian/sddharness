# Spec Driven Development (SDD)

> Este projeto segue um fluxo estilo Kiro: requirements → design → tasks
> → code. O código não é escrito até que o spec esteja aprovado por um
> humano.

## Estrutura

Cada feature nova (`"sdd": true` em `feature_list.json`) tem uma pasta
dedicada assim que sai de `pending`:

```
specs/<feature-name>/
├── requirements.md   # O QUÊ é necessário (notação EARS)
├── design.md         # COMO será construído (decisões técnicas)
└── tasks.md          # PASSOS concretos a implementar
```

O `feature-name` coincide com o campo `name` de `feature_list.json`.

## Estados de uma feature

| Estado         | Significado                                                     |
|----------------|-------------------------------------------------------------------|
| `pending`      | Sem spec. O `spec_author` é o primeiro a agir.                   |
| `spec_ready`   | Spec redigido. Aguardando aprovação humana. NÃO se toca código.  |
| `in_progress`  | Spec aprovado. `implementer` trabalhando.                        |
| `done`         | Código verde, `reviewer` aprovou, sessão fechada.                |
| `blocked`      | Travado. Motivo em `progress/current.md`.                        |

## O portão de aprovação humana

O fluxo automático para **uma vez**: quando o `spec_author` termina seus
três arquivos, marca a feature como `spec_ready` e para. O humano lê
`specs/<feature>/` e diz "aprovado" (ou pede mudanças).

Só então o `leader` transiciona `spec_ready → in_progress` e lança o
`implementer`.

```
pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress → [implementer → reviewer] → done
```

## requirements.md — EARS estrito

As requirements são redigidas em **EARS** (Easy Approach to Requirements
Syntax). Cada requirement é um parágrafo numerado com um destes cinco
padrões:

| Padrão          | Modelo                                                        |
|------------------|-------------------------------------------------------------------|
| **Ubíquo**       | `O sistema DEVE <ação>.`                                          |
| **Evento**       | `QUANDO <gatilho>, o sistema DEVE <ação>.`                        |
| **Estado**       | `ENQUANTO <estado>, o sistema DEVE <ação>.`                       |
| **Opcional**     | `ONDE <feature opcional>, o sistema DEVE <ação>.`                 |
| **Indesejado**   | `SE <evento indesejado> ENTÃO o sistema DEVE <ação>.`             |

Regras rígidas:

- Cada requirement tem um id estável: `R1`, `R2`, ...
- Cada requirement DEVE ser verificável por pelo menos um teste concreto.
- Não misture vários `DEVE` no mesmo requirement. Se houver mais de um,
  divida.
- Não use verbos brandos ("poderia", "pode", "suporta"). Só `DEVE` /
  `NÃO DEVE`.

Exemplo:

```markdown
## R1
QUANDO `openDatabase(path)` é chamado e o arquivo SQLite não existe, o
sistema DEVE criar o arquivo com as tabelas `clientes`, `sessoes` e
`pedidos`.

## R2
SE for tentada a inserção de um cliente com um `telefone` já existente
ENTÃO o sistema DEVE lançar `DatabaseError` e NÃO DEVE modificar a linha
existente.
```

## design.md — decisões técnicas

Capture **antes** de tocar em código:

- Quais arquivos são criados / modificados.
- Quais assinaturas novas aparecem (funções, classes, comandos).
- Quais exceções são reutilizadas ou adicionadas.
- Qual alternativa foi descartada e por quê (no mínimo uma).

NÃO é engenharia a partir de primeiros princípios — apoie-se em
`docs/architecture.md` e `docs/conventions.md`. O `design.md` documenta
os pontos onde sua feature toca a fronteira dessas regras.

## tasks.md — checklist executável

Passos discretos em ordem, cada um com checkbox. Cada task referencia
pelo menos um `R<n>` que cobre.

Exemplo:

```markdown
- [ ] T1 — Adicionar `openDatabase(path)` em `src/db/index.js`. Cobre: R1.
- [ ] T2 — Adicionar `insertCliente(db, cliente)` com `UNIQUE` em `telefone`. Cobre: R2.
- [ ] T3 — Adicionar teste `"cria o arquivo SQLite se não existir"` em
      `tests/database.test.js`. Cobre: R1.
- [ ] T4 — Adicionar teste `"rejeita um telefone duplicado em clientes"` em
      `tests/database.test.js`. Cobre: R2.
```

O `implementer` marca `[x]` cada task ao completá-la. O `reviewer`
rejeita se sobrar alguma `[ ]` sem justificativa documentada.

## Rastreabilidade (regra rígida)

- Cada teste em `tests/` deve poder ser mapeado a um `R<n>` do seu spec.
- Cada `R<n>` deve ter pelo menos um teste concreto.
- O `reviewer` verifica essa correspondência explicitamente e rejeita se
  faltar.

O `implementer` documenta o mapa em `progress/impl_<name>.md`:

```markdown
## Rastreabilidade
- R1 → `"cria o arquivo SQLite se não existir"`
- R2 → `"rejeita um telefone duplicado em clientes"`
- R3 → `"mantém apenas a sessão mais recente por cliente"`
```

## Quando o SDD NÃO se aplica

Features com `"sdd": false` ou sem o campo `sdd` NÃO têm spec. SDD só se
aplica dali em diante.
