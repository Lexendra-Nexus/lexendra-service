import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Buscar .env desde la raíz del proyecto (2 niveles arriba de src/config/)
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');

console.log('Loading .env from:', envPath);
console.log('File exists:', fs.existsSync(envPath));

dotenv.config({ path: envPath });
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