

export default {
    command: ['!myjid', '!groupjid', '!jid'],
    
     ownerOnly: false,
    
     description: 'Muestra tu ID de usuario (JID) o el ID del grupo.',

    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.sender;
        
         const commandText = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').toLowerCase();

        if (commandText.startsWith('!myjid') || commandText.startsWith('!jid')) {
                await sock.sendMessage(from, { text: `Tu JID de usuario es:\n\`\`\`${senderJid}\`\`\`` });
        
        } else if (commandText.startsWith('!groupjid')) {
               if (from.endsWith('@g.us')) {
                  await sock.sendMessage(from, { text: `El JID de este grupo es:\n\`\`\`${from}\`\`\`` });
            } else {
                  await sock.sendMessage(from, { text: 'Este comando solo funciona en grupos.' });
            }
        }
    }
};
