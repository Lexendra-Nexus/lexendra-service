import { llmService } from '../../services/llm.service.js';
import { ragService } from '../../services/rag.service.js';
import { documentService } from '../../services/document.service.js';
import { streamingService } from '../../services/streaming.service.js';
import { logInfo, logError } from '../../utils/logger.js';
import type { QueryRequest, QueryResponse, ChatSession } from '../../types/chat.types.js';
import { addMessage, createSession, getSession, saveSession, clearSession } from './session.js';

interface MultimodalQueryRequest extends QueryRequest {
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  file?: Express.Multer.File;
}

interface FileContextResult {
  fileContext: string;
  fileName: string;
  fileProcessedSuccessfully: boolean;
}

const lastDocumentContextByChatId = new Map<string, string>();

export class ChatService {
  private buildHistoryFromSession(session: ChatSession | null | undefined): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!session) {
      return [];
    }
    return session.messages.map((message) => ({
      role: message.role,
      content: message.content
    }));
  }

  private getLastDocumentFromHistory(chatId?: string): string {
    if (!chatId) {
      return '';
    }
    return lastDocumentContextByChatId.get(chatId) ?? '';
  }

  private saveLastDocumentContext(chatId: string | undefined, context: string): void {
    if (!chatId || !context.trim()) {
      return;
    }
    lastDocumentContextByChatId.set(chatId, context);
  }

  private async extractFileContext(
    file?: Express.Multer.File,
    onChunk?: (chunk: string) => void
  ): Promise<FileContextResult> {
    if (!file) {
      return {
        fileContext: '',
        fileName: '',
        fileProcessedSuccessfully: false
      };
    }

    console.log('📁 Archivo recibido:', file.originalname);
    console.log('📄 Tipo MIME:', file.mimetype);
    console.log('📏 Tamaño:', file.size, 'bytes');

    try {
      console.log('⏳ Extrayendo contenido del archivo...');
      const processedDoc = await documentService.processDocument(
        file.originalname,
        file.buffer,
        file.mimetype
      );

      const fileContext = processedDoc.content || '';
      const textLength = fileContext.trim().length;
      console.log('✅ Texto extraído:', textLength, 'caracteres');

      if (textLength > 0) {
        console.log('📝 Preview (primeros 300 chars):', fileContext.slice(0, 300).replace(/\n/g, ' '));
      } else {
        console.warn('⚠️ El archivo está vacío o no contiene texto legible');
      }

      return {
        fileContext,
        fileName: file.originalname,
        fileProcessedSuccessfully: textLength > 0
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error procesando archivo:', errorMsg);

      if (onChunk) {
        onChunk(`Error procesando el archivo ${file.originalname}: ${errorMsg}. Continuando con la consulta de texto.`);
      } else {
        // No bloqueamos el flujo normal de chat multimodal.
        console.warn('⚠️ Continuando sin contexto del archivo - responderé como chat normal');
      }

      return {
        fileContext: '',
        fileName: file.originalname,
        fileProcessedSuccessfully: false
      };
    }
  }

  async handleQuery(request: QueryRequest): Promise<QueryResponse> {
    logInfo(`Procesando consulta: "${request.question}"`);

    try {
      const session = request.chatId ? getSession(request.chatId) : null;
      const history = this.buildHistoryFromSession(session);
      
      // 🔄 ETAPA 1: INTENTAR BUSCAR EN DOCUMENTOS (RAG)
      console.log('🔍 Intentando buscar contexto en documentos...');
      const ragResult = await ragService.queryRAG(request.question);
      
      let context = ragResult.context || this.getLastDocumentFromHistory(request.chatId);
      let sources = ragResult.sources || [];
      const hasDocument = !!context.trim();
      this.saveLastDocumentContext(request.chatId, context);

      // Debug temporal para validar continuidad del documento.
      console.log('USANDO CONTEXTO:', hasDocument);
      console.log('LONGITUD CONTEXTO:', context?.length || 0);
      
      if (context && context.trim().length > 0) {
        console.log('✅ Contexto encontrado en documentos');
      } else {
        console.log('⚪ No hay documentos o no hay contexto relevante - respondiendo como chat normal');
      }

      // 🔄 ETAPA 2: GENERAR RESPUESTA - FLEXIBLE
      // - Si hay contexto: usa RAG
      // - Si no hay contexto: responde como asistente normal
      const answer = await llmService.generateResponse(context, request.question, history, hasDocument);

      if (request.chatId) {
        const finalSession = session ?? createSession(request.chatId, request.question, request.userId);
        addMessage(finalSession, 'user', request.question);
        addMessage(finalSession, 'assistant', answer);
        saveSession(finalSession);
      }

      return {
        answer,
        context: context ? [context] : [],
        sources: sources
      };
    } catch (error) {
      logError('Error in handleQuery', error);
      return {
        answer: 'Lo siento, ocurrió un error. Por favor, intenta de nuevo.',
        context: [],
        sources: []
      };
    }
  }

  async handleMultimodalQuery(request: MultimodalQueryRequest): Promise<QueryResponse> {
    logInfo(`Procesando consulta multimodal: "${request.question}"`);

    try {
      const session = request.chatId ? getSession(request.chatId) : null;
      const history = Array.isArray(request.history) ? request.history : [];

      const { fileContext, fileProcessedSuccessfully } = await this.extractFileContext(request.file);
      const fallbackContext = this.getLastDocumentFromHistory(request.chatId);
      const contextToUse = fileContext.trim() ? fileContext : fallbackContext;
      const hasDocument = !!contextToUse.trim();

      this.saveLastDocumentContext(request.chatId, fileContext);

      console.log('🤖 Generando respuesta...');
      console.log(`📊 Estado: ${hasDocument ? '✅ Contexto documental disponible' : '⚪ Sin documento en contexto'}`);

      // 🔄 ETAPA 2: GENERAR RESPUESTA - FLEXIBLE
      // - Si hay contexto del documento: usa RAG + contexto
      // - Si NO hay contexto: responde como chat normal
      const answer = await llmService.generateResponse(
        contextToUse,
        request.question,
        history,
        hasDocument
      );

      if (request.chatId) {
        const finalSession = session ?? createSession(request.chatId, request.question, request.userId);
        addMessage(finalSession, 'user', request.question);
        addMessage(finalSession, 'assistant', answer);
        saveSession(finalSession);
      }

      return {
        answer,
        context: contextToUse ? [contextToUse] : [],
        sources: []
      };
    } catch (error) {
      logError('Error in handleMultimodalQuery', error);
      return {
        answer: 'Lo siento, ocurrió un error al procesar tu consulta multimodal. Por favor, intenta de nuevo.',
        context: [],
        sources: []
      };
    }
  }

  async handleStreamingQuery(request: QueryRequest, onChunk: (chunk: string) => void): Promise<QueryResponse> {
    logInfo(`Procesando consulta streaming: "${request.question}"`);

    try {
      const session = request.chatId ? getSession(request.chatId) : null;
      const lastDocumentContext = this.getLastDocumentFromHistory(request.chatId);
      let context = lastDocumentContext;
      let sources: any[] = [];

      // Solo consulta RAG si no existe contexto documental activo.
      if (!context.trim()) {
        const ragResult = await ragService.queryRAG(request.question);
        context = ragResult.context || '';
        sources = ragResult.sources || [];
      }

      const hasDocument = !!context.trim();
      this.saveLastDocumentContext(request.chatId, context);

      // Debug temporal para validar continuidad del documento.
      console.log('USANDO CONTEXTO:', hasDocument);
      console.log('LONGITUD CONTEXTO:', context?.length || 0);

      const answer = await streamingService.generateStreamingMarkdownResponse(
        context,
        request.question,
        hasDocument,
        onChunk
      );

      if (request.chatId) {
        const finalSession = session ?? createSession(request.chatId, request.question, request.userId);
        addMessage(finalSession, 'user', request.question);
        addMessage(finalSession, 'assistant', answer);
        saveSession(finalSession);
      }

      return {
        answer,
        context: context ? [context] : [],
        sources: sources
      };
    } catch (error) {
      logError('Error in handleStreamingQuery', error);
      const errorMessage = 'Lo siento, ocurrió un error al procesar tu consulta.';
      onChunk(errorMessage);
      return {
        answer: errorMessage,
        context: [],
        sources: []
      };
    }
  }

  async handleMultimodalStreamingQuery(request: MultimodalQueryRequest, onChunk: (chunk: string) => void): Promise<QueryResponse> {
    logInfo(`Procesando consulta multimodal streaming: "${request.question}"`);

    try {
      const session = request.chatId ? getSession(request.chatId) : null;
      const history = Array.isArray(request.history) ? request.history : [];

      const { fileContext } = await this.extractFileContext(request.file, onChunk);
      this.saveLastDocumentContext(request.chatId, fileContext);

      // 🔄 ETAPA 2: BUSCAR CONTEXTO EN DOCUMENTOS (RAG)
      console.log('🔍 Buscando contexto en documentos...');
      let context = fileContext.trim() ? fileContext : this.getLastDocumentFromHistory(request.chatId);
      let sources: any[] = [];

      if (!context.trim()) {
        // Si no hay contexto documental activo, intentar RAG
        const ragResult = await ragService.queryRAG(request.question);
        context = ragResult.context || this.getLastDocumentFromHistory(request.chatId);
        sources = ragResult.sources || [];

        if (context && context.trim().length > 0) {
          console.log('✅ Contexto encontrado en documentos');
        } else {
          console.log('⚪ No hay documentos o no hay contexto relevante - respondiendo como chat normal');
        }
      }

      const hasDocument = !!context.trim();
      this.saveLastDocumentContext(request.chatId, context);

      // Debug temporal para validar continuidad del documento.
      console.log('USANDO CONTEXTO:', hasDocument);
      console.log('LONGITUD CONTEXTO:', context?.length || 0);

      // 🔄 ETAPA 3: GENERAR RESPUESTA CON STREAMING
      const answer = await streamingService.generateStreamingMarkdownResponse(
        context,
        request.question,
        hasDocument,
        onChunk
      );

      if (request.chatId) {
        const finalSession = session ?? createSession(request.chatId, request.question, request.userId);
        addMessage(finalSession, 'user', request.question);
        addMessage(finalSession, 'assistant', answer);
        saveSession(finalSession);
      }

      return {
        answer,
        context: context ? [context] : [],
        sources: sources
      };
    } catch (error) {
      logError('Error in handleMultimodalStreamingQuery', error);
      const errorMessage = 'Lo siento, ocurrió un error al procesar tu consulta multimodal.';
      onChunk(errorMessage);
      return {
        answer: errorMessage,
        context: [],
        sources: []
      };
    }
  }

  async getChatSession(chatId: string): Promise<ChatSession | null> {
    return getSession(chatId) ?? null;
  }

  async clearSession(chatId: string): Promise<void> {
    clearSession(chatId);
  }
}

export const chatService = new ChatService();