import { lightRAGPipeline, type LightRAGOptions } from '../../modules/lightRag/pipeline.js';
import { logInfo, logError } from '../../utils/logger.js';

export async function searchDocuments(question: string, k: number = 4): Promise<any[]> {
  logInfo(`Searching documents for: "${question}" with k=${k}`);

  try {
    const options: LightRAGOptions = {
      k,
      useHybrid: true,
      rerankByDiversity: true,
      compressContext: false
    };

    const results = await lightRAGPipeline.search(question, options);
    return results.map(doc => ({
      text: doc.text,
      metadata: doc.metadata,
      score: doc.score
    }));
  } catch (error) {
    logError('Error in searchDocuments', error);
    return [];
  }
}

export async function queryRAG(question: string, options: LightRAGOptions = {}): Promise<any> {
  logInfo(`Processing RAG query: "${question}"`);

  try {
    const relevantDocs = await lightRAGPipeline.search(question, {
      k: 4,
      useHybrid: true,
      rerankByDiversity: true,
      compressContext: true,
      maxContextTokens: 2000,
      ...options
    });

    if (relevantDocs.length === 0) {
      return {
        answer: 'No encontré información relevante en los documentos disponibles para responder tu pregunta.',
        context: '',
        sources: [],
        confidence: 0
      };
    }

    return {
      documents: relevantDocs,
      sources: relevantDocs.map((doc, idx) => `Documento ${idx + 1}: ${doc.metadata?.filename || 'Sin nombre'}`),
      confidence: relevantDocs[0]?.score || 0.5
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
