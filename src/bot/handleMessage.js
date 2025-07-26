// src/bot/handleMessage.js -> VERSIÓN FINAL CON ESTADOS DE ÁNIMO Y LÓGICA PROPIA

import fs from 'fs';
import path from 'path';

// --- GESTIÓN DE LA BASE DE DATOS (Sin cambios) ---
const dbPath = path.resolve('./database.json');
// ... (Las funciones loadKnowledge y saveKnowledge se quedan igual, las incluimos al final)
let db = loadKnowledge();

// --- MOTOR DE PERSONALIDAD DE CITLALI ---
// Esta función central elige qué decir basado en el estado de ánimo actual de Citlali.
async function responderSegunEstado(sock, from, estado, contexto = {}) {
  let respuestasPosibles = [];
  
  switch (estado) {
    case 'MENCIONADA':
      respuestasPosibles = [
        `¡Hola, @${contexto.jid}! Soy Citlali. ¿En qué puedo ayudarte hoy?`,
        `¿Sí, @${contexto.jid}? Dime, ¿necesitas algo?`,
        `¡Presente! Soy Citlali, a tu servicio @${contexto.jid}.`
      ];
      break;
    
    case 'AGRADECIDA':
      respuestasPosibles = [
        `¡Entendido! Lo he guardado en mi memoria. ¡Muchas gracias por enseñarme, ${contexto.nombre}!`,
        `¡Genial, ${contexto.nombre}! Una cosa nueva que aprendo hoy gracias a ti.`,
        `¡Anotado! Mi conocimiento crece contigo, ${contexto.nombre}. Te lo agradezco mucho.`
      ];
      break;

    case 'CONFUNDIDA':
      respuestasPosibles = [
        `Mmm, creo que no entendí bien la lección. ¿Podrías usar el formato \`pregunta = respuesta\`, por favor?`,
        `Estoy un poco confundida con el formato. Recuerda que es: \`pregunta = respuesta\`.`,
        `Algo no me cuadra. Para que aprenda, necesito que uses el signo '=' para separar la pregunta de la respuesta.`
      ];
      break;

    case 'CURIOSA':
      respuestasPosibles = [
        `Vaya, sobre "${contexto.pregunta}" todavía no he aprendido nada. Me encantaría que me enseñaras.`,
        `Esa es una buena pregunta. Aún no tengo la respuesta, pero puedes enseñármela.`,
        `Mi memoria aún no tiene información sobre "${contexto.pregunta}". ¿Te gustaría enseñarme la respuesta?`
      ];
      const sugerencia = `Puedes hacerlo con este comando:\n\n\`\`\`!aprende ${contexto.pregunta} = [Aquí escribe la respuesta]\`\`\``;
      // Enviamos una de las respuestas curiosas y luego la sugerencia.
      const respuestaCuriosa = respuestasPosibles[Math.floor(Math.random() * respuestasPosibles.length)];
      await sock.sendMessage(from, { text: `${respuestaCuriosa}\n\n${sugerencia}` });
      return; // Salimos porque este caso tiene una estructura especial.

    default: // Caso NEUTRAL o no definido
      respuestasPosibles = [`No estoy segura de qué decir a eso.`];
  }

  // Elige una respuesta al azar de las posibles para ese estado
  const respuestaFinal = respuestasPosibles[Math.floor(Math.random() * respuestasPosibles.length)];

  await sock.sendMessage(from, { 
    text: respuestaFinal,
    mentions: contexto.jid ? [contexto.jid] : [] // Añade la mención si existe en el contexto
  });
}


// --- LÓGICA PRINCIPAL DE MENSAJES (Ahora es un "Director de Orquesta") ---
export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text && !msg.message?.extendedTextMessage) return;

  const lowerText = text.toLowerCase();
  
  let estadoActual = 'NEUTRAL'; // Por defecto, su estado es neutral
  let contexto = {}; // Información adicional para la respuesta

  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  
  // DISPARADOR 1: Es mencionada
  if (mentionedJids.includes(botJid)) {
    estadoActual = 'MENCIONADA';
    contexto = { jid: senderJid.split('@')[0] };
  
  // DISPARADOR 2: Le intentan enseñar algo
  } else if (lowerText.startsWith('!aprende ') || lowerText.startsWith('!aprender ')) {
    const commandPrefix = lowerText.startsWith('!aprende ') ? '!aprende ' : '!aprender ';
    const content = text.substring(commandPrefix.length).trim();
    const parts = content.split('=');

    if (parts.length === 2) {
      const pregunta = parts[0].trim().toLowerCase();
      const respuesta = parts[1].trim();
      const senderName = await sock.getName(senderJid);
      db.conocimientos.push({ pregunta, respuesta, creadorJid: senderJid, creadorNombre: senderName });
      saveKnowledge(db);
      estadoActual = 'AGRADECIDA';
      contexto = { nombre: senderName };
    } else {
      estadoActual = 'CONFUNDIDA';
    }

  } else {
    // DISPARADOR 3: Revisa su memoria para contestar "sola"
    let respuestaEncontrada = false;
    for (const conocimiento of db.conocimientos) {
      const palabrasClave = conocimiento.pregunta.split(' ').filter(p => p.length > 2);
      let coincidencias = 0;
      for (const palabra of palabrasClave) {
        if (lowerText.includes(palabra)) coincidencias++;
      }
      const umbral = Math.floor(palabrasClave.length * 0.7);
      if (palabrasClave.length > 0 && coincidencias >= umbral) {
        console.log(`[Memoria Local] Respondiendo a "${conocimiento.pregunta}"`);
        await sock.sendMessage(from, { text: conocimiento.respuesta });
        respuestaEncontrada = true;
        break; // Sale del bucle al encontrar respuesta
      }
    }
    // DISPARADOR 4: Si no encontró nada, se pone curiosa
    if (!respuestaEncontrada && text) {
      estadoActual = 'CURIOSA';
      contexto = { pregunta: text };
    }
  }

  // Al final, llamamos al motor de personalidad si el estado no es neutral o si es una mención
  if (estadoActual !== 'NEUTRAL' || mentionedJids.includes(botJid)) {
    if (estadoActual !== 'NEUTRAL') { // Evitar doble respuesta si no es mencionada
         await responderSegunEstado(sock, from, estadoActual, contexto);
    }
  }
}

// --- FUNCIONES DE BASE DE DATOS (Asegúrate de que estén aquí) ---
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
