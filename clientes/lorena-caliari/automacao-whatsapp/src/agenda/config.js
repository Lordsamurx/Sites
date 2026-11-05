// =====================================================================
// CONFIGURAÇÃO DA AGENDA DA LORENA
// Valores marcados com "EXEMPLO" ainda precisam ser confirmados com ela.
// =====================================================================
const CONFIG = {
  fuso: 'America/Sao_Paulo',

  // ID da agenda do Google. "primary" = agenda principal da conta conectada.
  // Para usar uma agenda separada ("Atendimentos"), cole o ID dela aqui
  // (Configurações da agenda > Integrar agenda > ID da agenda).
  agendaId: 'primary',

  // Expediente por dia da semana: 1 = segunda ... 6 = sábado, 7 = domingo.
  // Dia sem entrada = fechado. Pausas (almoço) = duas faixas no mesmo dia.
  // EXEMPLO: confirmar com a Lorena.
  expediente: {
    1: [['09:00', '12:00'], ['13:00', '18:00']],
    2: [['09:00', '12:00'], ['13:00', '18:00']],
    3: [['09:00', '12:00'], ['13:00', '18:00']],
    4: [['09:00', '12:00'], ['13:00', '18:00']],
    5: [['09:00', '12:00'], ['13:00', '18:00']],
    6: [['09:00', '13:00']],
  },

  // Duração de cada atendimento em minutos. EXEMPLO: confirmar com a Lorena.
  duracoes: {
    avaliacao: 60,
    retorno: 30,
    bioestimuladores: 60,
    skinbooster: 60,
    harmonizacao_facial: 90,
    limpeza_de_pele: 90,
    peeling: 60,
    microagulhamento: 90,
  },
  duracaoPadrao: 60,

  // Nome que aparece no evento e nas mensagens.
  nomes: {
    avaliacao: 'Avaliação',
    retorno: 'Retorno',
    bioestimuladores: 'Bioestimuladores',
    skinbooster: 'Skinbooster',
    harmonizacao_facial: 'Harmonização facial',
    limpeza_de_pele: 'Limpeza de pele',
    peeling: 'Peeling',
    microagulhamento: 'Microagulhamento',
  },

  intervaloEntreAtendimentosMin: 15, // folga para limpar a sala e preparar a próxima
  passoMinutos: 30,                  // de quanto em quanto tempo oferecer horários
  antecedenciaMinimaHoras: 2,        // não agenda para daqui a menos de 2 h
  diasMaximosNoFuturo: 60,           // agenda aberta até 60 dias à frente
  maxHorariosPorDia: 4,              // quantos horários sugerir por dia
  maxHorariosPorConsulta: 12,        // total por consulta (o agente oferece 2 a 4)
  cancelamentoAutomaticoAteHoras: 12, // com menos que isso, quem decide é a Lorena (EXEMPLO)
};

// ---------------------------------------------------------------------
const e = $input.first().json;
const txt = (v) => (v === null || v === undefined ? '' : String(v).trim());
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function chaveProcedimento(p) {
  const s = semAcento(txt(p));
  if (!s) return 'avaliacao';
  if (s.includes('avalia')) return 'avaliacao';
  if (s.includes('retorno')) return 'retorno';
  if (s.includes('bioestim')) return 'bioestimuladores';
  if (s.includes('skin')) return 'skinbooster';
  if (s.includes('harmoniz')) return 'harmonizacao_facial';
  if (s.includes('limpeza')) return 'limpeza_de_pele';
  if (s.includes('peeling')) return 'peeling';
  if (s.includes('microagulh')) return 'microagulhamento';
  return 'avaliacao';
}

const chave = chaveProcedimento(e.procedimento);

return [{
  json: {
    acao: semAcento(txt(e.acao)),
    telefone: txt(e.telefone).replace(/\D/g, ''),
    nome: txt(e.nome),
    procedimento: chave,
    procedimento_nome: CONFIG.nomes[chave] || chave,
    duracao: CONFIG.duracoes[chave] || CONFIG.duracaoPadrao,
    data_inicio: txt(e.data_inicio),
    data_fim: txt(e.data_fim),
    inicio: txt(e.inicio),
    evento_id: txt(e.evento_id),
    motivo: txt(e.motivo),
    phone_number_id: txt(e.phone_number_id),
    lorena_whatsapp: txt(e.lorena_whatsapp).replace(/\D/g, ''),
    cfg: CONFIG,
  },
}];
