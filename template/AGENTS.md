# AGENTS.md — Mapa de navegação para agentes de IA

> Este arquivo é o **ponto de entrada** para qualquer agente que trabalhe
> neste repositório. NÃO é uma bíblia de regras: é um **mapa**. Leia só o
> que precisar quando precisar (divulgação progressiva).

---

## 1. Antes de começar (obrigatório)

1. Execute `./init.sh` e verifique que termina sem erros. Se falhar,
   **pare** e resolva o ambiente antes de tocar em código.
2. Leia `progress/current.md` para entender em que estado ficou a última
   sessão.
3. Leia `feature_list.json`. Toda feature nova (`"sdd": true`) passa por
   **Spec Driven Development** — veja `docs/specs.md` e §4 deste arquivo.
4. Leia `docs/specs.md` antes de tocar em qualquer spec ou feature
   `sdd: true`.
5. Leia `.sddharness/config.json` para saber qual modelo usar em cada
   agente.

## 2. Mapa do repositório

| Arquivo / pasta               | O que contém                                                                 | Quando ler |
|--------------------------------|-------------------------------------------------------------------------------|------------|
| `feature_list.json`           | Lista de tarefas com estado (`pending` / `spec_ready` / `in_progress` / `done` / `blocked`) | Sempre, ao começar |
| `progress/current.md`         | Estado da sessão atual                                                        | Sempre, ao começar |
| `progress/history.md`         | Diário append-only de sessões anteriores                                     | Se precisar de contexto histórico |
| `specs/<feature>/`            | `requirements.md` + `design.md` + `tasks.md` (estilo Kiro)                   | Antes de implementar qualquer feature com `"sdd": true` |
| `docs/architecture.md`        | O que significa "fazer um bom trabalho" neste projeto                        | Antes de implementar |
| `docs/conventions.md`         | Regras de estilo, nomes, estrutura                                           | Antes de escrever código |
| `docs/specs.md`                | Processo SDD: notação EARS, os 3 arquivos, portão de aprovação humana        | Antes de redigir ou ler um spec |
| `docs/verification.md`        | Como verificar que seu trabalho funciona                                     | Antes de declarar uma tarefa como `done` |
| `CHECKPOINTS.md`               | Critérios objetivos de "estado final correto"                                | Para se autoavaliar |
| `.sddharness/config.json`     | Modelo preferido por agente                                                  | Antes de lançar subagentes |
| `.claude/agents/` / `.cursor/agents/` | Definições de subagentes (`leader`, `spec_author`, `implementer`, `reviewer`, `jira_importer`) | Se você orquestra trabalho |

## 3. Regras rígidas (não negociáveis)

- **Uma única feature por vez.** Não misture mudanças de várias tarefas na
  mesma sessão.
- **Não declare uma tarefa `done` sem verificação verde.** Execute
  `./init.sh` e garanta que o bloco de verificação passa.
- **Não pule a fase de spec.** Toda feature com `"sdd": true` deve passar
  por `spec_author` e obter aprovação humana antes de tocar em código.
- **Não pule o portão de aprovação humana.** O leader interrompe o fluxo
  em `spec_ready` e espera `/sddharness approve <feature>`.
- **Documente o que você faz** em `progress/current.md` enquanto trabalha,
  não no final.
- **Deixe o repositório limpo** antes de encerrar a sessão (ver §5).
- **Se não souber algo, procure em `docs/`** antes de inventar.

## 4. Fluxo de trabalho (SDD)

```
pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress → [implementer → reviewer] → done
```

Comando típico:

1. `/sddharness jira PROJ-123` — gera/atualiza `feature_list.json`.
2. `/sddharness execute feature-01` — spec → `spec_ready`.
3. Humano revisa `specs/feature-01/`.
4. `/sddharness approve feature-01` — implementa + review → `done`.

## 5. Encerramento de sessão (lifecycle)

Antes de terminar:

1. Execute `./init.sh` — tudo verde.
2. Se a tarefa estiver acabada: marque `status: "done"` em
   `feature_list.json` (via fluxo do implementer após APPROVED).
3. Mova o resumo de `progress/current.md` para o final de
   `progress/history.md`.
4. Esvazie `progress/current.md` deixando só o modelo.
5. Não deixe arquivos temporários nem TODOs sem contexto.

## 6. Se você travar

- Releia a seção relevante de `docs/`.
- Se a ferramenta não fizer o que você espera, **não invente um
  workaround**: documente o bloqueio em `progress/current.md` e pare a
  sessão.
