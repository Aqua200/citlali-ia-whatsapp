// src/bot/handleMessage.js -> VERSIÓN FINAL CORREGIDA Y DEPURADA

import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';

// --- GESTIÓN DE LA BASE DE DATOS (Más robusta) ---
const dbPath = path.resolve('./database.json');
function loadKnowledge() { 
  if (fs.existsSync(dbPath)) { 
    const rawData = fs.readFileSync(dbPath); 
    try { return JSON.parse(rawData); } catch (e) {
      console.error("Error al parsear database.json, se reiniciará.", e);
      const baseData = { global: [], chats: {} };
      fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
      return baseData;
    }
  } 
  const baseData = { global: [], chats: {} }; 
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); 
  return baseData; 
}

// --- FUNCIÓN DE BÚSQUEDA (Simplificada y a prueba de errores) ---
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

// --- CEREBRO PRINCIPAL DE CITLALI ---
export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  if (!senderJid) return;

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text) return; // Si no hay texto (ej: solo una foto), no continuamos.

  const lowerText = text.toLowerCase();
  
  // --- JERARQUÍA DE DECISIONES ---

  // 1. ¿ES UN COMANDO DE PLUGIN?
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
    return;
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

  // 3. ¿ES SOBRE MI IDENTIDAD?
  if (lowerText.includes('quién eres')) { return await sock.sendMessage(from, { text: 'Soy Citlali, una IA que aprende de nuestras conversaciones.' }); }
  if (lowerText.includes('género')) { return await sock.sendMessage(from, { text: 'Tengo una identidad femenina.' }); }
  if (lowerText.includes('edad')) { return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años en tiempo de procesamiento, pero mi conocimiento crece cada día.` }); }

  // 4. ¿ESTÁ EN MI MEMORIA?
  const db = loadKnowledge();
  const bestMatch = findBestMatch(lowerText, { local: db.chats[from], global: db.global });
  
  if (bestMatch) {
      console.log(`[Memoria] Coincidencia encontrada para "${text}". Respondiendo...`);
      return await sock.sendMessage(from, { text: bestMatch.respuesta });
  }

  // 5. NO SÉ LA RESPUESTA
  console.log(`[Memoria] No se encontró coincidencia para "${text}". Enviando respuesta por defecto.`);
  const noSeRespuesta = `Vaya, sobre eso todavía no sé nada. Puedes enseñarme solo para este chat con:\n\n\`\`\`!aprende ${text} = [respuesta]\`\`\`\n\nSi es algo que deba saber en todas partes, mi creador/a puede usar \`!aprende-global\`.`;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
