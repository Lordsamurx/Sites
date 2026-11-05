// Testes de fumaça do site da Lorena Caliari. Rodar: npx playwright test (a partir de clientes/lorena-caliari/)
// Os dados que dependem da cliente (WhatsApp, Instagram, endereço, depoimentos) são trocados SÓ dentro do teste,
// interceptando o index.html; nada aqui chega ao site publicado.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const AxeBuilder = require("@axe-core/playwright").default;

const HTML = fs.readFileSync(path.join(__dirname, "..", "site", "index.html"), "utf8");
const N = Number(HTML.match(/const N = (\d+)/)[1]);
const CUTS = HTML.match(/CUTS = new Set\(\[([\d, ]+)\]\)/)[1].split(",").map(Number);

// Serve o index.html com trechos trocados (só para o teste)
async function comHTML(page, trocas) {
  let html = HTML;
  for (const [de, para] of trocas) {
    if (!html.includes(de)) throw new Error(`trecho não encontrado no index.html: ${de}`);
    html = html.replace(de, para);
  }
  await page.route(/\/(index\.html)?(\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
}
// Rola a página inteira devagar (dispara entradas, quadros do hero, painéis empilhados)
async function rolarTudo(page) {
  await page.evaluate(async () => {
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y <= H; y += Math.round(innerHeight * 0.6)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    scrollTo(0, 0);
  });
}
const framesPedidos = (page) => {
  const set = new Set();
  page.on("request", (r) => { const m = r.url().match(/assets\/frames\/(h-\d{3})(-800)?\.webp/); if (m) set.add(m[1]); });
  return set;
};
const esperarQuadros = (page) => page.waitForLoadState("load").then(() => page.waitForTimeout(2500));

test.describe("console e layout", () => {
  for (const w of [375, 768, 1440]) {
    test(`sem erros de console em ${w}px`, async ({ page }) => {
      const erros = [];
      page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
      page.on("pageerror", (e) => erros.push(e.message));
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/");
      await rolarTudo(page);
      await page.waitForTimeout(500);
      expect(erros).toEqual([]);
    });
  }

  for (const w of [320, 375, 768, 1024, 1440, 1920]) {
    test(`sem rolagem horizontal em ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto("/");
      await rolarTudo(page);
      const larg = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      expect(larg[0]).toBeLessThanOrEqual(larg[1]);
    });
  }

  test("zoom de 200% (1440 px → 720 px CSS): sem rolagem horizontal", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto("http://localhost:4173/");
    await rolarTudo(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });

  test("botões e cartões cabem nos painéis em 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    const fora = await page.evaluate(() => [...document.querySelectorAll(".lc-btn")].filter((b) => {
      const box = b.closest(".lc-split__copy, .lc-dark, .map, .lc-hero, .foot__cta-main, .faq-side");
      if (!box || !b.offsetParent) return false;
      const r = b.getBoundingClientRect(), p = box.getBoundingClientRect();
      return r.left < p.left - 0.5 || r.right > p.right + 0.5;
    }).map((b) => b.textContent.trim()));
    expect(fora).toEqual([]);
  });
});

test.describe("WhatsApp", () => {
  test("número válido monta o link do wa.me com a mensagem", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("[data-wa]");
    const n = await links.count();
    expect(n).toBeGreaterThan(5);
    for (let i = 0; i < n; i++) {
      const a = links.nth(i);
      const href = await a.getAttribute("href");
      const msg = await a.getAttribute("data-wa");
      expect(href).toBe(`https://wa.me/${HTML.match(/WA_NUMBER = "(\d+)"/)[1]}?text=${encodeURIComponent(msg)}`);
      await expect(a).toHaveAttribute("target", "_blank");
      await expect(a).toHaveAttribute("rel", /noopener/);
      await expect(a).not.toHaveAttribute("aria-disabled", "true");
    }
  });

  for (const ruim of ["5500000000000x", "123", "", "4431999999999", "55319867295421"]) {
    test(`número inválido ("${ruim}") desativa todos os botões`, async ({ page }) => {
      await comHTML(page, [[/const WA_NUMBER = "\d*";/.exec(HTML)[0], `const WA_NUMBER = "${ruim}";`]]);
      await page.goto("/");
      const estados = await page.$$eval("[data-wa]", (as) => as.map((a) => [a.hasAttribute("href"), a.getAttribute("aria-disabled")]));
      expect(estados.length).toBeGreaterThan(5);
      for (const [temHref, dis] of estados) { expect(temHref).toBe(false); expect(dis).toBe("true"); }
    });
  }

  test("o número só existe em WA_NUMBER (nem no JSON-LD, nem espalhado)", async () => {
    const numeros = HTML.match(/55\d{10,11}/g) || [];
    expect(numeros.length).toBe(1);
    expect(HTML).toMatch(/const WA_NUMBER = "55\d{10,11}";/);
    expect(HTML).toContain("/^55\\d{10,11}$/");
    const ld = HTML.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    expect(ld).not.toMatch(/\d{8,}/);
  });
});

test.describe("dados da cliente ainda pendentes", () => {
  test("âncoras internas apontam para elementos existentes", async ({ page }) => {
    await page.goto("/");
    const faltando = await page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
    expect(faltando).toEqual([]);
  });

  test('"Como chegar" fica sem href enquanto não houver endereço', async ({ page }) => {
    await page.goto("/");
    const link = page.locator("#map-link");
    await expect(link).not.toHaveAttribute("href", /.*/);
    await expect(link).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("#map-addr")).toHaveText("Endereço em breve.");
    await expect(page.locator("#map-canvas iframe")).toHaveCount(0);
  });

  test('com endereço, "Como chegar" abre o Google Maps', async ({ page }) => {
    await page.route(/google\.com/, (r) => r.fulfill({ status: 200, body: "" }));
    await comHTML(page, [['const ADDRESS = "";', 'const ADDRESS = "Rua de Teste, 1";']]);
    await page.goto("/");
    await expect(page.locator("#map-link")).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    await expect(page.locator("#map-link")).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("#map-canvas iframe")).toHaveCount(1);
  });

  test("chip do Instagram fica escondido sem URL", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#insta-item")).toBeHidden();
  });

  test("chip do Instagram aparece com URL de perfil válida", async ({ page }) => {
    await comHTML(page, [['const INSTAGRAM_URL = "";', 'const INSTAGRAM_URL = "https://www.instagram.com/perfil.teste/";']]);
    await page.goto("/");
    await expect(page.locator("#insta-item")).toBeVisible();
    await expect(page.locator("#insta-link")).toHaveAttribute("href", "https://www.instagram.com/perfil.teste/");
  });

  test("seção de depoimentos fica escondida com a lista vazia", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#depoimentos")).toBeHidden();
    expect(HTML).toMatch(/const DEPOIMENTOS = \[\];/);
    await expect(page.locator("#depo-list .quote")).toHaveCount(0);
  });

  test("depoimentos: com dados, monta os cartões como texto (sem HTML)", async ({ page }) => {
    // Dados fictícios SÓ deste teste, para conferir a montagem e o escape. Não são depoimentos.
    await comHTML(page, [["const DEPOIMENTOS = [];", 'const DEPOIMENTOS = [{ nome: "Teste A", texto: "<b>texto de teste</b>", origem: "Teste" }, { nome: "", texto: "sem nome: ignorado" }];']]);
    await page.goto("/");
    await expect(page.locator("#depoimentos")).toBeVisible();
    await expect(page.locator("#depo-list .quote")).toHaveCount(1);
    await expect(page.locator("#depo-list .quote blockquote p")).toHaveText("<b>texto de teste</b>");
    await expect(page.locator("#depo-list b")).toHaveCount(0);
  });
});

