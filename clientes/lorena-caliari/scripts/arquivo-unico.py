# Gera Lorena-Caliari-Home.html: a home em um arquivo só (CSS, fontes e imagens embutidos), para abrir no PC sem servidor.
# Uso: python3 scripts/arquivo-unico.py   (rodar de novo sempre que mudar algo em site/)
import base64, re, os, sys
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "..", "Lorena-Caliari-Home.html")
mime = {".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml"}
def data(rel):
    p = os.path.normpath(os.path.join(SITE, rel))
    return f"data:{mime[os.path.splitext(p)[1]]};base64," + base64.b64encode(open(p, "rb").read()).decode()

html = open(f"{SITE}/index.html", encoding="utf-8").read()
# CSS inline (fontes do fonts.css apontam para ../assets/fonts)
def css_inline(m):
    href = m.group(1); css = open(f"{SITE}/{href}", encoding="utf-8").read()
    css = re.sub(r'url\("\.\./(assets/[^"]+)"\)', lambda u: f'url("{data(u.group(1))}")', css)
    return f"<style>/* {href} */\n{css}\n</style>"
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_inline, html)
# preloads e script de preload de fontes não fazem sentido num arquivo único
html = re.sub(r'<link rel="preload"[^>]*>\n?', "", html)
html = re.sub(r'  if \(location\.protocol !== "file:"\)[\s\S]*?\}\);\n', "", html, count=1)
# imagens em atributos src / srcset / href de ícone
html = re.sub(r'(src|href)="(assets/[^"]+\.(?:webp|png))"', lambda m: f'{m.group(1)}="{data(m.group(2))}"', html)
html = re.sub(r'srcset="[^"]*"', lambda m: re.sub(r'(assets/[^ ,"]+\.webp)', lambda u: data(u.group(1)), m.group(0)), html)
# quadros do hero: tabela de data URIs no lugar do caminho
frames = sorted(f for f in os.listdir(f"{SITE}/assets/frames") if re.fullmatch(r"h-\d{3}\.webp", f))
table = "window.__FRAMES__=[" + ",".join(f'"{data("assets/frames/" + f)}"' for f in frames) + "];"
html = html.replace("<script>\n  // ===== Dados que dependem da Lorena", f"<script>{table}</script>\n<script>\n  // ===== Dados que dependem da Lorena", 1)
old = '`assets/frames/h-${String(i).padStart(3, "0")}.webp`'
assert old in html
html = html.replace(old, "window.__FRAMES__[i]")
open(OUT, "w", encoding="utf-8").write(html)
print(OUT, round(os.path.getsize(OUT) / 1024 / 1024, 2), "MB", len(frames), "quadros")
