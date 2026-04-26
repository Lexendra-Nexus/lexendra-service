import type { ChatSession } from '../../types/chat.types.js';
import { logInfo } from '../../utils/logger.js';

const sessions = new Map<string, ChatSession>();

export function getSession(chatId: string): ChatSession | undefined {
  return sessions.get(chatId);
}

export function saveSession(session: ChatSession): void {
  sessions.set(session.id, session);
  logInfo(`Session saved: ${session.id}`);
}

export function clearSession(chatId: string): void {
  sessions.delete(chatId);
  logInfo(`Session cleared: ${chatId}`);
}

export function createSession(chatId: string, question: string, userId?: string): ChatSession {
  const session: ChatSession = {
    id: chatId,
    userId: userId ?? 'anonymous',
    title: question.slice(0, 50) + (question.length > 50 ? '...' : ''),
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  sessions.set(chatId, session);
  return session;
}

export function addMessage(session: ChatSession, role: 'user' | 'assistant', content: string): void {
  session.messages.push({
    id: `msg-${Date.now()}-${role}`,
    role,
    content,
    timestamp: new Date()
  });
  session.updatedAt = new Date();
}
