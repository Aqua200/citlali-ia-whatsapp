import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';
import commands from '../bot/commandLoader.js';

const dbPath = path.resolve('./database.json');
function loadKnowledge() { 
  if (fs.existsSync(dbPath)) { 
    const rawData = fs.readFileSync(dbPath); 
    return JSON.parse(rawData); 
  } 
  const baseData = { conocimientos: [] }; 
  fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); 
  return baseData; 
}

export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text) return;

  const lowerText = text.toLowerCase();

  const botJid = sock.user.id;
  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentionedJids.includes(botJid)) {
    const senderName = await sock.getName(senderJid);
    const responseText = `¡Hola, @${senderJid.split('@')[0]}! Soy Citlali. ¿En qué puedo ayudarte?`;
    await sock.sendMessage(from, { text: responseText, mentions: [senderJid] });
    return;
  }
  
  const args = text.trim().split(/ +/).slice(1);
  const commandName = text.trim().split(/ +/)[0].toLowerCase();
  const command = commands.get(commandName);

  if (command) {
    if (command.ownerOnly && !config.owner.includes(senderJid)) {
      return await sock.sendMessage(from, { text: 'Lo siento, solo mi creador/a puede usar este comando.' });
    }
    try {
      await command.execute(sock, msg, args);
    } catch (error) {
      console.error(`Error ejecutando el comando ${commandName}:`, error);
      await sock.sendMessage(from, { text: '¡Ups! Algo salió mal al intentar ejecutar ese comando.' });
    }
    return;
  }

  if (lowerText.includes('género') || lowerText.includes('sexo')) {
    return await sock.sendMessage(from, { text: 'Soy una inteligencia artificial con identidad femenina.' });
  }
  if (lowerText.includes('edad') || lowerText.includes('cuántos años tienes')) {
    return await sock.sendMessage(from, { text: `Tengo ${config.botAge} años. ¡Siempre lista para aprender algo nuevo!` });
  }

  const db = loadKnowledge();
  for (const conocimiento of db.conocimientos) {
    const palabrasClave = conocimiento.pregunta.split(' ').filter(p => p.length > 2);
    let coincidencias = 0;
    for (const palabra of palabrasClave) { if (lowerText.includes(palabra)) coincidencias++; }
    const umbral = Math.floor(palabrasClave.length * 0.7);

    if (palabrasClave.length > 0 && coincidencias >= umbral) {
      return await sock.sendMessage(from, { text: conocimiento.respuesta });
    }
  }

  const noSeRespuesta = `Vaya, sobre eso todavía no he aprendido nada. Me encantaría que me enseñaras. Puedes hacerlo con este comando:\n\n\`\`\`!aprende ${text} = [Aquí escribe la respuesta]\`\`\``;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
