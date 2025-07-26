import fs from 'fs';
import path from 'path';

const commands = new Map();
const pluginsPath = path.resolve('./src/plugins');
const pluginFiles = fs.readdirSync(pluginsPath).filter(file => file.endsWith('.js'));

console.log('--- Cargando Plugins ---');

for (const file of pluginFiles) {
    try {
        const filePath = path.join(pluginsPath, file);
        const { default: plugin } = await import(`file://${filePath.replace(/\\/g, '/')}`);
        if (plugin.command) {
            plugin.command.forEach(cmd => {
                console.log(`[Plugin Cargado] Comando: ${cmd} -> desde ${file}`);
                commands.set(cmd, plugin);
            });
        }
    } catch (error) {
        console.error(`❌ Error cargando el plugin ${file}:`, error);
    }
}

console.log(`✅ ${commands.size} alias de comandos han sido cargados exitosamente.`);
console.log('------------------------');

export default commands;

