#!/usr/bin/env python3
"""Define o domínio final do site da Lorena Caliari.

Uso (a partir de clientes/lorena-caliari):
    python3 scripts/definir-dominio.py lorenacaliari.com.br --dry-run   # só mostra o que mudaria
    python3 scripts/definir-dominio.py lorenacaliari.com.br             # aplica

O que faz (só com biblioteca padrão do Python, sem dependências):
  1. site/index.html: ativa e preenche canonical, og:url e og:image (tira o bloco do comentário TODO);
  2. site/index.html: preenche "url" no JSON-LD;
  3. site/robots.txt: ativa a linha Sitemap;
  4. site/sitemap.xml: gera a partir de site/sitemap.exemplo.xml (o exemplo não é alterado).

Idempotente: rodar de novo com o mesmo domínio não muda nada; com outro domínio, troca o anterior.
Sempre usa https. O domínio nunca é inventado: ele é obrigatório e vem da linha de comando.
"""
import argparse
import difflib
import os
import re
import sys

PLACEHOLDER = "DOMINIO-FINAL"
# Rótulo de host (DNS): letras, números e hífen; precisa de ao menos um ponto (ou ser localhost) e porta opcional.
HOST_RE = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(:\d{1,5})?$|^localhost(:\d{1,5})?$")


def normalizar_dominio(bruto):
    """Aceita 'exemplo.com.br', 'https://exemplo.com.br/' ou 'www.exemplo.com.br'; recusa caminho, espaço e o placeholder."""
    d = bruto.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = d.rstrip("/")
    if not d or PLACEHOLDER.lower() in d:
        raise ValueError("informe o domínio real (não o placeholder %s)" % PLACEHOLDER)
    if "/" in d or "?" in d or "#" in d or " " in d or "@" in d:
        raise ValueError("use só o domínio, sem caminho, espaço ou parâmetros: %r" % bruto)
    if not HOST_RE.match(d):
        raise ValueError("domínio inválido: %r" % bruto)
    return d


def ler(caminho):
    # newline="" preserva o fim de linha original (LF ou CRLF) ao gravar de volta
    with open(caminho, encoding="utf-8", newline="") as f:
        return f.read()


def gravar(caminho, texto):
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        f.write(texto)


def eol_de(texto):
    return "\r\n" if "\r\n" in texto else "\n"


def alvo_index(html, base):
    """Retorna (novo_html, avisos)."""
    avisos = []
    eol = eol_de(html)
    ativo = (
        '<link rel="canonical" href="%s/">' % base,
        '<meta property="og:url" content="%s/">' % base,
        '<meta property="og:image" content="%s/assets/og.jpg">' % base,
    )

    # 1) Se ainda estiver no comentário TODO, tira as três linhas de dentro dele.
    bloco = re.compile(
        r'<!-- TODO \(URL final\)[^\r\n]*\r?\n'
        r'(?P<corpo>(?:<link rel="canonical"[^\r\n]*\r?\n)(?:<meta property="og:url"[^\r\n]*\r?\n)(?:<meta property="og:image"[^\r\n]*\r?\n))'
        r'-->\r?\n'
    )
    m = bloco.search(html)
    if m:
        html = html[:m.start()] + eol.join(ativo) + eol + html[m.end():]

    # 2) Tags já ativas (inclusive de uma rodada anterior): só atualiza o valor, sem duplicar.
    regras = [
        (r'<link rel="canonical" href="[^"]*">', ativo[0]),
        (r'<meta property="og:url" content="[^"]*">', ativo[1]),
        (r'<meta property="og:image" content="[^"]*">', ativo[2]),
    ]
    for padrao, novo in regras:
        achados = re.findall(padrao, html)
        if len(achados) == 0:
            raise RuntimeError("não encontrei no index.html a tag: %s" % novo.split(" ")[1])
        if len(achados) > 1:
            raise RuntimeError("tag duplicada no index.html (%d vezes): %s" % (len(achados), novo))
        html = re.sub(padrao, lambda _m, n=novo: n, html, count=1)

    # 3) JSON-LD: "url" logo depois de "description"; se já existir, só troca o valor.
    ld = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', html, re.S)
    if not ld:
        raise RuntimeError("bloco JSON-LD não encontrado no index.html")
    corpo = ld.group(2)
    linha_url = '  "url": "%s/",' % base
    if re.search(r'^  "url":', corpo, re.M):
        corpo = re.sub(r'^  "url":[^\r\n]*', lambda _m: linha_url, corpo, count=1, flags=re.M)
    else:
        corpo, n = re.subn(r'(^  "description":[^\r\n]*)', lambda m2: m2.group(1) + eol + linha_url, corpo, count=1, flags=re.M)
        if n != 1:
            raise RuntimeError('não achei a linha "description" no JSON-LD para inserir o "url"')
    html = html[:ld.start(2)] + corpo + html[ld.end(2):]
    return html, avisos


