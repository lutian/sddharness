# sddharness

Mini-arnês **Spec Driven Development (SDD)** portável. Instale em qualquer
repositório, orquestre features com agentes (`leader`, `spec_author`,
`implementer`, `reviewer`, `jira_importer`) e use o mesmo comando no
**Cursor** e no **Claude Code**.

Pilares:

1. **O repositório é o sistema** — estado em `feature_list.json`, `specs/`, `progress/`.
2. **Multi-agente** — o leader coordena; subagentes escrevem resultados em disco.
3. **Portão humano** — nada de código antes de `/sddharness approve`.
4. **Verificação** — `./init.sh` no projeto alvo tem que ficar verde.

## Para quem

Qualquer stack (C#, Ionic/Angular, Node, n8n, Python, etc.). Os agentes
são genéricos: leem `docs/architecture.md`, `docs/conventions.md` e
`docs/verification.md` **do seu projeto**.

## Instalar em um projeto

A partir do clone deste repositório:

```bash
./install.sh /caminho/do-seu-projeto
# ou
./bin/sddharness init /caminho/do-seu-projeto
```

A instalação faz **merge conservador**: cria o que falta e **não
sobrescreve** arquivos que já existem (`AGENTS.md`, docs, etc.).

### O que é criado

| Caminho | Função |
|---------|--------|
| `AGENTS.md` | Mapa de entrada para agentes |
| `CLAUDE.md` | Força papel `leader` no Claude Code |
| `CHECKPOINTS.md` | Critérios objetivos de saúde |
| `feature_list.json` | Fila de features + estados |
| `init.sh` | Bootstrap/verificação da sessão |
| `docs/architecture.md` | Stack e arquitetura (stub — preencha) |
| `docs/conventions.md` | Convenções (stub — preencha) |
| `docs/specs.md` | Processo SDD / EARS |
| `docs/verification.md` | Como provar que funciona (stub — preencha) |
| `specs/` | Specs por feature |
| `progress/` | Sessão viva + histórico |
| `scripts/validate-features.mjs` | Validador do `feature_list.json` |
| `.sddharness/config.json` | Modelo por agente (+ `verifyCmd` opcional) |
| `.cursor/commands/sddharness.md` | Slash command no Cursor |
| `.cursor/agents/*.md` | Definições dos agentes (Cursor) |
| `.claude/commands/sddharness.md` | Slash command no Claude Code |
| `.claude/agents/*.md` | Definições dos agentes (Claude Code) |

### Pré-requisitos no projeto alvo

1. Preencha `docs/architecture.md`, `docs/conventions.md` e
   `docs/verification.md` com a realidade da stack.
2. Opcional: defina o comando de verificação em
   `.sddharness/config.json` → `"verifyCmd": "npm test"` (ou
   `HARNESS_VERIFY_CMD` no ambiente). O `init.sh` também tenta detectar
   `dotnet test`, `npm test`, `pnpm test`, `bun test`, `pytest`.
3. Para import Jira: autentique o MCP Atlassian no Cursor.

## Executar o fluxo

No Cursor ou Claude Code, na raiz do **projeto alvo**:

### 1. Importar do Jira

```
/sddharness jira PROJ-123
```

Lê a issue ou o épico (filhos viram features), gera/atualiza
`feature_list.json` com merge por `jira_key`, e sugere:

> Quer começar com a feature-01?

### 2. (Opcional) Definir modelo por agente

```
/sddharness config implementer model claude-opus-4
```

Agentes válidos: `leader`, `spec_author`, `implementer`, `reviewer`,
`jira_importer`.

### 3. Spec da feature

```
/sddharness execute feature-01
```

Se estiver `pending`, o `spec_author` escreve
`specs/feature-01/{requirements,design,tasks}.md`, marca `spec_ready` e
**para**. O leader pede:

> Analise a feature-01 e se estiver ok pode rodar `/sddharness approve feature-01`

### 4. Aprovar e implementar

```
/sddharness approve feature-01
```

Transiciona para `in_progress`, lança `implementer` → `reviewer`. Se
APPROVED, marca `done` e sugere a próxima feature.

## Fluxo SDD

```
pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress → [implementer → reviewer] → done
```

| Estado | Significado |
|--------|-------------|
| `pending` | Sem spec |
| `spec_ready` | Spec pronto; aguarda `/sddharness approve` |
| `in_progress` | Implementação em andamento (máx. 1) |
| `done` | Verificação verde + review aprovado |
| `blocked` | Travado (motivo em `progress/current.md`) |

## Agentes

| Agente | Papel |
|--------|--------|
| `leader` | Orquestra; não escreve código de aplicação |
| `spec_author` | Redige requirements (EARS), design e tasks |
| `implementer` | Implementa UMA feature a partir do spec |
| `reviewer` | Aprova/rejeita (rastreabilidade + checkpoints) |
| `jira_importer` | Converte issue/épico Jira em `feature_list.json` |

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

Schema formal: [`schema/feature_list.schema.json`](schema/feature_list.schema.json).
Nomes usam zero-pad: `feature-01`, `feature-02`, …

## Config de modelos

`.sddharness/config.json`:

```json
{
  "agents": {
    "leader": { "model": "inherit" },
    "spec_author": { "model": "inherit" },
    "implementer": { "model": "inherit" },
    "reviewer": { "model": "inherit" },
    "jira_importer": { "model": "inherit" }
  },
  "verifyCmd": "npm test"
}
```

`inherit` = modelo da sessão. `verifyCmd` é opcional.

## Validação

No projeto alvo:

```bash
./init.sh
# ou, a partir deste kit:
./bin/sddharness validate /caminho/do-seu-projeto
```

## Cursor vs Claude Code

| | Cursor | Claude Code |
|--|--------|-------------|
| Comando | `.cursor/commands/sddharness.md` | `.claude/commands/sddharness.md` |
| Agentes | `.cursor/agents/` | `.claude/agents/` |
| Entry | `AGENTS.md` | `CLAUDE.md` + `AGENTS.md` |

A UX do slash command `/sddharness …` é a mesma nas duas plataformas.
Os prompts canônicos ficam em `template/agents/`; o install copia os
wrappers já gerados.

## Desenvolvimento deste kit

```bash
npm test
./install.sh /tmp/sddharness-demo
./bin/sddharness validate /tmp/sddharness-demo
```

## Licença / uso

Uso interno / time. Ajuste os stubs de `docs/` em cada projeto antes de
rodar o fluxo SDD de verdade.
