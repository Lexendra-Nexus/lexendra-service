import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}