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
- `site/assets/frames/h-000-m.webp` — pôster do hero em 1000 px para o celular (via `srcset`); o quadro 0 do canvas reaproveita o mesmo arquivo.
- `site/robots.txt` e `site/sitemap.exemplo.xml` — prontos; a linha do sitemap fica comentada até existir o domínio final.
- `gemini_generated_video_1961092c.mp4` — vídeo de origem (10 s, 1280×720).
- `tests/smoke.spec.js`, `playwright.config.js`, `package.json` — testes automáticos (ver "Testes").
- `Lorena-Caliari-Home.html` — a home inteira em um arquivo só (CSS, fontes e imagens embutidos, cerca de 4 MB) para abrir no PC sem servidor. Gerado por `python3 scripts/arquivo-unico.py`; rode de novo sempre que mudar algo em `site/`.
- `docs/capturas/` — capturas antes/depois da rodada de polimento (não são publicadas com o site).

## Dados da cliente (só no script do fim do `index.html`)
| Constante | Hoje | Efeito |
|---|---|---|
| `WA_NUMBER` | `5531986729542` (**temporário**, número de teste do Samuel) | Validado com `/^55\d{10,11}$/`. Válido: todos os `data-wa` viram `wa.me` com a mensagem. Inválido: botões sem `href` e com `aria-disabled`. Trocar pelo número da Lorena antes de publicar. Não repetir o número em outro lugar (nem no JSON-LD). |
| `ADDRESS` | vazio | Vazio: "Endereço em breve" e "Como chegar" sem link. Preenchido: mapa do Google com filtro dourado e botão ativo. |
| `INSTAGRAM_URL` | vazio | Vazio: chip escondido. Preenchido (URL completa `https://www.instagram.com/perfil/`): chip aparece. Acrescentar também em `sameAs` no JSON-LD. |
| `DEPOIMENTOS` | `[]` | Vazio: seção "Depoimentos" inteira escondida (`hidden`). Ver abaixo. |

### Como preencher os depoimentos
1. Só use depoimentos **reais**, com **autorização por escrito** da paciente para uso no site (guarde a autorização). Confirme antes com o CRF se a publicidade do farmacêutico permite depoimentos.
2. Nada de antes e depois, notas de estrelas ou promessa de resultado no texto.
3. Preencha no script, um objeto por depoimento:
   ```js
   const DEPOIMENTOS = [
     { nome: "Iniciais ou primeiro nome", texto: "Texto exatamente como a paciente autorizou.", origem: "Google" },
   ];
   ```
   `origem` é opcional (aparece como "via Google"). O texto entra com `textContent` (HTML não é interpretado). Com 1 ou mais itens, a seção aparece com o carrossel.

## Testes
```bash
npm install
npx playwright test
```
- Sobe sozinho um servidor local (`http-server site -p 4173`). 51 testes no Chromium: console, WhatsApp válido/inválido, âncoras, mapa, Instagram, quadros do hero (movimento reduzido, celular, economia de dados), loop de rAF em repouso, menu (Esc e `aria-*`), carrossel, depoimentos, rolagem horizontal de 320 a 1920 px e zoom de 200%, colisão do cabeçalho, sobreposição no hero e no painel escuro, sem JS, sem imagens, axe-core, alvos de toque e tamanho mínimo de texto.
- Firefox e WebKit (motor do Safari) não estão no `playwright.config.js` porque não estavam instalados no ambiente desta rodada; ver o comentário no arquivo.
- Lighthouse: `npx lighthouse http://localhost:4173/ --view` (celular) e `--preset=desktop`.

## Desempenho
Lighthouse 12.8 (servidor local, mediana de 2 execuções), novembro de 2026:

| | Celular sem compressão | Celular com gzip | Desktop |
|---|---|---|---|
| Antes (fc98eca) | 92 · LCP 3,35 s | — | 100 · LCP 0,63 s |
| Depois | 95 · LCP 2,85 s | 99 · LCP 2,12 s | 100 · LCP 0,58 s (0,43 s com gzip) |

