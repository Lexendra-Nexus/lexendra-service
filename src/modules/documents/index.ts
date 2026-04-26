import { generateId } from '../../utils/helpers.js';
import { logInfo, logError } from '../../utils/logger.js';
import { documentIndexer } from './indexer.js';
import {
  extractTextFromPDF,
  extractTextFromWord,
  extractTextFromExcel,
  extractTextFromPowerPoint,
  extractTextFromImage
} from './extractors.js';
import type { Document } from './types.js';

export class DocumentService {
  private documents = new Map<string, Document>()

  async processDocument(fileName: string, buffer: Buffer, mimeType: string): Promise<Document> {
    let content = '';

    switch (mimeType) {
      case 'application/pdf':
        content = await extractTextFromPDF(buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        content = await extractTextFromWord(buffer);
        break;
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        content = await extractTextFromExcel(buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        content = await extractTextFromPowerPoint(buffer);
        break;
      case 'image/jpeg':
      case 'image/png':
      case 'image/jpg':
        content = await extractTextFromImage(buffer);
        break;
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const document: Document = {
      id: generateId(),
      filename: fileName,
      content,
      metadata: {
        filename: fileName,
        size: buffer.length,
        mimeType,
        uploadedAt: new Date()
      },
      chunks: []
    };

    try {
      logInfo(`Indexando documento "${fileName}" en ChromaDB`);
      await documentIndexer.indexDocument(document);
      console.log('✅ Documento indexado en ChromaDB correctamente');
    } catch (indexError) {
      logError('Error indexando documento en ChromaDB', indexError);
      console.warn('⚠️ Documento procesado pero falló indexación en ChromaDB - se procesará ad-hoc en consultas');
    }

    this.documents.set(document.id, document);
    return document;
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    await documentIndexer.deleteDocument(id);
  }

  async searchDocuments(query: string, limit: number = 10): Promise<any[]> {
    return await documentIndexer.searchDocuments(query, limit);
  }
}

export const documentService = new DocumentService();
