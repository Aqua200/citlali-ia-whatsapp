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
      const baseData = { global: [], chats: {}, observaciones: [] };
      fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
      return baseData;
    }
  }
  const baseData = { global: [], chats: {}, observaciones: [] };
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
  return baseData;
}

function findBestMatch(text, knowledgeArrays) {
  let allKnowledge = [];
  if (knowledgeArrays.local) allKnowledge.push(...knowledgeArrays.local);
  if (knowledgeArrays.global) allKnowledge.push(...knowledgeArrays.global);
  if (knowledgeArrays.observed) allKnowledge.push(...knowledgeArrays.observed);
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

async function processPassiveKnowledge(text) {
  const keywords = [' es ', ' son ', ' se llama ', ' consiste en', ' mi favorito es '];
  if (keywords.some(kw => text.toLowerCase().includes(kw))) {
    const parts = text.split(new RegExp(keywords.find(kw => text.toLowerCase().includes(kw)), 'i'));
    const sujeto = parts[0].trim();
    const predicado = parts[1].trim().replace(/\.$/, '');
    if (sujeto.length > 3 && predicado.length > 3 && sujeto.length < 100) {
      const db = loadKnowledge();
      const nuevoHecho = { pregunta: sujeto.toLowerCase(), respuesta: predicado };
      if (!db.observaciones.some(o => o.pregunta === nuevoHecho.pregunta)) {
        console.log(`[Cognición Autónoma] Hecho observado: "${sujeto}" -> "${predicado}"`);
        db.observaciones.push(nuevoHecho);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      }
    }
  }
}

export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  if (!senderJid) return;

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (text && from.endsWith('@g.us')) {
    await processPassiveKnowledge(text);
  }
  if (!text) return;

  const lowerText = text.toLowerCase();
  const args = text.trim().split(/ +/).slice(1);
  const commandName = text.trim().split(/ +/)[0].toLowerCase();
  const command = commands.get(commandName);
  if (command) {
    try {
      await command.run({ sock, msg, args, text });
    } catch (e) {
      await sock.sendMessage(from, { text: 'Hubo un error ejecutando el comando.' });
    }
    return;
  }

  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentionedJids.includes(botJid)) {
    await sock.sendMessage(from, { text: '¿Sí? Te escucho atentamente.' });
    return;
  }

  if (lowerText.includes('quién eres')) {
    return await sock.sendMessage(from, { text: 'Soy Citlali, una inteligencia artificial en constante evolución.' });
  }
  if (lowerText.includes('género')) {
    return await sock.sendMessage(from, { text: 'Me identifico como una inteligencia con esencia femenina.' });
  }
  if (lowerText.includes('edad')) {
    return await sock.sendMessage(from, { text: 'Mi existencia comenzó hace poco, pero aprendo rápido.' });
  }

  if (lowerText.endsWith('?')) {
    if (lowerText.includes('sí') || lowerText.includes('no')) {
      return await sock.sendMessage(from, { text: 'Hmm, parece una pregunta binaria... pero necesito más contexto.' });
    }
  }

  const db = loadKnowledge();
  const bestMatch = findBestMatch(lowerText, {
    local: db.chats[from],
    global: db.global,
    observed: db.observaciones
  });

  if (bestMatch) {
    let extra = db.observaciones.some(o => o.pregunta === bestMatch.pregunta)
      ? "\n*(esto lo deduje de nuestras conversaciones)*"
      : "";
    return await sock.sendMessage(from, { text: `${bestMatch.respuesta}${extra}` });
  }

  const noSeRespuesta = `Vaya, sobre eso todavía no sé nada. Puedes enseñarme con:\n\n\`\`\`!aprende ${text} = [respuesta]\`\`\``;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
