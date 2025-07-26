import fs from 'fs';
import path from 'path';

const commands = new Map();
const pluginsPath = path.resolve('./src/plugins');

if (fs.existsSync(pluginsPath)) {
    const pluginFiles = fs.readdirSync(pluginsPath).filter(file => file.endsWith('.js'));

    for (const file of pluginFiles) {
        try {
            const filePath = path.join(pluginsPath, file);
            const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
            const { default: plugin } = await import(fileUrl);
            
            if (plugin && plugin.command) {
                plugin.command.forEach(cmd => {
                    commands.set(cmd.toLowerCase(), plugin);
                });
            }
        } catch (error) {
            console.error(`Error al cargar el plugin ${file}:`, error);
        }
    }
}

export default commands;
