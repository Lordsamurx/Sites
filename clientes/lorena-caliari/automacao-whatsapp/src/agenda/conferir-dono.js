// Antes de cancelar: o evento existe, é deste número, é futuro
// e respeita a antecedência mínima para cancelar pelo assistente.
const d = $('Config').first().json;
const cfg = d.cfg;
const z = cfg.fuso;
const r = $input.first().json;
const ev = r.body && typeof r.body === 'object' ? r.body : {};
const erro = (m) => [{ json: { ok: false, resultado: m } }];
const digitos = (v) => String(v || '').replace(/\D/g, '');

if (!d.evento_id) return erro('Falta o evento_id. Use listar_meus_agendamentos primeiro.');
if (r.statusCode !== 200 || !ev.id || ev.status === 'cancelled') {
  return erro('Agendamento não encontrado ou já cancelado. Use listar_meus_agendamentos para ver os atuais.');
}
if (digitos(ev.extendedProperties?.private?.telefone) !== digitos(d.telefone)) {
  return erro('Esse agendamento não pertence a este número. Não cancele. Use listar_meus_agendamentos.');
}

const ini = DateTime.fromISO(ev.start?.dateTime || ev.start?.date, { zone: z });
const agora = DateTime.now().setZone(z);
if (ini <= agora) return erro('Esse agendamento já passou e não pode ser cancelado.');

const quando = ini.setLocale('pt-BR').toFormat("cccc, dd/MM/yyyy 'às' HH:mm");
const proc = cfg.nomes[ev.extendedProperties?.private?.procedimento] || String(ev.summary || 'Atendimento').split(' · ')[0];

if (ini.diff(agora, 'hours').hours < cfg.cancelamentoAutomaticoAteHoras) {
  return erro(
    `Faltam menos de ${cfg.cancelamentoAutomaticoAteHoras} horas para ${proc} (${quando}). ` +
    'Não cancele pelo assistente: use chamar_lorena com o motivo "cancelamento em cima da hora" e avise a paciente que a Lorena vai responder.'
  );
}

const paciente = String(ev.summary || '').split(' · ')[1] || 'paciente';
return [{
  json: {
    ok: true,
    evento_id: ev.id,
    quando,
    procedimento_nome: proc,
    aviso_lorena: `Cancelamento pelo assistente\n${proc} · ${quando}\nPaciente: ${paciente}\nWhatsApp: https://wa.me/${d.telefone}\nO horário ficou livre na agenda.`,
  },
}];
