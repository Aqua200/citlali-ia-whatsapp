import { connect } from './src/lib/connect.js';
import { resolveGroupJIDs } from './src/lib/config.js';
import { handleMessage } from './src/bot/handleMessage.js';
import { getRandomThought } from './src/lib/thoughts.js';

const chatActivity = new Map();
const INACTIVITY_THRESHOLD = 30 * 60 * 1000;

async function start() {
  const sock = await connect();
  await resolveGroupJIDs(sock);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;
    chatActivity.set(msg.key.remoteJid, Date.now());
    await handleMessage(sock, msg);
  });

  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    for (const jid of participants) {
      try {
        if (action === 'add') {
          const welcomeText = `¡Bienvenida/o al grupo, @${jid.split('@')[0]}! 🎉\n\nSoy Citlali, la asistente de este chat. ¡Espero que disfrutes tu estadía!`;
          await sock.sendMessage(id, {
            text: welcomeText,
            mentions: [jid]
          });
        } else if (action === 'remove') {
          const goodbyeText = `Adiós, @${jid.split('@')[0]}. ¡Te echaremos de menos! 👋`;
          await sock.sendMessage(id, {
            text: goodbyeText,
            mentions: [jid]
          });
        }
      } catch (e) {
        console.error(`Error en el evento de grupo:`, e);
      }
    }
  });

  setInterval(async () => {
    const now = Date.now();
    for (const [chatId, lastActivity] of chatActivity.entries()) {
      if (!chatId.endsWith('@g.us')) continue;
      if ((now - lastActivity) > INACTIVITY_THRESHOLD) {
        const thought = getRandomThought();
        await sock.sendMessage(chatId, { text: thought });
        chatActivity.set(chatId, now);
      }
    }
  }, 5 * 60 * 1000);

  console.log("🚀 Bot iniciado. Escuchando, pensando y ahora ¡dando la bienvenida!");
}

start();
