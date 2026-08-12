# AGENTS.md — Mapa de navegação para agentes de IA

> Este arquivo é o **ponto de entrada** para qualquer agente que trabalhe
> neste repositório. NÃO é uma bíblia de regras: é um **mapa**. Leia só o
> que precisar quando precisar (divulgação progressiva).

---

## 1. Antes de começar (obrigatório)

1. Execute `./init.sh` e verifique o ambiente. Se falhar, **pare**.
2. Docs de stack devem estar prontos (`node scripts/docs-ready.mjs`).
   Se falhar: `/sddharness filldocs` ou `/sddharness init`.
3. Leia `progress/current.md` e `feature_list.json`.
4. Leia `docs/specs.md` antes de tocar em feature `sdd: true`.
5. Leia `.sddharness/config.json` para modelos por agente.

## 2. Mapa do repositório

| Arquivo / pasta | O que contém | Quando ler |
|---|---|---|
| `feature_list.json` | Fila de features e estados | Sempre |
| `progress/current.md` | Sessão ativa | Sempre |
| `progress/history.md` | Diário append-only | Contexto histórico |
| `specs/<feature>/` | requirements + design + tasks | Antes de implementar |
| `docs/architecture.md` | Stack e arquitetura do projeto | Antes de implementar |
| `docs/conventions.md` | Convenções de código | Antes de escrever código |
| `docs/specs.md` | Processo SDD / EARS | Antes de redigir spec |
| `docs/verification.md` | Como provar que funciona | Antes de marcar done |
| `CHECKPOINTS.md` | Critérios de saúde | Autoavaliação |
| `.sddharness/config.json` | Modelos + verifyCmd | Antes de subagentes |
| `.claude/agents/` / `.cursor/agents/` | leader, docs_filler, spec_author, implementer, reviewer, jira_importer | Orquestração |

## 3. Regras rígidas

- **Uma feature por vez.**
- **Docs prontos** antes de jira / write-spec / approve (marcador TODO = bloqueio).
- **Não declare `done` sem verificação verde** (`./init.sh`).
- **Não pule a fase de spec** (`write-spec` → approve humano → `approve`).
- Documente em `progress/current.md` enquanto trabalha.
- Se não souber, procure em `docs/` antes de inventar.

## 4. Fluxo de trabalho (SDD)

```
filldocs → jira → write-spec → ⏸ approve humano → approve → done
```

Fluxo amigável recomendado:

1. `/sddharness init` — preenche docs, pede id Jira, importa.
2. Pergunta: `Quer que inicie o fluxo com a feature-01?` → Sim dispara `write-spec`.
3. Em `spec_ready`: `Aprova a feature-01 de "{title}"?` → Sim dispara `approve`.

Slash explícitos: `filldocs`, `jira`, `write-spec`, `approve`, `config`.
Não existe subcomando `execute`.

## 5. Encerramento de sessão

1. `./init.sh` verde.
2. Feature `done` via implementer após APPROVED.
3. Resumo → `progress/history.md`; esvazie `current.md`.
4. Sem temporários nem TODOs sem contexto.

## 6. Se você travar

Releia `docs/`. Sem workaround inventado: documente bloqueio e pare.
