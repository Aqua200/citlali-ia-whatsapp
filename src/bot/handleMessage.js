// src/bot/handleMessage.js -> VERSIÓN FINAL CON MEMORIA LOCAL/GLOBAL

import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';

// --- GESTIÓN DE LA BASE DE DATOS (Actualizada para la nueva estructura) ---
const dbPath = path.resolve('./database.json');

function loadKnowledge() { 
  if (fs.existsSync(dbPath)) { 
    const rawData = fs.readFileSync(dbPath); 
    try {
        return JSON.parse(rawData); 
    } catch (e) {
        console.error("Error al parsear database.json, reiniciando...", e);
        // Si el JSON está corrupto, lo reinicia
        const baseData = { global: [], chats: {} };
        fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
        return baseData;
    }
  } 
  // Si el archivo no existe, lo crea con la nueva estructura
  const baseData = { global: [], chats: {} }; 
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); 
  return baseData; 
}

// --- FUNCIÓN DE AYUDA PARA LA BÚSQUEDA (Evita repetir código) ---
function findKnowledge(text, knowledgeArray) {
    if (!knowledgeArray || knowledgeArray.length === 0) return null;

    for (const conocimiento of knowledgeArray) {
        const palabrasClave = conocimiento.pregunta.split(' ').filter(p => p.length > 2);
        let coincidencias = 0;
        for (const palabra of palabrasClave) { 
            if (text.includes(palabra)) coincidencias++; 
        }
        const umbral = Math.floor(palabrasClave.length * 0.7);
        if (palabrasClave.length > 0 && coincidencias >= umbral) {
            // Devuelve la respuesta encontrada
            return conocimiento.respuesta;
        }
    }
    // Si no encuentra nada, devuelve null
    return null;
}


// --- CEREBRO PRINCIPAL DE CITLALI ---
export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text) return;

  const lowerText = text.toLowerCase();
  
  // --- 1. LÓGICA DE MENCIÓN ---
  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentionedJids.includes(botJid)) {
    const senderName = msg.pushName || senderJid.split('@')[0]; // Corrección para obtener el nombre
    const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
    await sock.sendMessage(from, { text: responseText, mentions: [senderJid] });
    return;
  }
  
  // --- 2. LÓGICA DE PLUGINS ---
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
  
  // --- 3. LÓGICA DE IDENTIDAD ---
  if (lowerText.includes('género') || lowerText.includes('sexo')) {
    return await sock.sendMessage(from, { text: 'Soy una inteligencia artificial con identidad femenina.' });
  }
  if (lowerText.includes('edad') || lowerText.includes('cuántos años tienes')) {
    return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años. ¡Siempre lista para aprender algo nuevo!` });
  }

  // --- 4. NUEVA LÓGICA DE BÚSQUEDA EN MEMORIA (LOCAL Y GLOBAL) ---
  const db = loadKnowledge();
  
  // Primero, busca en la memoria local de este chat
  let respuesta = findKnowledge(lowerText, db.chats[from]);
  
  // Si no encontró nada, busca en la memoria global
  if (!respuesta) {
    respuesta = findKnowledge(lowerText, db.global);
  }

  // Si encontró una respuesta en cualquiera de las dos memorias, la envía
  if (respuesta) {
    return await sock.sendMessage(from, { text: respuesta });
  }

  // --- 5. SI LLEGAMOS AQUÍ, NO SABE LA RESPUESTA ---
  const noSeRespuesta = `Vaya, sobre eso todavía no he aprendido nada. Puedes enseñarme solo para este chat con:\n\n\`\`\`!aprende ${text} = [Aquí escribe la respuesta]\`\`\`\n\nO si es un conocimiento general, mi creador/a puede usar \`!aprende-global\`.`;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
