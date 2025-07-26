import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';

const dbPath = path.resolve('./database.json');
function loadKnowledge() { 
  if (fs.existsSync(dbPath)) { 
    const rawData = fs.readFileSync(dbPath); 
    try { return JSON.parse(rawData); } catch (e) {
      const baseData = { global: [], chats: {} };
      fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
      return baseData;
    }
  } 
  const baseData = { global: [], chats: {} }; 
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); 
  return baseData; 
}

function findBestMatch(text, knowledgeArray) {
  if (!knowledgeArray || knowledgeArray.length === 0) return null;
  const learnedQuestions = knowledgeArray.map(k => k.pregunta);
  if (learnedQuestions.length === 0) return null;
  const matches = stringSimilarity.findBestMatch(text, learnedQuestions);
  if (matches.bestMatch.rating > 0.5) {
    const bestKnowledge = knowledgeArray.find(k => k.pregunta === matches.bestMatch.target);
    return bestKnowledge.respuesta;
  }
  return null;
}

export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text) return;

  const lowerText = text.toLowerCase();
  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentionedJids.includes(botJid)) {
    const senderName = msg.pushName || senderJid.split('@')[0];
    const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
    await sock.sendMessage(from, { text: responseText, mentions: [senderJid] });
    return;
  }

  const args = text.trim().split(/ +/).slice(1);
  const commandName = text.trim().split(/ +/)[0].toLowerCase();
  const command = commands.get(commandName);
  if (command) {
    if (command.ownerOnly && !config.owner.includes(senderJid)) {
      return await sock.sendMessage(from, { text: 'Lo siento, solo mi creador/a puede usar este comando.' });
    }
    try {
      await command.execute(sock, msg, args);
    } catch (error) {
      console.error(`Error ejecutando el comando ${commandName}:`, error);
      await sock.sendMessage(from, { text: '¡Ups! Algo salió mal al intentar ejecutar ese comando.' });
    }
    return;
  }

  if (lowerText.includes('género') || lowerText.includes('sexo')) {
    return await sock.sendMessage(from, { text: 'Soy una inteligencia artificial con identidad femenina.' });
  }
  if (lowerText.includes('edad') || lowerText.includes('cuántos años tienes')) {
    return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años. ¡Siempre lista para aprender algo nuevo!` });
  }

  const db = loadKnowledge();
  let respuesta = findBestMatch(lowerText, db.chats[from]);
  if (!respuesta) {
    respuesta = findBestMatch(lowerText, db.global);
  }
  if (respuesta) {
    return await sock.sendMessage(from, { text: respuesta });
  }

  const noSeRespuesta = `Vaya, sobre eso todavía no he aprendido nada. Puedes enseñarme solo para este chat con:\n\n\`\`\`!aprende ${text} = [respuesta]\`\`\`\n\nO si es un conocimiento general, mi creador/a puede usar \`!aprende-global\`.`;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
