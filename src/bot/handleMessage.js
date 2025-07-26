// src/bot/handleMessage.js -> VERSIÓN CON PERSONALIDAD FEMENINA DEFINIDA

import fs from 'fs';
import path from 'path';

// --- GESTIÓN DE LA BASE DE DATOS (Sin cambios) ---
const dbPath = path.resolve('./database.json');

function loadKnowledge() {
  if (fs.existsSync(dbPath)) {
    const rawData = fs.readFileSync(dbPath);
    return JSON.parse(rawData);
  }
  const baseData = { conocimientos: [] };
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
  return baseData;
}

function saveKnowledge(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

let db = loadKnowledge();
// ------------------------------------------------------------------


export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text && !msg.message?.extendedTextMessage) return;

  const lowerText = text.toLowerCase();
  
  // --- RESPUESTA A MENCIONES (Con su nueva personalidad) ---
  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  
  if (mentionedJids.includes(botJid)) {
    const senderName = await sock.getName(senderJid);
    
    // VOZ ACTUALIZADA: Se presenta y ofrece ayuda de forma más personal.
    const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
    
    await sock.sendMessage(from, {
      text: responseText,
      mentions: [senderJid]
    });
    
    return;
  }

  // --- COMANDO DE APRENDIZAJE (Con su nueva personalidad) ---
  if (lowerText.startsWith('!aprende ')) {
    const content = text.substring(9).trim();
    const parts = content.split('=');

    if (parts.length === 2) {
      const pregunta = parts[0].trim().toLowerCase();
      const respuesta = parts[1].trim();
      const senderName = await sock.getName(senderJid);
      const nuevoConocimiento = { pregunta, respuesta, creadorJid: senderJid, creadorNombre: senderName };
      db.conocimientos.push(nuevoConocimiento);
      saveKnowledge(db);
      
      // VOZ ACTUALIZADA: Suena más agradecida y consciente de su aprendizaje.
      await sock.sendMessage(from, { text: `¡Entendido! Lo he guardado en mi memoria. ¡Muchas gracias por enseñarme, ${senderName}!` });
    } else {
      // VOZ ACTUALIZADA: Suena más amable al corregir.
      await sock.sendMessage(from, { text: 'Mmm, creo que no entendí bien la lección. ¿Podrías usar el formato `pregunta = respuesta`, por favor?' });
    }
    return;
  }
  
  // --- LÓGICA DE RECONOCIMIENTO (Sin cambios, esta es la que la hace "contestar sola") ---
  for (const conocimiento of db.conocimientos) {
    const palabrasClave = conocimiento.pregunta.split(' ').filter(p => p.length > 2);
    let coincidencias = 0;
    for (const palabra of palabrasClave) {
      if (lowerText.includes(palabra)) {
        coincidencias++;
      }
    }
    const umbral = Math.floor(palabrasClave.length * 0.7);

    if (palabrasClave.length > 0 && coincidencias >= umbral) {
      console.log(`[Memoria Local] Respondiendo a "${conocimiento.pregunta}"`);
      await sock.sendMessage(from, { text: conocimiento.respuesta });
      return;
    }
  }

  // --- RESPUESTA CUANDO NO SABE (Con su nueva personalidad) ---
  // VOZ ACTUALIZADA: Suena más curiosa y proactiva.
  const noSeRespuesta = `Vaya, sobre eso todavía no he aprendido nada. Me encantaría que me enseñaras. Puedes hacerlo con este comando:\n\n\`\`\`!aprende ${text} = [Aquí escribe la respuesta]\`\`\``;
  if (text) {
    await sock.sendMessage(from, { text: noSeRespuesta });
  }
}
