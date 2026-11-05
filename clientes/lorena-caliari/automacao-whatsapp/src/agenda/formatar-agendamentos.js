// Lista os próximos agendamentos deste número (só os criados pelo assistente,
// que guardam o telefone no evento).
const cfg = $('Config').first().json.cfg;
const z = cfg.fuso;
const itens = ($input.first().json.items || []).filter((ev) => ev.status !== 'cancelled');

if (!itens.length) {
  return [{
    json: {
      resultado:
        'Nenhum agendamento futuro encontrado para este número de WhatsApp. ' +
        'Se a paciente diz que tem horário (pode ter sido marcado direto com a Lorena ou por outro número), use chamar_lorena.',
    },
  }];
}

const nomeProc = (ev) => {
  const k = ev.extendedProperties?.private?.procedimento;
  return cfg.nomes[k] || String(ev.summary || 'Atendimento').split(' · ')[0];
};

const linhas = itens.map((ev) => {
  const ini = DateTime.fromISO(ev.start?.dateTime || ev.start?.date, { zone: z });
  return `- ${nomeProc(ev)}: ${ini.setLocale('pt-BR').toFormat("cccc, dd/MM/yyyy 'às' HH:mm")} (evento_id: ${ev.id})`;
});

return [{
  json: {
    resultado: `Próximos agendamentos deste número:\n${linhas.join('\n')}\nNão mostre o evento_id para a paciente.`,
  },
}];
