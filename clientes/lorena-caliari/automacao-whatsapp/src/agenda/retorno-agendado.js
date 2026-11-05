// Resposta final do agendamento para o agente.
const p = $('Validar pedido').first().json;
const d = $('Config').first().json;
const ev = $('Criar evento').first().json;

return [{
  json: {
    resultado:
      `Agendado: ${d.procedimento_nome} em ${p.quando} (evento_id: ${ev.id}). ` +
      'Confirme para a paciente o dia, o horário e o endereço, e diga que, se precisar desmarcar, é só avisar por aqui.',
  },
}];
