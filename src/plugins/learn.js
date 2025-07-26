import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('./database.json');
function loadKnowledge() {
  if (fs.existsSync(dbPath)) {
    const rawData = fs.readFileSync(dbPath);
    return JSON.parse(rawData);
  }
  const baseData = { conocimientos: [] };
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
  return baseData;
}
function saveKnowledge(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export default {
  command: ['!aprende', '!aprender'],
  description: 'Enseña una nueva respuesta al bot. Usa: pregunta = respuesta',

  async execute(sock, msg, args) {
    const db = loadKnowledge();
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.sender;
    const textToLearn = args.join(' ');

    const parts = textToLearn.split('=');

    if (parts.length === 2) {
      const pregunta = parts[0].trim().toLowerCase();
      const respuesta = parts[1].trim();
      const senderName = msg.pushName || senderJid.split('@')[0];

      db.conocimientos.push({ pregunta, respuesta, creadorJid: senderJid, creadorNombre: senderName });
      saveKnowledge(db);

      await sock.sendMessage(from, { text: `¡Entendido! Lo he guardado en mi memoria. ¡Muchas gracias por enseñarme, ${senderName}!` });
    } else {
      await sock.sendMessage(from, { text: 'Mmm, creo que no entendí bien la lección. ¿Podrías usar el formato `pregunta = respuesta`, por favor?' });
    }
  }
};
