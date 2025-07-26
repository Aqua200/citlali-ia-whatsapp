export async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text

  if (!text) return

  // Respuestas simples según mensaje
  if (text.toLowerCase().includes('hola')) {
    await sock.sendMessage(from, { text: '¡Hola! Soy Citlali, tu asistente IA. ¿En qué te puedo ayudar?' })
  } else if (text.toLowerCase().includes('¿cómo estás?')) { // <-- NUEVA RESPUESTA
    await sock.sendMessage(from, { text: '¡Estoy funcionando a la perfección! Gracias por preguntar.' })
  } else if (text.toLowerCase().includes('adiós')) {
    await sock.sendMessage(from, { text: '¡Hasta luego! Que tengas un gran día 😊' })
  } else {
    await sock.sendMessage(from, { text: 'No entendí eso, ¿puedes intentar de nuevo?' })
  }
}
