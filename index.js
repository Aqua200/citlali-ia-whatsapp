import { connect } from './src/lib/connect.js';
import { resolveGroupJIDs } from './src/lib/config.js';
import { handleMessage } from './src/bot/handleMessage.js';
import { getRandomThought } from './src/lib/thoughts.js';
import { startInternalMonologue } from './src/bot/internalMonologue.js';

const chatActivity = new Map();
const INACTIVITY_THRESHOLD = 45 * 60 * 1000;

async function start() {
  const sock = await connect();
  await resolveGroupJIDs(sock);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || !msg.key.remoteJid) return;
    chatActivity.set(msg.key.remoteJid, Date.now());
    await handleMessage(sock, msg);
  });

  setInterval(async () => {
    const now = Date.now();
    console.log('[Corazón Externo] Revisando la actividad de los grupos...');
    
    for (const [chatId, lastActivity] of chatActivity.entries()) {
      if (!chatId.endsWith('@g.us')) continue;
      if ((now - lastActivity) > INACTIVITY_THRESHOLD) {
        console.log(`[Pensamiento Externo] El grupo ${chatId} está en silencio. Tomando la iniciativa...`);
        const thought = getRandomThought();
        await sock.sendMessage(chatId, { text: thought });
        chatActivity.set(chatId, now);
      }
    }
  }, 10 * 60 * 1000);

  startInternalMonologue();
  console.log("🚀 Citlali está completamente viva: responde, piensa en voz alta y reflexiona internamente.");
}

start();
