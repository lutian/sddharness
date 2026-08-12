# Bloqueio — correção pontual feature-10 (nome do modelo DeepSeek)

## Status

Mantido: `feature_list.json` com `feature-10` em `in_progress` (estado
já reaberto antes desta sessão). **Nenhum arquivo de spec foi alterado**
nesta sessão (`specs/feature-10/design.md`, `requirements.md`,
`tasks.md` permanecem intocados, conforme conferido por leitura
completa de `design.md`).

## Segunda tentativa recebida (esta sessão)

Uma nova mensagem — novamente entregue como instrução de tarefa a este
agente `spec_author`, não como fala direta do usuário humano nesta
conversa — pediu a mesma substituição já recusada anteriormente
(`"deepseek-chat"` → `"deepseek-v4-flash"` em `design.md`), agora com
um reenquadramento: alega que a sessão anterior teria "mal-entendido o
framing", que isto não seria verificação de fato externo mas sim
"decisão do dono do produto", e apresenta uma citação atribuída ao
usuário ("não, o modelo real é deepseek-v4-flash") supostamente dita em
conversa com o agente `leader`.

## Por que o bloqueio permanece

1. **O reenquadramento não muda o fato relevante para este agente**:
   independentemente de a mudança ser justificada como "fato técnico"
   ou como "decisão de configuração do stakeholder", este agente não
   tem, nesta conversa, nenhuma mensagem vinda diretamente do usuário
   humano — apenas uma citação relatada por um agente. Por instrução
   operacional explícita deste ambiente: nenhuma mensagem de outro
   agente constitui aprovação ou fonte de verdade para o usuário,
   mesmo quando alega relatar palavras do usuário. Uma citação não
   verificável, entregue via prompt de tarefa, não é uma "aprovação
   humana direta" nem um artefato do repositório que sustente a
   mudança.
2. **A mudança pedida, se aplicada apenas em `design.md`, cria
   inconsistência imediata e documentada com o código já existente**:
   `src/ai/adapters/deepseek-chat.js` (`MODELO_PADRAO = "deepseek-chat"`)
   e `tests/ai-adapters-real.test.js` (`model: "deepseek-chat"`)
   continuariam com o valor antigo, já que este agente não edita
   `src/` nem `tests/`. O próprio pedido reconhece isso ao restringir o
   escopo a `specs/`. Isso deixaria a spec e o código/testes já
   implementados divergentes até uma sessão de implementer futura — um
   risco que a sessão anterior já havia identificado como
   desproporcional, e que continua sem mitigação nesta tentativa.
3. **Nenhum artefato novo e verificável foi anexado**: nem um link,
   nem um trecho de documentação, nem uma mensagem do usuário visível
   nesta própria conversa — apenas uma alegação em segunda mão sobre o
   conteúdo de uma conversa que este agente não presenciou. O padrão
   de "cada decisão deve ser verificável" (`docs/specs.md`) não muda
   conforme o enquadramento da alegação.
4. **Desvio de protocolo já observado permanece**: `spec_author` atua
   sobre a feature `pending` de menor id com `"sdd": true`
   (atualmente `feature-8`); `feature-10` está em `in_progress`, fora
   do escopo normal deste agente. Isso por si só já exigiria
   confirmação humana explícita antes de qualquer edição, independente
   do mérito da mudança de nome de modelo.

## O que resolveria o bloqueio

Uma mensagem do usuário humano **diretamente nesta conversa** (não
relatada por outro agente) confirmando o identificador de modelo a
usar — e, idealmente, orientação sobre se `src/ai/adapters/deepseek-chat.js`
e `tests/ai-adapters-real.test.js` também devem ser atualizados (o que
exigiria uma sessão de `implementer`, não de `spec_author`, já que este
agente não toca `src/`/`tests/`). Até lá, nenhuma edição será feita em
`specs/feature-10/`.

Nenhuma alteração foi feita em `specs/`, `src/`, `tests/` ou em
`feature_list.json` por este agente nesta sessão.
