import { ChromaClient } from 'chromadb';
import { dbConfig } from '../../config/db.config.js';
import { logInfo, logError } from '../../utils/logger.js';

class ChromaService {
  private client: ChromaClient | null = null;
  private collection: any = null;

  constructor() {
    try {
      // Usar ChromaDB embebido 
      this.client = new ChromaClient();
    } catch (error) {
      logError('Error initializing Chroma client', error);
    }
  }

  async getCollection(name: string = 'legal_docs') {
    if (!this.client) return null;

    try {
      this.collection = await this.client.getOrCreateCollection({
        name,
        metadata: { 'hnsw:space': 'cosine' }
      });
      return this.collection;
    } catch (error) {
      logError('Error getting Chroma collection', error);
      return null;
    }
  }

  async addDocuments(ids: string[], documents: string[], metadatas: any[], embeddings: number[][]) {
    if (!this.collection) {
      logError('Collection not initialized');
      return;
    }

    try {
      await this.collection.add({
        ids,
        documents,
        metadatas,
        embeddings
      });
      logInfo(`Added ${ids.length} documents to Chroma`);
    } catch (error) {
      logError('Error adding documents to Chroma', error);
    }
  }

  async queryDocuments(queryEmbedding: number[], nResults: number = 4) {
    if (!this.collection) {
      logError('Collection not initialized');
      return { documents: [], metadatas: [], distances: [], ids: [] };
    }

    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults
      });
      return results;
    } catch (error) {
      logError('Error querying Chroma', error);
      return { documents: [], metadatas: [], distances: [], ids: [] };
    }
  }

  async deleteDocuments(ids: string[]) {
    if (!this.collection) return;

    try {
      await this.collection.delete({ ids });
      logInfo(`Deleted ${ids.length} documents from Chroma`);
    } catch (error) {
      logError('Error deleting documents from Chroma', error);
    }
  }
}

export const chromaService = new ChromaService();