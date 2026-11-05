// Testa o código dos nós "Code" fora do n8n, com o Luxon (o mesmo DateTime do n8n)
// e o relógio fixo em segunda-feira, 09/11/2026, 08:00 (Brasília).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DateTime, Settings } from 'luxon';

const AGORA = DateTime.fromISO('2026-11-09T08:00', { zone: 'America/Sao_Paulo' });
Settings.now = () => AGORA.toMillis();

const fonte = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

// Executa o código como o n8n faz: corpo de função com $input, $ e $json.
function rodar(arquivo, { entrada = [{}], nos = {} } = {}) {
  const itens = entrada.map((json) => ({ json }));
  const $input = { all: () => itens, first: () => itens[0], item: itens[0] };
  const $ = (nome) => {
    if (!(nome in nos)) throw new Error(`nó não simulado: ${nome}`);
    const it = { json: nos[nome] };
    return { first: () => it, item: it, all: () => [it] };
  };
  const fn = new Function('$input', '$', '$json', 'DateTime', fonte(arquivo));
  return fn($input, $, itens[0]?.json, DateTime);
}

const config = (extra = {}) =>
  rodar('agenda/config.js', {
    entrada: [{ acao: 'consultar', telefone: '+55 (31) 98888-7777', phone_number_id: '123', lorena_whatsapp: '5531977776666', ...extra }],
  })[0].json;

// ---------------------------------------------------------------- Config
test('Config normaliza procedimento, duração e telefone', () => {
  const d = config({ procedimento: 'Harmonização Facial' });
  assert.equal(d.procedimento, 'harmonizacao_facial');
  assert.equal(d.duracao, 90);
  assert.equal(d.procedimento_nome, 'Harmonização facial');
  assert.equal(d.telefone, '5531988887777');
  assert.equal(config({ procedimento: '' }).procedimento, 'avaliacao');
  assert.equal(config({ procedimento: 'qualquer coisa' }).duracao, 60);
});

// ---------------------------------------------------------------- consultar
test('Montar consulta não volta ao passado e limita a 14 dias', () => {
  const d = config();
  const p = rodar('agenda/montar-consulta.js', { entrada: [{ ...d, data_inicio: '2026-10-01', data_fim: '2026-12-31' }] })[0].json;
  assert.ok(p.janela_inicio.startsWith('2026-11-09T00:00'));
  assert.ok(p.janela_fim.startsWith('2026-11-22T23:59'));
  assert.equal(p.freebusy.items[0].id, 'primary');
});

function consultar(dataIni, dataFim, busy = [], procedimento = 'avaliacao') {
  const d = config({ procedimento, data_inicio: dataIni, data_fim: dataFim });
  const p = rodar('agenda/montar-consulta.js', { entrada: [d] })[0].json;
  return rodar('agenda/calcular-horarios.js', {
    entrada: [{ calendars: { primary: { busy } } }],
    nos: { Config: d, 'Montar consulta': p },
  })[0].json.resultado;
}
const codigos = (txt) => [...txt.matchAll(/\[(\d{4}-\d\d-\d\dT\d\d:\d\d)\]/g)].map((m) => m[1]);

test('Calcular horários respeita antecedência, expediente e espalha no dia', () => {
  const r = consultar('2026-11-09', '2026-11-09');
  const hs = codigos(r);
  assert.equal(hs.length, 4);
  assert.equal(hs[0], '2026-11-09T10:00'); // agora 08:00 + 2 h de antecedência
  assert.ok(hs.some((h) => h >= '2026-11-09T13:00')); // também oferece tarde
  assert.ok(!hs.includes('2026-11-09T11:30')); // 11:30 + 60 min invade o almoço
  assert.equal(hs.at(-1), '2026-11-09T17:00'); // último que cabe até 18:00
  assert.match(r, /segunda-feira, 09\/11\/2026/);
});

