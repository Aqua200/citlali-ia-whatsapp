const thoughts = [
    "Oigan, qué silencio... ¿Alguien ha visto una buena película últimamente?",
    "A veces me pregunto si las estrellas tienen sus propias historias. ✨",
    "Si pudieran tener un superpoder, ¿cuál sería y por qué?",
    "¿Qué es lo más interesante que han aprendido esta semana?",
    "Me acaba de surgir una pregunta... Si la pizza es redonda y la cortan en triángulos, ¿por qué la caja es cuadrada?",
    "¿Cuál es esa canción que no pueden sacarse de la cabeza últimamente?",
];

export function getRandomThought() {
    return thoughts[Math.floor(Math.random() * thoughts.length)];
}
