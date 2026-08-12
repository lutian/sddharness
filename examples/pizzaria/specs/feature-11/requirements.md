# Requirements — feature-11: Sistema de Design — Tema Claro/Escuro e Componentes Base

> EARS estrito. Cada `R<n>` é verificável por um teste concreto em
> `tests/design-system.test.js`, rodando em ambiente `jsdom` com
> `@testing-library/react`, sem nenhuma comparação visual/pixel (ver
> `design.md`). Mapeamento aos 4 `acceptance` originais de
> `feature_list.json` ao final do documento.

## R1
O sistema DEVE definir, em `src/ui/styles/tokens.css`, as custom
properties CSS (`--background`, `--foreground`, `--card`, `--primary`,
`--secondary`, `--muted`, `--accent`, `--border`, `--radius`,
`--gradient-primary`, `--gradient-hero`, `--gradient-card`,
`--gradient-button`, `--shadow-glow`, `--shadow-card`) para os blocos
`:root`, `.light` e `.dark`, com os mesmos valores literais (HSL,
gradientes, sombras, `radius`) já definidos em `docs/styles.css`, sem
inventar, arredondar ou substituir nenhum valor.

## R2
O sistema DEVE expor um componente `ThemeProvider` em
`src/ui/theme/ThemeProvider.jsx` que aplica, no elemento raiz
(`document.documentElement`), exatamente uma das classes `"light"` ou
`"dark"`, correspondente ao tema atual mantido em seu estado interno.

## R3
QUANDO `ThemeProvider` é montado e não existe nenhuma preferência salva
em `localStorage` sob a chave `"pizzaria-theme"`, o sistema DEVE aplicar
o tema `"dark"` como padrão ao elemento raiz.

## R4
QUANDO `ThemeProvider` é montado e existe uma preferência salva em
`localStorage["pizzaria-theme"]` com valor `"light"` ou `"dark"`, o
sistema DEVE aplicar exatamente essa preferência salva ao elemento raiz,
ignorando o tema padrão.

## R5
QUANDO a função `toggleTheme()` (obtida via `useTheme()`) é chamada, o
sistema DEVE alternar o tema atual entre `"light"` e `"dark"`, aplicar a
classe correspondente ao novo tema no elemento raiz e persistir o novo
valor em `localStorage["pizzaria-theme"]`.

## R6
QUANDO o componente `ThemeToggle` (`src/ui/components/ThemeToggle.jsx`)
recebe um evento de clique, o sistema DEVE invocar `toggleTheme()` do
contexto de tema exatamente uma vez por clique.

## R7
O sistema DEVE expor um componente `Card` em
`src/ui/components/Card.jsx` que renderiza seus `children` dentro de um
elemento cuja classe base é `"glass-card"` (definida a partir dos tokens
de `tokens.css`) e que, quando recebe uma prop `className`, DEVE compor
essa classe adicional junto da classe base, sem substituí-la.

## R8
O sistema DEVE expor um componente `Badge` em
`src/ui/components/Badge.jsx` que aceita uma prop `variant` com um dos
valores `"default"`, `"success"`, `"warning"` ou `"danger"` e renderiza
`children` com a classe CSS correspondente a essa variante, derivada dos
tokens de cor de `tokens.css`.

## R9
O sistema DEVE expor um componente `Button` em
`src/ui/components/Button.jsx` que aceita uma prop `variant` com um dos
valores `"primary"`, `"secondary"` ou `"ghost"`, e DEVE repassar as
props `onClick`, `disabled` e `type` recebidas para o elemento
`<button>` subjacente sem alterá-las.

## R10
O sistema DEVE expor um componente `Navbar` em
`src/ui/components/Navbar.jsx` que renderiza um elemento `<nav>`
contendo integralmente os `children` recebidos, sem descartar ou
reordenar nenhum deles.

## R11
O sistema DEVE exportar `ThemeProvider`, `useTheme`, `Card`, `Badge`,
`Button`, `Navbar` e `ThemeToggle` a partir de um único arquivo de porta
de entrada, `src/ui/index.js`, seguindo o mesmo padrão de superfície
pública única já usado em `src/db/index.js` e demais domínios.

## R12
O sistema DEVE configurar `vitest.config.js` para executar
`tests/design-system.test.js` (e qualquer futuro arquivo que corresponda
ao padrão `tests/*-ui.test.js`) em ambiente `jsdom`, mantendo todos os
demais arquivos de teste já existentes (`tests/*.test.js` das features
1 a 10) em ambiente `node`, sem alterar o resultado desses testes já
existentes.

## R13
SE `useTheme()` for chamado por um componente que não está descendente
de `ThemeProvider` ENTÃO o sistema DEVE lançar um erro explícito (`Error`
com mensagem indicando o uso incorreto), e NÃO DEVE retornar um contexto
de tema parcial ou `undefined` silenciosamente.

---

## Cobertura dos acceptance criteria originais

| Acceptance original (feature_list.json)                                                                                         | Coberto por                                  |
|-------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------|
| Os tokens de cor, tipografia e espaçamento usados pelos componentes React vêm de docs/styles.css, sem paleta nova inventada.        | R1                                                |
| O alternador de tema claro/escuro funciona e persiste a preferência do usuário.                                                     | R2, R3, R4, R5, R6, R13                           |
| Componentes base (Card, Badge, Button, Navbar, ThemeToggle) são reutilizáveis pelas features 12 e 13 sem duplicação de estilo.       | R7, R8, R9, R10, R11                              |
| tests/design-system.test.js valida a lógica de alternância de tema e a composição dos componentes base (não teste visual/pixel).    | R12 (ambiente) + R2–R11, R13 (implementação de teste) |
