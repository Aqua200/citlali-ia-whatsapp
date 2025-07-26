// Helper para añadir pausas. No lo cambies.
const delay = ms => new Promise(res => setTimeout(res, ms));

export async function handleMessage(sock, msg) {
  // === LA PROTECCIÓN MÁS IMPORTANTE ===
  // Ignora todos los mensajes que el propio bot envía.
  // Esto previene el 99% de los bucles infinitos.
  if (msg.key.fromMe) {
    return;
  }
  // =====================================

  const from = msg.key.remoteJid;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

  if (!text) return;

  const lowerText = text.toLowerCase();

  // Condición de inicio (la activa el usuario)
  if (lowerText.includes('hola')) {
    // Si el usuario dice "hola", el bot envía la secuencia directamente.
    
    // Mensaje 1
    await sock.sendMessage(from, { text: '¡Hola! Permíteme presentarme...' });
    await delay(1000); // Espera 1 segundo (1000 ms)

    // Mensaje 2
    await sock.sendMessage(from, { text: 'Soy Citlali, tu asistente de IA.' });
    await delay(1000); // Espera 1 segundo

    // Mensaje 3
    await sock.sendMessage(from, { text: '¿En qué te puedo ayudar hoy?' });
    
    // La secuencia termina aquí. No se necesita más lógica.

  } else if (lowerText.includes('adiós')) {
    await sock.sendMessage(from, { text: '¡Hasta luego! Que tengas un gran día 😊' });
  } else {
    // Respuesta por defecto para cualquier otro mensaje.
    await sock.sendMessage(from, { text: 'No entendí eso, ¿puedes intentar de nuevo?' });
  }
}
