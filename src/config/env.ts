import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');

dotenv.config({ path: envPath });
console.log('Loading .env from:', envPath);
console.log('DEEPSEEK_API_KEY loaded:', !!process.env.DEEPSEEK_API_KEY);
console.log('DEEPSEEK_API_URL loaded:', !!process.env.DEEPSEEK_API_URL);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  deepseekApiUrl: process.env.DEEPSEEK_API_URL || '',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  logLevel: process.env.LOG_LEVEL || 'info'
};