# Lorena Caliari — Estética Avançada (home)

Home estática (HTML + CSS + JS puro, sem build). Abrir `site/index.html` no navegador.

## Estrutura
- `design-system/project/` — design system da marca (tokens, componentes `lc-*`, README com regras de uso). Fonte da verdade de cor, tipografia e componentes.
- `site/index.html` — página (HTML + JS inline no final). No topo do script ficam os dados que dependem da Lorena: `WA_NUMBER`, `INSTAGRAM_URL`, `ADDRESS` e `DEPOIMENTOS`.
- `site/css/fonts.css` (fontes hospedadas no site), `tokens.css` (espelho de `tokens.json`), `components.css` (cópia de `bundle.css`, sem o `@import` do Google Fonts), `site.css` (layout da página).
- `site/assets/fonts/` — Cormorant Garamond (normal e itálico) e Manrope, WOFF2 variáveis, subconjunto latino (licença SIL OFL). Na Cormorant, o circunflexo minúsculo (â, ê, ô, î, û) foi achatado e baixado para não ficar solto do "e" em "você" (`tools/achatar-circunflexo.py`; maiúsculas e demais acentos intactos). Se baixar a fonte de novo do Google, rode o script uma vez.
- `site/assets/frames/` — 84 quadros WebP do hero (recortes 8:9 do vídeo, a partir do quadro 72, sem a piscada; ampliados e levemente nitidificados para 800×900; o primeiro em 1200×1350 e numa versão de 800×900, `h-000-800.webp`, que o celular usa. Se regenerar com OpenCV, use caminho relativo: imwrite falha em silêncio com "Á" no caminho).
- `site/assets/stills/` — recortes quadrados do vídeo para cartões e painéis.
- `site/assets/logo-*.png` — logo com fundo transparente (recorte automático do cartão original 260×164). Masters; a página usa as versões `.webp` redimensionadas (`logo-mark-360.webp` no celular).
- `site/assets/lorena.png` — master da foto; a página usa `lorena.webp`. `favicon.png` vem do símbolo dourado.
- `site/robots.txt` — libera tudo; a linha do sitemap fica comentada até existir a URL final (modelo em `tools/sitemap.modelo.xml`).
- `tests/` — testes Playwright (`smoke.spec.js`), servidor local (`server.js`) e Lighthouse (`lighthouse.js`). `package.json` e `playwright.config.js` ficam na raiz desta pasta.
- `tools/` — scripts de manutenção (fonte, modelo de sitemap). Não vão para a hospedagem.
- `gemini_generated_video_1961092c.mp4` — vídeo de origem (10 s, 1280×720).

## Testes
Requer Node 18 ou mais novo. A partir de `clientes/lorena-caliari/`:

```bash
npm install
npx playwright install chromium   # só na primeira vez
npx playwright test               # sobe o servidor local sozinho (porta 4173)
```

Cobrem: console sem erros (375, 768, 1440); sem rolagem horizontal (320 a 1920 e zoom de 200%); WhatsApp (número válido monta o `wa.me`, inválido desativa todos os botões, o número só existe em `WA_NUMBER`); âncoras internas; "Como chegar" sem link enquanto não houver endereço; Instagram escondido sem URL; depoimentos escondidos com a lista vazia e montados como texto; quadros do hero (desktop todos, celular metade, economia de dados 1 a cada 4, movimento reduzido só o quadro 0); loop de animação parado em repouso; menu mobile (rótulo, `aria-expanded`, Esc); cabeçalho e hero sem colisão (320 a 1440); pílula do painel escuro sem sobreposição; axe sem violações; alvos de toque ≥ 44 px; texto ≥ 11 px; JSON-LD sem dados inventados; sem JavaScript, com JavaScript atrasado e sem imagens.

Firefox e Safari (WebKit): `npx playwright install firefox webkit` e depois `TODOS=1 npx playwright test`. Nesta rodada só o Chromium foi testado; Safari no iPhone real ainda precisa ser conferido à mão.

Lighthouse: `node tests/server.js` (ou `GZIP=1 node tests/server.js`, que simula a compressão da hospedagem) e, em outro terminal, `npm run lighthouse`. Os relatórios vão para `lighthouse-report/` (fora do git).

## Desempenho
Lighthouse 13 (celular simulado, servidor local), novembro de 2026:

| | Sem compressão | Com gzip (como na hospedagem) |
|---|---|---|
| Celular | 96 (LCP 2,6 s) | 99 (LCP 2,2 s) |
| Desktop | 100 (LCP 0,5 s) | 100 (LCP 0,4 s) |

