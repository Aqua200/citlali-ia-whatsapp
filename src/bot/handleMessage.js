// src/bot/handleMessage.js -> VERSIÓN DEFINITIVA CON JERARQUÍA CORREGIDA

import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';

// --- (Las funciones de la base de datos no cambian, asegúrate de que estén aquí) ---
const dbPath = path.resolve('./database.json');
function loadKnowledge() { if (fs.existsSync(dbPath)) { const rawData = fs.readFileSync(dbPath); try { return JSON.parse(rawData); } catch (e) { const baseData = { global: [], chats: {} }; fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); return baseData; } } const baseData = { global: [], chats: {} }; fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); return baseData; }
function findBestMatch(text, knowledgeArrays) { let allKnowledge = []; if (knowledgeArrays.local) allKnowledge.push(...knowledgeArrays.local); if (knowledgeArrays.global) allKnowledge.push(...knowledgeArrays.global); if (allKnowledge.length === 0) return null; const learnedQuestions = allKnowledge.map(k => k.pregunta); if (learnedQuestions.length === 0) return null; const matches = stringSimilarity.findBestMatch(text, learnedQuestions); if (matches.bestMatch.rating > 0.6) { const bestKnowledge = allKnowledge.find(k => k.pregunta === matches.bestMatch.target); return bestKnowledge; } return null; }

// --- CEREBRO PRINCIPAL DE CITLALI ---
export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  if (!senderJid) return;

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text) return;

  const lowerText = text.toLowerCase();
  
  // ----------------------------------------------------------------
  // --- JERARQUÍA DE DECISIONES DE CITLALI (ORDEN CORRECTO) ---
  // ----------------------------------------------------------------

  // 1. ¿ES UN COMANDO DE PLUGIN? (Máxima prioridad)
  const args = text.trim().split(/ +/).slice(1);
  const commandName = text.trim().split(/ +/)[0].toLowerCase();
  const command = commands.get(commandName);
  if (command) {
    if (command.ownerOnly) {
        const senderNumber = senderJid.split('@')[0];
        const isOwner = config.owner.some(owner => owner[0] === senderNumber);
        if (!isOwner) return await sock.sendMessage(from, { text: 'Lo siento, solo los dueños de Citlali pueden usar este comando.' });
    }
    try { await command.execute(sock, msg, args); } catch (error) { console.error(`Error en comando ${commandName}:`, error); await sock.sendMessage(from, { text: '¡Ups! Algo salió mal con ese comando.' }); }
    return; // FIN: Se ejecuta el comando y no se hace nada más.
  }

  // 2. ¿ME MENCIONAN?
  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentionedJids.includes(botJid)) {
    const senderName = msg.pushName || senderJid.split('@')[0];
    const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
    await sock.sendMessage(from, { text: responseText, mentions: [senderJid] });
    return;
  }

  // --- SI NO FUE UN COMANDO, INTENTA TENER UNA CONVERSACIÓN NATURAL ---

  // 3. ¿ES SOBRE MI IDENTIDAD?
  if (lowerText.includes('quién eres')) { return await sock.sendMessage(from, { text: 'Soy Citlali, una IA que aprende de nuestras conversaciones.' }); }
  if (lowerText.includes('género')) { return await sock.sendMessage(from, { text: 'Tengo una identidad femenina.' }); }
  if (lowerText.includes('edad')) { return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años en tiempo de procesamiento, pero mi conocimiento crece cada día.` }); }

  // 4. LÓGICA DE VERIFICACIÓN (SÍ/NO)
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
          if (similarity > 0.7) return await sock.sendMessage(from, { text: 'Sí, ¡exacto!' });
          else return await sock.sendMessage(from, { text: `No, según lo que he aprendido, ${sujeto} es "${bestMatch.respuesta}".` });
        }
      }
    }
  }

  // 5. BÚSQUEDA GENERAL EN MEMORIA
  const db = loadKnowledge();
  const bestMatch = findBestMatch(lowerText, { local: db.chats[from], global: db.global });
  if (bestMatch) {
      return await sock.sendMessage(from, { text: bestMatch.respuesta });
  }

  // 6. NO SÉ LA RESPUESTA
  const noSeRespuesta = `Vaya, sobre eso todavía no sé nada. Puedes enseñarme solo para este chat con:\n\n\`\`\`!aprende ${text} = [respuesta]\`\`\`\n\nSi es algo que deba saber en todas partes, mi creador/a puede usar \`!aprende-global\`.`;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
