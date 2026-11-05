// Cruza o expediente com os horários ocupados do Google Agenda
// e devolve opções livres, espalhadas ao longo de cada dia.
const d = $('Config').first().json;
const cfg = d.cfg;
const p = $('Montar consulta').first().json;
const resp = $input.first().json;
const z = cfg.fuso;

const cal = Object.values(resp.calendars || {})[0] || {};
if (cal.errors && cal.errors.length) {
  return [{ json: { resultado: 'Não consegui ler a agenda agora. Peça desculpas e use chamar_lorena para ela confirmar o horário pessoalmente.' } }];
}

const ocupados = (cal.busy || []).map((b) => ({
  s: DateTime.fromISO(b.start).toMillis(),
  e: DateTime.fromISO(b.end).toMillis(),
}));
const folga = cfg.intervaloEntreAtendimentosMin * 60000;
const livre = (s, e) => ocupados.every((b) => e + folga <= b.s || b.e + folga <= s);
const hm = (t) => { const [h, m] = t.split(':').map(Number); return { hour: h, minute: m, second: 0, millisecond: 0 }; };

const agora = DateTime.now().setZone(z);
const minimo = agora.plus({ hours: cfg.antecedenciaMinimaHoras });
const dur = d.duracao;

// Escolhe k itens espalhados (manhã e tarde) em vez dos k primeiros.
function espalhar(lista, k) {
  if (lista.length <= k) return lista;
  const out = [];
  for (let i = 0; i < k; i++) out.push(lista[Math.round((i * (lista.length - 1)) / (k - 1))]);
  return out;
}

const dias = [];
let total = 0;
let dia = DateTime.fromISO(p.janela_inicio, { zone: z }).startOf('day');
const ultimo = DateTime.fromISO(p.janela_fim, { zone: z }).startOf('day');

while (dia <= ultimo && total < cfg.maxHorariosPorConsulta) {
  const faixas = cfg.expediente[dia.weekday] || [];
  const opcoes = [];
  for (const [a, b] of faixas) {
    let s = dia.set(hm(a));
    const fimFaixa = dia.set(hm(b));
    while (s.plus({ minutes: dur }) <= fimFaixa) {
      const e = s.plus({ minutes: dur });
      if (s >= minimo && livre(s.toMillis(), e.toMillis())) opcoes.push(s);
      s = s.plus({ minutes: cfg.passoMinutos });
    }
  }
  if (opcoes.length) {
    const k = Math.min(cfg.maxHorariosPorDia, cfg.maxHorariosPorConsulta - total);
    const escolhidos = espalhar(opcoes, k);
    dias.push({ dia, horarios: escolhidos });
    total += escolhidos.length;
  }
  dia = dia.plus({ days: 1 });
}

const fmtDia = (x) => x.setLocale('pt-BR').toFormat("cccc, dd/MM/yyyy");
const ini = DateTime.fromISO(p.janela_inicio, { zone: z });
const fim = DateTime.fromISO(p.janela_fim, { zone: z });

if (!dias.length) {
  const extra = p.fora_do_limite ? ` A agenda só está aberta até ${cfg.diasMaximosNoFuturo} dias à frente.` : '';
  return [{ json: { resultado: `Nenhum horário livre para ${d.procedimento_nome} (${dur} min) entre ${fmtDia(ini)} e ${fmtDia(fim)}.${extra} Ofereça consultar outro período.` } }];
}

const linhas = dias.map(({ dia: x, horarios }) =>
  `- ${fmtDia(x)}: ` + horarios.map((h) => `${h.toFormat('HH:mm')} [${h.toFormat("yyyy-MM-dd'T'HH:mm")}]`).join(', ')
);

return [{
  json: {
    resultado:
      `Horários livres para ${d.procedimento_nome} (${dur} min):\n` + linhas.join('\n') +
      '\nO valor entre colchetes é o código para a ferramenta agendar. Não mostre o código para a paciente; ofereça de 2 a 4 opções em linguagem natural.',
  },
}];
