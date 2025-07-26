import { connect } from './src/lib/connect.js';
import config, { resolveGroupJIDs } from './src/lib/config.js';
import { handleMessage } from './src/bot/handleMessage.js';

async function start() {
  const sock = await connect();
  await resolveGroupJIDs(sock);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;
    await handleMessage(sock, msg);
  });

  console.log("🚀 Bot iniciado y esperando mensajes...");
}

start();
