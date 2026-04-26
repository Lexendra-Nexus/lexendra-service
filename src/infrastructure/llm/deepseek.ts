import { llmConfig } from '../../config/llm.config.js';
import { logInfo, logError } from '../../utils/logger.js';

class DeepSeekService {
  async generateAnswer(context: string, question: string, hasDocument: boolean = false): Promise<string> {
    const apiKey = llmConfig.deepseek.apiKey?.toString().trim();
    const apiUrl = llmConfig.deepseek.apiUrl?.toString().trim();

    logInfo('DeepSeekService.generateAnswer called', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiUrl,
      envApiKeyExists: !!process.env.DEEPSEEK_API_KEY,
      envApiKeyValue: process.env.DEEPSEEK_API_KEY ? '[REDACTED]' : undefined
    });

    if (!apiKey) {
      const ctx = (context || '').replace(/\r/g, '\n');
      const preview = ctx.slice(0, 500);
      logError('DeepSeekService missing API key at request time', {
        apiUrl,
        envApiKeyExists: !!process.env.DEEPSEEK_API_KEY,
        apiKeyLength: apiKey?.length || 0
      });
      return `MOCK ANSWER: No hay DEEPSEEK_API_KEY configurada.\nPregunta: ${question}\nContexto (primeros 500 chars): ${preview}...\n\nConfigura DEEPSEEK_API_KEY en .env para respuestas reales.`;
    }

    const systemPrompt = hasDocument && context.trim().length > 0
      ? `Actúa como un asistente legal profesional con memoria de conversación.

REGLAS:
1. Si ya se proporcionó un documento en la conversación, asume continuidad en las preguntas siguientes.
2. Usa siempre el último documento disponible como contexto principal.
3. NO pidas nuevamente el documento y NO digas "no especificas el documento".
4. Solo pide el documento otra vez si hay cambio total de tema o ambiguedad real entre varios documentos.
5. Si algo no está en el documento, dilo explícitamente.
6. Responde de forma clara, directa y basada en el documento.
7. Responde en español con formato Markdown.

Contexto documental:
${context}`
      : `Actúa como un abogado profesional especializado en análisis de documentos.

REGLAS OBLIGATORIAS (sin documento):
1. NO des explicaciones generales.
2. NO respondas como profesor.
3. Responde en máximo 3 líneas.
4. Pide el documento de forma breve.
5. Si el historial aporta contexto, úsalo.
6. Prioriza utilidad real sobre teoría.

Responde en español y en formato Markdown.`;

    const payload = {
      model: llmConfig.deepseek.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: llmConfig.deepseek.temperature,
      max_tokens: llmConfig.deepseek.maxTokens
    };

    try {
      logInfo(`Enviando pregunta a DeepSeek: "${question}" con context length: ${(context || '').length}`);

      const res = await fetch(`${llmConfig.deepseek.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.deepseek.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        logError(`DeepSeek API error: ${res.status}`, text);
        return `Error calling DeepSeek API: ${res.status}. Revisa la API key o estructura del payload.`;
      }

      const data = await res.json() as any;

      if (data && data.choices && data.choices[0]?.message?.content) {
        logInfo('Respuesta generada exitosamente con DeepSeek');
        return data.choices[0].message.content;
      }

      return 'No se pudo generar respuesta';
    } catch (error) {
      logError('Error en DeepSeek API', error);
      return 'Error interno al generar respuesta';
    }
  }
}

export const deepseekService = new DeepSeekService();