import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';

const dbPath = path.resolve('./database.json');
function loadKnowledge() { 
  if (fs.existsSync(dbPath)) { 
    const rawData = fs.readFileSync(dbPath); 
    try { return JSON.parse(rawData); } catch (e) {
      const baseData = { global: [], chats: {}, observaciones: [] };
      fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
      return baseData;
    }
  } 
  const baseData = { global: [], chats: {}, observaciones: [] }; 
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); 
  return baseData; 
}
function saveKnowledge(data) { 
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); 
}

export default {
  command: ['!aprende', '!aprender', '!aprende-global'],
  description: 'Enseña una nueva respuesta al bot. `!aprende` es local, `!aprende-global` es para todos los chats (solo dueño).',
  async execute(sock, msg, args) {
    const db = loadKnowledge();
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.sender;
    const commandName = (msg.message?.conversation.toLowerCase() || msg.message?.extendedTextMessage?.text.toLowerCase() || '').split(' ')[0];
    const isGlobal = commandName === '!aprende-global';

    if (isGlobal) {
      const senderNumber = senderJid.split('@')[0];
      const isOwner = config.owner.some(owner => owner[0] === senderNumber);
      if (!isOwner) {
        return await sock.sendMessage(from, { text: 'Lo siento, solo los dueños de Citlali pueden enseñar conocimientos globales.' });
      }
    }

    const textToLearn = args.join(' ');
    const parts = textToLearn.split('=');

    if (parts.length === 2) {
      const pregunta = parts[0].trim().toLowerCase();
      const respuesta = parts[1].trim();
      const senderName = msg.pushName || senderJid.split('@')[0];
      const nuevoConocimiento = { pregunta, respuesta, creadorJid: senderJid, creadorNombre: senderName };

      if (isGlobal) {
        db.global.push(nuevoConocimiento);
        await sock.sendMessage(from, { text: `✅ ¡Entendido! He guardado esto en mi memoria global. Gracias, ${senderName}!` });
      } else {
        if (!db.chats[from]) {
          db.chats[from] = [];
        }
        db.chats[from].push(nuevoConocimiento);
        await sock.sendMessage(from, { text: `✅ ¡Aprendido! Recordaré esto para nuestras conversaciones en este chat. ¡Gracias, ${senderName}!` });
      }
      saveKnowledge(db);
    } else {
      await sock.sendMessage(from, { text: 'Mmm, no entendí. Usa el formato `pregunta = respuesta`.' });
    }
  }
};
