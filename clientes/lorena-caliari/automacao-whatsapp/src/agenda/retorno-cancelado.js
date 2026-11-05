// Resposta final do cancelamento para o agente.
const p = $('Conferir dono').first().json;
return [{
  json: {
    resultado: `Cancelado: ${p.procedimento_nome} de ${p.quando}. Confirme o cancelamento e ofereça remarcar, sem insistir.`,
  },
}];
