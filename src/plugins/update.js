import { exec } from 'child_process';

export default {
    command: ['!update', '!actualizar', '!gitpull'],
    ownerOnly: true,
    description: 'Actualiza el bot desde su repositorio oficial de Git.',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;

        await sock.sendMessage(from, { text: '🔄 Verificando actualizaciones desde el repositorio de Git...' });

        exec('git pull', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al ejecutar git pull: ${error.message}`);
                return sock.sendMessage(from, { text: `❌ Ocurrió un error al intentar actualizar.\n\n*Error:*\n\`\`\`${error.message}\`\`\`` });
            }

            if (stderr) {
                console.warn(`Advertencias de git pull: ${stderr}`);
            }

            if (stdout.includes('Already up to date.')) {
                return sock.sendMessage(from, { text: '✅ ¡Perfecto! Ya estoy en la última versión.' });
            }

            const successMessage = `✅ ¡Actualización completada con éxito!\n\n*Detalles:*\n\`\`\`\n${stdout}\n\`\`\``;
            sock.sendMessage(from, { text: successMessage });
            sock.sendMessage(from, { text: '💡 **Recuerda reiniciar el bot para que los nuevos cambios surtan efecto!**' });
        });
    }
};