test.describe("hero (quadros no canvas)", () => {
  test("desktop baixa todos os quadros", async ({ page }) => {
    const pedidos = framesPedidos(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await esperarQuadros(page);
    expect(pedidos.size).toBe(N);
  });

  test("celular baixa metade dos quadros (mais as bordas das cenas)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const pedidos = framesPedidos(page);
    await page.goto("http://localhost:4173/");
    await esperarQuadros(page);
    expect(pedidos.size).toBeGreaterThanOrEqual(Math.ceil(N / 2));
    expect(pedidos.size).toBeLessThanOrEqual(Math.ceil(N / 2) + CUTS.length * 2 + 1);
    await ctx.close();
  });

  test("economia de dados baixa 1 a cada 4 quadros", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true } }));
    const pedidos = framesPedidos(page);
    await page.goto("/");
    await esperarQuadros(page);
    expect(pedidos.size).toBeLessThanOrEqual(Math.ceil(N / 4) + CUTS.length * 2 + 1);
    expect(pedidos.size).toBeGreaterThan(1);
  });

  test("movimento reduzido baixa só o quadro 0", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const pedidos = framesPedidos(page);
    await page.goto("/");
    await esperarQuadros(page);
    await rolarTudo(page);
    expect([...pedidos]).toEqual(["h-000"]);
  });

  test("celular usa o quadro 0 em 800 px (não o de 1200)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, deviceScaleFactor: 2, isMobile: true });
    const page = await ctx.newPage();
    const urls = [];
    page.on("request", (r) => { if (/h-000/.test(r.url())) urls.push(r.url()); });
    await page.goto("http://localhost:4173/");
    await page.waitForLoadState("load");
    expect(urls.some((u) => u.endsWith("h-000-800.webp"))).toBe(true);
    expect(urls.some((u) => u.endsWith("h-000.webp"))).toBe(false);
    await ctx.close();
  });

  test("loop de requestAnimationFrame para em repouso", async ({ page }) => {
    await page.addInitScript(() => {
      window.__raf = 0; const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => { window.__raf++; return orig(cb); };
    });
    await page.goto("/");
    await esperarQuadros(page);
    await page.mouse.wheel(0, 600); await page.waitForTimeout(1500);     // rola e espera a imagem alcançar
    const a = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(1000);
    const b = await page.evaluate(() => window.__raf);
    expect(b - a).toBe(0);
  });
});

