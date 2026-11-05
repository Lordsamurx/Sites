// Testes de fumaça da home da Lorena Caliari. Rodar com: npx playwright test
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("fs");
const path = require("path");

const HTML = fs.readFileSync(path.join(__dirname, "../site/index.html"), "utf8");
const FRAMES = 84;

// Rola a página inteira (dispara as entradas .reveal e o hero) e volta ao topo
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 200));
  });
}
// Serve o index.html com uma troca de texto (para testar outros valores de WA_NUMBER, ADDRESS etc.)
async function serveWith(page, from, to) {
  await page.route("**/", (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === "/" || u.pathname === "/index.html") return route.fulfill({ contentType: "text/html; charset=utf-8", body: HTML.replace(from, to) });
    return route.continue();
  });
}
const frameIndex = (url) => { const m = /frames\/h-(\d{3})(-m)?\.webp/.exec(url); return m ? +m[1] : null; };
const overlap = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

test.describe("console e layout", () => {
  for (const width of [375, 768, 1440]) {
    test(`sem erros de console em ${width}px`, async ({ page }) => {
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      await scrollThrough(page);
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  }

  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    test(`sem rolagem horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/", { waitUntil: "load" });
      await scrollThrough(page);
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }

  test("zoom de 200% (equivale a 640 e 720 px) sem rolagem horizontal", async ({ page }) => {
    for (const width of [640, 720]) {
      await page.setViewportSize({ width, height: 450 });
      await page.goto("/", { waitUntil: "load" });
      await scrollThrough(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });

  for (const width of [320, 340, 360, 375, 900, 1024, 1180, 1280]) {
    test(`cabeçalho sem colisão em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/", { waitUntil: "load" });
      const res = await page.evaluate(() => {
        const vis = (e) => e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
        const els = [".brand__text", ".brand__symbol", ".nav__cta", ".nav__toggle", ...[...document.querySelectorAll(".nav__links a")].map((_, i) => `.nav__links li:nth-child(${i + 1}) a`)]
          .map((s) => [s, document.querySelector(s)]).filter(([, e]) => vis(e)).map(([s, e]) => [s, e.getBoundingClientRect().toJSON()]);
        const hits = [];
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
          const a = els[i][1], b = els[j][1];
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hits.push(`${els[i][0]} x ${els[j][0]}`);
        }
        const tall = [...document.querySelectorAll(".nav__links a")].filter(vis).filter((a) => a.getBoundingClientRect().height > 46).length;
        const right = Math.max(...els.map(([, r]) => r.right));
        return { hits, tall, right, vw: document.documentElement.clientWidth };
      });
      expect(res.hits).toEqual([]);
      expect(res.tall).toBe(0);
      expect(res.right).toBeLessThanOrEqual(res.vw);
    });
  }

  for (const width of [900, 1024, 1280, 1440, 1920]) {
    test(`hero: texto não invade o arco em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      const { textRight, archLeft } = await page.evaluate(() => {
        const right = (s) => { const r = document.createRange(); r.selectNodeContents(document.querySelector(s)); return Math.max(...[...r.getClientRects()].map((x) => x.right)); };
        return { textRight: Math.max(right(".lc-hero__title"), right(".lc-hero__sub")), archLeft: document.querySelector(".hero-frame").getBoundingClientRect().left };
      });
      expect(textRight).toBeLessThan(archLeft);
    });
  }

  for (const width of [375, 768, 1440]) {
    test(`etiqueta da foto no painel escuro não cobre o texto em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      await page.locator("#lorena").scrollIntoViewIfNeeded();
      const r = await page.evaluate(() => ["dark-tag", "lc-dark__copy .lc-overline", "lc-dark__copy .lc-title", "lc-dark__copy .dark-body"].map((s) => document.querySelector("." + s).getBoundingClientRect().toJSON()));
      for (const other of r.slice(1)) expect(overlap(r[0], other)).toBe(false);
    });
  }

  test("sem JavaScript o conteúdo continua visível", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } });
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "load" });
    for (const sel of ["#t-cuidado", "#t-trat", ".lc-card", ".faq"]) {
      expect(await page.locator(sel).first().evaluate((e) => +getComputedStyle(e.closest(".reveal") || e).opacity)).toBe(1);
    }
    await ctx.close();
  });

  test("sem imagens: sem erro de script e sem rolagem horizontal", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route(/\.(webp|png)$/, (r) => r.abort());
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/", { waitUntil: "load" });
    await scrollThrough(page);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe("WhatsApp, mapa e Instagram", () => {
  test("número válido monta links wa.me com a mensagem", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.$$eval("[data-wa]", (els) => els.map((a) => [a.getAttribute("href"), a.dataset.wa, a.getAttribute("aria-disabled"), a.target]));
    expect(hrefs.length).toBeGreaterThan(5);
    for (const [href, msg, dis, target] of hrefs) {
      expect(href).toBe(`https://wa.me/5531986729542?text=${encodeURIComponent(msg)}`);
      expect(dis).toBeNull();
      expect(target).toBe("_blank");
    }
  });

  test("número inválido desativa todos os botões de WhatsApp", async ({ page }) => {
    await serveWith(page, 'const WA_NUMBER = "5531986729542"', 'const WA_NUMBER = "5500000"');
    await page.goto("/");
    const states = await page.$$eval("[data-wa]", (els) => els.map((a) => [a.hasAttribute("href"), a.getAttribute("aria-disabled")]));
    for (const [hasHref, dis] of states) { expect(hasHref).toBe(false); expect(dis).toBe("true"); }
  });

  test("o número aparece só em WA_NUMBER (nem no JSON-LD nem espalhado)", async () => {
    expect(HTML.split("5531986729542").length - 1).toBe(1);
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(HTML)[1]);
    expect(["LocalBusiness", "BeautySalon", "HealthAndBeautyBusiness"]).toContain(ld["@type"]);
    expect(JSON.stringify(ld)).not.toMatch(/\d{8,}/);
  });

  test('"Como chegar" sem href enquanto não houver endereço', async ({ page }) => {
    await page.goto("/");
    const link = page.locator("#map-link");
    await expect(link).not.toHaveAttribute("href", /.*/);
    await expect(link).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("#map-addr")).toHaveText("Endereço em breve.");
  });

  test("com endereço, o mapa e o botão são ativados", async ({ page }) => {
    await page.route(/google\.com/, (r) => r.fulfill({ body: "" }));
    await serveWith(page, 'const ADDRESS = "";', 'const ADDRESS = "Rua Exemplo de Teste, 1";');
    await page.goto("/");
    await expect(page.locator("#map-link")).toHaveAttribute("href", /google\.com\/maps/);
    await expect(page.locator("#map-link")).not.toHaveAttribute("aria-disabled", /.*/);
    await expect(page.locator("#map-canvas iframe")).toHaveCount(1);
  });

  test("chip do Instagram escondido sem URL e visível com URL", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#ig-item")).toBeHidden();
    await serveWith(page, 'const INSTAGRAM_URL = "";', 'const INSTAGRAM_URL = "https://www.instagram.com/perfil.teste/";');
    await page.goto("/");
    await expect(page.locator("#ig-item")).toBeVisible();
    await expect(page.locator("#ig-link")).toHaveAttribute("href", "https://www.instagram.com/perfil.teste/");
  });

  test("todas as âncoras internas apontam para um id existente", async ({ page }) => {
    await page.goto("/");
    const missing = await page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
    expect(missing).toEqual([]);
    expect(await page.$$eval('a[href="#"]', (as) => as.length)).toBe(0);
  });
});

