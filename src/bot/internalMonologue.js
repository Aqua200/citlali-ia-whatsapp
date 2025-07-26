import chalk from 'chalk';
import { getRandomThought } from '../lib/thoughts.js';
import { getCurrentEmotion } from './emotionEngine.js';

function printThought(thought, emotion) {
    let color = chalk.magenta;
    if (emotion === 'ALEGRE') color = chalk.yellow;
    if (emotion === 'CAUTELOSA') color = chalk.cyan;

    console.log(color('-----------------------------------------'));
    console.log(color.bold(`💭 Pensamiento Interno [${emotion}]:`));
}

export function startInternalMonologue() {
    const think = () => {
        const emotion = getCurrentEmotion();
        const thought = getRandomThought(); 
        printThought(thought, emotion);
    };
}
