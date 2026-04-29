import OpenAI from 'openai';
import { llmConfig } from '../../config/llm.config.js';
import { logInfo, logError } from '../../utils/logger.js';

class OpenAIService {
  private client: OpenAI | null = null;

  constructor() {
    if (llmConfig.openai.apiKey && !llmConfig.openai.apiKey.toLowerCase().startsWith('mock')) {
      this.client = new OpenAI({ apiKey: llmConfig.openai.apiKey });
    }
  }

  private createMockEmbedding(text: string): number[] {
    const safeText = text || 'default';
    const hash = Array.from(safeText).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
    return Array.from({ length: 1536 }, (_, i) => Math.sin(hash + i));
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      logInfo('OpenAI client not initialized, using mock embeddings');
      return this.createMockEmbedding(text);
    }

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data?.[0]?.embedding || this.createMockEmbedding(text);
    } catch (error) {
      logError('Error generating OpenAI embedding', error);
      return this.createMockEmbedding(text);
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    if (!this.client) {
      return 'Mock response: OpenAI not configured';
    }

    try {
      const response = await this.client.chat.completions.create({
        model: llmConfig.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: llmConfig.openai.temperature,
        max_tokens: llmConfig.openai.maxTokens,
      });
      return response.choices?.[0]?.message?.content || 'No response';
    } catch (error) {
      logError('Error generating OpenAI completion', error);
      return 'Error generating response';
    }
  }
}

export const openaiService = new OpenAIService();