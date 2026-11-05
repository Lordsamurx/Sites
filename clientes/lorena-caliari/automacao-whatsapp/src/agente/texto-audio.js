// Coloca a transcrição no lugar do texto. Se algo falhou no caminho
// (download ou transcrição), o agente recebe um aviso e pede para digitar.
const base = $('Normalizar').item.json;
const t = String($json.text || '').trim();
return {
  json: {
    ...base,
    rota: 'texto',
    texto: t
      ? `[Áudio transcrito] ${t}`
      : '[A pessoa enviou um áudio que não foi possível transcrever. Peça com gentileza para escrever a mensagem.]',
  },
};
