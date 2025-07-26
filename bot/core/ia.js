// ia (1).js - Corregido para auto-respuesta controlada

export async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

  if (!text) return;

  const fromMe = msg.key.fromMe; // Comprobamos si el mensaje viene del bot
  const lowerText = text.toLowerCase(); // Pasamos el texto a minúsculas una sola vez

  // --- LÓGICA PRINCIPAL ---
  // Esta sección se encarga de las respuestas a los demás y a sí mismo.

  // 1. Condición de inicio (la activa el usuario)
  if (lowerText.includes('hola') && !fromMe) {
    // Si un USUARIO (no el bot) dice "hola", inicia la secuencia.
    await sock.sendMessage(from, { text: '¡Hola! Iniciando mi presentación... [Paso 1]' });
    return; // Detenemos la función aquí para no seguir evaluando.
  }

  // 2. Condición de auto-respuesta (la activa el bot)
  if (lowerText.includes('[paso 1]') && fromMe) {
    // Si el BOT (y solo el bot) envía un mensaje con "[Paso 1]", responde con el paso 2.
    await sock.sendMessage(from, { text: 'Soy Citlali, tu asistente IA. [Paso 2]' });
    return;
  }
  
  // 3. Condición final de auto-respuesta (la activa el bot)
  if (lowerText.includes('[paso 2]') && fromMe) {
    // Si el BOT (y solo el bot) envía un mensaje con "[Paso 2]", responde con el mensaje final.
    await sock.sendMessage(from, { text: '¡Secuencia completada! ¿En qué te puedo ayudar?' });
    return; // El mensaje final no contiene ninguna palabra clave, por lo que el ciclo se detiene aquí.
  }
  
  // 4. Respuesta para "adiós" (solo para usuarios)
  if (lowerText.includes('adiós') && !fromMe) {
    await sock.sendMessage(from, { text: '¡Hasta luego! Que tengas un gran día 😊' });
    return;
  }

  // 5. Respuesta por defecto (solo si el mensaje es de un usuario y no coincide con nada)
  if (!fromMe) {
      await sock.sendMessage(from, { text: 'No entendí eso, ¿puedes intentar de nuevo?' });
  }

  // Si el mensaje es del bot y no coincide con ninguna condición de auto-respuesta,
  // simplemente no hace nada, evitando el bucle infinito.
}
