export interface DocumentMetadata {
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  checksum?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface Document {
  id: string;
  filename: string;
  content?: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
}