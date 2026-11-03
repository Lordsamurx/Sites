# DarkPanel

Painel largo em marrom (`bg-inverse`) com foto ou vídeo ao fundo, revelado por uma máscara da esquerda, e o texto em creme por cima.

## Anatomia
`lc-dark` > `lc-dark__media` + `lc-dark__copy` (metade da largura, recuo `space-16`/`space-20`).
- Dentro dele: `lc-title` em `cream`, `lc-hl` e overline em `gold`, `lc-body` em `sand`.
- Abaixo de 900px a máscara vira vertical e o texto ocupa a largura toda.

## Regras
- O momento de impacto da página (a frase de marca, o método, o resultado): no máximo dois por página e nunca seguidos.
- Foto em tom quente e escuro nas bordas; a máscara não substitui o tratamento da imagem.
- Botão: `lc-btn--on-dark` ou `lc-btn--solid`.
