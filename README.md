# sddharness

Mini-arnês **Spec Driven Development (SDD)** portável. Instale em qualquer
repositório, orquestre features com agentes e use o mesmo comando no
**Cursor** e no **Claude Code**.

Pilares:

1. **O repositório é o sistema** — estado em `feature_list.json`, `specs/`, `progress/`.
2. **Multi-agente** — o leader coordena; subagentes escrevem resultados em disco.
3. **Portão humano** — nada de código antes de `/sddharness approve`.
4. **Verificação** — `./init.sh` no projeto alvo tem que ficar verde.
5. **Docs de stack obrigatórios** — `architecture` / `conventions` / `verification` prontos antes de Jira/specs.

## Para quem

Qualquer stack (C#, Ionic/Angular, Node, n8n, Python, etc.). Os agentes
leem `docs/architecture.md`, `docs/conventions.md` e
`docs/verification.md` **do seu projeto**.

## Instalar o skeleton (CLI)

A partir do clone deste repositório:

```bash
./install.sh /caminho/do-seu-projeto
# ou
./bin/sddharness init /caminho/do-seu-projeto
```

Isso **só copia** o arnês (merge conservador). Não confunda com o slash
`/sddharness init` (sessão amigável no projeto alvo).

### O que a instalação cria

| Caminho | Função |
|---------|--------|
| `AGENTS.md` / `CLAUDE.md` / `CHECKPOINTS.md` | Entrada e checkpoints |
| `feature_list.json` | Fila de features |
| `init.sh` | Bootstrap/verificação |
| `docs/*.md` | Specs SDD + stubs de stack (preencher via filldocs) |
| `specs/` / `progress/` | Specs e sessão |
| `scripts/validate-features.mjs` | Valida feature_list |
| `scripts/docs-ready.mjs` | Gate: docs sem marcador TODO |
| `.sddharness/config.json` | Modelos + `verifyCmd` |
| `.cursor/` e `.claude/` | Comando `/sddharness` e agents |

## Fluxo recomendado (amigável)

No Cursor ou Claude Code, na raiz do **projeto alvo**:

```
/sddharness init
```

1. Roda `filldocs` (`docs_filler`) — analisa o codebase e preenche os 3 docs.
2. Se o projeto estiver **vazio**, os stubs permanecem e o arnês **bloqueia**
   (você precisa preencher os docs manualmente).
3. Se docs ok → pergunta: `Insira o id da tarefa do Jira`
4. Com a KEY → importa (`jira_importer`).
5. Pergunta: `Quer que inicie o fluxo com a feature-01?`
6. Se **Sim** → `/sddharness write-spec feature-01` (`spec_author`).
7. Em `spec_ready` pergunta: `Aprova a feature-01 de "{título}"?`
8. Se **Sim/Aprovo** → `/sddharness approve feature-01` (implementer + reviewer).

### Subcomandos explícitos

```
/sddharness filldocs
/sddharness jira PROJ-123
/sddharness write-spec feature-01
/sddharness approve feature-01
/sddharness config implementer model claude-opus-4
```

Não existe `execute` — o nome correto para criar specs é **`write-spec`**.

### Gate proibitivo de docs

Se `docs/architecture.md`, `conventions.md` ou `verification.md` ainda
tiverem a seção `## TODO — preencha após instalar o arnês`, então
`jira` / `write-spec` / `approve` **não avançam**. Cheque com:

```bash
node scripts/docs-ready.mjs
```

## Fluxo SDD

```
filldocs → jira → write-spec → ⏸ humano → approve → done
```

| Estado | Significado |
|--------|-------------|
| `pending` | Sem spec |
| `spec_ready` | Spec pronto; aguarda approve |
| `in_progress` | Implementação (máx. 1) |
| `done` | Verificação verde + review |
| `blocked` | Travado (`progress/current.md`) |

## Agentes

| Agente | Papel |
|--------|--------|
| `leader` | Orquestra; perguntas amigáveis Sim/Aprova |
| `docs_filler` | Preenche architecture/conventions/verification |
| `jira_importer` | Issue/épico → `feature_list.json` |
| `spec_author` | Specs EARS (`write-spec`) |
| `implementer` | Código + verificação (`approve`) |
| `reviewer` | Aprova/rejeita rastreabilidade |

## Schema de `feature_list.json`

```json
{
  "project": "meu-app",
  "description": "Descrição curta",
  "source": { "type": "jira", "key": "PROJ-123" },
  "rules": {
    "one_feature_at_a_time": true,
    "require_tests_to_close": true,
    "require_approved_spec_to_implement": true,
    "valid_status": ["pending", "spec_ready", "in_progress", "done", "blocked"],
    "sdd_required_when": "feature has \"sdd\": true"
  },
  "features": [
    {
      "id": 1,
      "name": "feature-01",
      "title": "Título",
      "description": "O quê entregar",
      "acceptance": ["Critério verificável"],
      "jira_key": "PROJ-456",
      "sdd": true,
      "status": "pending"
    }
  ]
}
```

Schema: [`schema/feature_list.schema.json`](schema/feature_list.schema.json).

## Config de modelos

```json
{
  "agents": {
    "leader": { "model": "inherit" },
    "docs_filler": { "model": "inherit" },
    "spec_author": { "model": "inherit" },
    "implementer": { "model": "inherit" },
    "reviewer": { "model": "inherit" },
    "jira_importer": { "model": "inherit" }
  },
  "verifyCmd": "npm test"
}
```

## Validação

```bash
./init.sh
./bin/sddharness validate /caminho/do-seu-projeto
node scripts/docs-ready.mjs
```

## Cursor vs Claude Code

| | Cursor | Claude Code |
|--|--------|-------------|
| Comando | `.cursor/commands/sddharness.md` | `.claude/commands/sddharness.md` |
| Agentes | `.cursor/agents/` | `.claude/agents/` |
| Entry | `AGENTS.md` | `CLAUDE.md` + `AGENTS.md` |

## Desenvolvimento deste kit

```bash
npm test
./install.sh /tmp/sddharness-demo
./bin/sddharness validate /tmp/sddharness-demo
```

## Licença / uso

Uso interno / time.
