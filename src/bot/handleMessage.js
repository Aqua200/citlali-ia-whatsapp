// src/bot/handleMessage.js -> VERSIÓN MEJORADA Y MÁS FLEXIBLE

import fs from 'fs';
import path from 'path';

// ... (El resto de las funciones de la base de datos no cambian)
const dbPath = path.resolve('./database.json');
function loadKnowledge() { /* ...código sin cambios... */ }
function saveKnowledge(data) { /* ...código sin cambios... */ }
let db = loadKnowledge();

export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text && !msg.message?.extendedTextMessage) return;

  const lowerText = text.toLowerCase();
  
  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  
  if (mentionedJids.includes(botJid)) {
    const senderName = await sock.getName(senderJid);
    const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
    await sock.sendMessage(from, { text: responseText, mentions: [senderJid] });
    return;
  }

  // --- COMANDO DE APRENDIZAJE MEJORADO ---
  // Ahora acepta '!aprende' y '!aprender'
  if (lowerText.startsWith('!aprende ') || lowerText.startsWith('!aprender ')) {
    // Determinamos cuál comando se usó para quitar el prefijo correcto
    const commandPrefix = lowerText.startsWith('!aprende ') ? '!aprende ' : '!aprender ';
    const content = text.substring(commandPrefix.length).trim();
    const parts = content.split('=');

    if (parts.length === 2) {
      const pregunta = parts[0].trim().toLowerCase();
      const respuesta = parts[1].trim();
      const senderName = await sock.getName(senderJid);
      const nuevoConocimiento = { pregunta, respuesta, creadorJid: senderJid, creadorNombre: senderName };
      db.conocimientos.push(nuevoConocimiento);
      saveKnowledge(db);
      await sock.sendMessage(from, { text: `¡Entendido! Lo he guardado en mi memoria. ¡Muchas gracias por enseñarme, ${senderName}!` });
    } else {
      await sock.sendMessage(from, { text: 'Mmm, creo que no entendí bien la lección. ¿Podrías usar el formato `pregunta = respuesta`, por favor?' });
    }
    return;
  }
  
  // ... (El resto del código para buscar en la memoria y responder no cambia)
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
      await sock.sendMessage(from, { text: conocimiento.respuesta });
      return;
    }
  }

  const noSeRespuesta = `Vaya, sobre eso todavía no he aprendido nada. Me encantaría que me enseñaras. Puedes hacerlo con este comando:\n\n\`\`\`!aprende ${text} = [Aquí escribe la respuesta]\`\`\``;
  if (text) {
    await sock.sendMessage(from, { text: noSeRespuesta });
  }
}

// Asegúrate de que las funciones loadKnowledge y saveKnowledge estén aquí también
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