test.describe("menu e cabeçalho", () => {
  test("menu mobile: aria-label, aria-expanded e Esc", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    const t = page.locator(".nav__toggle");
    await expect(t).toHaveAttribute("aria-label", "Abrir menu");
    await expect(t).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#menu")).toBeHidden();
    await t.click();
    await expect(t).toHaveAttribute("aria-expanded", "true");
    await expect(t).toHaveAttribute("aria-label", "Fechar menu");
    await expect(page.locator("#menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(t).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#menu")).toBeHidden();
    await expect(t).toBeFocused();
    await t.click();
    await page.locator('#menu a[href="#tratamentos"]').click();
    await expect(t).toHaveAttribute("aria-expanded", "false");
  });

  for (const w of [320, 340, 360, 375]) {
    test(`cabeçalho sem colisão em ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 700 });
      await page.goto("/");
      const [brand, tog] = await Promise.all([page.locator(".brand").boundingBox(), page.locator(".nav__toggle").boundingBox()]);
      expect(brand.x + brand.width).toBeLessThanOrEqual(tog.x);
      expect(tog.width).toBeGreaterThanOrEqual(44);
      expect(tog.x + tog.width).toBeLessThanOrEqual(w);
      const nome = await page.locator(".brand__name").evaluate((e) => e.scrollWidth <= e.clientWidth + 1);
      expect(nome).toBe(true);
    });
  }

  for (const w of [900, 1024, 1100, 1199, 1440]) {
    test(`cabeçalho e hero sem sobreposição em ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 820 });
      await page.goto("/");
      const caixas = await page.evaluate(() => {
        const b = (s) => document.querySelector(s).getBoundingClientRect();
        const txt = (s) => { const r = document.createRange(); r.selectNodeContents(document.querySelector(s)); return r.getBoundingClientRect(); };   // extensão real do texto
        const links = [...document.querySelectorAll(".nav__links a")].map((a) => a.getBoundingClientRect());
        return { brand: b(".brand"), first: links[0], last: links[links.length - 1], cta: b(".nav__cta"), alturas: links.map((r) => r.height), title: txt(".lc-hero__title"), sub: txt(".lc-hero__sub"), frame: b(".hero-frame") };
      });
      expect(caixas.brand.right).toBeLessThanOrEqual(caixas.first.left);
      expect(caixas.last.right).toBeLessThanOrEqual(caixas.cta.left);
      expect(new Set(caixas.alturas.map(Math.round)).size).toBe(1);           // links numa linha só
      expect(caixas.title.right).toBeLessThanOrEqual(caixas.frame.left);
      expect(caixas.sub.right).toBeLessThanOrEqual(caixas.frame.left);
    });
  }

  test("pílula do painel escuro não se sobrepõe ao texto", async ({ page }) => {
    for (const w of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/");
      const r = await page.evaluate(() => {
        const tag = document.querySelector(".dark-tag").getBoundingClientRect(), dark = document.querySelector(".lc-dark").getBoundingClientRect();
        const outros = [...document.querySelectorAll(".lc-dark__copy .lc-overline, .lc-dark__copy .lc-title, .lc-dark__copy .lc-body, .lc-dark__copy .lc-btn")].map((e) => e.getBoundingClientRect());
        const cruza = outros.some((o) => !(tag.right <= o.left || tag.left >= o.right || tag.bottom <= o.top || tag.top >= o.bottom));
        return { cruza, dentro: tag.left >= dark.left && tag.right <= dark.right && tag.top >= dark.top && tag.bottom <= dark.bottom };
      });
      expect(r, `${w}px`).toEqual({ cruza: false, dentro: true });
    }
  });
});

