# SplitPanel

Dois quadrados lado a lado: texto num painel branco e foto num painel areia, ambos com `radius-xl`.

## Anatomia
`lc-split` > `lc-split__copy` (`lc-panel__text`: overline + `lc-title`; `lc-panel__foot`: `lc-body` + botão) e `lc-split__media`.
- Desktop: cada lado com `layout-panel` (602px). Recuo do texto: `space-16` em cima e embaixo, `space-18` à direita, `space-20` à esquerda.
- Abaixo de 900px: a foto sobe, o texto desce, 3px entre os dois, `radius-lg`.

## Regras
- O título fica no topo e o rodapé (texto + botão) embaixo: o vazio entre eles é parte do desenho.
- Alterne o lado da foto entre seções seguidas.
- Uma palavra do título em `lc-hl` (itálico dourado).
- Bom para "Sobre a Lorena" (retrato) e para explicar um protocolo.