Antes desta rodada: celular 90 (LCP 3,6 s) sem compressão e 97 (LCP 2,6 s) com gzip; desktop 100. Acessibilidade, boas práticas e SEO em 100. CLS 0. axe: 0 violações em 375 e 1440 px. INP medido no Playwright com a CPU 4× mais lenta: cerca de 130 ms (bom é abaixo de 200).
- Fontes no próprio site com `preload` (sem a cadeia Google CSS → gstatic; elimina o salto de layout na troca de fonte).
- Primeiro quadro do hero com `preload` responsivo (`imagesrcset`): o celular baixa a versão de 800 px (29 KB em vez de 101 KB), que também vira o quadro 0 do canvas.
- Demais quadros só depois do evento `load`, em ondas: desktop todos, celular metade, economia de dados (`saveData`) 1 a cada 4, sempre com as bordas de cada cena; com movimento reduzido, nenhum (fica o pôster).
- O loop de `requestAnimationFrame` do hero só roda enquanto a imagem alcança a rolagem; em repouso, para.
- Imagens abaixo da dobra com `loading="lazy"` e `decoding="async"`.
- Na hospedagem, ativar gzip/brotli e cache longo para `assets/` (o Lighthouse aponta isso; depende do servidor, não do código).
- Se mudar os pesos ou estilos das fontes no design system, atualizar `css/fonts.css` e `assets/fonts/` (e rodar `tools/achatar-circunflexo.py`).

## Como o hero funciona
Trilho de 340vh (84 quadros; `N` e `CUTS` no script) com palco `position: sticky`; a rolagem conduz os quadros num `<canvas>` (sem `<video>`, evita travar em seek e funciona no iOS). Mistura entre quadros só dentro da mesma cena (`CUTS` no script). No celular não há trilho fixo.

## Regras do design system a respeitar
Dourado `gold` não é cor de texto sobre claro (usar `gold-ink`). Títulos de painel em CAIXA ALTA com uma palavra em itálico dourado. Botão é sempre pílula com seta. Sem emoji. Ver `design-system/project/README.md`.

## Depoimentos (como preencher)
A seção "Depoimentos" já está pronta, mas fica escondida enquanto a lista estiver vazia. Para publicar:
1. Use só depoimentos **reais**, com **autorização por escrito** de cada paciente para uso no site (guarde a autorização). Nada de texto de exemplo, nota de estrelas ou número de pacientes.
2. Respeite a publicidade em saúde: sem antes e depois, sem promessa de resultado, sem expor dados de saúde da paciente.
3. No fim do `index.html`, preencha `DEPOIMENTOS`, por exemplo: `{ nome: "A. P.", texto: "…", origem: "Google" }` (`nome` pode ser só as iniciais; `origem` é opcional). O texto entra como texto puro (sem HTML).
4. Rode `npx playwright test`.

## Pendências
- **WhatsApp:** `WA_NUMBER` no fim do `index.html` é **temporário** (número de teste do Samuel). Trocar pelo da Lorena antes de publicar; só existe ali (nem no JSON-LD). A validação `/^55\d{10,11}$/` desativa os botões se o número estiver errado.
- **Instagram:** preencher `INSTAGRAM_URL` (URL do perfil). Vazio, o botão do rodapé fica escondido. Depois, acrescentar `sameAs` no JSON-LD.
- **Endereço e mapa:** preencher `ADDRESS` (endereço real, confirmado com a Lorena): o card "Onde estamos" troca a arte pelo mapa do Google (iframe com filtro dourado) e ativa o botão "Como chegar". Sem endereço, mostra "Endereço em breve" e o botão fica sem link.
- **Cidade, horário de atendimento e telefone:** não aparecem no site. Quando houver, entram no rodapé e no JSON-LD (`address`, `openingHoursSpecification`, `telephone`).
- **CRF:** número do registro profissional da Lorena (TODO no rodapé, ao lado do ©).
- **URL final:** descomentar `canonical`, `og:url` e `og:image` no `<head>`, acrescentar `url` e `image` no JSON-LD, criar `site/sitemap.xml` a partir de `tools/sitemap.modelo.xml` e descomentar a linha `Sitemap:` em `site/robots.txt`. Falta também uma imagem de compartilhamento (`og.jpg`, 1200×630).
- **Depoimentos reais:** com autorização das pacientes (ver acima).
- **Conteúdo a validar com a Lorena:** nomes e descrições dos tratamentos (só "Bioestimuladores" e "Skinbooster" vêm do design system); textos dos balões do hero ("Avaliação completa", "Plano individual", "Acompanhamento"); lista da faixa (limpeza de pele, peeling, microagulhamento); textos novos desta rodada (overlines "Minha filosofia" e "Meu compromisso", "Venha me visitar", resposta "Como agendo o meu horário?", título "Quem já cuidou comigo" da seção de depoimentos).
- **Qualidade de imagem:** vídeo é 720p (arco do hero fica macio em telas retina); foto da Lorena (`assets/lorena.png`) tem só 546×591 e aparece no painel escuro. Pedir versões maiores.
- **Logo:** pedir arquivo vetorial (SVG/PNG grande); o recorte atual é automático.
- **Navegadores:** testado no Chromium (Playwright). Falta conferir no Safari do iPhone e no Firefox.
- **Bug conhecido no design system:** `.lc-split` colapsa no mobile (flex 1 1 0 em coluna). Corrigido só em `site.css` (`.lc-split > * { flex: none }`); falta corrigir em `components/bundle.css` e adicionar quadro mobile na prévia do SplitPanel.
- **Rosto do cartão "Bioestimuladores":** o quadro com pálpebra caída foi trocado; não há retoque de pixel, só seleção de quadros do vídeo.
