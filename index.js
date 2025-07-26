// index.js ---> CÓDIGO FINAL Y CORRECTO

// 1. Ruta actualizada para encontrar el archivo de conexión
import { connect } from './src/lib/connect.js'; 

// 2. Ruta actualizada para encontrar el archivo que maneja los mensajes
import { handleMessage } from './src/bot/handleMessage.js'; 

async function start() {
  const sock = await connect();

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    // Llama a la función desde su nueva ubicación
    await handleMessage(sock, msg);
  });

  console.log("🚀 Bot iniciado y esperando mensajes...");
}

start();
