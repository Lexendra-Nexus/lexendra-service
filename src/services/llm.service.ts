import { openaiService } from '../infrastructure/llm/openai.js';
import { deepseekService } from '../infrastructure/llm/deepseek.js';
import { logInfo } from '../utils/logger.js';

function buildPrompt(
  context: string,
  question: string,
  history: Array<{ role: string; content: string }> = [],
  hasDocument: boolean = false
) {
  const formattedHistory = history
    .map((item) => `${item.role === 'assistant' ? 'Asistente' : 'Usuario'}: ${item.content}`)
    .join('\n');

  const promptSections: string[] = [
    `Instrucciones:
- Actúa como un asistente legal profesional con memoria de conversación.
- Si ya existe un documento en el chat, asume continuidad y úsalo como contexto principal.
- No pidas nuevamente el documento salvo cambio total de tema o ambiguedad real.
- Si la pregunta incluye referencias como "esto", "ese", "artículo" o "lo anterior", interpreta que apunta al documento activo.
- Sé útil y concreto; evita respuestas genéricas.
- Responde en español.`
  ];

  if (formattedHistory.trim()) {
    promptSections.push(`Historial:\n${formattedHistory}`);
  }

  if (context && context.trim()) {
    promptSections.push(`CONTEXTO DEL DOCUMENTO ACTIVO:\n${context}`);
    promptSections.push(
      `Regla de continuidad:
- Existe documento activo en memoria.
- No digas "no especificas el documento".`
    );
  } else if (!hasDocument) {
    promptSections.push(
      `Condición actual:
- El usuario no proporcionó documento ni contexto documental utilizable.
- No des explicaciones generales ni guías largas.
- Responde en máximo 3 líneas.
- Pide que adjunte el documento de forma breve.
- Si el historial aporta contexto, úsalo.`
    );
  }

  promptSections.push(`Pregunta:\n${question}`);
  return promptSections.join('\n\n');
}

export class LLMService {
  async generateEmbedding(text: string): Promise<number[]> {
    return await openaiService.generateEmbedding(text);
  }

  async generateResponse(
    context: string,
    question: string,
    history: Array<{ role: string; content: string }> = [],
    hasDocument: boolean = false
  ): Promise<string> {
    const prompt = buildPrompt(context, question, history, hasDocument);

    try {
      logInfo('Generando respuesta con DeepSeek');
      const deepseekResponse = await deepseekService.generateAnswer(context, prompt, hasDocument);

      if (typeof deepseekResponse === 'string' && deepseekResponse.includes('MOCK ANSWER:')) {
        logInfo('DeepSeek retornó mock, fallback a OpenAI');
        return await openaiService.generateCompletion(prompt);
      }

      return deepseekResponse;
    } catch (error) {
      logInfo('Fallback a OpenAI por error en DeepSeek', { error });
      return await openaiService.generateCompletion(prompt);
    }
  }
}

export const llmService = new LLMService();