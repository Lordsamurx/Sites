// Prepara o aviso para a Lorena assumir a conversa.
const d = $input.first().json;
const agora = DateTime.now().setZone(d.cfg.fuso);
const motivo = d.motivo || 'A paciente pediu para falar com a Lorena.';
const urgente = /urgente/i.test(motivo);

return [{
  json: {
    telefone: d.telefone,
    motivo,
    agora: agora.toFormat('yyyy-MM-dd HH:mm'),
    aviso_lorena:
      `${urgente ? 'URGENTE · ' : ''}Atendimento humano solicitado\n` +
      `Motivo: ${motivo}\n` +
      `Nome no WhatsApp: ${d.nome || 'não informado'}\n` +
      `Conversa: https://wa.me/${d.telefone}\n` +
      `O assistente parou de responder esta pessoa. Para ele voltar: #retomar ${d.telefone}`,
  },
}];
