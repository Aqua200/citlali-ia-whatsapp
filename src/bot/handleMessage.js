import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';

const dbPath = path.resolve('./database.json');
function loadKnowledge() {
  if (fs.existsSync(dbPath)) {
    const rawData = fs.readFileSync(dbPath);
    try {
      return JSON.parse(rawData);
    } catch (e) {
      const baseData = { global: [], chats: {} };
      fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
      return baseData;
    }
  }
  const baseData = { global: [], chats: {} };
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
  return baseData;
}

function findBestMatch(text, knowledgeArrays) {
  let allKnowledge = [];
  if (knowledgeArrays.local) allKnowledge.push(...knowledgeArrays.local);
  if (knowledgeArrays.global) allKnowledge.push(...knowledgeArrays.global);
  if (allKnowledge.length === 0) return null;
  const learnedQuestions = allKnowledge.map(k => k.pregunta);
  if (learnedQuestions.length === 0) return null;
  const matches = stringSimilarity.findBestMatch(text, learnedQuestions);
  if (matches.bestMatch.rating > 0.6) {
    const bestKnowledge = allKnowledge.find(k => k.pregunta === matches.bestMatch.target);
    return bestKnowledge;
  }
  return null;
}

export async function handleMessage(sock, msg) {
  try {
    if (msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.sender;
    if (!senderJid) return;

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!text) return;

    const lowerText = text.toLowerCase();
    
    const args = text.trim().split(/ +/).slice(1);
    const commandName = text.trim().split(/ +/)[0].toLowerCase();
    const command = commands.get(commandName);
    if (command) {
      if (command.ownerOnly) {
        const senderNumber = senderJid.split('@')[0];
        const isOwner = config.owner.some(owner => owner[0] === senderNumber);
        if (!isOwner) return await sock.sendMessage(from, { text: 'Lo siento, solo los dueños de Citlali pueden usar este comando.' });
      }
      await command.execute(sock, msg, args);
      return;
    }

    const botJid = sock.user.id;
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentionedJids.includes(botJid)) {
      const senderName = msg.pushName || senderJid.split('@')[0];
      const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
      await sock.sendMessage(from, { text: responseText, mentions: [senderJid] });
      return;
    }

    if (lowerText.includes('quién eres')) return await sock.sendMessage(from, { text: 'Soy Citlali, una IA que aprende de nuestras conversaciones.' });
    if (lowerText.includes('género')) return await sock.sendMessage(from, { text: 'Tengo una identidad femenina.' });
    if (lowerText.includes('edad')) return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años en tiempo de procesamiento.` });

    if (lowerText.endsWith('?')) {
      const questionText = lowerText.slice(0, -1).trim();
      const factKeywords = ['es', 'son'];
      const keyword = factKeywords.find(kw => questionText.includes(` ${kw} `));
      if (keyword) {
        const parts = questionText.split(new RegExp(` ${keyword} `, 'i'));
        if (parts.length === 2) {
          const sujeto = parts[0].trim().replace(/^(es|son)\s*/, '');
          const afirmacion = parts[1].trim();
          const db = loadKnowledge();
          const bestMatch = findBestMatch(sujeto, { local: db.chats[from], global: db.global });
          if (bestMatch) {
            const similarity = stringSimilarity.compareTwoStrings(afirmacion, bestMatch.respuesta.toLowerCase());
            if (similarity > 0.7) return await sock.sendMessage(from, { text: 'Sí, ¡exacto!' });
            else return await sock.sendMessage(from, { text: `No, según lo que he aprendido, ${sujeto} es "${bestMatch.respuesta}".` });
          }
        }
      }
    }

    const db = loadKnowledge();
    const bestMatch = findBestMatch(lowerText, { local: db.chats[from], global: db.global });
    if (bestMatch) {
      return await sock.sendMessage(from, { text: bestMatch.respuesta });
    }

    const noSeRespuesta = `Vaya, sobre eso todavía no sé nada. Puedes enseñarme con:\n\n\`\`\`!aprende ${text} = [respuesta]\`\`\``;
    await sock.sendMessage(from, { text: noSeRespuesta });

  } catch (e) {
    console.error("ERROR CRÍTICO EN handleMessage:", e);
    if (config.owner && config.owner.length > 0) {
      const ownerJid = `${config.owner[0][0]}@s.whatsapp.net`;
      await sock.sendMessage(ownerJid, { text: `¡Alerta! Ocurrió un error crítico en el bot:\n\n${e.message}` });
    }
  }
}
