import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service.js';
import { streamingService } from '../services/streaming.service.js';
import type { QueryRequest } from '../types/chat.types.js';

export class ChatController {
  async query(req: Request, res: Response) {
    try {
      const request: QueryRequest = req.body;
      const response = await chatService.handleQuery(request);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Error processing query' });
    }
  }

  async queryMultimodal(req: Request, res: Response) {
    try {
      const message = req.body.message || '';
      const history = req.body.history ? JSON.parse(req.body.history) : [];
      const chatId = req.body.chatId;
      const userId = req.body.userId;

      // VALIDACIÓN: Al menos mensaje O archivo requerido
      if (!message && !req.file) {
        return res.status(400).json({
          error: 'Error: Debes proporcionar un mensaje o un archivo.',
          hint: 'Envía al menos un mensaje o sube un archivo (imagen, PDF, Word, Excel, PowerPoint)'
        });
      }

      // Logging detallado
      if (req.file) {
        console.log('📁 Archivo recibido:', req.file.originalname);
        console.log('📄 Tipo MIME:', req.file.mimetype);
        console.log('📏 Tamaño:', req.file.size, 'bytes');
        console.log('✅ Validación: El archivo será procesado como multimodal');
      } else {
        console.log('ℹ️  Chat normal (sin archivo) - mensaje:', message.substring(0, 50) + '...');
      }

      const requestBody: any = {
        question: message,
        chatId,
        userId,
        history,
      };
      
      if (req.file) {
        requestBody.file = req.file;
      }
      
      const response = await chatService.handleMultimodalQuery(requestBody);

      res.json(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error en queryMultimodal:', errorMsg);
      res.status(500).json({
        error: 'Error al procesar tu consulta',
        details: errorMsg,
        help: 'Verifica los logs del servidor para más información'
      });
    }
  }

  async queryStream(req: Request, res: Response) {
    try {
      // Soportar tanto 'message' como 'question' del frontend
      const request: QueryRequest = {
        question: req.body.message || req.body.question || '',
        chatId: req.body.sessionId || req.body.chatId,
        userId: req.body.userId
      };
      
      // Validar que hay mensaje
      if (!request.question) {
        return res.status(400).json({ error: 'Message or question is required' });
      }
      
      const stream = streamingService.setupStreamingResponse(res);

      const response = await chatService.handleStreamingQuery(request, (chunk) => {
        stream.sendChunk(chunk);
      });

      stream.sendComplete({
        context: response.context,
        sources: response.sources
      });
    } catch (error) {
      const stream = streamingService.setupStreamingResponse(res);
      stream.sendError('Error processing streaming query');
    }
  }

  async queryMultimodalStream(req: Request, res: Response) {
    try {
      const message = req.body.message || '';
      const history = req.body.history ? JSON.parse(req.body.history) : [];
      const chatId = req.body.chatId;
      const userId = req.body.userId;

      // VALIDACIÓN: Al menos mensaje O archivo requerido
      if (!message && !req.file) {
        const stream = streamingService.setupStreamingResponse(res);
        stream.sendError('Error: Debes proporcionar un mensaje o un archivo.');
        return;
      }

      // Logging detallado
      if (req.file) {
        console.log('📁 Archivo recibido:', req.file.originalname);
        console.log('📄 Tipo MIME:', req.file.mimetype);
        console.log('📏 Tamaño:', req.file.size, 'bytes');
        console.log('✅ Validación: El archivo será procesado como multimodal streaming');
      } else {
        console.log('ℹ️  Chat streaming (sin archivo) - mensaje:', message.substring(0, 50) + '...');
      }

      const stream = streamingService.setupStreamingResponse(res);

      const requestBody: any = {
        question: message,
        chatId,
        userId,
        history,
      };

      if (req.file) {
        requestBody.file = req.file;
      }

      const response = await chatService.handleMultimodalStreamingQuery(requestBody, (chunk) => {
        stream.sendChunk(chunk);
      });

      stream.sendComplete({
        context: response.context,
        sources: response.sources
      });
    } catch (error) {
      const stream = streamingService.setupStreamingResponse(res);
      stream.sendError('Error processing multimodal streaming query');
    }
  }

  async getChat(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      if (!chatId || typeof chatId !== 'string') {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const chat = await chatService.getChatSession(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      res.json(chat);
    } catch (error) {
      res.status(500).json({ error: 'Error retrieving chat' });
    }
  }

  async clearChat(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      if (!chatId || typeof chatId !== 'string') {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      await chatService.clearSession(chatId);
      res.json({ message: 'Chat session cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Error clearing chat session' });
    }
  }
}

export const chatController = new ChatController();