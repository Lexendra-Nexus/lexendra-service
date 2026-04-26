import { logInfo, logError } from '../../utils/logger.js';
import { buildContext } from './context.js';
import { ingestDocument } from './ingest.js';
import { queryRAG as rawQueryRAG, searchDocuments as rawSearchDocuments } from './search.js';
import { reranker } from '../lightRag/reranker.js';
import type { LightRAGOptions } from '../lightRag/pipeline.js';
import type { RAGResult } from '../../types/rag.types.js';

export class RAGService {
  async searchDocuments(question: string, k: number = 4): Promise<any[]> {
    return await rawSearchDocuments(question, k);
  }

  async queryRAG(question: string, options: LightRAGOptions = {}): Promise<RAGResult> {
    logInfo(`Processing RAG query: "${question}"`);

    try {
      const rawResult = await rawQueryRAG(question, options);
      const context = buildContext(question, rawResult.documents);

      return {
        answer: rawResult.answer,
        context,
        sources: rawResult.sources,
        confidence: rawResult.confidence
      };
    } catch (error) {
      logError('Error in queryRAG', error);
      return {
        answer: 'Ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo.',
        context: '',
        sources: [],
        confidence: 0
      };
    }
  }

  async ingestDocument(text: string, metadata: Record<string, any> = {}): Promise<boolean> {
    return await ingestDocument(text, metadata);
  }

  rerankResults(documents: any[]): any[] {
    return reranker.rerankByDiversity(documents, 4);
  }
}

export const ragService = new RAGService();
