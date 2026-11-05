// Lighthouse do site servido localmente (celular e desktop). Uso:
//   node tests/server.js &        (ou GZIP=1 node tests/server.js, como numa hospedagem com compressão)
//   node tests/lighthouse.js [url] [pasta-de-saída]
// Usa o Chromium do Playwright (CHROME_PATH para outro navegador).
const path = require("path");
const fs = require("fs");
const url = process.argv[2] || "http://localhost:4173/";
const out = process.argv[3] || path.join(__dirname, "..", "lighthouse-report");

(async () => {
  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  const chromePath = process.env.CHROME_PATH || require("playwright").chromium.executablePath();
  fs.mkdirSync(out, { recursive: true });
  const resumo = {};
  for (const modo of ["mobile", "desktop"]) {
    const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
    const flags = { port: chrome.port, output: ["json", "html"], logLevel: "error" };
    const config = modo === "desktop" ? (await import("lighthouse/core/config/desktop-config.js")).default : undefined;
    const r = await lighthouse(url, flags, config);
    await chrome.kill();
    const [json, html] = r.report;
    fs.writeFileSync(path.join(out, `${modo}.json`), json);
    fs.writeFileSync(path.join(out, `${modo}.html`), html);
    const lhr = r.lhr, a = lhr.audits;
    resumo[modo] = {
      desempenho: Math.round(lhr.categories.performance.score * 100),
      acessibilidade: Math.round(lhr.categories.accessibility.score * 100),
      boasPraticas: Math.round(lhr.categories["best-practices"].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
      FCP: a["first-contentful-paint"].displayValue,
      LCP: a["largest-contentful-paint"].displayValue,
      TBT: a["total-blocking-time"].displayValue,
      CLS: a["cumulative-layout-shift"].displayValue,
      SI: a["speed-index"].displayValue,
      falhas: Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== "informative" && x.scoreDisplayMode !== "manual" && x.scoreDisplayMode !== "notApplicable").map((x) => x.id),
    };
  }
  console.log(JSON.stringify(resumo, null, 2));
})();
