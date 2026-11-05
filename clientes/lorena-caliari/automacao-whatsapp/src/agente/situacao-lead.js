// Junta a mensagem com o cadastro do lead na planilha:
// é a primeira conversa? A Lorena pausou o assistente para este número?
const msg = $('Mensagem pronta').first().json;
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const linha = $input.all().map((i) => i.json).find((r) => r && digitos(r.telefone) === msg.telefone) || null;
const agora = DateTime.now().setZone('America/Sao_Paulo').toFormat('yyyy-MM-dd HH:mm');
const pausado = ['sim', 's', 'true', '1', 'pausado'].includes(String(linha?.bot_pausado ?? '').trim().toLowerCase());

return [{
  json: {
    ...msg,
    lead_novo: !linha,
    bot_pausado: pausado,
    primeiro_contato: linha?.primeiro_contato || agora,
    ultimo_contato: agora,
  },
}];
