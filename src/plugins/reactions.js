export default {
    command: ['!happy', '!feliz'],
    ownerOnly: false,
    description: 'Expresa tu felicidad con un video. Menciona a alguien para dedicarlo.',

    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.sender;

        let targetJid;
        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0) {
            targetJid = mentionedJids[0];
        } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetJid = msg.message.extendedTextMessage.contextInfo.participant;
        } else {
            targetJid = senderJid;
        }

        const senderName = msg.pushName || senderJid.split('@')[0];
        let targetName = 'alguien';
        if (targetJid) {
            try {
                const [result] = await sock.onWhatsApp(targetJid);
                targetName = result.notify || result.verifiedName || targetJid.split('@')[0];
            } catch (e) {
                targetName = targetJid.split('@')[0];
            }
        }

        let captionText;
        if (targetJid && targetJid !== senderJid) {
            captionText = `*${senderName}* está feliz por *${targetName}* ٩(˶ˆᗜˆ˵)و`;
        } else {
            captionText = `*${senderName}* está feliz ٩(˶ˆᗜˆ˵)و`;
        }

        const videos = [
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865594703.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865585197.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865626162.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865629570.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865615508.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865606355.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865601294.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865789327.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865670953.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865663383.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865653527.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742865637437.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1745603272484.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1745603276572.mp4',
            'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1745603266683.mp4',
        ];

        const randomVideoUrl = videos[Math.floor(Math.random() * videos.length)];

        await sock.sendMessage(from, { 
            video: { url: randomVideoUrl }, 
            gifPlayback: true,
            caption: captionText,
            mentions: [senderJid, targetJid].filter(Boolean) 
        }, { quoted: msg });
    }
};
