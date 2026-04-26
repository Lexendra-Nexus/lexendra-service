import type { StreamOptions } from '../../services/streaming.service.js';
import { logInfo, logError } from '../../utils/logger.js';
import { buildSystemPrompt } from './prompt.js';
import { generateMockStreamingResponse } from './mockStreaming.js';

export async function streamOpenAIResponse(options: StreamOptions): Promise<string> {
  const { context, question, onChunk } = options;

  try {
    logInfo('Starting OpenAI streaming response');

    const OpenAI = (await import('openai')).default;
    const { llmConfig } = await import('../../config/llm.config.js');

    if (!llmConfig.openai.apiKey || llmConfig.openai.apiKey.toLowerCase().startsWith('mock')) {
      return generateMockStreamingResponse(context, question, onChunk);
    }

    const client = new OpenAI({ apiKey: llmConfig.openai.apiKey });
    const systemPrompt = buildSystemPrompt(context);

    const stream = await client.chat.completions.create({
      model: llmConfig.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: llmConfig.openai.temperature,
      max_tokens: llmConfig.openai.maxTokens,
      stream: true
    });

    let fullResponse = '';
    const startTime = Date.now();

    for await (const chunk of stream) {
      if (Date.now() - startTime > 30000) {
        logError('OpenAI stream timeout');
        break;
      }

      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        if (onChunk) {
          onChunk(content);
        }
      }
    }

    logInfo('OpenAI streaming completed successfully');
    return fullResponse;
  } catch (error) {
    logError('OpenAI streaming error', error);
    return generateMockStreamingResponse(context, question, onChunk);
  }
}
