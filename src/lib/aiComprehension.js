import OpenAI from 'openai';

const openai = new OpenAI();

export async function understandAndExtractFacts(conversationText) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Tu única función es analizar la conversación de un grupo de WhatsApp y extraer hechos o declaraciones importantes. Devuelve estos hechos como una lista de pares `pregunta simple=respuesta concisa`, cada par en una nueva línea. No añadas introducciones, conclusiones ni texto extra. Si no hay hechos claros, no devuelvas nada."
        },
        {
          role: "user",
          content: conversationText
        }
      ],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error al usar el motor de comprensión de IA:", error);
    return null;
  }
}