test('Calcular horários evita ocupados com folga de 15 min', () => {
  const busy = [{ start: '2026-11-10T09:00:00-03:00', end: '2026-11-10T17:00:00-03:00' }];
  const hs = codigos(consultar('2026-11-10', '2026-11-10', busy));
  // Ocupado das 9h às 17h: 17:00 começaria sem os 15 min de folga, então nada cabe.
  assert.deepEqual(hs, []);
  const busy2 = [{ start: '2026-11-10T14:00:00-03:00', end: '2026-11-10T15:00:00-03:00' }];
  const d = config({ data_inicio: '2026-11-10', data_fim: '2026-11-10' });
  d.cfg.maxHorariosPorDia = 50;
  const p = rodar('agenda/montar-consulta.js', { entrada: [d] })[0].json;
  const todos = codigos(rodar('agenda/calcular-horarios.js', {
    entrada: [{ calendars: { primary: { busy: busy2 } } }], nos: { Config: d, 'Montar consulta': p },
  })[0].json.resultado);
  assert.ok(todos.includes('2026-11-10T09:00'));
  assert.ok(!todos.includes('2026-11-10T13:00')); // terminaria 14:00, sem folga
  assert.ok(!todos.includes('2026-11-10T14:30'));
  assert.ok(!todos.includes('2026-11-10T15:00')); // começaria sem folga
  assert.ok(todos.includes('2026-11-10T15:30'));
});

test('Domingo fechado e sábado só de manhã', () => {
  const hs = codigos(consultar('2026-11-14', '2026-11-15'));
  assert.ok(hs.length > 0);
  assert.ok(hs.every((h) => h.startsWith('2026-11-14') && h <= '2026-11-14T12:00'));
});

test('Sem horário livre devolve mensagem clara', () => {
  const busy = [{ start: '2026-11-14T00:00:00-03:00', end: '2026-11-16T00:00:00-03:00' }];
  assert.match(consultar('2026-11-14', '2026-11-15', busy), /Nenhum horário livre/);
});

test('Erro do Google na consulta pede para chamar a Lorena', () => {
  const d = config();
  const p = rodar('agenda/montar-consulta.js', { entrada: [d] })[0].json;
  const r = rodar('agenda/calcular-horarios.js', {
    entrada: [{ calendars: { primary: { errors: [{ reason: 'notFound' }] } } }], nos: { Config: d, 'Montar consulta': p },
  })[0].json.resultado;
  assert.match(r, /chamar_lorena/);
});

// ---------------------------------------------------------------- agendar
const validar = (extra) => rodar('agenda/validar-pedido.js', { entrada: [config({ acao: 'agendar', nome: 'Maria Souza', ...extra })] })[0].json;

test('Validar pedido recusa nome, formato, passado, almoço e domingo', () => {
  assert.equal(validar({ nome: '', inicio: '2026-11-10T09:00' }).ok, false);
  assert.equal(validar({ inicio: 'terça às 9' }).ok, false);
  assert.equal(validar({ inicio: '2026-11-09T09:00' }).ok, false); // menos de 2 h
  assert.equal(validar({ inicio: '2026-11-10T11:30' }).ok, false); // invade o almoço
  assert.equal(validar({ inicio: '2026-11-15T10:00' }).ok, false); // domingo
  assert.equal(validar({ inicio: '2027-03-01T10:00' }).ok, false); // além de 60 dias
});

test('Validar pedido monta o evento com telefone e duração', () => {
  const p = validar({ inicio: '2026-11-10T14:00', procedimento: 'microagulhamento' });
  assert.equal(p.ok, true);
  assert.equal(p.evento.summary, 'Microagulhamento · Maria Souza');
  assert.equal(p.evento.extendedProperties.private.telefone, '5531988887777');
  assert.ok(p.evento.start.dateTime.startsWith('2026-11-10T14:00:00.000-03:00'));
  assert.ok(p.evento.end.dateTime.startsWith('2026-11-10T15:30:00.000-03:00'));
  assert.ok(p.freebusy.timeMin.startsWith('2026-11-10T13:45'));
  assert.match(p.quando, /terça-feira, 10\/11\/2026 às 14:00/);
  // aceita também horário com fuso explícito
  assert.equal(validar({ inicio: '2026-11-10T17:00:00Z' }).ok, true); // 14:00 em Brasília
});

