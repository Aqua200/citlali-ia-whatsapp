// src/bot/handleMessage.js -> VERSIÓN DE DIAGNÓSTICO

import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';
import stringSimilarity from 'string-similarity';

// --- (Las funciones de la base de datos no necesitan cambios) ---
const dbPath = path.resolve('./database.json');
function loadKnowledge() { if (fs.existsSync(dbPath)) { const rawData = fs.readFileSync(dbPath); try { return JSON.parse(rawData); } catch (e) { const baseData = { global: [], chats: {}, observaciones: [] }; fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); return baseData; } } const baseData = { global: [], chats: {}, observaciones: [] }; fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); return baseData; }
function findBestMatch(text, knowledgeArray) { if (!knowledgeArray || knowledgeArray.length === 0) return null; const learnedQuestions = knowledgeArray.map(k => k.pregunta); if (learnedQuestions.length === 0) return null; const matches = stringSimilarity.findBestMatch(text, learnedQuestions); if (matches.bestMatch.rating > 0.6) { const bestKnowledge = knowledgeArray.find(k => k.pregunta === matches.bestMatch.target); return bestKnowledge.respuesta; } return null; }
async function processPassiveKnowledge(text) { const keywords = [' es ', ' son ', ' se llama ', ' me gusta ', ' mi favorito es ']; if (keywords.some(kw => text.toLowerCase().includes(kw))) { const parts = text.split(keywords.find(kw => text.toLowerCase().includes(kw))); const sujeto = parts[0].trim(); const predicado = parts[1].trim(); if (sujeto.length > 3 && predicado.length > 3) { const db = loadKnowledge(); const nuevoHecho = { pregunta: sujeto.toLowerCase(), respuesta: predicado }; if (!db.observaciones.some(o => o.pregunta === nuevoHecho.pregunta)) { console.log(`[Cognición] Hecho observado: "${sujeto}" -> "${predicado}"`); db.observaciones.push(nuevoHecho); fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); } } } }


// --- CEREBRO PRINCIPAL CON DIAGNÓSTICO ---
export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  
  console.log(`\n--- NUEVO MENSAJE ---`);
  console.log(`[Paso 0] Mensaje recibido de ${senderJid}: "${text}"`);
  
  // Observación Pasiva
  if (text) {
      await processPassiveKnowledge(text);
  }

  const lowerText = text.toLowerCase();
  
  // 1. LÓGICA DE COMANDOS
  const args = text.trim().split(/ +/).slice(1);
  const commandName = text.trim().split(/ +/)[0].toLowerCase();
  const command = commands.get(commandName);

  console.log(`[Paso 1] Verificando si "${commandName}" es un comando...`);
  if (command) {
    console.log(`[Diagnóstico] ¡SÍ! Es el comando "${commandName}". Ejecutando plugin...`);
    if (command.ownerOnly && !config.owner.includes(senderJid)) {
      console.log(`[Acción] Permiso denegado.`);
      return await sock.sendMessage(from, { text: 'Lo siento, solo mi creador/a puede usar este comando.' });
    }
    try { await command.execute(sock, msg, args); } catch (error) { console.error(`Error ejecutando el comando ${commandName}:`, error); await sock.sendMessage(from, { text: '¡Ups! Algo salió mal.' }); }
    console.log(`[FIN] Ejecución de comando completada.`);
    return;
  }
  console.log(`[Diagnóstico] No, no es un comando de plugin.`);

  // 2. LÓGICA DE MENCIÓN
  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  console.log(`[Paso 2] Verificando si me mencionaron...`);
  if (mentionedJids.includes(botJid)) {
    console.log(`[Diagnóstico] ¡SÍ! Fui mencionado. Respondiendo...`);
    const senderName = msg.pushName || senderJid.split('@')[0];
    const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
    await sock.sendMessage(from, { text: responseText, mentions: [senderJid] });
    console.log(`[FIN] Respuesta a mención enviada.`);
    return;
  }
  console.log(`[Diagnóstico] No, no fui mencionado.`);
  
  // Si no hay texto, no se puede continuar con la lógica conversacional
  if (!text) {
    console.log('[FIN] No hay texto para procesar. Deteniendo.');
    return;
  }
  
  // 3. LÓGICA DE IDENTIDAD
  console.log(`[Paso 3] Verificando si es una pregunta sobre mi identidad...`);
  if (lowerText.includes('género') || lowerText.includes('quién eres')) {
    console.log(`[Diagnóstico] Pregunta de género detectada. Respondiendo...`);
    return await sock.sendMessage(from, { text: 'Soy Citlali, una IA con identidad femenina.' });
  }
  if (lowerText.includes('edad')) {
    console.log(`[Diagnóstico] Pregunta de edad detectada. Respondiendo...`);
    return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años.` });
  }
  console.log(`[Diagnóstico] No, no es sobre mi identidad.`);

  // 4. BÚSQUEDA EN MEMORIA
  console.log(`[Paso 4] Buscando en mi memoria local y global...`);
  const db = loadKnowledge();
  const respuesta = findBestMatch(lowerText, [db.chats[from], db.global, db.observaciones]);
  if (respuesta) {
      console.log(`[Diagnóstico] ¡Coincidencia encontrada en la memoria! Respondiendo...`);
      let extra = db.observaciones.some(o => o.respuesta === respuesta) ? "\n*(Esto lo aprendí observando nuestras conversaciones)*" : "";
      return await sock.sendMessage(from, { text: `${respuesta}${extra}` });
  }
  console.log(`[Diagnóstico] No encontré nada en mi memoria.`);

  // 5. RESPUESTA POR DEFECTO
  console.log(`[Paso 5] Enviando respuesta por defecto.`);
  const noSeRespuesta = ["Vaya, esa es una pregunta interesante...", "Mmm, eso es nuevo para mí...", "No tengo esa información en mi memoria..."];
  await sock.sendMessage(from, { text: noSeRespuesta[Math.floor(Math.random() * noSeRespuesta.length)] });
  console.log(`[FIN] Respuesta por defecto enviada.`);
}
