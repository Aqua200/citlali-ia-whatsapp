// src/bot/handleMessage.js -> VERSIÓN CON RESPUESTA A MENCIONES

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
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''; // '' para evitar errores
  if (!text && !msg.message?.extendedTextMessage) return; // Salir si no hay nada que procesar

  const lowerText = text.toLowerCase();
  
  // --- CARACTERÍSTICA NUEVA: RESPUESTA A MENCIONES ---
  // Obtenemos el JID del bot para poder compararlo
  const botJid = sock.user.id;
  // Verificamos si la lista de menciones del mensaje incluye el JID del bot
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  
  if (mentionedJids.includes(botJid)) {
    console.log(`[Mención] Fui etiquetado por ${senderJid} en ${from}`);
    
    // Obtenemos el nombre del usuario que nos mencionó
    const senderName = await sock.getName(senderJid);
    
    // Construimos la respuesta. Es importante usar el JID para que la etiqueta funcione.
    const responseText = `¡Hola @${senderJid.split('@')[0]}! ¿En qué te puedo ayudar?`;
    
    // Enviamos el mensaje, incluyendo la propiedad `mentions` para que la etiqueta sea un enlace azul.
    await sock.sendMessage(from, {
      text: responseText,
      mentions: [senderJid]
    });
    
    return; // Detenemos la ejecución para no procesar el resto del mensaje.
  }

  // --- COMANDO DE APRENDIZAJE (Sin cambios) ---
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
  
  // --- LÓGICA DE RECONOCIMIENTO (Sin cambios) ---
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

  // --- RESPUESTA CUANDO NO SABE (Sin cambios) ---
  const noSeRespuesta = `🤔 No sé cómo responder a eso. ¡Puedes enseñarme usando el siguiente comando!\n\n\`\`\`!aprende ${text} = [Aquí pones la respuesta correcta]\`\`\``;
  // Solo respondemos si el mensaje tiene texto, para no spamear en menciones vacías.
  if (text) {
    await sock.sendMessage(from, { text: noSeRespuesta });
  }
}```
4.  Guarda el archivo.

### ¿Qué hemos cambiado?

1.  **Detección de Mención:** Al principio de todo, el código ahora busca si el `JID` (el número de teléfono único) del bot está en la lista de `mentionedJid` del mensaje.
2.  **Respuesta Personalizada:** Si lo encuentra:
    *   Obtiene el nombre y el JID de la persona que envió el mensaje.
    *   Crea el texto `¡Hola @[número del usuario]! ¿En qué te puedo ayudar?`.
    *   **Crucial:** Envía el mensaje con la propiedad `mentions: [senderJid]`. Esto es lo que hace que WhatsApp convierta el `@numero` en un `@nombre` azul y notificable.
3.  **Prioridad:** Después de responder a la mención, usamos `return;` para que el bot no intente hacer nada más con ese mensaje (como buscarlo en su base de datos o intentar aprender de él).

### Cómo Probarlo

1.  Reinicia tu bot con `npm start`.
2.  Ve a cualquier grupo donde esté el bot.
3.  Escribe un mensaje y etiqueta al bot, por ejemplo: `@Citlali-IA ¿estás ahí?`
4.  El bot debería responderte inmediatamente: `¡Hola @[Tu Nombre]! ¿En qué te puedo ayudar?`
### ¡Felicidades! Tu bot ahora es mucho más social y consciente de su entorno en los grupos.
