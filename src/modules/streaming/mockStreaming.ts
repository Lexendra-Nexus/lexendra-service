import type { StreamOptions } from '../../services/streaming.service.js';

export function generateMockStreamingResponse(
  context: string,
  question: string,
  onChunk?: (chunk: string) => void
): string {
  const mockResponse = `¡Hola! He recibido tu pregunta: "${question}"

${context ? `Basándome en el contexto proporcionado, puedo ayudarte con esta información.` : 'Como no hay documentos específicos, responderé de manera general.'}

Esta es una respuesta simulada que aparece en tiempo real para demostrar el streaming. En producción, configurarías las APIs de OpenAI o DeepSeek para respuestas reales.

${context ? `Información del contexto: ${context.slice(0, 150)}...` : 'Sin contexto adicional disponible.'}

¿En qué más puedo ayudarte?`;

  // Simular streaming más rápido y realista
  const chunks = mockResponse.split(' ');
  let delay = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i] + ' ';
    setTimeout(() => {
      if (onChunk) {
        onChunk(chunk);
      }
    }, delay);
    // Delay aleatorio entre 50-150ms para simular velocidad de IA
    delay += Math.random() * 100 + 50;
  }

  return mockResponse;
}
