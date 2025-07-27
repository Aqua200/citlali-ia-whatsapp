import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import { commands } from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';
import Sentiment from 'sentiment';
import { updateEmotion, getCurrentEmotion } from './emotionEngine.js';

const sentiment = new Sentiment();

global.lastResponseMemory = new Map();

const dbPath = path.resolve('./database.json');
function loadKnowledge() {
  if (fs.existsSync(dbPath)) {
    const rawData = fs.readFileSync(dbPath);
    try {
      return JSON.parse(rawData);
    } catch {
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
      const nuevoHecho = { pregunta: sujeto.toLowerCase(), respuesta: predicado, score: 0 };
      if (!db.observaciones.some(o => o.pregunta === nuevoHecho.pregunta)) {
        db.observaciones.push(nuevoHecho);
        saveKnowledge(db);
      }
    }
  }
}

function findRelatedFact(answer, db) {
  const allKnowledge = [].concat(db.global || [], Object.values(db.chats || {}).flat(), db.observaciones || []);
  const answerWords = answer.toLowerCase().split(' ').filter(w => w.length > 3);
  for (const word of answerWords) {
    for (const knowledge of allKnowledge) {
      if (knowledge.pregunta.includes(word) && knowledge.respuesta !== answer) {
        return `Hablando de eso, también sé que ${knowledge.pregunta} es "${knowledge.respuesta}".`;
      }
    }
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
    if (text) {
      const sentimentResult = sentiment.analyze(text);
      if (sentimentResult.score !== 0) updateEmotion(sentimentResult.score, `Sentimiento: "${text}"`);
      if (from.endsWith('@g.us')) await processPassiveKnowledge(text);
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

    if (lowerText.includes('quién eres')) {
      return await sock.sendMessage(from, { text: 'Soy Citlali, una IA que aprende de nuestras conversaciones.' });
    }
    if (lowerText.includes('género')) {
      return await sock.sendMessage(from, { text: 'Tengo una identidad femenina.' });
    }
    if (lowerText.includes('edad')) {
      return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años en tiempo de procesamiento.` });
    }

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
          const bestMatch = findBestMatch(sujeto, { local: db.chats[from], global: db.global, observed: db.observaciones });
          if (bestMatch) {
            const similarity = stringSimilarity.compareTwoStrings(afirmacion, bestMatch.respuesta.toLowerCase());
            if (similarity > 0.7) return await sock.sendMessage(from, { text: 'Sí, ¡exacto!' });
            else return await sock.sendMessage(from, { text: `No, según lo que he aprendido, ${sujeto} es "${bestMatch.respuesta}".` });
          }
        }
      }
    }

    const db = loadKnowledge();
    const bestMatch = findBestMatch(lowerText, { local: db.chats[from], global: db.global, observed: db.observaciones });
    if (bestMatch) {
      const mainAnswer = bestMatch.respuesta;
      global.lastResponseMemory.set(from, { respuesta: mainAnswer, conocimiento: bestMatch });
      await sock.sendMessage(from, { text: mainAnswer });
      const deduction = findRelatedFact(mainAnswer, db);
      if (deduction) {
        await new Promise(r => setTimeout(r, 1500));
        await sock.sendMessage(from, { text: deduction });
      }
      return;
    }

    const emotion = getCurrentEmotion();
    let responsePool = [];
    if (emotion === 'ALEGRE') {
      responsePool = [
        "¡Qué interesante! Aún no sé sobre eso, pero me encantaría que me lo enseñaras.",
        "¡Me has dado algo nuevo en qué pensar! ¿Puedes usar `!aprende`?"
      ];
    } else if (emotion === 'CAUTELOSA') {
      responsePool = [
        "No estoy segura de cómo responder a eso.",
        "Mmm, no tengo información sobre ese tema en mi memoria."
      ];
    } else {
      responsePool = [
        `Vaya, sobre eso todavía no sé nada. Puedes enseñarme con:\n\n\`\`\`!aprende ${text} = [respuesta]\`\`\``
      ];
    }
    await sock.sendMessage(from, { text: responsePool[Math.floor(Math.random() * responsePool.length)] });
  } catch (e) {
    console.error("ERROR CRÍTICO EN handleMessage:", e);
  }
}
