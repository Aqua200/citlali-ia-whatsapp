import chalk from 'chalk';
import { getRandomThought } from '../lib/thoughts.js';

function printThought(thought) {
    console.log(chalk.magenta('-----------------------------------------'));
    console.log(chalk.magenta.bold('💭 Pensamiento Interno de Citlali:'));
    console.log(chalk.magenta(`   "${thought}"`));
    console.log(chalk.magenta('-----------------------------------------'));
}

export function startInternalMonologue() {
    console.log(chalk.cyan('✨ La mente de Citlali ha despertado.'));

    const think = () => {
        const thought = getRandomThought();
        printThought(thought);
        const nextThoughtDelay = Math.floor(Math.random() * (300000 - 60000 + 1)) + 60000;
        setTimeout(think, nextThoughtDelay);
    };

    setTimeout(think, 10000);
}
