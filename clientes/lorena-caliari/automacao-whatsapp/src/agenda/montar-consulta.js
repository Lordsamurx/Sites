// Define a janela de datas da consulta (no máximo 14 dias, nunca no passado)
// e monta o pedido de "livre/ocupado" (freeBusy) para o Google Agenda.
const d = $input.first().json;
const cfg = d.cfg;
const z = cfg.fuso;
const agora = DateTime.now().setZone(z);
const hoje = agora.startOf('day');
const limite = hoje.plus({ days: cfg.diasMaximosNoFuturo });

const lerData = (s) => {
  const v = DateTime.fromISO(String(s || '').slice(0, 10), { zone: z });
  return v.isValid ? v.startOf('day') : null;
};

let ini = lerData(d.data_inicio) || hoje;
if (ini < hoje) ini = hoje;
const foraDoLimite = ini > limite;
if (foraDoLimite) ini = limite;

let fim = lerData(d.data_fim) || ini.plus({ days: 6 });
if (fim < ini) fim = ini;
if (fim > limite) fim = limite;
if (fim.diff(ini, 'days').days > 13) fim = ini.plus({ days: 13 });

const janelaFim = fim.endOf('day');

return [{
  json: {
    janela_inicio: ini.toISO(),
    janela_fim: janelaFim.toISO(),
    fora_do_limite: foraDoLimite,
    freebusy: {
      timeMin: ini.toISO(),
      timeMax: janelaFim.toISO(),
      timeZone: z,
      items: [{ id: cfg.agendaId }],
    },
  },
}];
