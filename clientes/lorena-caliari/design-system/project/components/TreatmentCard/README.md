# TreatmentCard

Cartão branco de tratamento: título curto em serifa, uma frase e uma foto quadrada que amplia e ganha um brilho dourado no hover.

## Anatomia
- `lc-card` > `lc-card__content` (`lc-card__title` + `lc-card__desc`) > `lc-card__media` (`lc-card__layer` com a `<img>` + `lc-card__glow`).
- Grade: `lc-cards`, três colunas, `space-12` entre linhas e `space-8` entre colunas; uma coluna abaixo de 900px.

## Regras
- Nome do tratamento em caixa normal (`display-card`, 34px): "Bioestimuladores", "Skinbooster". Nomes longos não cabem em CAIXA ALTA na coluna.
- Descrição de até ~90 caracteres, em `text-secondary`, falando de resultado e sensação, sem promessa médica.
- Foto: pele real, luz suave e quente, fundo areia; sem antes e depois no cartão.
- Hover: a foto amplia 6,25% em 800ms (`--ease-soft`) e o brilho dourado segue o cursor (`--mx`/`--my`). Sem brilho no mobile.

## O que o consumidor fornece
Título, descrição, foto com `alt` e o script de 3 linhas do brilho (veja a prévia).
