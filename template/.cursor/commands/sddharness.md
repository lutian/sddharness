---
description: Arnês SDD — jira | config | execute | approve
---

# /sddharness

Comando unificado do mini-arnês Spec Driven Development.

## Uso

```
/sddharness jira <KEY>
/sddharness config <agente> model <modelo>
/sddharness execute <feature-XX>
/sddharness approve <feature-XX>
```

`$ARGUMENTS` contém o restante da linha após `/sddharness`.

## Roteamento

Parse `$ARGUMENTS` e execute **exatamente um** dos fluxos abaixo.

### 1. `jira <KEY>`

1. Atue como (ou lance) o agente `jira_importer`.
2. Use o MCP Atlassian para ler a issue/épico `<KEY>`.
3. Gere ou atualize `feature_list.json` (merge por `jira_key`).
4. Valide com `node scripts/validate-features.mjs`.
5. Ao terminar, pergunte ao humano:
   > "Quer começar com a feature-01?"
   > Se sim → `/sddharness execute feature-01`
   (use a menor feature `pending` se não for `feature-01`).

### 2. `config <agente> model <modelo>`

Agentes válidos: `leader`, `spec_author`, `implementer`, `reviewer`, `jira_importer`.

1. Leia `.sddharness/config.json` (crie se não existir a partir do template).
2. Defina `agents.<agente>.model` = `<modelo>`.
3. Grave o arquivo e confirme em uma linha:
   `config -> <agente> = <modelo>`

Não altere outros agentes.

### 3. `execute <feature-XX>`

1. Atue como o agente `leader` (leia `.claude/agents/leader.md` ou
   `.cursor/agents/leader.md` e `.sddharness/config.json`).
2. Localize a feature com `name == <feature-XX>` em `feature_list.json`.
3. Siga o protocolo `execute` do leader:
   - `pending` → lance `spec_author` → pare em `spec_ready` e diga:
     > "Analise a `<feature-XX>` e se estiver ok pode rodar `/sddharness approve <feature-XX>`."
   - `spec_ready` → apenas lembre o approve (não implemente).
   - `in_progress` → pergunte se retoma.
   - `done` / `blocked` → informe o estado; não avance sozinho.

### 4. `approve <feature-XX>`

1. Atue como o agente `leader`.
2. Exija `status == spec_ready`.
3. Transicione para `in_progress`, lance `implementer` e depois `reviewer`.
4. Se APPROVED, feche a feature (`done`) via segunda invocação do implementer.
5. Sugira a próxima:
   > "Quer começar com a `<próxima>`?" → `/sddharness execute <próxima>`

## Regras

- Uma feature por vez.
- Nunca pule o portão humano entre `spec_ready` e `in_progress`.
- Resultados de subagentes vivem em disco (`specs/`, `progress/`); o chat
  só carrega referências.
- Idioma: português do Brasil.
- Se `$ARGUMENTS` for inválido ou vazio, mostre o uso acima e pare.
