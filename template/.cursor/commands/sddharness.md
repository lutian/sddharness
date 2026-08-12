---
description: Arnês SDD — init | filldocs | jira | write-spec | approve | config
---

# /sddharness

Comando unificado do mini-arnês Spec Driven Development.

## Uso

```
/sddharness init
/sddharness filldocs
/sddharness jira <KEY>
/sddharness write-spec <feature-XX>
/sddharness approve <feature-XX>
/sddharness config <agente> model <modelo>
```

`$ARGUMENTS` = resto da linha após `/sddharness`.

CLI `./bin/sddharness init <path>` = instalar skeleton.  
Slash `/sddharness init` = sessão amigável.

## Gate de docs

Antes de `jira` / `write-spec` / `approve`: `node scripts/docs-ready.mjs`.

## Git (obrigatório no fluxo)

```bash
node scripts/git-session.mjs current-branch
node scripts/git-session.mjs ensure-parent --jira KEY --title "..."
node scripts/git-session.mjs add-worktree --jira KEY --feature feature-01 --title "..."
node scripts/git-session.mjs merge-worktree --feature feature-01
```

Frases canônicas:

- `Vou criar a branch para começar a trabalhar a partir da branch atual ({nome}), posso continuar ou quer mudar de branch?`
- `Criando a branch "{parentBranch}"…`
- `Criando o worktree "{worktreeBranch}"…`
- `Fazendo merge do worktree "{worktreeBranch}" na branch "{parentBranch}"…`

Arnês na raiz; código no worktree (`.worktrees/`).

## Roteamento

### 1. `init`

1. `./init.sh` + `docs_filler`.
2. Blocked → pare.
3. Ready → `Insira o id da tarefa do Jira`
4. KEY → `jira`.
5. `current-branch` → pergunta da base atual.
6. Continuar → `Criando a branch "…"…` + `ensure-parent`.
7. `Quer que inicie o fluxo com a feature-01?`
8. Sim → `write-spec` → `Aprova…?` → `approve` (com merge) → próxima.

### 2. `filldocs`

Lance `docs_filler`.

### 3. `jira <KEY>`

1. Docs prontos → `jira_importer`.
2. Leader (não o importer) conduz pergunta da base + `ensure-parent`.
3. Depois: `Quer que inicie o fluxo com a feature-01?`

### 4. `write-spec <feature-XX>`

1. Docs + session com parentBranch.
2. `Criando o worktree "…"…` + `add-worktree`.
3. `spec_author` (specs na raiz) → `spec_ready` → pergunta approve.

### 5. `approve <feature-XX>`

1. `implementer` (código no worktreePath) → `reviewer` → `done`.
2. `Fazendo merge do worktree "…" na branch "{parent}"…` + `merge-worktree`.
3. Próxima feature.

### 6. `config <agente> model <modelo>`

Agentes: `leader`, `spec_author`, `implementer`, `reviewer`, `jira_importer`, `docs_filler`.

## Regras

- Uma feature por vez.
- Sem `execute` — use `write-spec`.
- Confirmações `Sim`/`Aprovo`/`continuar` no chat valem como o próximo passo.
- PT-BR.
