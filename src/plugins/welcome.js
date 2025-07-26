export default {
    event: 'group-participants.update',

    description: 'Gestiona la bienvenida y despedida de los miembros del grupo.',

    async execute(sock, update) {
        const { id, participants, action } = update;

        console.log('[Plugin Welcome] Evento de grupo detectado:', update);

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
                console.error(`Error en el plugin de bienvenida:`, e);
            }
        }
    }
};
