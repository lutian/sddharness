# Requirements — feature-3: Conexão WhatsApp e Fila de Mensagens Sequencial

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/whatsapp-queue.test.js`. Mapeamento aos 4 `acceptance` originais
> de `feature_list.json` ao final do documento.

## R1
O sistema DEVE expor uma função pública `createWhatsAppClient(adapter)`
que recebe um adaptador de cliente WhatsApp (`adapter`) e retorna um
objeto de cliente WhatsApp (`WhatsAppClient`) que orquestra autenticação,
fila de mensagens e persistência de sessão, sem acoplar-se a nenhuma
biblioteca concreta de automação do WhatsApp Web.

## R2
QUANDO o `adapter` injetado emite um evento de QR Code (ex.: `"qr"`) com
uma string de QR Code, o `WhatsAppClient` DEVE repassar essa string para
quem assinar o evento público `"qr"` do cliente, de modo que a aplicação
desktop possa exibi-la sem tocar diretamente no adaptador.

## R3
SE o `adapter` injetado emitir um evento de falha de autenticação (ex.:
`"auth_failure"`) ENTÃO o `WhatsAppClient` DEVE lançar `WhatsAppError`
(subtipo `AuthenticationError`) para quem assinar o evento público de
erro, sem encerrar o processo do `WhatsAppClient`.

## R4
O sistema DEVE expor uma fila de mensagens (`MessageQueue`) com um método
público de enfileiramento (`enqueue(mensagem)`) que aceita mensagens
recebidas e as adiciona ao final da fila, preservando a ordem de chegada
(FIFO).

## R5
ENQUANTO houver mais de uma mensagem na `MessageQueue`, o sistema DEVE
processar as mensagens estritamente uma de cada vez, na ordem em que
foram enfileiradas (FIFO), NÃO DEVE iniciar o processamento de uma nova
mensagem antes que o processamento da mensagem anterior termine.

## R6
QUANDO a `MessageQueue` processa uma mensagem, o sistema DEVE aguardar um
delay configurável (delay humanizado) antes de invocar o processamento
da mensagem seguinte da fila, respeitando um intervalo mínimo e máximo
configuráveis (`minDelayMs`, `maxDelayMs`).

## R7
QUANDO o processamento de uma mensagem na `MessageQueue` lança uma
exceção, o sistema DEVE capturar essa exceção, reportá-la através de um
evento público de erro (`"error"`), e DEVE continuar processando as
mensagens seguintes da fila (uma falha em uma mensagem não interrompe o
processamento das demais).

## R8
QUANDO uma mensagem recebida referencia um `clienteId` que já possui uma
sessão salva na tabela `sessoes` do banco de dados, o sistema DEVE
recuperar essa sessão (`historico`) antes de processar a mensagem, de
modo que o processamento tenha acesso ao contexto da conversa anterior
desse cliente.

## R9
QUANDO uma mensagem recebida referencia um `clienteId` que ainda NÃO
possui sessão salva na tabela `sessoes` do banco de dados, o sistema
DEVE tratar essa ausência como um histórico vazio (não DEVE lançar
exceção nem reutilizar o histórico de outro `clienteId`).

## R10
O sistema DEVE manter o histórico de conversa isolado por `clienteId`:
processar uma mensagem de um `clienteId` NÃO DEVE ler nem alterar o
`historico` armazenado em `sessoes` de nenhum outro `clienteId`.

## R11
QUANDO a fila processa mensagens intercaladas de dois ou mais
`clienteId` distintos, o sistema DEVE preservar, para cada `clienteId`,
a ordem relativa de chegada das suas próprias mensagens (FIFO por
cliente dentro da ordem global FIFO da fila).

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                           | Coberto por          |
|--------------------------------------------------------------------------------------------------------------------------------------|------------------------|
| O QR Code de autenticação do WhatsApp é gerado e exibido na aplicação desktop.                                                       | R1, R2, R3             |
| Mensagens recebidas são enfileiradas e processadas estritamente de forma sequencial (uma por vez) com delay humanizado.              | R4, R5, R6, R7         |
| O sistema recupera o histórico da sessão ativa do cliente no banco de dados para manter o contexto da conversa.                      | R8, R9, R10            |
| tests/whatsapp-queue.test.js valida o comportamento da fila FIFO e o isolamento de sessões.                                          | R4, R5, R7, R9, R10, R11 (implementação de teste) |
