export interface RAGContext {
  query: string;
  relevantChunks: DocumentChunk[];
  context: string;
}

export interface RAGResult {
  answer: string;
  context: string;
  sources: string[];
  confidence?: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}