Acessibilidade, boas práticas e SEO em 100 nos dois. CLS 0 e TBT 0 ms. INP aproximado (toques reais, CPU 4x mais lenta): 192 ms na maior interação. Peso no celular de 2,7 MB para 1,5 MB.
- Fontes no próprio site com `preload` (sem a cadeia Google CSS → gstatic; elimina o salto de layout na troca de fonte).
- Primeiro quadro do hero com `preload` (1000 px no celular, 1200 px no desktop); os outros só baixam depois do evento `load`, em ondas: todos no desktop, metade no celular, 1 a cada 4 com economia de dados ou 2G e nenhum com movimento reduzido.
- O loop de `requestAnimationFrame` do hero para quando a imagem chega ao destino.
- Imagens abaixo da dobra com `loading="lazy"` e `decoding="async"`.
- Na hospedagem, ativar gzip/brotli e cache longo para `assets/` (o Lighthouse aponta isso; depende do servidor, não do código).
- Se mudar os pesos ou estilos das fontes no design system, atualizar `css/fonts.css` e `assets/fonts/`.

## Como o hero funciona
Trilho de 340vh (84 quadros; `N` e `CUTS` no script) com palco `position: sticky`; a rolagem conduz os quadros num `<canvas>` (sem `<video>`, evita travar em seek e funciona no iOS). Mistura entre quadros só dentro da mesma cena (`CUTS` no script). No celular não há trilho fixo. Quem tem quadros faltando (celular, economia de dados) vê o quadro carregado mais próximo.

## Regras do design system a respeitar
Dourado `gold` não é cor de texto sobre claro (usar `gold-ink`). Títulos de painel em CAIXA ALTA com uma palavra em itálico dourado. Botão é sempre pílula com seta. Sem emoji. Ver `design-system/project/README.md`.

## Pendências
Dependem da Lorena (não inventar; o site está preparado para receber):
- **WhatsApp:** `WA_NUMBER` é o número de teste do Samuel. Trocar pelo da Lorena antes de publicar.
- **Instagram:** `INSTAGRAM_URL` vazio (chip escondido). Depois, acrescentar em `sameAs` no JSON-LD.
- **Endereço, cidade, horário e telefone:** `ADDRESS` vazio ("Endereço em breve"). No JSON-LD faltam `address`, `telephone` e `openingHoursSpecification` (TODO no comentário acima dele).
- **CRF:** comentário TODO no rodapé; não publicar sem o número real.
- **URL final:** `canonical`, `og:url`, `og:image` (imagem 1200×630 a criar), `url` do JSON-LD, linha `Sitemap` do `robots.txt` e `sitemap.exemplo.xml` → `sitemap.xml`. O SEO só chega a 100 de verdade com isso.
- **Depoimentos reais** com autorização por escrito (ver "Como preencher os depoimentos"). Confirmar com o CRF se depoimentos são permitidos.
- **Textos a validar:** nomes e descrições dos tratamentos (só "Bioestimuladores" e "Skinbooster" vêm do design system); balões do hero; cartões do carrossel dos pilares; título "O que dizem as pacientes"; respostas revisadas do FAQ; "Venha me visitar".
- **Foto da Lorena** em alta resolução (a atual tem 546×591) e **logo** vetorial (SVG/PNG grande; o recorte atual é automático e o `logo-mark.webp` pesa 37 KB para aparecer com cerca de 200 px no celular).
- **Qualidade do vídeo:** 720p; o arco do hero fica macio em telas retina.

Técnicas:
- **Bug no design system:** `.lc-split` colapsa no mobile (flex 1 1 0 em coluna). Corrigido só em `site.css` (`.lc-split > * { flex: none }`); falta corrigir em `components/bundle.css` e adicionar quadro mobile na prévia do SplitPanel.
- **Fonte:** na Cormorant Garamond o circunflexo minúsculo ("você") fica alto e solto do "e". Testado em novembro de 2026: acento combinante (U+0302), peso 400, `font-feature-settings` e a Cormorant original do Google têm o mesmo desenho. A única saída visual (desenhar o acento com CSS) troca o texto real por "voce", o que prejudica leitor de tela, busca e copiar/colar. Não adotada.
- **Safari/iOS e Firefox:** não testados nesta rodada (só Chromium). Testar em aparelho antes de publicar, principalmente o hero (canvas e `position: sticky`) e o carrossel (scroll-snap).
- **Rosto do cartão "Bioestimuladores":** o quadro com pálpebra caída foi trocado; não há retoque de pixel, só seleção de quadros do vídeo.
- **Hospedagem:** ativar gzip/brotli e cache longo para `assets/`.