test.describe("hero (quadros e animação)", () => {
  async function framesRequested(page) {
    const got = new Set();
    page.on("request", (r) => { const i = frameIndex(r.url()); if (i !== null) got.add(i); });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    return [...got].sort((a, b) => a - b);
  }

  test("movimento reduzido baixa só o quadro 0", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    expect(await framesRequested(page)).toEqual([0]);
    await ctx.close();
  });

  test("desktop baixa todos os quadros", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    expect((await framesRequested(page)).length).toBe(FRAMES);
  });

  test("celular baixa metade dos quadros", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const got = await framesRequested(page);
    expect(got.length).toBe(Math.ceil(FRAMES / 2));
    expect(got.every((i) => i % 2 === 0)).toBe(true);
  });

  test("economia de dados baixa 1 quadro a cada 4", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true, effectiveType: "4g" } }));
    await page.setViewportSize({ width: 375, height: 812 });
    const got = await framesRequested(page);
    expect(got.length).toBe(Math.ceil(FRAMES / 4));
    expect(got.every((i) => i % 4 === 0)).toBe(true);
  });

  test("celular usa o pôster menor (sem baixar o de 1200 px)", async ({ page }) => {
    const urls = [];
    page.on("request", (r) => urls.push(r.url()));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "load" });
    expect(urls.some((u) => u.endsWith("h-000-m.webp"))).toBe(true);
    expect(urls.some((u) => u.endsWith("h-000.webp"))).toBe(false);
  });

  test("loop de requestAnimationFrame para em repouso", async ({ page }) => {
    await page.addInitScript(() => {
      window.__raf = 0; const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => { window.__raf++; return raf(cb); };
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    await page.mouse.wheel(0, 900); await page.waitForTimeout(300); await page.mouse.wheel(0, -400);
    await page.waitForFunction(() => window.__heroIdle === true, null, { timeout: 10_000 });
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.__raf)).toBe(before);
  });
});

