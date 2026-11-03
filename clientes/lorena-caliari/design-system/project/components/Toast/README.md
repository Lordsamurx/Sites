# Toast

Notificação flutuante de vidro branco, com borda em degradê dourado, que entra com um pequeno salto.

## Anatomia
`lc-toast` > `lc-toast__icon` (bloco `accent` com o brilho) + `lc-toast__text` (`lc-toast__title` em CAIXA ALTA e `lc-toast__sub`).

## Uso
- Decorativo no hero, sobre a foto: simula a confirmação de um agendamento. Marque com `aria-hidden="true"`.
- `lc-toast--enter` anima a entrada (900ms, `--ease-pop`); em sequência, troque a mensagem a cada ~4,5s.
- Parado com movimento reduzido.
