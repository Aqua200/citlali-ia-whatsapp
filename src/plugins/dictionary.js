// src/plugins/dictionary.js

export default {
    command: ['!definir', '!define', '!diccionario'],
    description: 'Busca la definición de una palabra en el diccionario.',
    
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const word = args.join(' ');

        if (!word) {
            return await sock.sendMessage(from, { 
                text: 'Por favor, dime qué palabra quieres que busque.\n\n*Ejemplo:*\n`!definir resiliencia`' 
            });
        }

        try {
            await sock.sendMessage(from, { text: `📖 Buscando la definición de "${word}"...` });

            // Usamos la API pública y gratuita para diccionarios en español
            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(word)}`;
            const response = await fetch(apiUrl);

            // Si la API devuelve un error 404, significa que no encontró la palabra
            if (response.status === 404) {
                return await sock.sendMessage(from, { text: `😕 No encontré una definición para "${word}". ¿Está bien escrita?` }, { quoted: msg });
            }

            // Si la respuesta no es exitosa por otra razón
            if (!response.ok) {
                throw new Error('La API del diccionario no respondió correctamente.');
            }

            const data = await response.json();
            
            // La API devuelve un array, tomamos el primer resultado
            const entry = data[0];
            let responseText = `*Definición de "${entry.word}"*\n\n`;

            // Recorremos cada significado (ej: sustantivo, verbo)
            entry.meanings.forEach((meaning, index) => {
                responseText += `*${index + 1}. ${meaning.partOfSpeech}*\n`;
                // Recorremos cada definición dentro de ese significado
                meaning.definitions.forEach((def, defIndex) => {
                    responseText += `   ${defIndex + 1}. ${def.definition}\n`;
                    // Si hay un ejemplo, lo añadimos
                    if (def.example) {
                        responseText += `   *Ejemplo:* _"${def.example}"_\n`;
                    }
                });
                responseText += '\n';
            });

            // Enviamos el resultado formateado
            await sock.sendMessage(from, { text: responseText.trim() }, { quoted: msg });

        } catch (error) {
            console.error("Error al buscar en el diccionario:", error);
            await sock.sendMessage(from, { text: '❌ ¡Ups! Hubo un problema al buscar la definición. Inténtalo de nuevo más tarde.' });
        }
    }
};
