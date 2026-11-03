# Lorena Caliari

Sistema de design do site da **Lorena Caliari Estética Avançada**: luxo silencioso, sofisticação, público de alto ticket e beleza natural.

> **Origem.** Cores, fontes e tom vêm do briefing de identidade (logo monograma LC com silhueta feminina, em dourado sobre areia). A estrutura (escala de espaços, raios, ritmo de painéis quadrados, botão pílula com seta, vidro, notificação animada, faixa em movimento) foi tirada da home da zen.com (2026). Nenhum logo, foto ou texto da zen.com foi copiado.

## Princípios

1. **Calma antes de tudo.** Muito respiro, serifa leve, cores de pele e areia. Nada grita; o dourado sussurra.
2. **O dourado é joia, não tinta.** `gold` vai no botão principal, nos ornamentos e numa palavra do título. Se tudo brilha, nada é especial.
3. **Profundidade por superfície.** Cartões brancos sobre `cream`, seções em `beige-light`, um painel marrom como ponto alto. Sombra só nos três casos do token `shadow`.
4. **Toda ação é uma pílula.** Botões com `radius-pill` e seta fina que gira no hover.
5. **Movimento macio.** Entradas com leve salto, zoom lento nas fotos, faixa que desliza. Tudo para com `prefers-reduced-motion`.

## Voz e conteúdo

- **Tom:** elegante, acolhedor, inteligente, com uma pitada de humor. Educa sem jargão e nunca promete milagre.
- **Exemplo da marca:** "O colágeno tem um currículo, você só não tinha lido ainda."
- **Títulos de painel:** 3 a 7 palavras, CAIXA ALTA, uma palavra em itálico dourado: "ESTÉTICA QUE *RESPEITA* QUEM VOCÊ É".
- **Nome do tratamento (cartão):** caixa normal, como se escreve: "Bioestimuladores", "Skinbooster".
- **Corpo:** uma ou duas frases, falando de resultado natural, sensação e segurança.
- **Botões:** verbo primeiro: "Agendar avaliação", "Falar no WhatsApp", "Ver tratamentos".
- **Evite:** "milagroso", "rejuvenescer 10 anos", antes e depois sensacionalista, exclamações, emoji, preço em destaque.

## Cor

| Papel | Token | Valor | Uso |
|---|---|---|---|
| Fundo de página | `bg-page` | `cream` #FFFBF7 | Off White da marca |
| Cartões | `bg-surface` | `white` | Sobre cream |
| Seções alternadas | `bg-tint` | `beige-light` #F4EBE0 | Ritmo entre seções |
| Base areia | `beige` | #EADBC8 | Degradê areia, divisórias, fundo de foto |
| Painel de impacto | `bg-inverse` | `brown` #2B1E16 | Um ou dois por página |
| Títulos e texto | `text-strong` / `text-body` | `brown` | 15,7:1 em cream |
| Texto de apoio | `text-secondary` | `cocoa` #5C4A3D | 8,2:1 |
| Legendas | `text-muted` | `taupe` #6B5A4E | 6,4:1 |
| Ação principal | `accent` / `on-accent` | `gold` #C9A86A / `brown` | 7,2:1 |
| Hover dourado | `accent-hover` | `gold-dark` #B8935A | Com texto brown, 5,7:1 |
| Dourado como texto | `accent-text` | `gold-ink` #7D5F33 | 5,7:1 em cream |

