import type { StreamOptions } from '../../services/streaming.service.js';
import { logInfo, logError } from '../../utils/logger.js';
import { buildSystemPrompt } from './prompt.js';
import { generateMockStreamingResponse } from './mockStreaming.js';

export async function streamDeepSeekResponse(options: StreamOptions): Promise<string> {
  const { context, question, onChunk } = options;

  try {
    logInfo('Starting DeepSeek streaming response');

    const { llmConfig } = await import('../../config/llm.config.js');
    if (!llmConfig.deepseek.apiKey) {
      return generateMockStreamingResponse(context, question, onChunk);
    }

    const payload = {
      model: llmConfig.deepseek.model,
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: question }
      ],
      temperature: llmConfig.deepseek.temperature,
      max_tokens: llmConfig.deepseek.maxTokens,
      stream: true
    };

    const response = await fetch(`${llmConfig.deepseek.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.deepseek.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader');
    }

    let fullResponse = '';
    const decoder = new TextDecoder();
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime > 30000) {
        logError('DeepSeek stream timeout');
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              if (onChunk) {
                onChunk(content);
              }
            }
          } catch {
            // Ignore parsing errors for SSE format
          }
        }
      }
    }

    logInfo('DeepSeek streaming completed successfully');
    return fullResponse;
  } catch (error) {
    logError('DeepSeek streaming error', error);
    return generateMockStreamingResponse(context, question, onChunk);
  }
}