test('Conferir conflito detecta encosto sem folga', () => {
  const d = config();
  const p = validar({ inicio: '2026-11-10T14:00' });
  const conf = (busy) => rodar('agenda/conferir-conflito.js', {
    entrada: [{ calendars: { primary: { busy } } }], nos: { Config: d, 'Validar pedido': p },
  })[0].json.livre;
  assert.equal(conf([]), true);
  assert.equal(conf([{ start: '2026-11-10T15:00:00-03:00', end: '2026-11-10T16:00:00-03:00' }]), false);
  assert.equal(conf([{ start: '2026-11-10T13:45:00-03:00', end: '2026-11-10T14:00:00-03:00' }]), false);
  assert.equal(conf([{ start: '2026-11-10T13:00:00-03:00', end: '2026-11-10T13:45:00-03:00' }]), true);
});

// ---------------------------------------------------------------- listar e cancelar
test('Formatar agendamentos lista e esconde cancelados', () => {
  const d = config();
  const r = rodar('agenda/formatar-agendamentos.js', {
    entrada: [{ items: [
      { id: 'a1', status: 'confirmed', summary: 'Avaliação · Maria', start: { dateTime: '2026-11-10T14:00:00-03:00' }, extendedProperties: { private: { procedimento: 'avaliacao' } } },
      { id: 'a2', status: 'cancelled', summary: 'Peeling · Maria', start: { dateTime: '2026-11-11T14:00:00-03:00' } },
    ] }],
    nos: { Config: d },
  })[0].json.resultado;
  assert.match(r, /Avaliação: terça-feira, 10\/11\/2026 às 14:00 \(evento_id: a1\)/);
  assert.doesNotMatch(r, /a2/);
  const vazio = rodar('agenda/formatar-agendamentos.js', { entrada: [{ items: [] }], nos: { Config: d } })[0].json.resultado;
  assert.match(vazio, /Nenhum agendamento/);
});

test('Conferir dono só cancela evento do próprio número e com antecedência', () => {
  const d = config({ acao: 'cancelar', evento_id: 'a1' });
  const ev = (telefone, inicio) => ({ statusCode: 200, body: { id: 'a1', status: 'confirmed', summary: 'Avaliação · Maria Souza', start: { dateTime: inicio }, extendedProperties: { private: { telefone, procedimento: 'avaliacao' } } } });
  const conf = (r, dd = d) => rodar('agenda/conferir-dono.js', { entrada: [r], nos: { Config: dd } })[0].json;
  assert.equal(conf(ev('5531911112222', '2026-11-12T10:00:00-03:00')).ok, false); // outro número
  assert.equal(conf(ev('5531988887777', '2026-11-09T15:00:00-03:00')).ok, false); // menos de 12 h
  assert.equal(conf(ev('5531988887777', '2026-11-08T15:00:00-03:00')).ok, false); // já passou
  assert.equal(conf({ statusCode: 404, body: { error: {} } }).ok, false);
  assert.equal(conf(ev('5531988887777', '2026-11-12T10:00:00-03:00'), config({ acao: 'cancelar' })).ok, false); // sem evento_id
  const ok = conf(ev('5531988887777', '2026-11-12T10:00:00-03:00'));
  assert.equal(ok.ok, true);
  assert.match(ok.aviso_lorena, /Maria Souza/);
});

// ---------------------------------------------------------------- agente
const webhook = (msg, extra = {}) => ({
  messaging_product: 'whatsapp',
  metadata: { display_phone_number: '553130000000', phone_number_id: 'PNID' },
  contacts: [{ profile: { name: 'Ana' }, wa_id: msg.from }],
  messages: [msg],
  field: 'messages',
  ...extra,
});
const normalizar = (json) => rodar('agente/normalizar.js', { entrada: [json] }).map((i) => i.json);
const comLorena = (codigo) => codigo.replace("const LORENA_WHATSAPP = '55XXXXXXXXXXX'", "const LORENA_WHATSAPP = '5531977776666'");