test.describe("acessibilidade e SEO", () => {
  for (const w of [375, 1440]) {
    test(`axe: 0 violações em ${w}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await page.goto("http://localhost:4173/");
      await rolarTudo(page);
      await page.waitForTimeout(800);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      await ctx.close();
    });
  }

  test("alvos de toque ≥ 44 px no celular", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await page.locator(".nav__toggle").click();
    const pequenos = await page.evaluate(() => [...document.querySelectorAll("a[href], button, summary, [data-wa]")].filter((el) => {
      if (el.closest(".lc-card__title") || el.classList.contains("skip")) return false;   // título do cartão: o alvo é o cartão inteiro
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (s.visibility === "hidden" || s.display === "none" || !r.width || +s.opacity === 0) return false;
      return r.width < 44 || r.height < 44;
    }).map((el) => `${el.className || el.tagName}: ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`));
    expect(pequenos).toEqual([]);
  });

  for (const w of [320, 1440]) {
    test(`nenhum texto visível abaixo de 11 px em ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto("/");
      const miudos = await page.evaluate(() => {
        const out = [], tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (tw.nextNode()) {
          const el = tw.currentNode.parentElement; if (!tw.currentNode.textContent.trim() || el.closest("[aria-hidden=true], [hidden], .skip, script")) continue;
          const s = getComputedStyle(el); if (s.display === "none" || !el.getClientRects().length) continue;
          if (parseFloat(s.fontSize) < 11) out.push(`${el.className}: ${s.fontSize}`);
        }
        return out;
      });
      expect(miudos).toEqual([]);
    });
  }

  test("um h1, title, description, lang e JSON-LD válido sem dados inventados", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page).toHaveTitle(/Lorena Caliari/);
    expect((await page.locator('meta[name="description"]').getAttribute("content")).length).toBeGreaterThan(50);
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld.name).toBe("Lorena Caliari Estética Avançada");
    for (const chute of ["aggregateRating", "review", "telephone", "address", "openingHours", "openingHoursSpecification", "priceRange", "url", "image"]) expect(ld).not.toHaveProperty(chute);
  });

  test("hierarquia de títulos sem saltos", async ({ page }) => {
    await page.goto("/");
    const niveis = await page.$$eval("h1, h2, h3, h4", (hs) => hs.filter((h) => !h.closest("[hidden]")).map((h) => +h.tagName[1]));
    expect(niveis[0]).toBe(1);
    for (let i = 1; i < niveis.length; i++) expect(niveis[i] - niveis[i - 1]).toBeLessThanOrEqual(1);
  });

  test("link de pular para o conteúdo é o primeiro foco e funciona", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip")).toBeFocused();
    await expect(page.locator(".skip")).toBeInViewport();
  });

  test("nenhuma promessa proibida no texto (exclamação, emoji, antes e depois)", async ({ page }) => {
    await page.goto("/");
    const texto = await page.evaluate(() => document.body.innerText);
    expect(texto).not.toMatch(/!/);
    expect(texto).not.toMatch(/\p{Emoji_Presentation}/u);
    expect(texto.toLowerCase()).not.toMatch(/milagros|rejuvenes|garantid/);
  });
});

test.describe("robustez", () => {
  test("sem JavaScript, todo o conteúdo aparece", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } });
    const page = await ctx.newPage();
    await page.goto("http://localhost:4173/");
    const escondidos = await page.$$eval(".reveal", (els) => els.filter((e) => getComputedStyle(e).opacity !== "1").length);
    expect(escondidos).toBe(0);
    await expect(page.locator(".hero-poster")).toBeVisible();
    await ctx.close();
  });

  test("JavaScript atrasado: a página funciona quando o script chega", async ({ page }) => {
    let html = HTML.replace(/<script>\n  \/\/ ===== Dados que dependem/, '<script>window.__atraso = new Promise((r) => setTimeout(r, 1500)); window.__atraso.then(() => {\n  // ===== Dados que dependem');
    html = html.replace(/<\/script>\n<\/body>/, "});\n</script>\n</body>");
    await page.route(/\/(index\.html)?$/, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
    const erros = []; page.on("pageerror", (e) => erros.push(e.message));
    await page.goto("/");
    await expect(page.locator(".lc-hero__title")).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator(".nav__cta")).toHaveAttribute("href", /wa\.me/);
    expect(erros).toEqual([]);
  });

  test("sem imagens: layout não quebra e o texto continua legível", async ({ page }) => {
    await page.route(/\.(webp|png)$/, (r) => r.abort());
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await rolarTudo(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const arch = await page.locator("#hero-arch").boundingBox();
    expect(arch.height).toBeGreaterThan(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("movimento reduzido: sem animações em loop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const animando = await page.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity && a.playState === "running").length);
    expect(animando).toBe(0);
  });
});
