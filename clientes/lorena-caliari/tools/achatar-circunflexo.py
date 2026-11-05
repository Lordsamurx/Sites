"""Achata o circunflexo minúsculo da Cormorant Garamond (â, ê, ô) nos arquivos do site.

Por quê: na Cormorant o circunflexo minúsculo é um chevron alto e fino (472 a 730 unidades,
acima até da altura das maiúsculas, 625). Em títulos grandes ("você") ele parece solto do "e".
Isto não troca a fonte: só reduz a altura do contorno do acento (base fixa) no mesmo arquivo,
inclusive nas variações de peso (gvar). A licença SIL OFL permite modificar a fonte.

Uso (uma vez, a partir dos arquivos originais do Google Fonts):
    python3 tools/achatar-circunflexo.py site/assets/fonts/cormorant-garamond.woff2 site/assets/fonts/cormorant-garamond-italic.woff2
Requer: pip install fonttools brotli
"""
import sys
from fontTools.ttLib import TTFont

import os
FATOR = float(os.environ.get("FATOR", "0.66"))       # altura final do acento / altura original
DESCER = int(os.environ.get("DESCER", "32"))        # quanto a base do acento desce, em unidades (1000 por em)
GLIFOS = ["acircumflex", "ecircumflex", "ocircumflex", "icircumflex", "ucircumflex"]

for caminho in sys.argv[1:]:
    fonte = TTFont(caminho)
    glyf, gvar = fonte["glyf"], fonte["gvar"]
    for nome in GLIFOS:
        g = glyf[nome]
        coords = g.getCoordinates(glyf)[0]
        inicio, pontos = 0, []
        for fim in g.endPtsOfContours:           # contorno do acento: todo acima da altura x
            ys = [coords[i][1] for i in range(inicio, fim + 1)]
            if min(ys) > 420: pontos += list(range(inicio, fim + 1))
            inicio = fim + 1
        if not pontos: continue
        base = min(coords[i][1] for i in pontos)
        if max(coords[i][1] for i in pontos) - base < 220:   # já achatado: não aplica de novo
            print("já ajustado:", nome); continue
        for i in pontos:
            x, y = coords[i]
            coords[i] = (x, round(base - DESCER + (y - base) * FATOR))
        g.coordinates = coords
        g.recalcBounds(glyf)
        for var in gvar.variations.get(nome, []):   # as variações de peso acompanham a escala
            for i in pontos:
                d = var.coordinates[i]
                if d is not None: var.coordinates[i] = (d[0], round(d[1] * FATOR))
    fonte.save(caminho)
    print("ok:", caminho)
