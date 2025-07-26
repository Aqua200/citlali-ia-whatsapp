let emotionScore = 0;

export function updateEmotion(change, reason) {
    emotionScore += change;
    emotionScore = Math.max(-10, Math.min(10, emotionScore));
    console.log(`[Emoción] Estado cambiado por ${change} debido a: ${reason}. Score actual: ${emotionScore}`);
}

export function getCurrentEmotion() {
    if (emotionScore > 5) return 'ALEGRE';
    if (emotionScore < -5) return 'CAUTELOSA';
    return 'NEUTRAL';
}
