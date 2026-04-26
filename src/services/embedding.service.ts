import { llmService } from './llm.service.js';
import { logInfo } from '../utils/logger.js';

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    return await llmService.generateEmbedding(text);
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    logInfo(`Generated ${embeddings.length} embeddings`);
    return embeddings;
  }

  async fallbackEmbedding(text: string): Promise<number[]> {
    // Mock embedding si falla
    const hash = Array.from(text).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
    return Array.from({ length: 1536 }, (_, i) => Math.sin(hash + i));
  }
}

export const embeddingService = new EmbeddingService();