import type { Response } from 'express';
import { logInfo, logError } from '../utils/logger.js';
import { streamOpenAIResponse } from '../modules/streaming/openaiStreaming.js';
import { streamDeepSeekResponse } from '../modules/streaming/deepseekStreaming.js';
import { generateMockStreamingResponse } from '../modules/streaming/mockStreaming.js';

export interface StreamOptions {
  context: string;
  question: string;
  onChunk?: (chunk: string) => void;
  timeout?: number;
}

export class StreamingService {
  setupStreamingResponse(res: Response): StreamingResponse {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    return new StreamingResponse(res);
  }

  async streamOpenAIResponse(options: StreamOptions): Promise<string> {
    return streamOpenAIResponse(options);
  }

  async streamDeepSeekResponse(options: StreamOptions): Promise<string> {
    return streamDeepSeekResponse(options);
  }

  async generateStreamingMarkdownResponse(
    context: string,
    question: string,
    hasContext: boolean,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      // Para velocidad de desarrollo, usar mock si no hay API keys configuradas
      const { llmConfig } = await import('../config/llm.config.js');
      const hasDeepSeek = !!llmConfig.deepseek.apiKey;
      const hasOpenAI = !!llmConfig.openai.apiKey;

      if (!hasDeepSeek && !hasOpenAI) {
        logInfo('No API keys configured, using mock streaming for speed');
        return this.generateMockStreamingResponse(context, question, onChunk);
      }

      let response = await this.streamDeepSeekResponse({
        context,
        question,
        onChunk
      });

      if (!response || response.includes('Error') || response.includes('MOCK')) {
        logInfo('DeepSeek failed, trying OpenAI');
        response = await this.streamOpenAIResponse({
          context,
          question,
          onChunk
        });
      }

      return response;
    } catch (error) {
      logError('Streaming response error', error);
      const fallbackResponse = `Lo siento, ocurrió un error al generar la respuesta. Tu pregunta fue: "${question}". Por favor, intenta de nuevo.`;
      onChunk(fallbackResponse);
      return fallbackResponse;
    }
  }

  async generateMockStreamingResponse(
    context: string,
    question: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    return generateMockStreamingResponse(context, question, onChunk);
  }
}

export class StreamingResponse {
  constructor(private res: Response) {}

  sendChunk(data: string) {
    this.res.write(`data: ${JSON.stringify({ chunk: data })}\n\n`);
  }

  sendComplete(metadata: any = {}) {
    this.res.write(`data: ${JSON.stringify({ done: true, ...metadata })}\n\n`);
    this.res.end();
  }

  sendError(error: string) {
    this.res.write(`data: ${JSON.stringify({ error })}\n\n`);
    this.res.end();
  }
}

export const streamingService = new StreamingService();
