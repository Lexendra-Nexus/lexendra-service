import { config } from './env.js';

console.log('Config loaded from env:', {
  openaiApiKey: !!config.openaiApiKey,
  deepseekApiKey: !!config.deepseekApiKey,
  deepseekApiUrl: !!config.deepseekApiUrl
});

export const llmConfig = {
  openai: {
    apiKey: config.openaiApiKey,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  },
  deepseek: {
    apiUrl: config.deepseekApiUrl,
    apiKey: config.deepseekApiKey,
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2000
  }
};