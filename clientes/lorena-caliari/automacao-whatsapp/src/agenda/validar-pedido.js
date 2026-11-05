// Confere o pedido de agendamento antes de tocar na agenda:
// nome, formato da data, antecedência, limite de dias e expediente.
const d = $input.first().json;
const cfg = d.cfg;
const z = cfg.fuso;
const erro = (m) => [{ json: { ok: false, resultado: m } }];

if (!d.telefone) return erro('Telefone da paciente ausente. Use chamar_lorena.');
if (d.nome.length < 3) return erro('Falta o nome completo da paciente. Pergunte antes de agendar.');

let ini = DateTime.fromISO(d.inicio, { zone: z });
if (!d.inicio || !ini.isValid) {
  return erro('Data e hora inválidas. Use o código AAAA-MM-DDTHH:MM exatamente como veio de consultar_horarios.');
}
ini = ini.set({ second: 0, millisecond: 0 });
const fim = ini.plus({ minutes: d.duracao });
const agora = DateTime.now().setZone(z);

if (ini < agora.plus({ hours: cfg.antecedenciaMinimaHoras })) {
  return erro(`Esse horário já passou ou está muito próximo (antecedência mínima de ${cfg.antecedenciaMinimaHoras} h). Consulte outros horários.`);
}
if (ini >= agora.startOf('day').plus({ days: cfg.diasMaximosNoFuturo + 1 })) {
  return erro(`A agenda só está aberta até ${cfg.diasMaximosNoFuturo} dias à frente. Ofereça uma data mais próxima.`);
}

const hm = (t) => { const [h, m] = t.split(':').map(Number); return { hour: h, minute: m, second: 0, millisecond: 0 }; };
const faixas = cfg.expediente[ini.weekday] || [];
const cabe = faixas.some(([a, b]) => ini >= ini.set(hm(a)) && fim <= ini.set(hm(b)));
if (!cabe) return erro('Esse horário está fora do expediente. Use consultar_horarios e ofereça um dos horários livres.');

const folga = cfg.intervaloEntreAtendimentosMin;
const quando = ini.setLocale('pt-BR').toFormat("cccc, dd/MM/yyyy 'às' HH:mm");

const evento = {
  summary: `${d.procedimento_nome} · ${d.nome}`,
  description:
    'Agendado pelo assistente do WhatsApp.\n' +
    `Paciente: ${d.nome}\n` +
    `WhatsApp: https://wa.me/${d.telefone}\n` +
    `Procedimento: ${d.procedimento_nome} (${d.duracao} min)`,
  start: { dateTime: ini.toISO(), timeZone: z },
  end: { dateTime: fim.toISO(), timeZone: z },
  extendedProperties: { private: { telefone: d.telefone, origem: 'assistente-whatsapp', procedimento: d.procedimento } },
  reminders: { useDefault: true },
};

return [{
  json: {
    ok: true,
    inicio: ini.toISO(),
    fim: fim.toISO(),
    quando,
    evento,
    freebusy: {
      timeMin: ini.minus({ minutes: folga }).toISO(),
      timeMax: fim.plus({ minutes: folga }).toISO(),
      timeZone: z,
      items: [{ id: cfg.agendaId }],
    },
    aviso_lorena:
      `Novo agendamento pelo assistente\n${d.procedimento_nome} · ${quando}\n` +
      `Paciente: ${d.nome}\nWhatsApp: https://wa.me/${d.telefone}`,
  },
}];
