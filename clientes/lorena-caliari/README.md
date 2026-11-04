# Lorena Caliari — Estética Avançada (home)

Home estática (HTML + CSS + JS puro, sem build). Abrir `site/index.html` no navegador.

## Estrutura
- `design-system/project/` — design system da marca (tokens, componentes `lc-*`, README com regras de uso). Fonte da verdade de cor, tipografia e componentes.
- `site/index.html` — página (HTML + JS inline no final).
- `site/css/fonts.css` (fontes hospedadas no site), `tokens.css` (espelho de `tokens.json`), `components.css` (cópia de `bundle.css`, sem o `@import` do Google Fonts), `site.css` (layout da página).
- `site/assets/fonts/` — Cormorant Garamond (normal e itálico) e Manrope, WOFF2 variáveis, subconjunto latino (licença SIL OFL).
- `site/assets/frames/` — 84 quadros WebP do hero (recortes 8:9 do vídeo, a partir do quadro 72, sem a piscada; ampliados e levemente nitidificados para 800×900, o primeiro em 1200×1350. Se regenerar com OpenCV, use caminho relativo: imwrite falha em silêncio com "Á" no caminho).
- `site/assets/stills/` — recortes quadrados do vídeo para cartões e painéis.
- `site/assets/logo-*.png` — logo com fundo transparente (recorte automático do cartão original 260×164). Masters; a página usa as versões `.webp` redimensionadas.
- `site/assets/lorena.png` — master da foto; a página usa `lorena.webp`. `favicon.png` vem do símbolo dourado.
- `gemini_generated_video_1961092c.mp4` — vídeo de origem (10 s, 1280×720).

## Desempenho
Lighthouse (servidor local, sem compressão): celular 98, desktop 100; acessibilidade, boas práticas e SEO em 100. Antes desta rodada: celular 72 (LCP 5,2 s), desktop 96.
- Fontes no próprio site com `preload` (sem a cadeia Google CSS → gstatic; elimina o salto de layout na troca de fonte).
- Primeiro quadro do hero com `preload`; os outros 98 só baixam depois do evento `load`, em ondas.
- Imagens abaixo da dobra com `loading="lazy"` e `decoding="async"`.
- Na hospedagem, ativar gzip/brotli e cache longo para `assets/` (o Lighthouse aponta isso; depende do servidor, não do código).
- Se mudar os pesos ou estilos das fontes no design system, atualizar `css/fonts.css` e `assets/fonts/`.

## Como o hero funciona
Trilho de 340vh (84 quadros; `N` e `CUTS` no script) com palco `position: sticky`; a rolagem conduz os quadros num `<canvas>` (sem `<video>`, evita travar em seek e funciona no iOS). Mistura entre quadros só dentro da mesma cena (`CUTS` no script). No celular não há trilho fixo.

## Regras do design system a respeitar
Dourado `gold` não é cor de texto sobre claro (usar `gold-ink`). Títulos de painel em CAIXA ALTA com uma palavra em itálico dourado. Botão é sempre pílula com seta. Sem emoji. Ver `design-system/project/README.md`.

## Pendências
- **WhatsApp:** `WA_NUMBER` no fim do `index.html` é placeholder (`5500000000000`).
- **Conteúdo a validar com a Lorena:** nomes e descrições dos tratamentos (só "Bioestimuladores" e "Skinbooster" vêm do design system); textos dos balões do hero (hoje resumem os três passos: "Avaliação completa", "Plano individual", "Acompanhamento").
- **Instagram:** link do rodapé ainda é `#`.
- **Qualidade de imagem:** vídeo é 720p (arco do hero fica macio em telas retina); foto da Lorena (`assets/lorena.png`) tem só 546×591 e aparece no painel escuro. Pedir versões maiores.
- **Logo:** pedir arquivo vetorial (SVG/PNG grande); o recorte atual é automático.
- **Bug conhecido no design system:** `.lc-split` colapsa no mobile (flex 1 1 0 em coluna). Corrigido só em `site.css` (`.lc-split > * { flex: none }`); falta corrigir em `components/bundle.css` e adicionar quadro mobile na prévia do SplitPanel.
- **Fonte:** na Cormorant Garamond o circunflexo minúsculo ("você") fica alto e solto do "e"; é desenho da fonte (aparece em todos os pesos), não erro de CSS.
- **Rosto do cartão "Bioestimuladores":** o quadro com pálpebra caída foi trocado; não há retoque de pixel, só seleção de quadros do vídeo.
