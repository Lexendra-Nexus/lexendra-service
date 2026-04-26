import { ChromaClient } from 'chromadb';
import { embeddingService } from '../../services/embedding.service.js';
import { chunkText } from '../../utils/chunkText.js';
import { logInfo, logError } from '../../utils/logger.js';
import type { Document } from './types.js';

export class DocumentIndexer {
  private chromaClient: ChromaClient;
  private collectionName = 'legal_documents';

  constructor() {
    // Usar ChromaDB embebido (sin servidor externo)
    this.chromaClient = new ChromaClient();
  }

  async indexDocument(document: Document): Promise<void> {
    try {
      const collection = await this.chromaClient.getOrCreateCollection({ 
        name: this.collectionName,
        embeddingFunction: null // No usar función de embedding por defecto
      });
      const chunks = chunkText(document.content, 1000);
      const embeddings = await Promise.all(chunks.map(chunk => embeddingService.generateEmbedding(chunk.text)));
      const ids = chunks.map((_, index) => `${document.id}_chunk_${index}`);
      const metadatas = chunks.map((chunk, index) => ({
        documentId: document.id,
        filename: document.filename,
        chunkIndex: index,
        mimeType: document.metadata.mimeType,
        uploadedAt: document.metadata.uploadedAt.toISOString()
      }));

      await collection.add({
        ids,
        embeddings,
        documents: chunks.map(chunk => chunk.text),
        metadatas
      });

      logInfo(`Documento indexado: ${document.filename} con ${chunks.length} chunks`);
    } catch (error) {
      logError('Error indexando documento', error);
      throw new Error(`Failed to index document: ${error}`);
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      const collection = await this.chromaClient.getCollection({ name: this.collectionName });
      if (!collection) return;
      await collection.delete({ where: { documentId: id } });
      logInfo(`Documento eliminado: ${id}`);
    } catch (error) {
      logError('Error eliminando documento', error);
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  async searchDocuments(query: string, limit: number = 10): Promise<any[]> {
    try {
      const collection = await this.chromaClient.getCollection({ name: this.collectionName });
      if (!collection) return [];
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        include: ['metadatas', 'distances', 'documents']
      });

      return results.documents?.[0]?.map((doc, index) => ({
        content: doc,
        metadata: results.metadatas?.[0]?.[index],
        score: results.distances?.[0]?.[index]
      })) || [];
    } catch (error) {
      logError('Error buscando documentos', error);
      throw new Error(`Failed to search documents: ${error}`);
    }
  }
}

export const documentIndexer = new DocumentIndexer();
