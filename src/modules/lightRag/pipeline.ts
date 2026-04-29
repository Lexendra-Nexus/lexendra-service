import { embeddingService } from '../../services/embedding.service.js';
import { chromaService } from '../../infrastructure/vectorDB/chroma.js';
import { logInfo, logError } from '../../utils/logger.js';

export interface RAGDocument {
  text: string;
  metadata?: Record<string, any>;
  score?: number;
}

export interface LightRAGOptions {
  k?: number;
  useHybrid?: boolean;
  rerankByDiversity?: boolean;
  compressContext?: boolean;
  maxContextTokens?: number;
}

// Bandera global para indicar si ChromaDB está disponible
let chromaAvailable = false;

export function setChromaAvailable(available: boolean) {
  chromaAvailable = available;
  logInfo(`ChromaDB availability set to: ${available}`);
}

export class LightRAGPipeline {
  async search(question: string, options: LightRAGOptions = {}): Promise<RAGDocument[]> {
    const {
      k = 4,
      useHybrid = true,
      rerankByDiversity = false,
      compressContext = true,
      maxContextTokens = 2000
    } = options;

    logInfo(`LightRAG search for: "${question}" with k=${k}`);

    try {
      // 1. Generate embedding for the question
      const queryEmbedding = await embeddingService.generateEmbedding(question);

      // 2. Try to get Chroma collection, handle gracefully if not available
      let collection = null;
      let vectorResults = null;
      
      try {
        collection = await chromaService.getCollection();
        if (collection) {
          vectorResults = await chromaService.queryDocuments(queryEmbedding, k * 2);
          if (vectorResults && vectorResults.documents && vectorResults.documents.length > 0) {
            setChromaAvailable(true);
          }
        }
      } catch (chromaError) {
        logError('ChromaDB not available, using fallback mode', chromaError);
        setChromaAvailable(false);
      }

      // 3. If no Chroma results, use fallback with mock/legal knowledge base
      let documents: RAGDocument[] = [];
      
      if (!vectorResults || !vectorResults.documents || vectorResults.documents.length === 0) {
        logInfo('Using fallback knowledge base (no ChromaDB results)');
        documents = this.getFallbackDocuments(question, k);
      } else {
        // Convert Chroma results to RAGDocument format
        documents = vectorResults.documents.map((text: string, idx: number) => ({
          text,
          metadata: vectorResults.metadatas?.[idx] || {},
          score: vectorResults.distances?.[idx] ? 1 / (1 + vectorResults.distances[idx]) : 0.5
        }));
      }

      // 4. Apply hybrid search if enabled (combine with keyword search)
      if (useHybrid && documents.length > 0) {
        documents = await this.applyHybridSearch(question, documents, k);
      }

      // 5. Rerank by diversity if enabled
      if (rerankByDiversity && documents.length > 0) {
        documents = this.rerankByDiversity(documents, k);
      }

      // 6. Compress context if enabled
      if (compressContext && documents.length > 0) {
        documents = this.compressContext(documents, question, maxContextTokens);
      }

      // 7. Return top k results
      return documents.slice(0, k);

    } catch (error) {
      logError('LightRAG search error', error);
      // Return fallback documents on any error
      return this.getFallbackDocuments(question, k);
    }
  }

  // Fallback knowledge base when ChromaDB is not available
  private getFallbackDocuments(question: string, k: number): RAGDocument[] {
    const questionLower = (question || '').toLowerCase();
    const fallbackDocs: RAGDocument[] = [
      {
        text: 'Lexendra Nexus es una plataforma de asistente legal inteligente que utiliza tecnologías de IA avanzada para proporcionar consultas legales precisas y contextuales.',
        metadata: { source: 'knowledge_base', filename: 'lexendra-info.md' },
        score: 0.8
      },
      {
        text: 'El sistema RAG (Retrieval Augmented Generation) combina recuperación de información con generación de lenguaje natural para responder preguntas legales con contexto relevante.',
        metadata: { source: 'knowledge_base', filename: 'rag-system.md' },
        score: 0.7
      },
      {
        text: 'DeepSeek es el modelo de lenguaje utilizado para generar respuestas legales contextuales. El sistema puede funcionar con múltiples proveedores de IA.',
        metadata: { source: 'knowledge_base', filename: 'llm-providers.md' },
        score: 0.6
      }
    ];

    // Filter by relevance to question
    const relevant = fallbackDocs.filter(doc => {
      const text = doc.text.toLowerCase();
      const words = questionLower.split(/\s+/).filter(w => w.length > 2);
      return words.some(word => text.includes(word));
    });

    return relevant.length > 0 ? relevant.slice(0, k) : fallbackDocs.slice(0, k);
  }

  private async applyHybridSearch(question: string, vectorDocs: RAGDocument[], k: number): Promise<RAGDocument[]> {
    // Simple keyword-based scoring as fallback/complement
    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    vectorDocs.forEach(doc => {
      let keywordScore = 0;
      const text = doc.text.toLowerCase();
      questionWords.forEach(word => {
        const count = (text.match(new RegExp(word, 'g')) || []).length;
        keywordScore += count;
      });

      // Combine vector similarity with keyword score
      doc.score = (doc.score || 0) * 0.7 + (keywordScore / questionWords.length) * 0.3;
    });

    return vectorDocs.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private rerankByDiversity(documents: RAGDocument[], k: number): RAGDocument[] {
    if (documents.length === 0) return [];
    if (documents.length <= k) return documents;

    const firstDoc = documents[0];
    if (!firstDoc) return [];

    const selected: RAGDocument[] = [firstDoc]; // Start with highest scored

    for (let i = 1; i < documents.length && selected.length < k; i++) {
      const candidate = documents[i];
      if (!candidate) continue;

      let minSimilarity = 1;

      // Calculate similarity to already selected documents
      for (const selectedDoc of selected) {
        const similarity = this.calculateTextSimilarity(candidate.text, selectedDoc.text);
        minSimilarity = Math.min(minSimilarity, similarity);
      }

      // Only add if sufficiently different (diversity threshold)
      if (minSimilarity < 0.7) {
        selected.push(candidate);
      }
    }

    return selected;
  }

  private compressContext(documents: RAGDocument[], question: string, maxTokens: number): RAGDocument[] {
    // Simple compression: prioritize documents most relevant to the question
    const questionWords = question.toLowerCase().split(/\s+/);

    documents.forEach(doc => {
      const text = doc.text.toLowerCase();
      let relevanceScore = 0;

      questionWords.forEach(word => {
        if (text.includes(word)) relevanceScore += 1;
      });

      doc.score = (doc.score || 0) + relevanceScore * 0.1;
    });

    documents.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Truncate to fit token limit
    let totalTokens = 0;
    const compressed: RAGDocument[] = [];

    for (const doc of documents) {
      const tokens = Math.ceil(doc.text.length / 4); // Rough token estimation
      if (totalTokens + tokens <= maxTokens) {
        compressed.push(doc);
        totalTokens += tokens;
      } else {
        // Truncate this document to fit
        const remainingTokens = maxTokens - totalTokens;
        const maxChars = remainingTokens * 4;
        if (maxChars > 100) { // Only add if meaningful
          compressed.push({
            ...doc,
            text: doc.text.substring(0, maxChars) + '...'
          });
        }
        break;
      }
    }

    return compressed;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

export const lightRAGPipeline = new LightRAGPipeline();