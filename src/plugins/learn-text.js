import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('./database.json');
function loadKnowledge() {
  if (fs.existsSync(dbPath)) {
    const rawData = fs.readFileSync(dbPath);
    try {
      return JSON.parse(rawData);
    } catch (e) {
      const baseData = { global: [], chats: {} };
      fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
      return baseData;
    }
  }
  const baseData = { global: [], chats: {} };
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
  return baseData;
}
function saveKnowledge(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export default {
  command: ['!aprende-texto', '!analiza-texto'],
  description: 'Analiza un texto para aprender sus hechos clave de forma autónoma (Solo Dueño).',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;
    const textToProcess = args.join(' ');

    if (!textToProcess) {
      return await sock.sendMessage(from, { text: 'Por favor, proporciona el texto que quieres que analice después del comando.' });
    }

    await sock.sendMessage(from, { text: '🧠 Analizando el texto con mi propio procesador... Un momento.' });

    const db = loadKnowledge();
    const sentences = textToProcess.split('.');
    let factsLearned = 0;

    const factKeywords = ['es', 'son', 'se llama', 'consiste en', 'significa', 'se conoce como'];

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const keyword = factKeywords.find(kw => lowerSentence.includes(` ${kw} `));

      if (keyword) {
        const parts = sentence.split(new RegExp(` ${keyword} `, 'i'));
        if (parts.length === 2) {
          let pregunta = parts[0].trim().toLowerCase();
          const respuesta = parts[1].trim();
          pregunta = pregunta.replace(/^(qué es|qué son|cuál es)\s*/, '');

          if (pregunta.length > 3 && respuesta.length > 3 && pregunta.length < 100) {
            db.global.push({
              pregunta: pregunta,
              respuesta: respuesta,
              creadorJid: msg.key.participant || msg.sender,
              creadorNombre: 'Aprendizaje Autónomo'
            });
            factsLearned++;
          }
        }
      }
    }

    if (factsLearned > 0) {
      saveKnowledge(db);
      await sock.sendMessage(from, { text: `✅ ¡Análisis completado! He extraído y aprendido ${factsLearned} nuevos conceptos del texto.` });
    } else {
      await sock.sendMessage(from, { text: 'No pude extraer ningún hecho claro del texto con mi método actual. Intenta con un texto más simple y declarativo.' });
    }
  }
};