test.describe("menu, carrossel e depoimentos", () => {
  test("menu mobile: aria-label, aria-expanded e Esc", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const toggle = page.locator(".nav__toggle");
    await expect(toggle).toHaveAttribute("aria-label", "Abrir menu");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#menu")).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute("aria-label", "Fechar menu");
    await expect(page.locator("#menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#menu")).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("carrossel dos pilares: setas no celular, três lado a lado no desktop", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const track = page.locator("#pilares");
    await track.scrollIntoViewIfNeeded();
    const prev = page.locator('.promise .carousel__btn--prev'), next = page.locator('.promise .carousel__btn--next');
    await expect(prev).toBeDisabled();
    await next.click();
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(100);
    await expect(prev).toBeEnabled();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator(".promise .carousel__nav")).toBeHidden();
    const tops = await page.$$eval("#pilares > li", (li) => li.map((l) => l.offsetTop));
    expect(new Set(tops).size).toBe(1);
  });

  test("depoimentos: seção escondida com o array vazio", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#depoimentos")).toBeHidden();
    await expect(page.locator("#depo-track > li")).toHaveCount(0);
  });

  test("depoimentos: com dados, monta os cartões (dados de teste só aqui, nunca no site)", async ({ page }) => {
    await page.addInitScript(() => {
      window.__LC_DEPOIMENTOS__ = [
        { nome: "Teste Um", texto: "Texto de teste do componente.", origem: "Teste" },
        { nome: "Teste Dois", texto: "<b>sem HTML</b>", origem: "Teste" },
      ];
    });
    await page.goto("/");
    await expect(page.locator("#depoimentos")).toBeVisible();
    await expect(page.locator("#depo-track > li")).toHaveCount(2);
    await expect(page.locator("#depo-track b").first()).toHaveText("Teste Um");
    await expect(page.locator("#depo-track blockquote p").nth(1)).toHaveText("<b>sem HTML</b>");
  });
});

test.describe("acessibilidade", () => {
  for (const width of [375, 1440]) {
    test(`axe sem violações em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      await scrollThrough(page);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(800);
      const res = await new AxeBuilder({ page }).analyze();
      expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  for (const width of [375, 1440]) {
    test(`alvos de toque ≥ 44 px e texto ≥ 11 px em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "load" });
      const r = await page.evaluate(() => {
        const shown = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return false; } return el.getBoundingClientRect().width > 0; };
        const small = [...document.querySelectorAll("a, button, summary")]
          .filter((el) => shown(el) && !el.classList.contains("skip") && !el.closest(".lc-card__title"))   // o título do cartão estende o clique ao cartão inteiro
          .map((el) => [el.textContent.trim().slice(0, 24) || el.getAttribute("aria-label"), el.getBoundingClientRect()])
          .filter(([, b]) => b.width < 44 || b.height < 44).map(([t, b]) => `${t} ${Math.round(b.width)}x${Math.round(b.height)}`);
        const tiny = [...document.querySelectorAll("body *")].filter((el) => shown(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 11)
          .map((el) => `${el.className} ${getComputedStyle(el).fontSize}`);
        return { small, tiny };
      });
      expect(r.small).toEqual([]);
      expect(r.tiny).toEqual([]);
    });
  }

  test("botão sólido do rodapé mantém texto marrom sobre dourado", async ({ page }) => {
    await page.goto("/");
    expect(await page.locator(".foot .lc-btn--solid").evaluate((e) => getComputedStyle(e).color)).toBe("rgb(43, 30, 22)");
  });

  test("um único h1 e títulos únicos de página", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/Lorena Caliari/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator("html").getAttribute("lang")).toBe("pt-BR");
  });
});
