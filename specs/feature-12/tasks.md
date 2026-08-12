# Tasks — feature-12: Interface React — Painel de Configuração

- [x] T1 — Criar `src/ui/panels/config/localDataClient.js` com a
      implementação padrão de `dataClient`: `loadCardapio()`,
      `loadConfig()` e `saveConfig(config)`, cada um retornando uma
      `Promise` que envolve, respectivamente, `loadCardapio`,
      `loadConfig` e `saveConfig` de `src/menu/index.js` (caminhos de
      `cardapio.json`/`config.json` recebidos como parâmetros da fábrica
      do cliente, não hardcoded).
      Cobre: R14 (implementação de referência do contrato).

- [x] T2 — Criar `src/ui/panels/config/CardapioEditor.jsx` com o
      componente `CardapioEditor({ cardapio, onChange })`: renderiza cada
      categoria e seus itens (nome, preço) a partir da prop `cardapio`;
      ao editar um campo de nome ou preço, chama `onChange` com uma nova
      cópia imutável do cardápio refletindo apenas o item alterado.
      Cobre: R2, R3.

- [x] T3 — Adicionar validação client-side de preço em
      `CardapioEditor.jsx`: quando o valor digitado no campo de preço não
      for convertível para número finito, exibir uma mensagem de erro
      associada ao campo e marcar o item como inválido no estado
      derivado do componente (sem incluí-lo em nenhum payload de
      salvamento futuro).
      Cobre: R4.

- [x] T4 — Criar `src/ui/panels/config/ConfigForm.jsx` com o componente
      `ConfigForm({ config, onChange, onSave, saving, error, saved })`:
      renderiza campos para `apiKeys.openai`, `apiKeys.deepseek`,
      `systemPrompt`, switches para `audioEnabled`/`imageEnabled` e um
      seletor para `modeloSelecionado` (`"openai"`/`"deepseek"`); cada
      edição de campo chama `onChange` com o novo objeto `config`
      atualizado.
      Cobre: R5, R6, R7, R8.

- [x] T5 — Em `ConfigForm.jsx`, adicionar um `Button` (de
      `src/ui/index.js`, `variant="primary"`) que, ao clicar, chama
      `onSave()`; desabilitar o botão quando `saving` for verdadeiro;
      exibir um `Badge` (`variant="success"`) quando `saved` for
      verdadeiro e um `Badge` (`variant="danger"`) com a mensagem de
      `error` quando presente.
      Cobre: R9, R10, R11.

- [x] T6 — Criar `src/ui/panels/config/ConfigPanel.jsx` com o componente
      `ConfigPanel({ dataClient })`: em um `useEffect` na montagem, chama
      `dataClient.loadCardapio()` e `dataClient.loadConfig()` (uma vez
      cada) e guarda os resultados em estado local; renderiza
      `CardapioEditor` e `ConfigForm` dentro de `Card`s de
      `src/ui/index.js`, com um `Navbar` contendo um `ThemeToggle` no
      topo do painel.
      Cobre: R1, R12, R13.

- [x] T7 — Em `ConfigPanel.jsx`, implementar o handler de salvar
      configuração: ao ser acionado a partir de `ConfigForm`, define
      `saving = true`, chama
      `dataClient.saveConfig({ apiKeys, systemPrompt, audioEnabled,
      imageEnabled, modeloSelecionado })` com os valores atuais do
      estado de configuração; em caso de sucesso, define `saved = true` e
      `error = null`; em caso de rejeição, captura o erro (sem propagar
      exceção não tratada), define `error = <mensagem>` e `saved =
      false`; em ambos os casos, define `saving = false` ao final.
      Cobre: R9, R10, R11.

- [x] T8 — Criar `src/ui/panels/config/index.js` reexportando apenas
      `ConfigPanel` como porta pública deste subdomínio, seguindo o
      padrão de `index.js` único já usado em `src/ui/index.js` e nos
      domínios de `src/`.
      Cobre: R14 (contrato de composição), consistência estrutural.

