// src/bot/handleMessage.js -> NUEVO MANEJADOR DE PLUGINS

import fs from 'fs';
import path from 'path';
import config from '../lib/config.js';

// --- CARGADOR DE PLUGINS ---
// Creamos un mapa para almacenar todos nuestros comandos
const commands = new Map();

// Leemos la carpeta de plugins y cargamos cada uno
const pluginsPath = path.resolve('./src/plugins');
const pluginFiles = fs.readdirSync(pluginsPath).filter(file => file.endsWith('.js'));

for (const file of pluginFiles) {
    const filePath = path.join(pluginsPath, file);
    // Usamos import() dinámico para cargar el módulo
    const { default: plugin } = await import(`file://${filePath}`);
    if (plugin.command) {
        plugin.command.forEach(cmd => commands.set(cmd, plugin));
    }
}
console.log(`✅ ${commands.size} comandos cargados en los plugins.`);
// ----------------------------------------------------


// --- LÓGICA DE LA MEMORIA (se queda aquí para el fallback) ---
const dbPath = path.resolve('./database.json');
function loadKnowledge() { if (fs.existsSync(dbPath)) { const rawData = fs.readFileSync(dbPath); return JSON.parse(rawData); } const baseData = { conocimientos: [] }; fs.writeFileSync(dbPath, JSON.stringify(baseData, null, 2)); return baseData; }
// ------------------------------------------------------------------


export async function handleMessage(sock, msg) {
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.sender;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  if (!text) return;

  const lowerText = text.toLowerCase();
  const args = text.trim().split(/ +/).slice(1);
  const commandName = text.trim().split(/ +/)[0].toLowerCase();
  
  // Buscamos si el mensaje es un comando que tenemos cargado
  const command = commands.get(commandName);

  // --- EJECUTOR DE COMANDOS ---
  if (command) {
    // Verificación de permisos
    if (command.ownerOnly && !config.owner.includes(senderJid)) {
      return await sock.sendMessage(from, { text: 'Lo siento, solo mi creador/a puede usar este comando.' });
    }
    
    // Ejecutamos el plugin
    try {
      await command.execute(sock, msg, args);
    } catch (error) {
      console.error(`Error ejecutando el comando ${commandName}:`, error);
      await sock.sendMessage(from, { text: '¡Ups! Algo salió mal al intentar ejecutar ese comando.' });
    }
    return; // Detenemos la ejecución si fue un comando
  }
  
  // --- FALLBACK: SI NO ES UN COMANDO, BUSCA EN LA MEMORIA ---
  // Esta lógica se ejecuta solo si el mensaje no activó ningún plugin
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

  // Si tampoco encontró nada en la memoria, responde que no sabe
  const noSeRespuesta = `Vaya, sobre eso todavía no he aprendido nada. Me encantaría que me enseñaras. Puedes hacerlo con este comando:\n\n\`\`\`!aprende ${text} = [Aquí escribe la respuesta]\`\`\``;
  await sock.sendMessage(from, { text: noSeRespuesta });
}
