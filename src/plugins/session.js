// src/plugins/session.js

import { readdirSync, unlinkSync, existsSync } from 'fs';
import path from 'path';

// Definimos la ruta de la carpeta de sesiones aquí para mantener el código limpio.
// Asumimos que la carpeta se llama 'sessions' y está en la raíz del proyecto.
const sessionsFolder = './sessions'; 

export default {
    // Definimos todos los alias para este comando
    command: ['dsowner', 'delai', 'clearallsession'],
    
    // Marcamos que es un comando exclusivo para el dueño
    ownerOnly: true,
    
    // Descripción para el menú de ayuda
    description: 'Limpia la caché de la sesión para solucionar problemas de conexión.',

    // La función principal que se ejecuta
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;

        // Comprobamos si el comando se está ejecutando en el bot principal
        // (Aunque con ownerOnly es redundante, es una buena práctica de seguridad)
        if (global.conn.user.jid !== sock.user.jid) {
            return await sock.sendMessage(from, { text: 'Utiliza este comando directamente en el número principal del Bot.' });
        }
        
        await sock.sendMessage(from, { text: '⏳ Iniciando limpieza de la sesión... (excepto creds.json)' });

        try {
            // Verificamos si la carpeta de sesiones existe
            if (!existsSync(sessionsFolder)) {
                return await sock.sendMessage(from, { text: '⚠️ La carpeta de sesiones no existe. No hay nada que limpiar.' });
            }

            // Leemos todos los archivos de la carpeta
            const files = readdirSync(sessionsFolder);
            let filesDeleted = 0;

            // Recorremos cada archivo
            for (const file of files) {
                // Si el archivo NO es 'creds.json', lo eliminamos
                if (file !== 'creds.json') {
                    const filePath = path.join(sessionsFolder, file);
                    unlinkSync(filePath);
                    filesDeleted++;
                }
            }

            if (filesDeleted === 0) {
                await sock.sendMessage(from, { text: '✅ La carpeta de sesiones ya estaba limpia. No se eliminó ningún archivo.' });
            } else {
                await sock.sendMessage(from, { text: `✅ ¡Limpieza completada! Se eliminaron ${filesDeleted} archivos de sesión.` });
                // Mensaje de prueba para ver si el bot sigue respondiendo después de la limpieza
                await sock.sendMessage(from, { text: `¡Hola! Si ves esto, sigo funcionando perfectamente.` });
            }

        } catch (err) {
            console.error('Error al limpiar la carpeta de sesión:', err);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error inesperado durante la limpieza.' });
        }
    }
};
