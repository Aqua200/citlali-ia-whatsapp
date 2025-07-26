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
  let allKnowledge = [];
  if (knowledgeArrays.global) allKnowledge.push(...knowledgeArrays.global);
  if (knowledgeArrays.local) allKnowledge.push(...knowledgeArrays.local);
  if (knowledgeArrays.observed) allKnowledge.push(...knowledgeArrays.observed);
  if (allKnowledge.length === 0) return null;
  const learnedQuestions = allKnowledge.map(k => k.pregunta);
  const matches = stringSimilarity.findBestMatch(text, learnedQuestions);
  if (matches.bestMatch.rating > 0.5) {
    const bestKnowledge = allKnowledge.find(k => k.pregunta === matches.bestMatch.target);
    return bestKnowledge;
  }
  return null;
}

let conversationBuffer = new Map();
let lastProcessedTime = new Map();

async function processConversationWithAI(chatId, newText) {
  const COOLDOWN = 2 * 60 * 1000;
  const now = Date.now();
  let buffer = conversationBuffer.get(chatId) || [];
  buffer.push(newText);
  conversationBuffer.set(chatId, buffer);
  if (now - (lastProcessedTime.get(chatId) || 0) < COOLDOWN) return;
  console.log(`[Cognición IA] Analizando la conversación acumulada de ${chatId}...`);
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
      const nuevoHecho = { pregunta, respuesta };
      if (!db.observaciones.some(o => o.pregunta === nuevoHecho.pregunta)) {
        db.observaciones.push(nuevoHecho);
        factsLearned++;
      }
    }
  }
  if (factsLearned > 0) {
    saveKnowledge(db);
    console.log(`[Cognición IA] ¡Éxito! Se aprendieron ${factsLearned} nuevos hechos de la conversación.`);
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
    return await sock.sendMessage(from, { text: 'Soy una inteligencia artificial con identidad femenina.' });
  }
  if (lowerText.includes('edad')) {
    return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años.` });
  }
  const db = loadKnowledge();
  const bestMatch = findBestMatch(lowerText, { local: db.chats[from], global: db.global, observed: db.observaciones });
  if (bestMatch) {
    let extra = db.observaciones.some(o => o.pregunta === bestMatch.pregunta) ? "\n*(Esto lo aprendí observando nuestras conversaciones)*" : "";
    return await sock.sendMessage(from, { text: `${bestMatch.respuesta}${extra}` });
  }
  const noSeRespuesta = [
    "Vaya, esa es una pregunta interesante...",
    "Mmm, eso es nuevo para mí...",
    "No tengo esa información en mi memoria..."
  ];
  await sock.sendMessage(from, { text: noSeRespuesta[Math.floor(Math.random() * noSeRespuesta.length)] });
}
