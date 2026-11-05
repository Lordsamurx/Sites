// Devolve ao agente a mensagem de recusa (pedido inválido, horário ocupado etc.).
return $input.all().map((i) => ({ json: { resultado: i.json.resultado } }));
