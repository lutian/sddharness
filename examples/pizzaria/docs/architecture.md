# Arquitetura — O que significa "fazer um bom trabalho"

> Este documento define o padrão de qualidade. Os agentes revisores
> avaliam o código contra este arquivo. Se não está aqui, não é um
> requisito.

## Stack

- **Runtime:** Node.js 20+ (verificado neste ambiente: v24), ESM
  (`"type": "module"`).
- **Shell desktop:** Electron. O processo `main` (Node nativo) contém todo
  o backend — SQLite, WhatsApp, IA, geocodificação. Não há sidecars nem
  binários externos embutidos (descartou-se Tauri: seu core em Rust
  obrigaria um sidecar Node para o backend já escrito em JS, duplicando o
  runtime e complicando o IPC sem necessidade).
- **UI:** React, como *renderer process* do Electron (painel KDS,
  feature-7).
- **Testes:** Vitest (ver `docs/verification.md`).

## Princípios

1. **Camadas por domínio, não por tipo de arquivo.** `src/` é organizado
   em um diretório por domínio de negócio, cada um com um `index.js` como
   única superfície pública; o restante dos arquivos do diretório é
   interno e não é importado de fora:

   ```
   electron/main.js   ─ inicialização do app, janela, registro de canais IPC
   src/db/            ─ persistência SQLite (clientes, sessões, pedidos)
   src/menu/          ─ cardápio (JSON) e configuração global (API keys, prompt)
   src/whatsapp/      ─ cliente WhatsApp Web + fila FIFO de mensagens
   src/ai/            ─ orquestração OpenAI/DeepSeek, Whisper, visão
   src/delivery/      ─ geocodificação Nominatim + cálculo de tempo de espera
   src/ui/             ─ painel React (KDS), renderer process
   ```

   Não introduza um domínio novo até que exista uma feature concreta em
   `feature_list.json` que o exija.

2. **Sem IO no renderer.** `src/ui/` (processo renderer) nunca acessa
   disco nem rede diretamente. Fala exclusivamente por IPC
   (`ipcRenderer.invoke`) contra handlers registrados em
   `electron/main.js`.

3. **Dependências externas permitidas, porém justificadas.** Diferente de
   um projeto stdlib-only, aqui pacotes npm são permitidos (SQLite,
   WhatsApp, HTTP). Toda dependência nova é declarada no `design.md` da
   feature que a introduz, junto com a alternativa descartada e o porquê.
   Não se adiciona uma dependência "por via das dúvidas".

4. **Erros explícitos.** Funções que podem falhar (cliente não existe,
   arquivo de cardápio corrompido, resposta de API inválida) lançam
   classes de erro nomeadas por domínio (`DatabaseError`, `MenuError`,
   `WhatsAppError`, …), nunca retornam `null`/`undefined` silenciosamente.

5. **Segredos fora da árvore de fontes.** As API keys (OpenAI, DeepSeek)
   são guardadas no armazenamento de configuração do usuário
   (`app.getPath("userData")`), nunca hardcoded nem em fixtures de teste.
   Os testes usam valores fictícios injetados por variável de ambiente ou
   configuração temporária.

6. **Atomicidade em disco onde se aplica.** Escritas em arquivos de
   configuração ou cardápio em disco (não SQLite, que já é transacional)
   são feitas em um arquivo temporário + `fs.rename()`. Nunca deixe um
   arquivo pela metade.

## Fluxo de dados

```
WhatsApp Web  ─→  src/whatsapp (fila FIFO)
                      │
                      ├─→  src/ai (OpenAI/DeepSeek, Whisper, visão)
                      │        │
                      │        └─→  src/menu (cardápio, config)
                      │
                      └─→  src/db (SQLite: clientes, sessões, pedidos)
                                │
                                └─→  src/delivery (Nominatim, tempo de espera)
                                          │
electron/main.js  ←── IPC ──→  src/ui (painel React / KDS)
```

## O que NÃO fazer

- Não use `console.log` para erros. Propague a exceção ou reporte-a pelo
  canal IPC de erro; o processo que a origina decide como exibi-la.
- Não misture IO com lógica de domínio dentro de um mesmo módulo interno
  — o `index.js` de cada domínio orquestra, os detalhes de IO ficam em
  arquivos separados dentro do mesmo diretório.
- Não leia/escreva SQLite ou arquivos de configuração a cada iteração de
  um loop. Carregue no início, modifique em memória/transação, salve no
  final.
- Não adicione um framework de estado global (Redux, etc.) em `src/ui/`
  até que uma feature o justifique explicitamente no seu `design.md`.
- Não chame APIs externas reais (OpenAI, Nominatim, WhatsApp) a partir de
  testes — ver `docs/verification.md`.
