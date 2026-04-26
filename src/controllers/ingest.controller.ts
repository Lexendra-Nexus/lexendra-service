import type { Request, Response } from 'express';
import { ragService } from '../services/rag.service.js';
import { documentService } from '../services/document.service.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export class IngestController {
  async ingestBatch(req: Request, res: Response) {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = [];

      for (const file of req.files as Express.Multer.File[]) {
        try {
          // Procesar documento
          const document = await documentService.processDocument(
            file.originalname,
            file.buffer,
            file.mimetype
          );

          // Ingestar en RAG
          await ragService.ingestDocument(document.content, {
            filename: document.filename,
            id: document.id,
            mimeType: document.metadata.mimeType
          });

          results.push({
            success: true,
            document: {
              id: document.id,
              filename: document.filename,
              chunks: document.chunks.length
            }
          });
        } catch (error) {
          results.push({
            success: false,
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.json({
        message: `Processed ${successCount} documents successfully, ${failureCount} failed`,
        results
      });
    } catch (error) {
      res.status(500).json({ error: 'Error processing batch ingestion' });
    }
  }

  async ingestStatus(req: Request, res: Response) {
    try {
      // En una implementación completa, esto debería devolver el estado de ingestión
      res.json({
        status: 'idle',
        message: 'No active ingestion processes'
      });
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving ingestion status' });
    }
  }
}

export const ingestController = new IngestController();
export { upload };