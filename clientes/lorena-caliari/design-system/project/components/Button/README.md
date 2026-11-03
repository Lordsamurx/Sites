# Button

Botão pílula com seta diagonal: toda ação do site tem esta forma.

## Variantes
- **solid** (`lc-btn lc-btn--solid`): fundo `accent` (gold), texto `on-accent` (brown). A ação principal, uma por seção: "Agendar avaliação". No hover inverte para fundo `brown` e texto `gold`.
- **outline** (`lc-btn--outline`): borda `accent`, texto `text-strong`. Ação secundária. No hover preenche de dourado.
- **on-dark** (`lc-btn--on-dark`): outline com texto `cream`, para painéis marrons.
- **sm** (`lc-btn--sm`): 44px, largura mínima 233px, seta à direita. Tamanho automático abaixo de 900px.
- **block** (`lc-btn--block`): largura total, 56px, sem seta, no mobile (ex.: "Falar no WhatsApp" fixo ao pé do hero).

## Anatomia
`<a class="lc-btn lc-btn--solid" href="…"><span>Agendar avaliação</span><svg class="lc-btn__icon">…</svg></a>`. O rótulo vem em caixa normal no HTML; a classe aplica CAIXA ALTA (`button`: 13px, 500, 2.4px).

## Regras
- Rótulo de 1 a 3 palavras, verbo primeiro: "Agendar avaliação", "Ver tratamentos", "Falar no WhatsApp".
- A seta gira 45° com `--ease-spring`; parada com movimento reduzido.
- Foco: anel de 2px em `focus-ring`, afastado 3px.
- Nunca texto dourado `gold` sobre cream (2,2:1).

## O que o consumidor fornece
O `href` (WhatsApp com mensagem pronta, agenda), o rótulo e, se for `<button>`, o `type`.
