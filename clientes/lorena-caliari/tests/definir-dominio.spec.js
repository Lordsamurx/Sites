// Testes do scripts/definir-dominio. Sempre numa cópia temporária de site/: o site real nunca é alterado.
const { test, expect } = require("@playwright/test");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.join(__dirname, "..");
const SCRIPT = path.join(RAIZ, "scripts", "definir-dominio");
const ARQUIVOS = ["index.html", "robots.txt", "sitemap.exemplo.xml"];
const D1 = "dominio-ficticio.example";
const D2 = "outro-ficticio.example";

function copiaTemporaria() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "definir-dominio-"));
  for (const f of ARQUIVOS) fs.copyFileSync(path.join(RAIZ, "site", f), path.join(dir, f));
  return dir;
}
const ler = (dir, f) => fs.readFileSync(path.join(dir, f), "utf8");
const rodar = (dir, ...args) => spawnSync("node", [SCRIPT, ...args, "--site", dir], { encoding: "utf8" });
const hashes = (dir) => Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, f))).digest("hex")]));
const conta = (txt, re) => (txt.match(re) || []).length;

test("--dry-run não grava nada e mostra o que mudaria", () => {
  const dir = copiaTemporaria();
  const antes = hashes(dir);
  const r = rodar(dir, D1, "--dry-run");
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("[dry-run]");
  expect(r.stdout).toContain(`+ Sitemap: https://${D1}/sitemap.xml`);
  expect(r.stdout).toContain(`https://${D1}/assets/og.jpg`);
  expect(hashes(dir)).toEqual(antes);
  expect(fs.existsSync(path.join(dir, "sitemap.xml"))).toBe(false);
});

test("preenche canonical, og:url, og:image, JSON-LD, robots e sitemap", () => {
  const dir = copiaTemporaria();
  expect(rodar(dir, D1).status).toBe(0);
  const html = ler(dir, "index.html");
  expect(html).toContain(`<link rel="canonical" href="https://${D1}/">`);
  expect(html).toContain(`<meta property="og:url" content="https://${D1}/">`);
  expect(html).toContain(`<meta property="og:image" content="https://${D1}/assets/og.jpg">`);
  expect(html).not.toContain("DOMINIO-FINAL");
  const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
  expect(ld.url).toBe(`https://${D1}/`);
  expect(ld.name).toBe("Lorena Caliari Estética Avançada"); // o resto do JSON-LD fica intacto
  expect(ld.telephone).toBeUndefined(); // nada inventado
  expect(ld.address).toBeUndefined();
  expect(ler(dir, "robots.txt")).toMatch(new RegExp(`^Sitemap: https://${D1}/sitemap\\.xml\\r?$`, "m"));
  const sitemap = ler(dir, "sitemap.xml");
  expect(sitemap).toContain(`<loc>https://${D1}/</loc>`);
  expect(sitemap).not.toContain("DOMINIO-FINAL");
  expect(ler(dir, "sitemap.exemplo.xml")).toBe(fs.readFileSync(path.join(RAIZ, "site", "sitemap.exemplo.xml"), "utf8")); // modelo intacto
});

test("é idempotente: rodar duas vezes não muda nem duplica nada", () => {
  const dir = copiaTemporaria();
  rodar(dir, D1);
  const depoisDe1 = hashes(dir);
  const r = rodar(dir, D1);
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("Nada a fazer");
  expect(hashes(dir)).toEqual(depoisDe1);
  const html = ler(dir, "index.html");
  expect(conta(html, /rel="canonical"/g)).toBe(1);
  expect(conta(html, /property="og:url"/g)).toBe(1);
  expect(conta(html, /property="og:image"/g)).toBe(1);
  expect(conta(html, /^  "url":/gm)).toBe(1);
  expect(conta(ler(dir, "robots.txt"), /Sitemap:/g)).toBe(1);
});

test("trocar o domínio atualiza os mesmos pontos, sem sobras do anterior", () => {
  const dir = copiaTemporaria();
  rodar(dir, D1);
  expect(rodar(dir, D2).status).toBe(0);
  for (const f of ["index.html", "robots.txt", "sitemap.xml"]) {
    expect(ler(dir, f)).toContain(D2);
    expect(ler(dir, f)).not.toContain(D1);
  }
  expect(conta(ler(dir, "robots.txt"), /Sitemap:/g)).toBe(1);
});

test("preserva o fim de linha original (CRLF)", () => {
  const dir = copiaTemporaria();
  const crlfAntes = conta(ler(dir, "index.html"), /\r\n/g) > 0;
  rodar(dir, D1);
  const html = ler(dir, "index.html");
  expect(conta(html, /\r\n/g) > 0).toBe(crlfAntes);
  expect(conta(html, /(?<!\r)\n/g)).toBe(crlfAntes ? 0 : conta(html, /\n/g));
});

test("aceita https:// e barra final, e rejeita domínio inválido sem gravar nada", () => {
  const dir = copiaTemporaria();
  expect(rodar(dir, `https://${D1.toUpperCase()}/`, "--dry-run").stdout).toContain(`Domínio: ${D1}`);
  const antes = hashes(dir);
  for (const ruim of ["a b", "DOMINIO-FINAL", "x.com/pagina", "localhost", "user@x.com", "x.com:8080"]) {
    const r = rodar(dir, ruim);
    expect(r.status, `"${ruim}" deveria falhar`).not.toBe(0);
    expect(r.stderr).toContain("Erro:");
  }
  expect(spawnSync("node", [SCRIPT, "--site", dir], { encoding: "utf8" }).status).not.toBe(0); // sem domínio
  expect(hashes(dir)).toEqual(antes);
});

test("--help mostra o uso", () => {
  expect(execFileSync("node", [SCRIPT, "--help"], { encoding: "utf8" })).toContain("--dry-run");
});
