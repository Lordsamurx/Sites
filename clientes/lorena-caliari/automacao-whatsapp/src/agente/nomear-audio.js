// A transcrição da OpenAI reconhece o formato pela extensão do arquivo.
// Áudios do WhatsApp são OGG/Opus.
const item = $input.item;
if (item.binary && item.binary.data) {
  item.binary.data.fileName = 'audio.ogg';
  item.binary.data.fileExtension = 'ogg';
  item.binary.data.mimeType = 'audio/ogg';
}
return item;
