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

`$ARGUMENTS` contém o restante da linha após `/sddharness`.

**Nota:** a CLI `./bin/sddharness init <path>` instala o skeleton. Este
slash `/sddharness init` inicia a sessão SDD amigável no projeto alvo.

## Gate de docs (proibitivo)

Antes de `jira`, `write-spec` e `approve`, rode `node scripts/docs-ready.mjs`.
Se falhar, **PARE** e peça `/sddharness filldocs` ou `/sddharness init`.

## Roteamento

Parse `$ARGUMENTS` e execute **exatamente um** dos fluxos abaixo.
Confirmações no chat (`Sim` / `Aprovo`) a perguntas canônicas pendentes
contam como o subcomando correspondente.

### 1. `init`

Orquestrador amigável (atue como `leader`):

1. Rode `./init.sh` (ambiente).
2. Lance `docs_filler` (filldocs).
3. Se `docs_blocked` → mensagem proibitiva; **não** peça Jira.
4. Se `docs_ready` → pergunte: `Insira o id da tarefa do Jira`
5. Com KEY → fluxo `jira`.
6. Após import → pergunte: `Quer que inicie o fluxo com a feature-01?`
7. Se Sim → fluxo `write-spec feature-01`.
8. Em `spec_ready` → `Aprova a feature-01 de "{title}"?`
9. Se Sim/Aprovo → fluxo `approve feature-01`.

### 2. `filldocs`

1. Lance `docs_filler`.
2. `docs_ready` → ok (pode pedir id Jira ou sugerir `init`).
3. `docs_blocked` → bloqueio claro (preenchimento manual obrigatório).

### 3. `jira <KEY>`

1. Exija docs prontos (`docs-ready.mjs`).
2. Lance `jira_importer`.
3. Ao terminar, pergunte:
   > Quer que inicie o fluxo com a feature-01?
   > (Sim → `/sddharness write-spec feature-01`)

### 4. `write-spec <feature-XX>`

1. Exija docs prontos.
2. Atue como `leader`: se `pending` → `spec_author` → `spec_ready` →
   pergunte `Aprova a <feature-XX> de "{title}"?`
3. Se já `spec_ready` → só lembre a approve.
4. Nunca implemente código neste subcomando.

### 5. `approve <feature-XX>`

1. Exija docs prontos e status `spec_ready`.
2. `in_progress` → `implementer` → `reviewer` → `done` se APPROVED.
3. Pergunte se inicia o fluxo da próxima feature.

### 6. `config <agente> model <modelo>`

Agentes válidos: `leader`, `spec_author`, `implementer`, `reviewer`,
`jira_importer`, `docs_filler`.

1. Atualize `.sddharness/config.json` → `agents.<agente>.model`.
2. Confirme: `config -> <agente> = <modelo>`

## Regras

- Uma feature por vez.
- Nunca pule o portão humano entre `spec_ready` e `in_progress`.
- Não existe subcomando `execute` — use `write-spec`.
- Resultados de subagentes vivem em disco; chat só com referências.
- Idioma: português do Brasil.
- Se `$ARGUMENTS` for inválido ou vazio, mostre o uso e pare.
