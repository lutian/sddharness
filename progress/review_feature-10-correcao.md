# Review — correção pontual pós-fechamento (feature-10, nome do modelo DeepSeek)

**Veredito:** APPROVED

## Escopo da correção

Reabertura pontual de `done` → `in_progress` (não reimplementação) para
corrigir `MODELO_PADRAO` do adapter DeepSeek de `"deepseek-chat"` para
`"deepseek-v4-flash"`, com base em confirmação direta e explícita do
usuário humano no chat, registrada em `progress/history.md`.

## Verificações realizadas

1. **`specs/feature-10/design.md`** — linhas 210, 271-275, 390 referenciam
   `"deepseek-v4-flash"` de forma consistente, com nota explícita do
   histórico da correção anterior (linhas 271-275).
   **`specs/feature-10/tasks.md`** — T4 (linha 24-30) especifica `model`
   padrão `"deepseek-v4-flash"`. Ambos consistentes entre si.

2. **`src/ai/adapters/deepseek-chat.js`** — linha 11:
   `const MODELO_PADRAO = "deepseek-v4-flash";`, comentário da assinatura
   (linha 16) e uso em `model: model ?? MODELO_PADRAO` (linha 29)
   consistentes.

3. **`tests/ai-adapters-real.test.js`** — linha 170, dentro do describe
   "Adapter concreto deepseek-chat.js" (linha 137), teste do R6 espera
   `model: "deepseek-v4-flash"`. Consistente com o adapter.

4. **`./init.sh`** executado nesta revisão: **131/131 testes passando**,
   10 arquivos de teste, sem falhas, sem regressão em nenhuma feature
   anterior (feature-1 a feature-9 inclusas).

5. **Escopo dos arquivos alterados** — verificado por timestamp de
   modificação (`find -newer specs/feature-10/design.md`) que, na janela
   temporal desta correção, apenas os seguintes arquivos foram tocados:
   `specs/feature-10/tasks.md`, `feature_list.json`, `src/ai/adapters/
   deepseek-chat.js`, `tests/ai-adapters-real.test.js`,
   `progress/history.md`, `progress/current.md`. O único arquivo fora da
   lista original de escopo é `feature_list.json`, cuja alteração se
   limita ao campo `status` de `feature-10` (`done` → `in_progress`) —
   mudança inerente e necessária à reabertura descrita no enunciado da
   tarefa ("reaberta de `done` para `in_progress` só para essa
   correção"), não uma expansão indevida de escopo. Nenhum outro arquivo
   de `src/` ou `tests/` fora dos dois listados foi tocado nesta janela.
   `feature_list.json` não foi marcado de volta para `done` (correto,
   aguarda fechamento pelo `leader` após esta revisão).

6. **`progress/history.md`** — seção "Reabertura e confirmação definitiva
   do nome do modelo DeepSeek (feature-10)" documenta de forma coerente
   e rastreável: (1) valor original `"deepseek-chat"` não confirmado com
   o usuário, (2) divergência intermediária para `"deepseek-v4-flash"`
   revertida como correção pontual anterior (seção "Correção pontual
   pós-fechamento" logo acima, também presente no arquivo), (3) tentativa
   de reversão sem confirmação corretamente recusada, (4) confirmação
   direta e inequívoca do usuário ("sim" à pergunta explícita) fixando
   `"deepseek-v4-flash"` como valor definitivo, (5) sincronização
   mecânica do spec e do código/teste a partir dessa confirmação. O
   relato é coerente entre si e com o estado atual dos arquivos.
   `progress/current.md` também reflete o estado da sessão de forma
   consistente com `history.md`.

## Rastreabilidade requirements ↔ testes (não afetada por esta correção)

- R6: [x] coberto por `"generateReply segue a mesma montagem de
  mensagens e retorno de openai-chat.js (R6)"` em
  `tests/ai-adapters-real.test.js` (linha ~170), agora validando
  `model: "deepseek-v4-flash"`.

Nenhuma outra cobertura de requirement foi afetada por esta correção
pontual — os demais R<n> de `specs/feature-10/requirements.md`
permanecem cobertos como já validado na revisão original
(`progress/review_feature-10.md`).

## Tasks

- T4: [x] — valor de `model` padrão atualizado para `"deepseek-v4-flash"`
  em `specs/feature-10/tasks.md`, refletido no código.
- Demais tasks (T1-T3, T5-T26): inalteradas por esta correção, já `[x]`
  na revisão original.

## Conclusão

A correção é estritamente pontual, consistente entre spec, código e
teste, com `./init.sh` verde (131/131) e histórico da confusão
devidamente documentado e rastreável. Não há mudanças fora do escopo
razoável da reabertura. Aprovada.

## Mudanças necessárias

Nenhuma.
