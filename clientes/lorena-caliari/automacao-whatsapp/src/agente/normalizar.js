// Transforma o webhook da API oficial do WhatsApp em uma mensagem limpa.
// Avisos de status (enviada, entregue, lida) e reações não seguem adiante.

// Número pessoal da Lorena, só dígitos (ex.: 5531999999999). Usado para:
//  - reconhecer os comandos #pausar e #retomar enviados por ela;
//  - receber os avisos de agendamento, cancelamento e atendimento humano.
const LORENA_WHATSAPP = '55XXXXXXXXXXX';

const digitos = (v) => String(v ?? '').replace(/\D/g, '');

// No Brasil o WhatsApp às vezes entrega o celular sem o 9 depois do DDD.
function variantes(n) {
  const d = digitos(n);
  const s = new Set([d]);
  if (d.startsWith('55') && d.length === 13 && d[4] === '9') s.add(d.slice(0, 4) + d.slice(5));
  if (d.startsWith('55') && d.length === 12) s.add(d.slice(0, 4) + '9' + d.slice(4));
  return s;
}
const mesmoNumero = (a, b) => { const va = variantes(a); return [...variantes(b)].some((x) => va.has(x)); };

// Aceita a saída do nó "WhatsApp Trigger" (objeto "value") e também o corpo
// bruto da Meta (com "entry"), caso troque o gatilho por um Webhook comum.
function valores(json) {
  const corpo = json.body && json.body.entry ? json.body : json;
  if (Array.isArray(corpo.entry)) {
    return corpo.entry.flatMap((en) => (en.changes || []).map((c) => c.value || {}));
  }
  return [corpo];
}

const saida = [];
for (const item of $input.all()) {
  for (const v of valores(item.json)) {
    const contato = (v.contacts || [])[0] || {};
    for (const msg of v.messages || []) {
      let texto = '';
      let rota = 'texto';
      let midiaId = '';
      switch (msg.type) {
        case 'text': texto = msg.text?.body ?? ''; break;
        case 'audio': rota = 'audio'; midiaId = msg.audio?.id ?? ''; break;
        case 'image': texto = msg.image?.caption ? `[Imagem com legenda] ${msg.image.caption}` : '[A pessoa enviou uma imagem sem texto]'; break;
        case 'video': texto = msg.video?.caption ? `[Vídeo com legenda] ${msg.video.caption}` : '[A pessoa enviou um vídeo sem texto]'; break;
        case 'document': texto = `[A pessoa enviou um documento${msg.document?.caption ? `: ${msg.document.caption}` : ''}]`; break;
        case 'button': texto = msg.button?.text ?? ''; break;
        case 'interactive': texto = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? ''; break;
        case 'location': texto = '[A pessoa enviou uma localização]'; break;
        case 'contacts': texto = '[A pessoa enviou um contato]'; break;
        case 'reaction':
        case 'sticker':
        case 'unsupported':
          continue; // reação, figurinha ou mensagem apagada: não responde
        default: texto = `[Mensagem do tipo ${msg.type}, que o assistente não consegue ler]`;
      }

      const telefone = digitos(msg.from || contato.wa_id);
      const base = {
        telefone,
        nome: contato.profile?.name ?? '',
        texto: String(texto).trim(),
        tipo: msg.type,
        rota,
        midia_id: midiaId,
        mensagem_id: msg.id,
        phone_number_id: v.metadata?.phone_number_id ?? '',
        lorena_whatsapp: LORENA_WHATSAPP,
        comando_valido: false,
        comando_alvo: '',
        comando_pausar: '',
        resposta_comando: '',
      };

      // Comandos da Lorena: "#pausar 5531999999999" e "#retomar 5531999999999".
      if (mesmoNumero(telefone, LORENA_WHATSAPP) && base.texto.startsWith('#')) {
        base.rota = 'comando';
        const m = base.texto.match(/^#(pausar|retomar)\s+(\+?[\d\s().-]{10,})/i);
        if (m) {
          const pausar = m[1].toLowerCase() === 'pausar';
          base.comando_valido = true;
          base.comando_alvo = digitos(m[2]);
          base.comando_pausar = pausar ? 'sim' : 'nao';
          base.resposta_comando = pausar
            ? `Assistente pausado para +${base.comando_alvo}. Você responde essa pessoa. Para ele voltar: #retomar ${base.comando_alvo}`
            : `Assistente reativado para +${base.comando_alvo}. Ele volta a responder essa pessoa na próxima mensagem.`;
        } else {
          base.resposta_comando =
            'Comandos do assistente:\n#pausar 5531999999999 (você assume a conversa)\n#retomar 5531999999999 (o assistente volta a responder)';
        }
      }

      saida.push({ json: base });
    }
  }
}
return saida;
