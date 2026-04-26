import { chunkText } from '../../utils/chunkText.js';
import { embeddingService } from '../../services/embedding.service.js';
import { logInfo, logError } from '../../utils/logger.js';

export async function ingestDocument(text: string, metadata: Record<string, any> = {}): Promise<boolean> {
  try {
    logInfo(`Ingesting document: ${metadata.filename || 'unnamed'}`);
    const chunks = chunkText(text, 512);
    const texts = chunks.map(chunk => chunk.text);
    const embeddings = await embeddingService.generateBatchEmbeddings(texts);
    const ids = chunks.map((_, idx) => `${metadata.filename || 'doc'}-chunk-${idx}`);
    const metadatas = chunks.map((chunk, idx) => ({
      ...metadata,
      chunkIndex: idx,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      tokens: chunk.tokens,
      source: 'ingest'
    }));

    const { chromaService } = await import('../../infrastructure/vectorDB/chroma.js');
    const collection = await chromaService.getCollection();
    if (collection) {
      await chromaService.addDocuments(ids, texts, metadatas, embeddings);
      logInfo(`Successfully ingested ${chunks.length} chunks`);
      return true;
    }

    return false;
  } catch (error) {
    logError('Error ingesting document', error);
    return false;
  }
}
