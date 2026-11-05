// Servidor estático mínimo para os testes e o Lighthouse (sem dependências).
// Uso: node tests/server.js [porta] [pasta]   (padrão: 4173 e ../site)
// Com GZIP=1 comprime HTML/CSS/JS/SVG, como faria a hospedagem.
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const port = Number(process.argv[2] || process.env.PORT || 4173);
const root = path.resolve(process.argv[3] || path.join(__dirname, "..", "site"));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon" };
const gzip = process.env.GZIP === "1";

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }).end("404"); return; }
    const ext = path.extname(file).toLowerCase();
    const headers = { "Content-Type": types[ext] || "application/octet-stream", "Cache-Control": p.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache" };
    if (gzip && /\.(html|css|js|svg|json|xml|txt)$/.test(ext) && /gzip/.test(req.headers["accept-encoding"] || "")) {
      headers["Content-Encoding"] = "gzip"; res.writeHead(200, headers).end(zlib.gzipSync(buf)); return;
    }
    res.writeHead(200, headers).end(buf);
  });
}).listen(port, () => console.log(`Servindo ${root} em http://localhost:${port}`));