- [x] T9 — Criar `tests/config-panel-ui.test.js` (Vitest +
      `@testing-library/react`, com `import "@testing-library/jest-dom"`
      no topo) contendo, no mínimo, os seguintes casos, todos com um
      `dataClient` fake (`vi.fn()` por método) injetado via prop —
      nenhum acesso a filesystem real:
      - Montar `ConfigPanel` com `dataClient.loadCardapio` e
        `dataClient.loadConfig` resolvidos e verificar que ambos foram
        chamados exatamente uma vez e que os dados retornados aparecem
        na tela.
        Cobre: R1, R2, R5.
      - Editar o campo de nome e o campo de preço de um item do cardápio
        exibido e verificar que o novo valor aparece no campo,
        permanecendo os demais itens/categorias inalterados.
        Cobre: R3.
      - Digitar um valor não numérico no campo de preço de um item e
        verificar que uma mensagem de erro de validação aparece
        associada a esse campo.
        Cobre: R4.
      - Editar os campos de chave de API (OpenAI e DeepSeek) e o system
        prompt, e verificar que os novos valores aparecem nos campos.
        Cobre: R6.
      - Alternar os switches de áudio e imagem e verificar que o estado
        visual (`checked`) de cada um inverte.
        Cobre: R7.
      - Selecionar um modelo diferente (`"deepseek"`) no seletor de
        modelo e verificar que a seleção é refletida.
        Cobre: R8.
      - Clicar em salvar e verificar que
        `dataClient.saveConfig` foi chamado exatamente uma vez com um
        objeto contendo os valores atuais de `apiKeys`, `systemPrompt`,
        `audioEnabled`, `imageEnabled` e `modeloSelecionado`.
        Cobre: R9.
      - Configurar `dataClient.saveConfig` para resolver com sucesso,
        clicar em salvar e verificar que uma indicação de sucesso aparece
        e nenhuma mensagem de erro é exibida.
        Cobre: R10.
      - Configurar `dataClient.saveConfig` para rejeitar com uma
        `InvalidConfigError` (importada de `src/menu/errors.js`), clicar
        em salvar e verificar que a mensagem de erro aparece na tela e
        que nenhuma exceção não tratada escapa do teste (o `render`/
        `fireEvent` não lança).
        Cobre: R11.
      - Inspecionar a árvore renderizada e verificar (via `container` ou
        seletores de `testing-library`) que os elementos base usados
        (botão de salvar, indicadores de estado, navbar) correspondem aos
        componentes `Button`/`Badge`/`Navbar`/`Card` de `src/ui/index.js`
        (ex.: via classes CSS derivadas desses componentes, como
        `"btn-primary"`, `"badge-success"`, `"glass-card"`, `"navbar"`).
        Cobre: R12.
      - Renderizar `ConfigPanel` dentro de `ThemeProvider`, clicar no
        `ThemeToggle` do painel e verificar que a classe de tema em
        `document.documentElement` alterna, reaproveitando o
        comportamento validado em `tests/design-system.test.js`.
        Cobre: R13.
      - Verificar que `ConfigPanel` é importável a partir de
        `src/ui/panels/config/index.js` (porta pública) e que aceita
        `dataClient` como prop, sem exigir importação de
        `localDataClient.js` no teste.
        Cobre: R14.
      Cobre: R1–R14 (implementação de teste).

- [x] T10 — Executar `npm test` e `./init.sh`, confirmando que
      `tests/config-panel-ui.test.js` roda em `jsdom` (via o padrão
      `tests/*-ui.test.js` já configurado na feature-11) e que todos os
      testes das features 1–11 continuam passando sem alteração de
      resultado; documentar a tabela de rastreabilidade R1–R14 → nome do
      teste em `progress/impl_feature-12.md` (a cargo do implementer, não
      deste spec).
      Cobre: R1–R14 (verificação final).
