# CHECKPOINTS — Avaliação do estado final

> Em sistemas multi-agente não se avalia o caminho, avalia-se o destino.
> Estes são os checkpoints objetivos que um juiz (humano ou IA) pode usar
> para decidir se o projeto está saudável.

## C1 — O arnês está completo

- [ ] Existem os 4 arquivos base: `AGENTS.md`, `init.sh`,
      `feature_list.json`, `progress/current.md`.
- [ ] Existem os 3 docs: `docs/architecture.md`, `docs/conventions.md`,
      `docs/verification.md`.
- [ ] `./init.sh` termina com exit code 0.

## C2 — O estado é coerente

- [ ] No máximo uma feature em `in_progress` em `feature_list.json`.
- [ ] Toda feature `done` tem testes associados que passam.
- [ ] `progress/current.md` está vazio ou descreve a sessão ativa (não
      contém lixo de sessões anteriores).

## C3 — O código respeita a arquitetura

- [ ] `src/` contém somente os domínios previstos em
      `docs/architecture.md`.
- [ ] Toda dependência em `package.json` está justificada no `design.md`
      de alguma feature.
- [ ] Não há `console.log` soltos para debug, nem TODOs sem contexto.

## C4 — A verificação é real

- [ ] `tests/` tem pelo menos um teste por módulo público de `src/`.
- [ ] Os testes usam um diretório temporário real
      (`fs.mkdtempSync`), não mocks de fs.
- [ ] `npm test` mostra > 0 testes e todos verdes.

## C5 — A sessão foi encerrada corretamente

- [ ] Não há arquivos não rastreados suspeitos (`*.tmp`, `node_modules/`,
      `*.sqlite` fora do `.gitignore`).
- [ ] `progress/history.md` tem uma entrada da última sessão.
- [ ] A última feature trabalhada está refletida em seu estado correto.

## C6 — Spec Driven Development

- [ ] Toda feature com `"sdd": true` em estado `spec_ready`,
      `in_progress` ou `done` tem sua pasta `specs/<name>/` com os 3
      arquivos: `requirements.md`, `design.md`, `tasks.md`.
- [ ] `requirements.md` usa EARS estrito (ver `docs/specs.md`).
- [ ] Toda feature `done` com `"sdd": true` tem todas as suas tasks
      marcadas `[x]` em `tasks.md`.
- [ ] Cada `R<n>` de `requirements.md` está coberto por pelo menos um
      teste concreto em `tests/`.

---

**Como usar este arquivo:** um agente revisor
(`.claude/agents/reviewer.md`) percorre cada checkbox, marca `[x]` ou
`[ ]`, e rejeita o fechamento da sessão se sobrarem boxes vazios em
C1-C6.
