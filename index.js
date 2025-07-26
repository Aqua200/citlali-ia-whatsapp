import { connect } from './src/lib/connect.js'; 

import { handleMessage } from './src/bot/handleMessage.js'; 

async function start() {
  const sock = await connect();

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    await handleMessage(sock, msg);
  });

  console.log("🚀 Bot iniciado y esperando mensajes...");
}

start();