**Regras de uso**
- `gold` (#C9A86A) e `gold-dark` **não são cor de texto** sobre cream (2,2:1 e 2,8:1). Para overlines, links e a palavra em destaque, use `accent-text` (`gold-ink`).
- Sobre o marrom, o `gold` funciona como texto (7,2:1).
- O degradê areia do logo é `--sand-gradient`: `beige` → `beige-light` → `cream`, a 135°. Fundo do hero e das mídias.
- Adições à paleta do briefing, só para garantir leitura: `gold-ink`, `beige-light`, `cocoa`, `taupe`, `sand` e `brown-deep`.

## Tipografia

| Estilo | Família | Tamanho / entrelinha | Peso | Uso |
|---|---|---|---|---|
| `display-hero` | Cormorant Garamond | 72 / 0.95 | 300 | Título do hero, caixa normal (42 no mobile) |
| `display-panel` | Cormorant Garamond | 44 / 46 | 400 | Título de painel, CAIXA ALTA (30 no mobile) |
| `display-card` | Cormorant Garamond | 34 / 36 | 400 | Nome do tratamento, caixa normal |
| `display-quote` | Cormorant Garamond | 22 / 28 | 400 itálico | Frase de efeito, depoimento |
| `lead` | Manrope | 18 / 28 | 300 | Subtítulo |
| `body` | Manrope | 16 / 24 | 400 | Texto corrido (13 no mobile) |
| `overline` | Manrope | 12 / 16 | 500, +3px | Rótulo, CAIXA ALTA |
| `button` | Manrope | 13 / 13 | 500, +2.4px | Botão, CAIXA ALTA |

- Títulos com espaçamento de letra de -1%, como pede o briefing.
- Rótulos e botões em caixa alta com 3px (botão 2.4px para caber).
- A palavra em destaque é **itálica** e **dourada** (`lc-hl`): é o gesto tipográfico da marca.
- Canela Text e Sora (alternativas do briefing) são pagas ou menos disponíveis; Cormorant Garamond e Manrope são do Google Fonts (licença OFL).

## Espaço e layout

Escala da referência, base de **4px** (`space-1` a `space-20`). Conteúdo em `layout-container` (1204px); painéis grandes são quadrados de `layout-panel` (602px). Abaixo de 900px: coluna única, margem `layout-gutter` (30px), raios de `radius-xl` para `radius-lg`, títulos de 44 para 30px, botões de 58 para 44px.

## Forma e elevação

- `radius-pill` em botões e pílulas; `radius-md` (12px) em cartões e notificações; `radius-xl` (24px) em painéis; `radius-2xl` (32px) no topo do rodapé.
- Sombras tingidas de marrom: `shadow-lift`, `shadow-nav`, `shadow-halo` (halo dourado do monograma).
- Vidro (`lc-glass`, `lc-toast`): fundo translúcido com desfoque e borda de 1px em degradê dourado.

## Movimento

| Token CSS | Valor | Uso |
|---|---|---|
| `--ease-soft` | cubic-bezier(.2,.7,.2,1) | Zoom lento de foto (800ms) |
| `--ease-spring` | cubic-bezier(.34,1.56,.64,1) | Giro da seta (300ms) |
| `--ease-pop` | cubic-bezier(.45,1.45,.8,1) | Entrada da notificação (900ms) |

## Iconografia e logo

Traço fino (1.5) em grade de 20px. O ornamento da marca é o **brilho de quatro pontas** entre dois filetes, como na peça de Instagram. O logo (monograma LC) ainda não foi enviado em arquivo: até lá, o nome entra em texto, Cormorant 300 em CAIXA ALTA, com `ESTÉTICA AVANÇADA` em `tagline` embaixo.

## Componentes

| Componente | Grupo | Para quê |
|---|---|---|
| Button | Ações | Pílula com seta: solid, outline, on-dark, sm, block |
| Overline | Tipografia | Rótulo de seção e ornamento com filetes |
| TreatmentCard | Superfícies | Cartão de tratamento com zoom e brilho dourado |
| SplitPanel | Superfícies | Texto e foto em dois quadrados |
| DarkPanel | Superfícies | Painel de impacto em marrom |
| GlassPill | Prova social | Avaliações em vidro |
| Marquee | Prova social | Faixa de tratamentos em movimento |
| QRCard | Prova social | QR para o WhatsApp |
| Toast | Feedback | Notificação de agendamento animada |
| Hero | Padrões | Abertura com retrato e título |

HTML + CSS puro, classes `lc-` em `components/bundle.css`.

## Faça e não faça

- **Faça** um botão `solid` por seção; os demais em `outline`.
- **Faça** alternar `cream`, `beige-light` e um painel marrom para dar ritmo.
- **Faça** fotos de pele real, luz quente e fundo areia.
- **Não faça** texto `gold` sobre fundo claro.
- **Não faça** títulos de painel em caixa baixa, nem o hero ou os nomes de tratamento em caixa alta.
- **Não faça** dois painéis marrons seguidos.
- **Não faça** preto puro, branco puro como fundo de página, degradês coloridos ou emoji.

## Como usar

1. Carregue `tokens.css` (gerado de `tokens.json`) e depois `components/bundle.css`.
2. Copie o HTML das prévias e troque textos e fotos.
3. Links de agendamento apontam para o WhatsApp com mensagem pronta.
