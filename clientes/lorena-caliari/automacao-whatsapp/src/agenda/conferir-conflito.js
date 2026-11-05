// Segunda checagem, logo antes de criar o evento: o horário ainda está livre?
// (Evita marcar duas pacientes no mesmo horário.)
const cfg = $('Config').first().json.cfg;
const p = $('Validar pedido').first().json;
const resp = $input.first().json;

const cal = Object.values(resp.calendars || {})[0] || {};
if (cal.errors && cal.errors.length) {
  return [{ json: { livre: false, resultado: 'Não consegui confirmar a agenda agora. Peça desculpas e use chamar_lorena.' } }];
}

const s = DateTime.fromISO(p.inicio).toMillis();
const e = DateTime.fromISO(p.fim).toMillis();
const folga = cfg.intervaloEntreAtendimentosMin * 60000;
const conflito = (cal.busy || []).some((b) => {
  const bs = DateTime.fromISO(b.start).toMillis();
  const be = DateTime.fromISO(b.end).toMillis();
  return !(e + folga <= bs || be + folga <= s);
});

return [{
  json: {
    livre: !conflito,
    resultado: conflito ? 'Esse horário acabou de ser ocupado. Use consultar_horarios de novo e ofereça outras opções.' : '',
  },
}];
