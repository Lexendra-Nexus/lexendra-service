export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryRequest {
  question: string;
  chatId?: string;
  userId?: string;
}

export interface QueryResponse {
  answer: string;
  context?: string[];
  sources?: string[];
}