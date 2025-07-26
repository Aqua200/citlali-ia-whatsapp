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
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  if (!senderJid) return;

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text) return;

  const lowerText = text.toLowerCase();

  const commandName = lowerText.split(' ')[0];
  const command = commands.get(commandName);
  if (command) {
    return;
  }

  if (lowerText.endsWith('?')) {
    const questionText = lowerText.slice(0, -1).trim();
    const factKeywords = ['es', 'son', 'se llama', 'consiste en'];
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

          if (similarity > 0.7) {
            return await sock.sendMessage(from, { text: 'Sí, ¡exacto!' });
          } else {
            return await sock.sendMessage(from, { text: `No, según lo que he aprendido, ${sujeto} es "${bestMatch.respuesta}".` });
          }
        }
      }
    }
  }

  const db = loadKnowledge();
  const bestMatch = findBestMatch(lowerText, { local: db.chats[from], global: db.global });

  if (bestMatch) {
    console.log(`[Memoria] Coincidencia encontrada para "${text}". Respondiendo...`);
    return await sock.sendMessage(from, { text: bestMatch.respuesta });
  }
}
