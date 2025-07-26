import fs from 'fs';
import path from 'path';

const commands = new Map();
const events = new Map();

const pluginsPath = path.resolve('./src/plugins');
console.log('--- Cargando Plugins ---');

if (fs.existsSync(pluginsPath)) {
    const pluginFiles = fs.readdirSync(pluginsPath).filter(file => file.endsWith('.js'));

    for (const file of pluginFiles) {
        try {
            const filePath = path.join(pluginsPath, file);
            const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
            const { default: plugin } = await import(fileUrl);
            
            if (plugin && plugin.command) {
                plugin.command.forEach(cmd => {
                    console.log(`[Plugin de Comando Cargado] Comando: ${cmd} -> ${file}`);
                    commands.set(cmd.toLowerCase(), plugin);
                });
            }
            
            if (plugin && plugin.event) {
                console.log(`[Plugin de Evento Cargado] Evento: ${plugin.event} -> ${file}`);
                events.set(plugin.event, plugin);
            }

        } catch (error) {
            console.error(`❌ Error CRÍTICO al cargar el plugin ${file}:`, error);
        }
    }
} else {
    console.error("¡ERROR! La carpeta 'src/plugins' no fue encontrada.");
}

console.log(`✅ ${commands.size} alias de comandos y ${events.size} eventos cargados.`);
console.log('------------------------');

export { commands, events };
