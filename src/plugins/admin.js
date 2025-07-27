import config from '../lib/config.js';

export default {
    command: ['!kick', '!echar', '!hechar', '!sacar', '!ban'],
    description: 'Expulsa a un usuario del grupo (solo para admins).',
    groupOnly: true,
    botAdmin: true,
    adminOnly: true,

    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.sender;

        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        let targetJid = mentionedJids[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (!targetJid) {
            return await sock.sendMessage(from, { text: 'Debes mencionar a un usuario o responder a su mensaje para expulsarlo.' });
        }

        if (targetJid === sock.user.id) {
            return await sock.sendMessage(from, { text: 'No puedo expulsarme a mí misma. 😅' });
        }

        const targetNumber = targetJid.split('@')[0];
        const isBotOwner = config.owner.some(owner => owner[0] === targetNumber);
        if (isBotOwner) {
            return await sock.sendMessage(from, { text: 'No puedo expulsar a mi creador/a. Es una regla fundamental.' });
        }

        const groupMetadata = await sock.groupMetadata(from);
        const groupOwner = groupMetadata.owner;
        if (targetJid === groupOwner) {
            return await sock.sendMessage(from, { text: 'No puedo expulsar al propietario/a del grupo.' });
        }

        try {
            await sock.sendMessage(from, { text: `Iniciando proceso de expulsión para @${targetNumber}...`, mentions: [targetJid] });

            await sock.groupParticipantsUpdate(
                from, 
                [targetJid],
                'remove'
            );

        } catch (error) {
            console.error("Error en el comando kick:", error);
            await sock.sendMessage(from, { text: 'Ocurrió un error. Es posible que no tenga los permisos suficientes para hacer eso.' });
        }
    }
};
