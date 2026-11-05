# Lorena Caliari — instruções para o Claude Code

Responda sempre em **português do Brasil**. Leia o `README.md` desta pasta antes de mexer (estrutura, pendências, como o hero funciona).

## Projeto
Home estática da Lorena Caliari Estética Avançada (farmacêutica). HTML + CSS + JS puro, **sem build**. O site fica em `site/`; o design system em `design-system/project/`. Este projeto vive dentro do repositório `Sites`, em `clientes/lorena-caliari/`.

## Regras do design system (obrigatórias)
Fonte da verdade: `design-system/project/README.md` e `tokens.json`. Resumo:
- Fundo de página `cream` (#fffbf7), nunca branco puro. Texto `brown` (#2b1e16). Seções alternadas em `beige-light`; no máximo um ou dois painéis marrons por página, nunca dois seguidos.
- **`gold` (#c9a86a) não é cor de texto sobre fundo claro.** Para overline, links e a palavra em destaque use `gold-ink` (#7d5f33). Sobre marrom, `gold` pode ser texto.
- Fontes: Cormorant Garamond (títulos) e Manrope (texto).
- Título de painel em CAIXA ALTA com **uma** palavra em itálico dourado; hero e nome de tratamento em caixa normal.
- Toda ação é um botão pílula com seta que gira no hover; um botão `solid` por seção, os demais `outline`.
- Tom: elegante, acolhedor, sem promessa de milagre, sem exclamação, sem emoji, sem preço em destaque, sem antes e depois sensacionalista.
- Use os componentes `lc-*` de `site/css/components.css` (cópia de `design-system/.../bundle.css`). Layout da página vai em `site/css/site.css`. Não altere cores ou espaços fora dos tokens de `site/css/tokens.css`.
- Respeite `prefers-reduced-motion` em qualquer animação nova.

## Cuidados técnicos
- O hero é uma sequência de quadros WebP (`site/assets/frames/`, 84 quadros) desenhada num `<canvas>` conforme a rolagem; o script está no fim de `site/index.html`. Se trocar os quadros, atualize `N` e `CUTS` (cortes de cena, sem mistura entre quadros).
- Todos os botões de agendamento usam `data-wa="mensagem"`; o número vem de `WA_NUMBER` no script (hoje um número temporário de teste; trocar pelo da Lorena antes de publicar).
- Não invente dados: nada de nota do Google, número de pacientes, endereço, preços ou depoimentos sem confirmação. O que não estiver confirmado vai nas pendências do README.
- Não é possível retocar rostos de imagens geradas; para corrigir uma expressão, troque o quadro do vídeo.
- Conferir visual: abra `site/index.html` em 1440px e 390px (Chrome/Playwright, se disponível), role a página toda e verifique que não há rolagem horizontal. Uma captura estática não prova o efeito de rolagem do hero.

## Fluxo de trabalho
- Mudanças em branch própria e commit com mensagem clara; não force push em `main`.
- Ao terminar um trabalho relevante, atualize a lista de **Pendências** do `README.md`.
- Pedidos pendentes de decisão (número de WhatsApp, textos dos tratamentos, logo e fotos em alta resolução) dependem da Lorena: pergunte, não suponha.
