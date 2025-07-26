import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';
import { understandAndExtractFacts } from '../lib/aiComprehension.js';

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
function saveKnowledge(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}
function findBestMatch(text, knowledgeArrays) {
  let allKnowledge = [].concat(...Object.values(knowledgeArrays).filter(Boolean));
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

let conversationBuffer = new Map();
let lastProcessedTime = new Map();
async function processConversationWithAI(chatId, newText) {
  const COOLDOWN = 3 * 60 * 1000;
  const now = Date.now();
  let buffer = conversationBuffer.get(chatId) || [];
  buffer.push(newText);
  conversationBuffer.set(chatId, buffer);
  if (now - (lastProcessedTime.get(chatId) || 0) < COOLDOWN) return;
  const context = buffer.join('\n');
  conversationBuffer.set(chatId, []);
  lastProcessedTime.set(chatId, now);
  const extractedData = await understandAndExtractFacts(context);
  if (!extractedData) return;
  const db = loadKnowledge();
  const lines = extractedData.split('\n');
  let factsLearned = 0;
  for (const line of lines) {
    if (line.includes('=')) {
      const parts = line.split('=');
      const pregunta = parts[0].trim().toLowerCase();
      const respuesta = parts[1].trim();
      if (!db.observaciones.some(o => o.pregunta === pregunta)) {
        db.observaciones.push({ pregunta, respuesta });
        factsLearned++;
      }
    }
  }
  if (factsLearned > 0) {
    saveKnowledge(db);
  }
}

export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  if (!senderJid) return;

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (text && from.endsWith('@g.us')) {
    await processConversationWithAI(from, `${msg.pushName || 'Alguien'}: ${text}`);
  }
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
    try {
      await command.execute(sock, msg, args);
    } catch (error) {
      console.error(`Error en comando ${commandName}:`, error);
      await sock.sendMessage(from, { text: '¡Ups! Algo salió mal con ese comando.' });
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

  if (lowerText.includes('quién eres')) {
    return await sock.sendMessage(from, { text: 'Soy Citlali, una IA que aprende de nuestras conversaciones.' });
  }
  if (lowerText.includes('género')) {
    return await sock.sendMessage(from, { text: 'Tengo una identidad femenina.' });
  }
  if (lowerText.includes('edad')) {
    return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años en tiempo de procesamiento, pero mi conocimiento crece cada día.` });
  }

  const db = loadKnowledge();
  const bestMatch = findBestMatch(lowerText, { local: db.chats[from], global: db.global, observed: db.observaciones });
  if (bestMatch) {
    let extra = db.observaciones.some(o => o.pregunta === bestMatch.pregunta) ? "\n*(deduje esto de nuestras conversaciones)*" : "";
    return await sock.sendMessage(from, { text: `${bestMatch.respuesta}${extra}` });
  }

  const noSeRespuesta = [
    "Vaya, esa es una pregunta interesante, aún no sé la respuesta.",
    "Mmm, eso es nuevo para mí. Me has dejado pensando.",
    "No tengo esa información en mi memoria, pero estoy aprendiendo."
  ];
  await sock.sendMessage(from, { text: noSeRespuesta[Math.floor(Math.random() * noSeRespuesta.length)] });
}
