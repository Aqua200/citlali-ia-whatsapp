import config from '../lib/config.js';

export default {
    command: ['!mipoder', '!anuncio'],
    ownerOnly: true,

    async execute(sock, msg, args) {
        const command = msg.message?.conversation.toLowerCase() || msg.message?.extendedTextMessage?.text.toLowerCase();
        
        if (command.startsWith('!mipoder')) {
            const senderName = await sock.getName(msg.key.participant || msg.sender);
            await sock.sendMessage(msg.key.remoteJid, { text: `¡Por supuesto, mi creador/a ${senderName}! Estoy a tus órdenes.` });
        
        } else if (command.startsWith('!anuncio')) {
            if (!config.officialGroupJID) {
                return await sock.sendMessage(msg.key.remoteJid, { text: '❌ El JID del grupo oficial no está configurado o no se pudo resolver.' });
            }
            const anuncio = args.join(' ');
            if (!anuncio) {
                return await sock.sendMessage(msg.key.remoteJid, { text: 'Por favor, escribe el mensaje que quieres anunciar.' });
            }
            await sock.sendMessage(config.officialGroupJID, { text: `📢 ¡Anuncio de mi creador/a!\n\n${anuncio}` });
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Anuncio enviado al grupo oficial.' });
        }
    }
};
