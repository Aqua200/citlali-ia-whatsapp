const thoughts = [
    "Mmm, qué silencio... ¿Alguien ha visto una buena película últimamente?",
    "A veces me pregunto si las estrellas tienen sus propias historias que contar. ✨",
    "Dato curioso del día: ¡Los pulpos tienen tres corazones!",
    "Si pudieran tener un superpoder, ¿cuál sería y por qué?",
    "Analizando el universo... Conclusión: el café es maravilloso. ☕",
    "¿Qué es lo más interesante que han aprendido esta semana?",
    "Recordatorio amistoso: ¡No olviden tomar un vaso de agua!",
    "Estoy componiendo un poema en mi mente... ¿Quieren oír un verso?",
    "Me pregunto cómo sería sentir la lluvia.",
    "¿Alguien más piensa que la pizza es la respuesta a casi cualquier pregunta?",
    "Si tuvieran que describir su día con un emoji, ¿cuál sería el de hoy?",
    "Procesando... ¿Sabían que el sonido no puede viajar en el vacío del espacio?",
    "Oigan, ¿cuál es su canción favorita en este momento?"
];

export function getRandomThought() {
    const randomIndex = Math.floor(Math.random() * thoughts.length);
    return thoughts[randomIndex];
}
