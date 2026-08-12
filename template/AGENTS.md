# AGENTS.md — Mapa de navegação para agentes de IA

> Este arquivo é o **ponto de entrada** para qualquer agente que trabalhe
> neste repositório. NÃO é uma bíblia de regras: é um **mapa**.

---

## 1. Antes de começar (obrigatório)

1. Execute `./init.sh`. Se falhar, **pare**.
2. Docs prontos: `node scripts/docs-ready.mjs` (senão `/sddharness filldocs` ou `init`).
3. Leia `progress/current.md`, `feature_list.json`, `docs/specs.md`.
4. Leia `.sddharness/config.json` (e `session.json` se existir).

## 2. Mapa do repositório

| Arquivo / pasta | O que contém |
|---|---|
| `feature_list.json` / `specs/` / `progress/` | Estado SDD (raiz) |
| `docs/*` | Arquitetura, convenções, verificação, specs SDD |
| `.sddharness/config.json` | Modelos + verifyCmd |
| `.sddharness/session.json` | Branch mãe + worktrees da sessão Jira |
| `.worktrees/` | Worktrees por feature (gitignored) |
| `scripts/git-session.mjs` | ensure-parent / add-worktree / merge-worktree |
| `.claude/agents/` / `.cursor/agents/` | Subagentes |

## 3. Regras rígidas

- Uma feature por vez.
- Docs prontos antes de jira / write-spec / approve.
- Código da feature no **worktree**; arnês na **raiz**.
- `write-spec` → approve humano → `approve` → merge worktree na branch mãe.
- Sem subcomando `execute`.

## 4. Fluxo

```
filldocs → jira → confirmar base → branch mãe → write-spec (+ worktree)
  → ⏸ approve humano → approve (+ merge) → próxima feature
```

Frases canônicas: ver `leader.md` / README (base atual, criando branch,
criando worktree, fazendo merge).

## 5. Encerramento

`./init.sh` verde; `done` após APPROVED + merge; limpe `progress/current.md`.

## 6. Se travar

Documente em `progress/current.md` e pare — sem workaround inventado.