def alvo_robots(txt, base):
    eol = eol_de(txt)
    linha = "Sitemap: %s/sitemap.xml" % base
    if re.search(r"^Sitemap:", txt, re.M):
        return re.sub(r"^Sitemap:[^\r\n]*", lambda _m: linha, txt, count=1, flags=re.M)
    # Ainda comentada: tira o '# ' e o comentário TODO que mandava fazer isso.
    novo, n = re.subn(r"^# Sitemap:[^\r\n]*", lambda _m: linha, txt, count=1, flags=re.M)
    if n != 1:
        raise RuntimeError("não encontrei a linha '# Sitemap:' nem 'Sitemap:' no robots.txt")
    novo = re.sub(r"^# TODO \(URL final\):[^\r\n]*\r?\n", "", novo, count=1, flags=re.M)
    return novo


def alvo_sitemap(exemplo, base):
    # O comentário "Modelo..." só faz sentido no exemplo; no sitemap final ele sai.
    sem_modelo = re.sub(r"<!-- Modelo\..*?-->\r?\n", "", exemplo, count=1, flags=re.S)
    if PLACEHOLDER not in sem_modelo:
        raise RuntimeError("o modelo sitemap.exemplo.xml não tem %s para trocar" % PLACEHOLDER)
    return sem_modelo.replace(PLACEHOLDER, base[len("https://"):])


def mostrar_diff(nome, antigo, novo):
    d = list(difflib.unified_diff(
        antigo.splitlines(), novo.splitlines(), fromfile="%s (atual)" % nome, tofile="%s (novo)" % nome, lineterm="", n=0))
    for linha in d:
        print("   " + (linha if len(linha) < 220 else linha[:217] + "..."))


def main():
    # Console do Windows costuma usar cp1252; força UTF-8 para os acentos saírem certos.
    for fluxo in (sys.stdout, sys.stderr):
        if hasattr(fluxo, "reconfigure"):
            fluxo.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Define o domínio final em index.html, robots.txt e sitemap.xml.")
    ap.add_argument("dominio", help="domínio final, ex.: exemplo.com.br (https é sempre usado)")
    ap.add_argument("--dry-run", action="store_true", help="só mostra o que mudaria, sem gravar nada")
    ap.add_argument("--site", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site"),
                    help="pasta do site (padrão: ../site); útil para testar numa cópia")
    args = ap.parse_args()

    try:
        host = normalizar_dominio(args.dominio)
    except ValueError as e:
        print("Erro: %s" % e, file=sys.stderr)
        return 2
    base = "https://" + host
    site = os.path.normpath(args.site)

    caminhos = {
        "index.html": os.path.join(site, "index.html"),
        "robots.txt": os.path.join(site, "robots.txt"),
        "sitemap.exemplo.xml": os.path.join(site, "sitemap.exemplo.xml"),
        "sitemap.xml": os.path.join(site, "sitemap.xml"),
    }
    for nome in ("index.html", "robots.txt", "sitemap.exemplo.xml"):
        if not os.path.isfile(caminhos[nome]):
            print("Erro: arquivo não encontrado: %s" % caminhos[nome], file=sys.stderr)
            return 1

    try:
        # Tudo é calculado antes de gravar: se algo falhar, nenhum arquivo é alterado.
        atual = {n: ler(caminhos[n]) for n in ("index.html", "robots.txt", "sitemap.exemplo.xml")}
        atual["sitemap.xml"] = ler(caminhos["sitemap.xml"]) if os.path.isfile(caminhos["sitemap.xml"]) else None
        novo = {}
        novo["index.html"], _ = alvo_index(atual["index.html"], base)
        novo["robots.txt"] = alvo_robots(atual["robots.txt"], base)
        novo["sitemap.xml"] = alvo_sitemap(atual["sitemap.exemplo.xml"], base)
    except RuntimeError as e:
        print("Erro: %s. Nada foi alterado." % e, file=sys.stderr)
        return 1

    print("Domínio: %s%s" % (base, "  [dry-run: nada será gravado]" if args.dry_run else ""))
    mudou = 0
    for nome in ("index.html", "robots.txt", "sitemap.xml"):
        if atual[nome] == novo[nome]:
            print(" = %s: já está certo, sem mudanças" % nome)
            continue
        mudou += 1
        print(" ~ %s: %s" % (nome, "seria criado" if atual[nome] is None and args.dry_run
                             else "criado" if atual[nome] is None else "seria alterado" if args.dry_run else "alterado"))
        if args.dry_run:
            mostrar_diff(nome, atual[nome] or "", novo[nome])
        else:
            gravar(caminhos[nome], novo[nome])

    if not os.path.isfile(os.path.join(site, "assets", "og.jpg")):
        print("\nAtenção: og:image aponta para %s/assets/og.jpg, mas site/assets/og.jpg ainda não existe "
              "(criar a imagem 1200x630; ver Pendências no README)." % base)
    if mudou == 0:
        print("\nNada a fazer.")
    elif args.dry_run:
        print("\nDry-run: %d arquivo(s) mudariam. Rode sem --dry-run para aplicar." % mudou)
    else:
        print("\n%d arquivo(s) atualizado(s)." % mudou)
    return 0


if __name__ == "__main__":
    sys.exit(main())
