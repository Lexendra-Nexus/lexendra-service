import type { Request, Response } from 'express';
import { documentService } from '../services/document.service.js';
import multer from 'multer';

// MIME types aceptados para procesamiento multimodal
const ACCEPTED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.macro-enabled.document',
  'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    console.log('🔍 Validando archivo:', file.originalname, 'MIME:', file.mimetype);
    
    if (ACCEPTED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.warn('❌ Tipo de archivo no permitido:', file.mimetype);
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Acepto: imágenes, PDFs, Word, Excel, PowerPoint`));
    }
  }
});

export class DocumentController {
  async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const document = await documentService.processDocument(
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );

      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Error processing document' });
    }
  }

  async uploadBatch(req: Request, res: Response) {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = await Promise.all(
        req.files.map(async (file: Express.Multer.File) => {
          try {
            return await documentService.processDocument(
              file.originalname,
              file.buffer,
              file.mimetype
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { error: `Failed to process ${file.originalname}: ${errorMessage}` };
          }
        })
      );

      res.json({ message: 'Batch processing completed', results });
    } catch (error) {
      res.status(500).json({ error: 'Error processing batch' });
    }
  }

  async getDocuments(req: Request, res: Response) {
    try {
      const documents = await documentService.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving documents' });
    }
  }

  async getDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      const document = await documentService.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json({ document });
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving document' });
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      await documentService.deleteDocument(id);
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting document' });
    }
  }

  async searchDocuments(req: Request, res: Response) {
    try {
      const query = (req.query.query || req.query.q) as string | undefined;
      const limit = req.query.limit || 10;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const results = await documentService.searchDocuments(query, parseInt(limit as string));
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Error searching documents' });
    }
  }
}

export const documentController = new DocumentController();
export { upload };