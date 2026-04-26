export interface Document {
  id: string;
  filename: string;
  content: string;
  metadata: {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
  };
  chunks: string[];
}
