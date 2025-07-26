import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';

const dbPath = path.resolve('./database.json');

export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  
  if (text) {
    await processPassiveKnowledge(text);
  }
  
  if (!text) return;

  const lowerText = text.toLowerCase();
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
      await sock.sendMessage(from, { text: '¡Ups! Algo salió mal.' });
    }
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

  if (lowerText.includes('género') || lowerText.includes('quién eres')) {
    return await sock.sendMessage(from, { text: 'Soy Citlali, una IA con identidad femenina.' });
  }
  if (lowerText.includes('edad')) {
    return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años.` });
  }

  const db = loadKnowledge();
  const respuesta = findBestMatch(lowerText, [db.chats[from], db.global, db.observaciones]);
  if (respuesta) {
    let extra = db.observaciones.some(o => o.respuesta === respuesta) ? "\n*(Esto lo aprendí observando nuestras conversaciones)*" : "";
    return await sock.sendMessage(from, { text: `${respuesta}${extra}` });
  }

  const noSeRespuesta = ["Vaya, esa es una pregunta interesante...", "Mmm, eso es nuevo para mí...", "No tengo esa información en mi memoria..."];
  await sock.sendMessage(from, { text: noSeRespuesta[Math.floor(Math.random() * noSeRespuesta.length)] });
}

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

function saveKnowledge(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function findBestMatch(text, knowledgeArrays) {
  let allKnowledge = [].concat(...knowledgeArrays.filter(Boolean));
  if (allKnowledge.length === 0) return null;
  const learnedQuestions = allKnowledge.map(k => k.pregunta);
  if (learnedQuestions.length === 0) return null;
  const matches = stringSimilarity.findBestMatch(text, learnedQuestions);
  if (matches.bestMatch.rating > 0.6) {
    const bestKnowledge = allKnowledge.find(k => k.pregunta === matches.bestMatch.target);
    return bestKnowledge.respuesta;
  }
  return null;
}

async function processPassiveKnowledge(text) {
  const keywords = [' es ', ' son ', ' se llama ', ' me gusta ', ' mi favorito es '];
  if (keywords.some(kw => text.toLowerCase().includes(kw))) {
    const parts = text.split(keywords.find(kw => text.toLowerCase().includes(kw)));
    const sujeto = parts[0].trim();
    const predicado = parts[1].trim();
    if (sujeto.length > 3 && predicado.length > 3) {
      const db = loadKnowledge();
      const nuevoHecho = { pregunta: sujeto.toLowerCase(), respuesta: predicado };
      if (!db.observaciones.some(o => o.pregunta === nuevoHecho.pregunta)) {
        console.log(`[Cognición] Hecho observado: "${sujeto}" -> "${predicado}"`);
        db.observaciones.push(nuevoHecho);
        saveKnowledge(db);
      }
    }
  }
}
