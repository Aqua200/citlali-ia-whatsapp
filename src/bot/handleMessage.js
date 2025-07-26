// src/bot/handleMessage.js -> VERSIÓN 100% AUTÓNOMA (SIN IA)

import fs from 'fs';
import path from 'path';
// ELIMINADO: Ya no importamos la IA.

// --- GESTIÓN DE LA BASE DE DATOS (Sin cambios aquí) ---
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
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  if (!text) return;

  const lowerText = text.toLowerCase();

  // --- COMANDO DE APRENDIZAJE (Sigue igual) ---
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
      await sock.sendMessage(from, { text: `✅ ¡Gracias, ${senderName}! He aprendido una nueva respuesta.` });
    } else {
      await sock.sendMessage(from, { text: '❌ Formato incorrecto. Usa: !aprende pregunta = respuesta' });
    }
    return;
  }
  
  // --- LÓGICA DE RECONOCIMIENTO (Sigue igual) ---
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

  // --- ¡LÓGICA COMPLETAMENTE NUEVA! Si no encuentra respuesta... ---
  // En lugar de llamar a la IA, ahora envía un mensaje de ayuda.
  const noSeRespuesta = `🤔 No sé cómo responder a eso. ¡Puedes enseñarme usando el siguiente comando!\n\n\`\`\`!aprende ${text} = [Aquí pones la respuesta correcta]\`\`\``;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
