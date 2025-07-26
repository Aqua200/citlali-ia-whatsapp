

import config from '../lib/config.js';

export default {
    command: ['!grupooficial', '!canaloficial'],
    
    async execute(sock, msg, args) {
        const command = msg.message?.conversation.toLowerCase() || msg.message?.extendedTextMessage?.text.toLowerCase();

        if (command.startsWith('!grupooficial')) {
            await sock.sendMessage(msg.key.remoteJid, { text: `¡Claro! Puedes unirte a nuestro grupo oficial aquí: ${config.officialGroup}` });
        } else if (command.startsWith('!canaloficial')) {
            await sock.sendMessage(msg.key.remoteJid, { text: `Sígueme en mi canal oficial para no perderte ninguna novedad: ${config.officialChannel}` });
        }
    }
};
