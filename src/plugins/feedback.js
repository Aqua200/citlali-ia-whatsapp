import fs from 'fs';
import path from 'path';
import { updateEmotion } from '../bot/emotionEngine.js';

const dbPath = path.resolve('./database.json');

function loadKnowledge() { 
  if (fs.existsSync(dbPath)) { 
    const rawData = fs.readFileSync(dbPath); 
    try { 
      return JSON.parse(rawData); 
    } catch (e) {
      const baseData = { global: [], chats: {}, observaciones: [] };
      fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2));
      return baseData;
    }
  } 
  const baseData = { global: [], chats: {}, observaciones: [] }; 
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); 
  return baseData; 
}

function saveKnowledge(data) { 
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); 
}

export default {
  command: ['!buena', '!bien', '!mala', '!mal'],
  description: 'Da feedback sobre la última respuesta de Citlali para que aprenda y mejore.',
  
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;
    const commandName = (msg.message?.conversation.toLowerCase() || msg.message?.extendedTextMessage?.text.toLowerCase() || '').split(' ')[0];
    const lastResponseData = global.lastResponseMemory.get(from);

    if (!lastResponseData) {
      return await sock.sendMessage(from, { text: 'No recuerdo haberte dado una respuesta recientemente para que puedas calificarla.' });
    }

    const { respuesta, conocimiento } = lastResponseData;
    const isGoodFeedback = commandName === '!buena' || commandName === '!bien';
    
    if (isGoodFeedback) {
      updateEmotion(2, 'Feedback positivo del usuario');
      conocimiento.score = (conocimiento.score || 0) + 1;
      await sock.sendMessage(from, { text: '¡Genial! Me alegra haber acertado. Lo tendré en cuenta para el futuro. 😊' });
    } else {
      updateEmotion(-2, 'Feedback negativo del usuario');
      conocimiento.score = (conocimiento.score || 0) - 1;
      await sock.sendMessage(from, { text: 'Vaya, lamento mi error. Gracias por decírmelo, me ayuda a aprender. 🤔' });
    }

    global.lastResponseMemory.delete(from);
  }
};