test('Normalizar ignora status de entrega e reações', () => {
  assert.deepEqual(normalizar({ metadata: {}, statuses: [{ status: 'read' }], field: 'messages' }), []);
  assert.deepEqual(normalizar(webhook({ from: '5531988887777', id: 'w1', type: 'reaction', reaction: { emoji: 'x' } })), []);
});

test('Normalizar texto, áudio, imagem e corpo bruto da Meta', () => {
  const [t] = normalizar(webhook({ from: '5531988887777', id: 'w1', type: 'text', text: { body: ' Olá, Lorena! Quero saber mais sobre skinbooster. ' } }));
  assert.equal(t.rota, 'texto');
  assert.equal(t.texto, 'Olá, Lorena! Quero saber mais sobre skinbooster.');
  assert.equal(t.nome, 'Ana');
  assert.equal(t.phone_number_id, 'PNID');
  const [a] = normalizar(webhook({ from: '5531988887777', id: 'w2', type: 'audio', audio: { id: 'MID' } }));
  assert.equal(a.rota, 'audio');
  assert.equal(a.midia_id, 'MID');
  const [i] = normalizar(webhook({ from: '5531988887777', id: 'w3', type: 'image', image: { id: 'x' } }));
  assert.match(i.texto, /imagem sem texto/);
  const bruto = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: webhook({ from: '5531988887777', id: 'w4', type: 'text', text: { body: 'oi' } }) }] }] };
  assert.equal(normalizar({ body: bruto })[0].texto, 'oi');
});

test('Comandos da Lorena, inclusive com o número sem o nono dígito', () => {
  const fn = new Function('$input', '$', '$json', 'DateTime', comLorena(fonte('agente/normalizar.js')));
  const rodarCmd = (from, body) => fn({ all: () => [{ json: webhook({ from, id: 'c', type: 'text', text: { body } }) }] }, null, null, DateTime)[0].json;
  const p = rodarCmd('553177776666', '#pausar +55 31 98888-7777');
  assert.equal(p.rota, 'comando');
  assert.equal(p.comando_valido, true);
  assert.equal(p.comando_alvo, '5531988887777');
  assert.equal(p.comando_pausar, 'sim');
  assert.equal(rodarCmd('5531977776666', '#retomar 5531988887777').comando_pausar, 'nao');
  assert.equal(rodarCmd('5531977776666', '#ajuda').comando_valido, false);
  // a Lorena escrevendo sem # é tratada como conversa normal (serve para testar)
  assert.equal(rodarCmd('5531977776666', 'quero agendar').rota, 'texto');
  // outra pessoa mandando # não vira comando
  assert.equal(rodarCmd('5531988887777', '#pausar 5531911112222').rota, 'texto');
});

test('Situação do lead: novo, existente e pausado', () => {
  const msg = { telefone: '5531988887777', texto: 'oi' };
  const sit = (linha) => rodar('agente/situacao-lead.js', { entrada: [linha], nos: { 'Mensagem pronta': msg } })[0].json;
  const novo = sit({});
  assert.equal(novo.lead_novo, true);
  assert.equal(novo.bot_pausado, false);
  assert.equal(novo.primeiro_contato, '2026-11-09 08:00');
  const antigo = sit({ telefone: '5531988887777', primeiro_contato: '2026-10-01 10:00', bot_pausado: 'Sim' });
  assert.equal(antigo.lead_novo, false);
  assert.equal(antigo.bot_pausado, true);
  assert.equal(antigo.primeiro_contato, '2026-10-01 10:00');
});

test('Texto do áudio usa a transcrição ou pede para digitar', () => {
  const base = { telefone: '5531988887777', rota: 'audio', texto: '' };
  const fn = (json) => new Function('$input', '$', '$json', 'DateTime', fonte('agente/texto-audio.js'))(null, () => ({ item: { json: base } }), json, DateTime).json;
  assert.equal(fn({ text: 'quero marcar uma avaliação' }).texto, '[Áudio transcrito] quero marcar uma avaliação');
  assert.equal(fn({ text: 'quero' }).rota, 'texto');
  assert.match(fn({ error: 'falhou' }).texto, /não foi possível transcrever/);
});
