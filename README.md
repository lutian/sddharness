# pizzaria-whatsapp-delivery-desktop

Aplicativo desktop em Electron/Node.js para automatizar o atendimento de
delivery via WhatsApp Web com IA generativa (OpenAI/DeepSeek), Whisper,
transcrição de imagens, gestão de cardápio via JSON e painel de pedidos
KDS (React). Serve também como exemplo de **Harness Engineering**.

> O importante deste repo não é só **o quê** o app faz, mas **como** o
> arnês está estruturado para que um agente de IA possa trabalhar sobre
> ele de forma autônoma e verificável.

## Como o arnês está organizado

| Pilar                                    | Manifestação neste repo                                                        |
|--------------------------------------------|------------------------------------------------------------------------------------|
| **1. O repositório É o sistema**          | `AGENTS.md`, `init.sh`, `feature_list.json`, `specs/`, `progress/`, `docs/`      |
| **2. Orquestração multi-agente**          | `.claude/agents/leader.md`, `spec_author.md`, `implementer.md`, `reviewer.md`     |
| **3. Spec Driven Development**            | `docs/specs.md`, notação EARS, portão de aprovação humana em `spec_ready`         |
| **4. Supervisão e melhoria**              | `CHECKPOINTS.md`, hooks em `.claude/settings.json`, `tests/`                      |

## Para começar

```bash
./init.sh
```

Se tudo estiver verde, abra `AGENTS.md` e siga a partir dali.

## Para usar o app (humanos)

```bash
npm install
npm run dev      # Electron em modo desenvolvimento
```

## Testar você mesmo com Claude Code

Se você baixar o repo e abrir o Claude Code na raiz, já está dentro do
arnês: `CLAUDE.md` obriga o modelo a atuar como `leader` (orquestra, não
edita código) e `docs/specs.md` impõe o fluxo Spec Driven Development.

Receita rápida:

1. `./init.sh` — deve terminar verde.
2. Abra `feature_list.json` e deixe pelo menos uma feature com
   `status: "pending"` e `"sdd": true`. A #2 `feature-2` já está assim
   (a #1 `feature-1` já passou pelo spec).
3. Lance o Claude Code na raiz do repo: `claude`.
4. Peça: **«implementa a próxima feature pendente»**.

O que acontece, em duas fases:

**Fase 1 — Spec.** O `leader` lança um `spec_author` que escreve
`specs/<feature>/{requirements.md, design.md, tasks.md}` e deixa a
feature em `spec_ready`. Depois **para e pede sua aprovação**.

Você lê os três arquivos no seu editor:

- `requirements.md` — o que a feature deve fazer, em EARS estrito.
- `design.md` — decisões técnicas antes de escrever código.
- `tasks.md` — checklist de passos discretos a executar.

Quando estiver de acordo, diga no chat «aprovado» (ou peça mudanças).

**Fase 2 — Código.** O `leader` transiciona a feature para `in_progress`
e lança `implementer` (segue as tasks uma a uma marcando `[x]`) e depois
`reviewer` (verifica rastreabilidade `R<n>` ↔ teste e todas as tasks
completas).

Onde fica o rastro de cada subagente:

| Arquivo                                    | Quem escreve         | O que contém                                                     |
|-----------------------------------------------|------------------------|----------------------------------------------------------------------|
| `specs/<feature>/requirements.md`             | spec_author            | Requirements EARS numeradas `R1`, `R2`, ...                       |
| `specs/<feature>/design.md`                   | spec_author            | Decisões técnicas + alternativa descartada                        |
| `specs/<feature>/tasks.md`                    | spec_author            | Checklist; o implementer vai marcando `[x]`                       |
| `progress/current.md`                         | leader                 | Plano vivo da sessão                                              |
| `progress/impl_<feature>.md`                  | implementer            | Arquivos tocados + mapa `R<n> → teste` + saída dos testes         |
| `progress/review_<feature>.md`                | reviewer               | Checklist contra `docs/`, `specs/<feature>/` e `CHECKPOINTS.md`    |
| `feature_list.json`                           | leader/implementer     | `pending` → `spec_ready` → `in_progress` → `done`                 |
| `progress/history.md`                         | leader                 | Resumo append-only ao fechar a sessão                              |

Abra `specs/` e `progress/` no seu editor enquanto o Claude trabalha:
cada relatório aparece assim que o subagente termina. Essa é a regra
anti-telefone-sem-fio em ação — o conteúdo não circula pelo chat, vive
em disco e fica versionado.

## Estrutura

```
.
├── AGENTS.md              # Mapa para agentes (divulgação progressiva)
├── CHECKPOINTS.md         # Critérios de "estado final correto"
├── feature_list.json      # Escopo: uma feature por vez
├── init.sh                # Verificação e inicialização
├── specs/<feature>/       # Spec por feature (estilo Kiro)
│   ├── requirements.md    # Notação EARS
│   ├── design.md          # Decisões técnicas
│   └── tasks.md           # Checklist de implementação
├── progress/
│   ├── current.md         # Sessão ativa (estado vivo)
│   └── history.md         # Diário append-only
├── docs/
│   ├── architecture.md    # O que significa "bom trabalho"
│   ├── conventions.md     # Estilo, nomes, erros
│   ├── specs.md           # Processo SDD: EARS, 3 arquivos, aprovação humana
│   └── verification.md    # Como demonstrar que funciona
├── .claude/
│   ├── agents/            # leader, spec_author, implementer, reviewer
│   └── settings.json      # Hooks que automatizam a verificação
├── electron/
│   └── main.js             # Processo main: inicialização, janela, IPC
├── src/
│   ├── db/                 # Persistência SQLite
│   ├── menu/                # Cardápio e configuração global
│   ├── whatsapp/            # Cliente WhatsApp Web + fila FIFO
│   ├── ai/                  # Orquestração OpenAI/DeepSeek, Whisper, visão
│   ├── delivery/            # Geocodificação Nominatim + tempo de espera
│   └── ui/                  # Painel React (KDS), renderer process
└── tests/
    └── *.test.js            # Um arquivo por domínio (Vitest)
```

## Aprendizados que este projeto ilustra

- **Divulgação progressiva** em `AGENTS.md`: o agente não recebe todas as
  regras de uma vez, recebe um mapa para buscá-las sob demanda.
- **Uma feature por vez** validado por `init.sh` (rejeita mais de um
  `in_progress` em `feature_list.json`).
- **Spec Driven Development** estilo Kiro: requirements (EARS) → design
  → tasks → code, com um portão de aprovação humana antes de tocar em
  código.
- **Estado em disco**, não no chat: `specs/`, `progress/current.md` e
  `history.md` sobrevivem a reinícios e context windows estouradas.
- **Verificação executável**: `init.sh` roda os testes reais e valida a
  presença de specs para toda feature SDD.
- **Rastreabilidade obrigatória**: cada `R<n>` é mapeado a um teste
  concreto; o reviewer rejeita se faltar.
- **Padrão Leader-Spec-Implementer-Reviewer**: o leader não implementa,
  o spec_author não codifica, o implementer não se autoaprova, o
  reviewer não edita código.
- **Anti telefone-sem-fio**: os subagentes escrevem seus resultados em
  arquivos e só devolvem uma referência leve.
