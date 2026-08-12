# sddharness

Mini-arnês **Spec Driven Development (SDD)** portável. Instale em qualquer
repositório, orquestre features com agentes e use o mesmo comando no
**Cursor** e no **Claude Code**.

Pilares:

1. **O repositório é o sistema** — estado SDD em `sddharness/` (`feature_list.json`, `specs/`, `progress/`).
2. **Multi-agente** — leader coordena; resultados em disco.
3. **Portão humano** — nada de código antes de `/sddharness approve`.
4. **Docs de stack** — architecture / conventions / verification prontos.
5. **Git por feature** — branch mãe + worktree em `.worktrees/` + merge ao concluir.

## Instalar o skeleton (CLI)

```bash
./install.sh /caminho/do-seu-projeto
# ou
./bin/sddharness init /caminho/do-seu-projeto
```

Slash `/sddharness init` no projeto alvo = sessão amigável (não é a CLI).

### Estrutura instalada

```
projeto/
├── CLAUDE.md
├── .claude/                  # agents + commands
├── .cursor/                  # agents + commands
├── .sddharness/
│   ├── config.json
│   └── session.json          # gitignored
├── .worktrees/               # worktrees git (gitignored)
└── sddharness/
    ├── AGENTS.md
    ├── CHECKPOINTS.md
    ├── feature_list.json
    ├── init.sh
    ├── docs/
    ├── progress/
    ├── scripts/
    └── specs/
```

### Projetos já instalados (layout antigo)

Se o arnês estava solto na raiz (`feature_list.json`, `docs/`, `scripts/`, …),
mova esses arquivos para `sddharness/` ou remova-os e rode de novo
`./install.sh /caminho` (merge conservador cria `sddharness/` sem apagar
código do app).

## Fluxo recomendado

```
/sddharness init
```

1. `filldocs` — preenche os 3 docs a partir do codebase (ou bloqueia se vazio).
2. Pede o id da tarefa Jira → importa features.
3. Pergunta: `Vou criar a branch para começar a trabalhar a partir da branch atual ({nome}), posso continuar ou quer mudar de branch?`
4. Se continuar: `Criando a branch "feature/JIRA-123-…"…` (a partir da branch atual).
5. `Quer que inicie o fluxo com a feature-01?`
6. Sim → `Criando o worktree "feature/JIRA-123-01-…"…` + `write-spec`.
7. `Aprova a feature-01 de "{título}"?`
8. Sim → implementa no worktree → `Fazendo merge do worktree "…" na branch "…"…` → próxima feature.

### Subcomandos

```
/sddharness filldocs
/sddharness jira PROJ-123
/sddharness write-spec feature-01
/sddharness approve feature-01
/sddharness config implementer model <slug>
```

Não existe `execute` — use **`write-spec`**.

### Git / worktrees

Scripts (cwd = raiz do projeto):

```bash
node sddharness/scripts/git-session.mjs current-branch
node sddharness/scripts/git-session.mjs ensure-parent --jira KEY --title "..."
node sddharness/scripts/git-session.mjs add-worktree --jira KEY --feature feature-01 --title "..."
node sddharness/scripts/git-session.mjs merge-worktree --feature feature-01
```

| Artefato | Exemplo |
|----------|---------|
| Branch mãe | `feature/JIRA-123-atualizacao-servico-payment` |
| Worktree/branch | `feature/JIRA-123-01-implementando-adapters` |
| Path | `.worktrees/JIRA-123-01-implementando-adapters` |

Estado SDD em **`sddharness/`**. Código da feature no **worktree**. Sessão em
`.sddharness/session.json` (gitignored).

### Gate de docs

```bash
node sddharness/scripts/docs-ready.mjs
```

## Agentes

| Agente | Papel |
|--------|--------|
| `leader` | Orquestra; git + perguntas amáveis |
| `docs_filler` | Preenche docs de stack |
| `jira_importer` | Jira → `sddharness/feature_list.json` |
| `spec_author` | Specs (`write-spec`) |
| `implementer` | Código no worktree |
| `reviewer` | Review |

## Schema / config

Ver `schema/feature_list.schema.json`. Modelos em `.sddharness/config.json`
(inclui `docs_filler`). `verifyCmd` opcional.

## Validação / testes do kit

No projeto alvo:

```bash
./sddharness/init.sh
node sddharness/scripts/docs-ready.mjs
```

No repositório do kit:

```bash
npm test
```

## Cursor vs Claude Code

Mesmo slash `/sddharness` em `.cursor/commands` e `.claude/commands`.
